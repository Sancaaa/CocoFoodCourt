import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { odooClient } from '@/lib/odoo-client';
import ReservationList, { type Reservation } from '@/components/dashboard/ReservationList';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie || !sessionCookie.value) {
    redirect('/login');
  }

  const session = JSON.parse(sessionCookie.value);

  let reservations: Reservation[] = [];
  if (session.partnerId) {
    try {
      reservations = await odooClient.executeKw(
        'foodcourt.reservation',
        'search_read',
        [[['customer_id', '=', session.partnerId]]],
        {
          fields: ['id', 'name', 'reservation_date', 'time_start', 'time_end', 'state', 'amount_total'],
          order: 'reservation_date desc'
        }
      );
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">View and manage your past and upcoming reservations.</p>
      </div>

      <ReservationList reservations={reservations} />
    </div>
  );
}
