import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

interface RawProduct {
  id: number;
  name: string;
  list_price: number;
  // tenant_id lives on product.template but is readable on product.product via
  // Odoo's _inherits delegation. Returned as [id, name] (or false if unset).
  tenant_id?: [number, string] | false;
}

export async function GET() {
  try {
    const products: RawProduct[] = await odooClient.executeKw(
      'product.product',
      'search_read',
      [[['available_in_pos', '=', true]]],
      { fields: ['id', 'name', 'list_price', 'tenant_id'] }
    );

    // Attach the tenant (food court vendor) name so the frontend can filter the
    // menu per tenant. The tenant name comes straight from the m2o tuple.
    const menu = products.map((p) => ({
      id: p.id,
      name: p.name,
      list_price: p.list_price,
      tenant: Array.isArray(p.tenant_id) && p.tenant_id.length > 1 ? p.tenant_id[1] : 'Other',
    }));

    return NextResponse.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
  }
}
