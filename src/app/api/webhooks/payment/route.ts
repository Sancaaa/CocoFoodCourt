import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // In a real integration, we would verify the webhook signature here
    // e.g. verifySignature(request.headers.get('x-signature'), data)

    const orderId = data.order_id;
    const transactionStatus = data.transaction_status;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    if (transactionStatus === 'settlement' || transactionStatus === 'capture' || transactionStatus === 'success') {
      // 1. Update Odoo reservation: is_paid_online = True and set reference
      await odooClient.executeKw('foodcourt.reservation', 'write', [
        [parseInt(orderId)],
        {
          is_paid_online: true,
          payment_reference: data.transaction_id || 'MOCK_TXN_ID'
        }
      ]);

      // 2. Confirm the reservation in Odoo
      // This will trigger action_confirm -> changes table state to Reserved
      await odooClient.executeKw('foodcourt.reservation', 'action_confirm', [
        [parseInt(orderId)]
      ]);

      return NextResponse.json({ success: true, message: 'Reservation confirmed successfully via payment webhook' });
    }

    return NextResponse.json({ success: true, message: 'Status updated but not paid yet' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
