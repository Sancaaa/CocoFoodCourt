import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

// Only these states may be cancelled from the web (not yet checked in).
const CANCELLABLE = ['draft', 'confirmed'];

export async function POST(request: Request) {
  try {
    const { reservationId } = await request.json();
    if (!reservationId) {
      return NextResponse.json({ error: 'Missing reservationId' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const session = JSON.parse(sessionCookie.value);
    if (!session.partnerId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Load the reservation to verify ownership and current state before acting.
    const records = await odooClient.executeKw(
      'foodcourt.reservation',
      'search_read',
      [[['id', '=', reservationId]]],
      { fields: ['id', 'customer_id', 'state'] }
    );
    const reservation = records[0];
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    const ownerId = Array.isArray(reservation.customer_id) ? reservation.customer_id[0] : reservation.customer_id;
    if (ownerId !== session.partnerId) {
      return NextResponse.json({ error: 'You cannot cancel this reservation' }, { status: 403 });
    }

    if (!CANCELLABLE.includes(reservation.state)) {
      return NextResponse.json({ error: `This reservation can no longer be cancelled (${reservation.state}).` }, { status: 400 });
    }

    // Odoo action_cancel sets state to 'cancelled' and frees the tables.
    await odooClient.executeKw('foodcourt.reservation', 'action_cancel', [[reservationId]]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json({ error: 'Failed to cancel reservation' }, { status: 500 });
  }
}
