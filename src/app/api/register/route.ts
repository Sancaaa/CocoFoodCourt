import { NextResponse } from 'next/server';
import { odooClient } from '@/lib/odoo-client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Boundary check: empty fields
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Boundary check: email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Check duplicate registration
    const existingUserIds = await odooClient.executeKw('res.users', 'search', [
      [['login', '=', email]]
    ]);
    console.log('[API Register] Email:', email, 'existingUserIds:', existingUserIds);

    if (existingUserIds && existingUserIds.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // 1. Search for "Portal" group ID
    const groupIds = await odooClient.executeKw('res.groups', 'search', [
      [['name', '=', 'Portal']]
    ]);

    const portalGroupId = groupIds && groupIds.length > 0 ? groupIds[0] : 10; // default 10 if not found

    // 2. Create the user under res.users and link to Portal group
    const userId = await odooClient.executeKw('res.users', 'create', [
      {
        name,
        login: email,
        email,
        password,
        groups_id: [[6, 0, [portalGroupId]]]
      }
    ]);

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (error) {
    console.error('Registration API error:', error);
    const msg = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
