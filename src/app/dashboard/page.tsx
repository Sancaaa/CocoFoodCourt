import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { odooClient } from '@/lib/odoo-client';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie || !sessionCookie.value) {
    redirect('/login');
  }
  
  const session = JSON.parse(sessionCookie.value);
  
  let reservations: any[] = [];
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

  const formatTime = (timeFloat: number) => {
    const hours = Math.floor(timeFloat);
    const minutes = Math.round((timeFloat - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">View and manage your past and upcoming reservations.</p>
      </div>

      <div className="grid gap-4">
        {reservations.map((res) => (
          <Card key={res.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{res.name}</CardTitle>
                  <CardDescription>{res.reservation_date}</CardDescription>
                </div>
                <Badge variant={res.state === 'confirmed' ? 'default' : 'secondary'} className={res.state === 'confirmed' ? 'bg-primary' : ''}>
                  {res.state.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <p className="font-medium">Time Slot</p>
                  <p className="text-muted-foreground">{formatTime(res.time_start)} - {formatTime(res.time_end)}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="font-medium">Total Pre-order</p>
                  <p className="text-muted-foreground">Rp {res.amount_total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
