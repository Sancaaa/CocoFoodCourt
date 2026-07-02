import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';
import { verifyNotificationSignature, isPaidStatus, type MidtransNotification } from '@/lib/midtrans';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMarshalNoneError(err: any): boolean {
  return typeof err?.faultString === 'string' && err.faultString.includes('cannot marshal None');
}

// Midtrans server-to-server payment notification handler.
// Configure this URL as the "Payment Notification URL" in the Midtrans
// dashboard: https://<your-public-host>/api/webhooks/payment
export async function POST(request: Request) {
  try {
    const notif = (await request.json()) as MidtransNotification;

    if (!notif.order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Reject forged callbacks.
    if (!verifyNotificationSignature(notif)) {
      console.warn('Rejected Midtrans notification with invalid signature:', notif.order_id);
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
      return NextResponse.json({ received: true, confirmed: false });
    }

    // Idempotency: only confirm a reservation still awaiting payment.
    const [record] = await odooClient.executeKw(
      'foodcourt.reservation',
      'read',
      [[reservationId]],
      { fields: ['state'] }
    );
    if (!record) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }
    if (record.state !== 'pending_payment' && record.state !== 'draft') {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    // Record the payment then confirm (Odoo locks the tables and emails the
    // customer a confirmation).
    await odooClient.executeKw('foodcourt.reservation', 'write', [
      [reservationId],
      {
        is_paid_online: true,
        payment_reference: notif.transaction_id || notif.order_id,
      },
    ]);

    try {
      await odooClient.executeKw('foodcourt.reservation', 'action_confirm', [[reservationId]]);
    } catch (confirmErr) {
      if (!isMarshalNoneError(confirmErr)) throw confirmErr;
    }

    return NextResponse.json({ received: true, confirmed: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
