import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

// Only this floor is bookable through the web app for now.
const MAIN_HALL_FLOOR = 'Food Court Main Hall';

interface RawOdooTable {
  id: number;
  table_number: string;
  floor_id: [number, string] | false;
  seats: number;
  position_h?: number;
  position_v?: number;
  width?: number;
  height?: number;
  shape?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const timeStart = searchParams.get('time_start');
  const timeEnd = searchParams.get('time_end');

  if (!date || !timeStart || !timeEnd) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  if (parseFloat(timeStart) >= parseFloat(timeEnd)) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
  }

  try {
    // 1. Find overlapping reservations. `draft` is included so a table that
    //    someone is mid-checkout on (created, awaiting payment) is held and
    //    cannot be double-booked during the payment window.
    const overlapping = await odooClient.executeKw(
      'foodcourt.reservation',
      'search_read',
      [[
        ['reservation_date', '=', date],
        ['state', 'in', ['draft', 'confirmed', 'checked_in']],
        ['time_start', '<', parseFloat(timeEnd)],
        ['time_end', '>', parseFloat(timeStart)]
      ]],
      { fields: ['table_ids'] }
    );

    // 2. Extract reserved table IDs
    const reservedTableIds = (overlapping as { table_ids?: number[] }[])
      .flatMap((res) => res.table_ids || []);

    // 3. Build domain for available tables (Main Hall only)
    type DomainLeaf = [string, string, unknown];
    const domain: DomainLeaf[] = [
      ['state', '=', 'available'],
      ['active', '=', true],
      ['floor_id.name', '=', MAIN_HALL_FLOOR]
    ];
    if (reservedTableIds.length > 0) {
      domain.push(['id', 'not in', reservedTableIds]);
    }

    // 4. Fetch available tables, including the POS floor-plan layout fields
    //    so the frontend can draw a real map instead of a plain grid.
    const rawTables: RawOdooTable[] = await odooClient.executeKw(
      'restaurant.table',
      'search_read',
      [domain],
      { fields: ['id', 'table_number', 'floor_id', 'seats', 'position_h', 'position_v', 'width', 'height', 'shape'] }
    );

    // 5. Format to match frontend expectations. We intentionally drop Odoo's
    //    `color` and re-style on the web for a consistent look.
    const tables = rawTables
      .map((t) => ({
        id: t.id,
        name: t.table_number,
        seats: t.seats,
        floor_name: Array.isArray(t.floor_id) && t.floor_id.length > 1 ? t.floor_id[1] : 'Unknown Floor',
        position_h: t.position_h ?? 0,
        position_v: t.position_v ?? 0,
        width: t.width ?? 0,
        height: t.height ?? 0,
        shape: t.shape || 'square',
      }))
      // Safety net: the mock client ignores the Odoo domain, so enforce the
      // Main Hall filter here too. On real Odoo this is already a no-op.
      .filter((t) => t.floor_name === MAIN_HALL_FLOOR);

    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}
