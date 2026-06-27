import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

export async function GET() {
  try {
    const menu = await odooClient.executeKw(
      'product.product',
      'search_read',
      [[['available_in_pos', '=', true]]],
      { fields: ['id', 'name', 'list_price', 'categ_id'] }
    );
    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}
