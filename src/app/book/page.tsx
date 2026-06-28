"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";

// Generate available time slots from 10:00 to 22:00
const timeSlots = Array.from({ length: 25 }, (_, i) => {
  const time = 10 + i * 0.5;
  const hours = Math.floor(time);
  const mins = time % 1 === 0 ? "00" : "30";
  return { label: `${hours}:${mins}`, value: time };
});

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeStart, setTimeStart] = useState<number | null>(null);
  const [timeEnd, setTimeEnd] = useState<number | null>(null);
  const [guests, setGuests] = useState(2);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [preorders, setPreorders] = useState<{ product_id: number; quantity: number }[]>([]);
  
  // User Info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Fetched Data
  const [tables, setTables] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/menu")
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(console.error);
  }, []);

  const handleFetchTables = async () => {
    if (!date || timeStart === null || timeEnd === null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tables?date=${date}&time_start=${timeStart}&time_end=${timeEnd}`);
      const data = await res.json();
      setTables(data);
      setStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTable = (id: number) => {
    setSelectedTables(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleUpdatePreorder = (id: number, delta: number) => {
    setPreorders(prev => {
      const existing = prev.find(p => p.product_id === id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter(p => p.product_id !== id);
        return prev.map(p => p.product_id === id ? { ...p, quantity: newQty } : p);
      }
      if (delta > 0) return [...prev, { product_id: id, quantity: delta }];
      return prev;
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          reservation_date: date,
          time_start: timeStart,
          time_end: timeEnd,
          guest_count: guests,
          table_ids: selectedTables,
          reservation_line_ids: preorders,
          notes: notes,
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.paymentUrl) {
          router.push(data.paymentUrl);
        } else {
          router.push("/dashboard");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPreorderQty = (id: number) => preorders.find(p => p.product_id === id)?.quantity || 0;

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <div className="mb-10 flex items-center justify-between relative px-2">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-muted/60 -z-10 transform -translate-y-1/2 rounded-full"></div>
        {["Time", "Table", "Food", "Guest"].map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-2 bg-background">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-background transition-colors duration-300 ${step >= i + 1 ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            <span className="text-xs font-medium text-muted-foreground hidden sm:block">{label}</span>
          </div>
        ))}
      </div>

      <Card className="shadow-friendly border-0">
        <CardHeader className="bg-primary/5 rounded-t-3xl pb-8 border-b border-primary/10">
          <CardTitle className="text-2xl text-primary font-bold">
            {step === 1 && "When are you visiting?"}
            {step === 2 && "Choose your table"}
            {step === 3 && "Pre-order your meals"}
            {step === 4 && "Who's coming?"}
          </CardTitle>
          <CardDescription className="text-base">
            {step === 1 && "Select the date, time, and number of guests."}
            {step === 2 && "Pick from the available tables for your time slot."}
            {step === 3 && "Skip the wait and order your food ahead of time. (Optional)"}
            {step === 4 && "Let us know who to expect."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          {step === 1 && (
            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="date" className="text-base font-semibold">Date</Label>
                  <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="guests" className="text-base font-semibold">Number of Guests</Label>
                  <Input id="guests" type="number" min={1} value={guests} onChange={e => setGuests(parseInt(e.target.value))} className="h-12 rounded-xl" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Arrival Time</Label>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.slice(0, 15).map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTimeStart(t.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${timeStart === t.value ? 'bg-primary text-white shadow-md scale-105' : 'bg-muted/50 hover:bg-muted text-foreground'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Departure Time</Label>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.slice(2).map((t) => (
                    <button
                      key={t.value}
                      disabled={timeStart !== null && t.value <= timeStart}
                      onClick={() => setTimeEnd(t.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 
                        ${timeEnd === t.value ? 'bg-primary text-white shadow-md scale-105' : 
                          timeStart !== null && t.value <= timeStart ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed' : 'bg-muted/50 hover:bg-muted text-foreground'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {tables.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center bg-muted/20 rounded-2xl">
                  <p className="text-lg text-muted-foreground font-medium">No tables available for this time slot.</p>
                  <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setStep(1)}>Change Time</Button>
                </div>
              ) : tables.map(table => (
                <div 
                  key={table.id} 
                  onClick={() => handleToggleTable(table.id)}
                  className={`p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02]
                    ${selectedTables.includes(table.id) 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "border-muted bg-card hover:border-primary/30 shadow-sm"}`}
                >
                  <h4 className="font-bold text-lg">{table.name}</h4>
                  <p className="text-muted-foreground mt-1">{table.floor_name}</p>
                  <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground">
                    {table.seats} Seats
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {menu.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-5 border rounded-2xl hover:border-primary/30 transition-colors shadow-sm bg-card">
                    <div>
                      <h4 className="font-semibold text-lg">{item.name}</h4>
                      <p className="text-primary font-bold mt-1">Rp {item.list_price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/50 rounded-full p-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background" onClick={() => handleUpdatePreorder(item.id, -1)}>-</Button>
                      <span className="w-6 text-center font-bold">{getPreorderQty(item.id)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background" onClick={() => handleUpdatePreorder(item.id, 1)}>+</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-base font-semibold">Full Name</Label>
                  <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-base font-semibold">Phone Number</Label>
                  <Input id="phone" placeholder="+62 812..." value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-xl" />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-semibold">Email (Optional)</Label>
                <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-3">
                <Label htmlFor="notes" className="text-base font-semibold">Special Requests</Label>
                <Input id="notes" placeholder="Any allergies or special needs?" value={notes} onChange={e => setNotes(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 bg-muted/10 rounded-b-3xl mt-4">
          <Button variant="ghost" className="rounded-xl px-6" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1 || loading}>
            Back
          </Button>
          
          {step === 1 && (
            <Button onClick={handleFetchTables} disabled={!date || timeStart === null || timeEnd === null || loading} className="rounded-xl px-8 shadow-md hover:shadow-primary/20">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Find Tables
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={selectedTables.length === 0} className="rounded-xl px-8 shadow-md hover:shadow-primary/20">
              Next: Pre-order
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={() => setStep(4)} className="rounded-xl px-8 shadow-md hover:shadow-primary/20">
              {preorders.length > 0 ? "Next: Details" : "Skip Pre-order"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 4 && (
            <Button onClick={handleSubmit} disabled={!name || !phone || loading} className="rounded-xl px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/30">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {preorders.length > 0 ? "Proceed to Payment" : "Confirm Reservation"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
