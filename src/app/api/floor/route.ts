import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

// Must match the bookable floor used by /api/tables.
const BOOKABLE_FLOOR = 'Main Floor';

interface RawFloor {
  id: number;
  name: string;
  background_color?: string | false;
  background_image?: string | false;
  floor_background_image?: string | false;
}

// Read PNG/JPEG dimensions straight from the base64 bytes so the frontend can
// size the Leaflet CRS.Simple map to the exact pixel space Odoo's table
// coordinates live in. Returns null for unknown formats.
function imageInfo(b64: string): { mime: string; width: number; height: number } | null {
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
  // PNG: signature then IHDR width/height as big-endian uint32 at offset 16/20.
  if (buf.length > 24 && buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') {
    return { mime: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk segments to the SOF marker.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1];
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { mime: 'image/jpeg', height: buf.readUInt16BE(o + 5), width: buf.readUInt16BE(o + 7) };
      }
      o += 2 + buf.readUInt16BE(o + 2);
    }
  }
  return null;
}

export async function GET() {
  try {
    const floors: RawFloor[] = await odooClient.executeKw(
      'restaurant.floor',
      'search_read',
      [[['name', '=', BOOKABLE_FLOOR]]],
      { fields: ['id', 'name', 'background_color', 'floor_background_image', 'background_image'] }
    );

    if (!floors || floors.length === 0) {
      return NextResponse.json({ name: BOOKABLE_FLOOR, image: null, width: 0, height: 0, backgroundColor: '#F5F3F2' });
    }

    const floor = floors[0];
    const backgroundColor =
      typeof floor.background_color === 'string' && floor.background_color ? floor.background_color : '#F5F3F2';

    // Prefer the dedicated floor background, fall back to the generic one.
    const raw =
      (typeof floor.floor_background_image === 'string' && floor.floor_background_image) ||
      (typeof floor.background_image === 'string' && floor.background_image) ||
      '';

    if (raw) {
      const info = imageInfo(raw);
      if (info) {
        return NextResponse.json({
          name: floor.name,
          backgroundColor,
          width: info.width,
          height: info.height,
          image: `data:${info.mime};base64,${raw}`,
        });
      }
    }

    // No usable image — the map will fall back to a plain canvas sized to the
    // table-coordinate bounds.
    return NextResponse.json({ name: floor.name, image: null, width: 0, height: 0, backgroundColor });
  } catch (error) {
    console.error('Error fetching floor:', error);
    return NextResponse.json({ error: 'Failed to fetch floor' }, { status: 500 });
  }
}
