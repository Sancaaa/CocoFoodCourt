import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

interface RawProduct {
  id: number;
  name: string;
  list_price: number;
  pos_categ_ids?: number[];
}

interface RawCategory {
  id: number;
  name: string;
}

export async function GET() {
  try {
    // Two sequential calls (kept sequential to avoid hammering the remote Odoo
    // with concurrent XML-RPC connections).
    const products: RawProduct[] = await odooClient.executeKw(
      'product.product',
      'search_read',
      [[['available_in_pos', '=', true]]],
      { fields: ['id', 'name', 'list_price', 'pos_categ_ids'] }
    );

    const categories: RawCategory[] = await odooClient.executeKw(
      'pos.category',
      'search_read',
      [[]],
      { fields: ['id', 'name'] }
    );

    const categoryName = new Map(categories.map((c) => [c.id, c.name]));

    // Attach human-readable POS category names so the frontend can filter by
    // category. Products can belong to several categories.
    const menu = products.map((p) => ({
      id: p.id,
      name: p.name,
      list_price: p.list_price,
      categories: (p.pos_categ_ids || [])
        .map((id) => categoryName.get(id))
        .filter((name): name is string => Boolean(name)),
    }));

    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}
