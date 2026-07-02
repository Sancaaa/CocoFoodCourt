import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';
import { createSnapTransaction, isMidtransConfigured } from '@/lib/midtrans';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMarshalNoneError(err: any): boolean {
  return typeof err?.faultString === 'string' && err.faultString.includes('cannot marshal None');
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    const hasPreorder = Array.isArray(data.reservation_line_ids) && data.reservation_line_ids.length > 0;

    // Create reservation in Odoo. Paid reservations start as `pending_payment`
    // which temporarily locks the tables (Odoo auto-cancels after 15 min if the
    // Midtrans payment never completes).
    const reservationVals: Record<string, unknown> = {
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_email: data.customer_email,
      reservation_date: data.reservation_date,
      time_start: data.time_start,
      time_end: data.time_end,
      guest_count: data.guest_count,
      table_ids: [[6, 0, data.table_ids || []]], // Many2many relation
      notes: data.notes || '',
    };
    if (hasPreorder) {
      reservationVals.state = 'pending_payment';
    }

    if (sessionCookie && sessionCookie.value) {
      const session = JSON.parse(sessionCookie.value);
      if (session.partnerId) {
        reservationVals.customer_id = session.partnerId;
      }
    } else if (data.customer_id) {
      reservationVals.customer_id = data.customer_id;
    }

    if (hasPreorder) {
      reservationVals.reservation_line_ids = data.reservation_line_ids.map((line: { product_id: number; quantity: number }) => [
        0, 0, {
          product_id: line.product_id,
          quantity: line.quantity,
        }
      ]);
    }

    // In Odoo 19, create expects a list of dicts
    const reservationIds = await odooClient.executeKw(
      'foodcourt.reservation',
      'create',
      [[reservationVals]]
    );
    const reservationId = Array.isArray(reservationIds) ? reservationIds[0] : reservationIds;

    if (!hasPreorder) {
      // No food ordered, no payment needed — confirm immediately.
      try {
        await odooClient.executeKw('foodcourt.reservation', 'action_confirm', [[reservationId]]);
      } catch (confirmErr) {
        if (isMarshalNoneError(confirmErr)) {
          console.warn('Ignored XML-RPC None marshal error on action_confirm');
        } else {
          throw confirmErr;
        }
      }
      return NextResponse.json({ success: true, reservationId });
    }

    // Read the Odoo-computed total (authoritative amount) for the payment.
    const [record] = await odooClient.executeKw(
      'foodcourt.reservation',
      'read',
      [[reservationId]],
      { fields: ['amount_total', 'name'] }
    );
    const amount = Number(record?.amount_total) || 0;

    if (amount <= 0) {
      // Nothing to charge — just confirm.
      try {
        await odooClient.executeKw('foodcourt.reservation', 'action_confirm', [[reservationId]]);
      } catch (confirmErr) {
        if (!isMarshalNoneError(confirmErr)) throw confirmErr;
      }
      return NextResponse.json({ success: true, reservationId });
    }

    if (!isMidtransConfigured()) {
      return NextResponse.json({ error: 'Payment gateway is not configured. Set MIDTRANS_SERVER_KEY.' }, { status: 503 });
    }

    // Create a Midtrans Snap transaction and hand the redirect URL to the client.
    const origin = process.env.APP_URL || new URL(request.url).origin;
    const orderId = `${reservationId}-${Date.now().toString().slice(-6)}`;
    const snap = await createSnapTransaction({
      orderId,
      grossAmount: amount,
      customer: { name: data.customer_name, email: data.customer_email, phone: data.customer_phone },
      finishUrl: `${origin}/payment/finish`,
    });

    return NextResponse.json({ success: true, reservationId, paymentUrl: snap.redirect_url });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
