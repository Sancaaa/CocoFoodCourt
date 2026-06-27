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
    const tables = await odooClient.executeKw(
      'foodcourt.reservation',
      'get_available_tables_api',
      [date, parseFloat(timeStart), parseFloat(timeEnd)]
    );
    return NextResponse.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}
