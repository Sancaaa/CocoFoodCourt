import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  // Mock data representing a user's past reservations fetched from Odoo
  const reservations = [
    {
      id: 1,
      name: "RES/2026/00123",
      reservation_date: "2026-06-30",
      time_start: 18.0,
      time_end: 20.0,
      state: "confirmed",
      amount_total: 68000,
    },
    {
      id: 2,
      name: "RES/2026/00089",
      reservation_date: "2026-06-15",
      time_start: 12.0,
      time_end: 14.0,
      state: "completed",
      amount_total: 125000,
    }
  ];

  const formatTime = (timeFloat: number) => {
    const hours = Math.floor(timeFloat);
    const minutes = Math.round((timeFloat - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Reservations</h1>
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
