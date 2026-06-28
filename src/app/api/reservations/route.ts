import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    // Create reservation in Odoo
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

    if (sessionCookie && sessionCookie.value) {
      const session = JSON.parse(sessionCookie.value);
      if (session.partnerId) {
        reservationVals.customer_id = session.partnerId;
      }
    } else if (data.customer_id) {
      reservationVals.customer_id = data.customer_id;
    }

    if (data.reservation_line_ids && data.reservation_line_ids.length > 0) {
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

    if (data.reservation_line_ids && data.reservation_line_ids.length > 0) {
      // Mock Headless Payment Gateway Integration
      // Return a mock payment URL for the user to complete payment
      const mockPaymentUrl = `/payment-mock?order_id=${reservationId}`;
      return NextResponse.json({ success: true, reservationId, paymentUrl: mockPaymentUrl });
    } else {
      // No food ordered, auto confirm reservation since no payment is needed
      await odooClient.executeKw('foodcourt.reservation', 'action_confirm', [
        [reservationId]
      ]);
      return NextResponse.json({ success: true, reservationId });
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
