import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Create reservation in Odoo
    const reservationVals: any = {
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

    if (data.customer_id) {
      reservationVals.customer_id = data.customer_id;
    }

    if (data.reservation_line_ids && data.reservation_line_ids.length > 0) {
      reservationVals.reservation_line_ids = data.reservation_line_ids.map((line: any) => [
        0, 0, {
          product_id: line.product_id,
          quantity: line.quantity,
        }
      ]);
    }

    const reservationId = await odooClient.executeKw(
      'foodcourt.reservation',
      'create',
      [reservationVals]
    );

    return NextResponse.json({ success: true, reservationId });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
