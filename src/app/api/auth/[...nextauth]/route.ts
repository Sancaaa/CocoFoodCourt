import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { odooClient } from '@/lib/odoo-client';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.endsWith('/session')) {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session');
      if (sessionCookie && sessionCookie.value) {
        const user = JSON.parse(sessionCookie.value);
        return NextResponse.json({ user });
      }
    } catch (e) {
      console.error('Session retrieval error:', e);
    }
    return NextResponse.json(null);
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.endsWith('/login') || pathname.endsWith('/signin') || pathname.endsWith('/credentials')) {
    try {
      const body = await request.json();
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      // Authenticate with Odoo Client
      const uid = await odooClient.authenticate(email, password);
      
      if (!uid || typeof uid !== 'number') {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Fetch user details (name, login, email)
      const userRecords = await odooClient.executeKw('res.users', 'read', [[uid]], {
        fields: ['name', 'login', 'email']
      });

      if (!userRecords || userRecords.length === 0) {
        return NextResponse.json({ error: 'User record not found' }, { status: 404 });
      }

      const user = userRecords[0];
      const sessionData = {
        id: uid,
        name: user.name || 'User',
        email: user.login || email
      };

      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set('session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      return NextResponse.json({ success: true, user: sessionData });
    } catch (error) {
      console.error('Login error:', error);
      const msg = error instanceof Error ? error.message : 'Invalid credentials';
      return NextResponse.json({ error: msg }, { status: 401 });
    }
  }

  if (pathname.endsWith('/logout') || pathname.endsWith('/signout')) {
    try {
      const cookieStore = await cookies();
      cookieStore.delete('session');
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
