import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const timeStart = searchParams.get('time_start');
  const timeEnd = searchParams.get('time_end');

  if (!date || !timeStart || !timeEnd) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // 1. Find overlapping reservations
    const overlapping = await odooClient.executeKw(
      'foodcourt.reservation',
      'search_read',
      [[
        ['reservation_date', '=', date],
        ['state', 'in', ['confirmed', 'checked_in']],
        ['time_start', '<', parseFloat(timeEnd)],
        ['time_end', '>', parseFloat(timeStart)]
      ]],
      { fields: ['table_ids'] }
    );

    // 2. Extract reserved table IDs
    const reservedTableIds = overlapping.flatMap((res: any) => res.table_ids || []);

    // 3. Build domain for available tables
    const domain: any[] = [
      ['state', '=', 'available'],
      ['active', '=', true]
    ];
    if (reservedTableIds.length > 0) {
      domain.push(['id', 'not in', reservedTableIds]);
    }

    // 4. Fetch available tables
    const rawTables = await odooClient.executeKw(
      'restaurant.table',
      'search_read',
      [domain],
      { fields: ['id', 'table_number', 'floor_id', 'seats'] }
    );

    // 5. Format to match frontend expectations
    const tables = rawTables.map((t: any) => ({
      id: t.id,
      name: t.table_number,
      seats: t.seats,
      floor_name: t.floor_id && t.floor_id.length > 1 ? t.floor_id[1] : 'Unknown Floor'
    }));

    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}
