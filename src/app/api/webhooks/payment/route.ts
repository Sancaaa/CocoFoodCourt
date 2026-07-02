import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';
import { verifyNotificationSignature, isPaidStatus, type MidtransNotification } from '@/lib/midtrans';

const TAG = '[midtrans-webhook]';

// Normalise any thrown value into loggable fields, including XML-RPC Fault
// details (faultCode/faultString) and Node system error codes (ECONNREFUSED…).
function errorInfo(err: unknown) {
  const e = err as { message?: string; stack?: string; faultCode?: unknown; faultString?: unknown; code?: unknown };
  return {
    message: e?.message ?? String(err),
    stack: e?.stack,
    faultCode: e?.faultCode,
    faultString: e?.faultString,
    code: e?.code,
  };
}

function isMarshalNoneError(err: unknown): boolean {
  const fs = (err as { faultString?: unknown })?.faultString;
  return typeof fs === 'string' && fs.includes('cannot marshal None');
}

// Midtrans server-to-server payment notification handler.
// Configure this URL as the "Payment Notification URL" in the Midtrans
// dashboard: https://<your-public-host>/api/webhooks/payment
export async function POST(request: Request) {
  // 1) Parse body FIRST, in its own guard: an invalid/empty body is a client
  //    error (400), never a 500.
  let notif: MidtransNotification;
  try {
    notif = (await request.json()) as MidtransNotification;
  } catch (err) {
    console.warn(`${TAG} invalid JSON body:`, errorInfo(err).message);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    console.info(`${TAG} received`, {
      order_id: notif?.order_id,
      transaction_status: notif?.transaction_status,
      fraud_status: notif?.fraud_status,
      status_code: notif?.status_code,
    });

    if (!notif?.order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // 2) Signature check — log the outcome so a mismatch is obvious.
    const validSignature = verifyNotificationSignature(notif);
    console.info(`${TAG} signature valid=${validSignature} order_id=${notif.order_id}`);
    if (!validSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // order_id is `${reservationId}-${suffix}`; parseInt stops at the dash.
    const reservationId = parseInt(notif.order_id, 10);
    if (Number.isNaN(reservationId)) {
      return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
    }

    if (!isPaidStatus(notif)) {
      // pending / deny / cancel / expire — nothing to do; Odoo's cron will
      // release the table if payment never completes.
      console.info(`${TAG} non-paid status "${notif.transaction_status}", skipping`);
      return NextResponse.json({ received: true, confirmed: false });
    }

    // 3) Idempotency: only confirm a reservation still awaiting payment.
    console.info(`${TAG} executeKw read foodcourt.reservation id=${reservationId}`);
    const readResult = await odooClient.executeKw(
      'foodcourt.reservation',
      'read',
      [[reservationId]],
      { fields: ['state'] }
    );
    console.info(`${TAG} read result:`, JSON.stringify(readResult));
    const record = Array.isArray(readResult) ? readResult[0] : undefined;
    if (!record) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }
    if (record.state !== 'pending_payment' && record.state !== 'draft') {
      console.info(`${TAG} already processed, state=${record.state}`);
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // 4) Record the payment then confirm (Odoo locks tables + emails customer).
    console.info(`${TAG} executeKw write payment ref id=${reservationId}`);
    await odooClient.executeKw('foodcourt.reservation', 'write', [
      [reservationId],
      {
        is_paid_online: true,
        payment_reference: notif.transaction_id || notif.order_id,
      },
    ]);

    console.info(`${TAG} executeKw action_confirm id=${reservationId}`);
    try {
      await odooClient.executeKw('foodcourt.reservation', 'action_confirm', [[reservationId]]);
    } catch (confirmErr) {
      if (isMarshalNoneError(confirmErr)) {
        console.warn(`${TAG} ignored XML-RPC "cannot marshal None" on action_confirm (method still succeeds)`);
      } else {
        throw confirmErr;
      }
    }

    console.info(`${TAG} confirmed reservation id=${reservationId}`);
    return NextResponse.json({ received: true, confirmed: true });
  } catch (error) {
    // Surface the real cause: message, XML-RPC fault, system code, stack.
    const info = errorInfo(error);
    console.error(`${TAG} processing error for order_id=${notif?.order_id}: ${info.message}`);
    if (info.faultCode !== undefined || info.faultString !== undefined) {
      console.error(`${TAG} XML-RPC fault → faultCode=${JSON.stringify(info.faultCode)} faultString=${JSON.stringify(info.faultString)}`);
    }
    if (info.code) console.error(`${TAG} system error code=${info.code}`);
    if (info.stack) console.error(`${TAG} stack:\n${info.stack}`);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
