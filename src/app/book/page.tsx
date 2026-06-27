"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BookPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
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

  // Fetch menu on load
  useEffect(() => {
    fetch("/api/menu")
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(console.error);
  }, []);

  const handleFetchTables = async () => {
    if (!date || !timeStart || !timeEnd) return;
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
      if (delta > 0) {
        return [...prev, { product_id: id, quantity: delta }];
      }
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
          time_start: parseFloat(timeStart),
          time_end: parseFloat(timeEnd),
          guest_count: guests,
          table_ids: selectedTables,
          reservation_line_ids: preorders,
          notes: notes,
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Reservation successful!");
        router.push("/dashboard");
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
      <div className="mb-8 flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -z-10 transform -translate-y-1/2 rounded-full"></div>
        {[1, 2, 3, 4].map(s => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-background ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {s}
          </div>
        ))}
      </div>

      <Card className="shadow-lg border-primary/20">
        <CardHeader className="bg-primary/5 rounded-t-xl pb-8">
          <CardTitle className="text-2xl text-primary">
            {step === 1 && "When are you visiting?"}
            {step === 2 && "Choose your tables"}
            {step === 3 && "Pre-order your meals"}
            {step === 4 && "Guest Details"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Select the date, time, and number of guests."}
            {step === 2 && "Pick from the available tables for your time slot."}
            {step === 3 && "Skip the wait and order your food ahead of time."}
            {step === 4 && "Let us know who to expect."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <Input id="guests" type="number" min={1} value={guests} onChange={e => setGuests(parseInt(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeStart">Start Time (24H Format e.g. 12.5 for 12:30)</Label>
                <Input id="timeStart" type="number" step="0.5" placeholder="12.0" value={timeStart} onChange={e => setTimeStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeEnd">End Time (24H Format)</Label>
                <Input id="timeEnd" type="number" step="0.5" placeholder="14.0" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {tables.length === 0 ? (
                <p className="text-muted-foreground col-span-full py-8 text-center">No tables available for this time slot.</p>
              ) : tables.map(table => (
                <div 
                  key={table.id} 
                  onClick={() => handleToggleTable(table.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedTables.includes(table.id) ? "border-primary bg-primary/10 shadow-md" : "hover:border-primary/50"}`}
                >
                  <h4 className="font-bold">{table.name}</h4>
                  <p className="text-sm text-muted-foreground">{table.floor_name} - {table.seats} Seats</p>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {menu.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-xl">
                  <div>
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-primary font-medium">Rp {item.list_price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleUpdatePreorder(item.id, -1)}>-</Button>
                    <span className="w-4 text-center font-medium">{getPreorderQty(item.id)}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleUpdatePreorder(item.id, 1)}>+</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+62 812..." value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Special Requests</Label>
                <Input id="notes" placeholder="Any allergies or special needs?" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1 || loading}>
            Back
          </Button>
          
          {step === 1 && (
            <Button onClick={handleFetchTables} disabled={!date || !timeStart || !timeEnd || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Find Tables
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={selectedTables.length === 0}>
              Next: Pre-order
            </Button>
          )}
          {step === 3 && (
            <Button onClick={() => setStep(4)}>
              Next: Your Details
            </Button>
          )}
          {step === 4 && (
            <Button onClick={handleSubmit} disabled={!name || !phone || loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reservation
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
