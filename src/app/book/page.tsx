"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [timeStart, setTimeStart] = useState<number | null>(null);
  const [timeEnd, setTimeEnd] = useState<number | null>(null);
  const [guests, setGuests] = useState(2);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [preorders, setPreorders] = useState<{ product_id: number; quantity: number }[]>([]);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  interface Table {
    id: number;
    name: string;
    floor_name: string;
    seats: number;
  }

  interface MenuItem {
    id: number;
    name: string;
    list_price: number;
  }

  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  useEffect(() => {
    // 1. Fetch menu
    fetch("/api/menu")
      .then(res => res.json())
      .then(data => setMenu(data))
      .catch(console.error);

    // 2. Check session
    fetch("/api/auth/session")
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(data => {
        if (data && data.user) {
          setIsLoggedIn(true);
          setName(data.user.name || "");
          setEmail(data.user.email || "");
        } else {
          // Check local storage fallback
          const localLoggedIn = localStorage.getItem("userLoggedIn") === "true";
          setIsLoggedIn(localLoggedIn);
        }
      })
      .catch(console.error);

    // 3. Restore state if redirecting back from registration
    const saved = localStorage.getItem("booking_state");
    if (saved) {
      setTimeout(() => {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.date) setDate(parsed.date);
          if (parsed.timeStart !== undefined) setTimeStart(parsed.timeStart);
          if (parsed.timeEnd !== undefined) setTimeEnd(parsed.timeEnd);
          if (parsed.guests !== undefined) setGuests(parsed.guests);
          if (parsed.selectedTables !== undefined) setSelectedTables(parsed.selectedTables);
          if (parsed.preorders !== undefined) setPreorders(parsed.preorders);
          if (parsed.name) setName(parsed.name);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.step) setStep(parsed.step);

          if (parsed.date && parsed.timeStart !== null && parsed.timeEnd !== null) {
            fetch(`/api/tables?date=${parsed.date}&time_start=${parsed.timeStart}&time_end=${parsed.timeEnd}`)
              .then(res => res.json())
              .then(data => setTables(data))
              .catch(console.error);
          }
        } catch (e) {
          console.error("Error restoring booking state:", e);
        } finally {
          localStorage.removeItem("booking_state");
        }
      }, 0);
    }
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
    // If not logged in, prompt to register
    if (!isLoggedIn) {
      const stateToSave = {
        date,
        timeStart,
        timeEnd,
        guests,
        selectedTables,
        preorders,
        name,
        phone,
        email,
        notes,
        step: 4
      };
      localStorage.setItem("booking_state", JSON.stringify(stateToSave));
      router.push("/register?redirect=/book");
      return;
    }

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
          reservation_line_ids: preorders.map(p => ({
            product_id: p.product_id,
            quantity: p.quantity
          })),
          notes: notes,
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
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

  // Calculate preorders total price
  const calculateTotal = () => {
    return preorders.reduce((total, p) => {
      const item = menu.find(m => m.id === p.product_id);
      return total + (item ? item.list_price * p.quantity : 0);
    }, 0);
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl bg-white min-h-screen">
      
      {/* Breadcrumb / Step Indicator */}
      <div className="mb-12 text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
          {step === 1 && "When are you visiting?"}
          {step === 2 && "Choose your table"}
          {step === 3 && "Pre-order your meals"}
          {step === 4 && "Who's coming?"}
        </h1>
        <p className="text-foreground/70">
          Step {step} of 4 &bull; {step === 1 ? "Time & Date" : step === 2 ? "Table Selection" : step === 3 ? "Optional Food Order" : "Guest Details"}
        </p>
      </div>

      <div className="w-full transition-all duration-300">
        {step === 1 && (
          <div className="space-y-10 max-w-2xl mx-auto">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="date" className="text-[13px] uppercase tracking-wide font-bold">Date</Label>
                <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-none border-2 border-muted focus-visible:ring-0 focus-visible:border-primary transition-colors" />
              </div>
              <div className="space-y-3">
                <Label htmlFor="guests" className="text-[13px] uppercase tracking-wide font-bold">Number of Guests</Label>
                <Input id="guests" type="number" min={1} value={guests} onChange={e => setGuests(parseInt(e.target.value))} className="h-12 rounded-none border-2 border-muted focus-visible:ring-0 focus-visible:border-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[13px] uppercase tracking-wide font-bold">Arrival Time</Label>
              <div className="flex flex-wrap gap-2">
                {timeSlots.slice(0, 15).map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTimeStart(t.value)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors duration-200 ${timeStart === t.value ? 'bg-primary text-white' : 'bg-[#F5F3F2] hover:bg-muted text-foreground'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[13px] uppercase tracking-wide font-bold">Departure Time</Label>
              <div className="flex flex-wrap gap-2">
                {timeSlots.slice(2).map((t) => (
                  <button
                    key={t.value}
                    disabled={timeStart !== null && t.value <= timeStart}
                    onClick={() => setTimeEnd(t.value)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors duration-200 
                      ${timeEnd === t.value ? 'bg-primary text-white' : 
                        timeStart !== null && t.value <= timeStart ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed' : 'bg-[#F5F3F2] hover:bg-muted text-foreground'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {tables.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-[#F5F3F2]">
                <p className="text-lg text-foreground/70 font-medium">No tables available for this time slot.</p>
                <Button variant="outline" className="mt-4 rounded-none" onClick={() => setStep(1)}>Change Time</Button>
              </div>
            ) : tables.map(table => (
              <div 
                key={table.id} 
                onClick={() => handleToggleTable(table.id)}
                className={`p-6 cursor-pointer transition-all duration-200 
                  ${selectedTables.includes(table.id) 
                    ? "bg-primary text-white" 
                    : "bg-[#F5F3F2] hover:bg-primary/5 text-foreground"}`}
              >
                <h4 className="font-bold text-xl font-serif">{table.name}</h4>
                <p className={`mt-1 text-sm ${selectedTables.includes(table.id) ? "text-white/80" : "text-foreground/70"}`}>{table.floor_name}</p>
                <p className={`mt-4 text-[13px] uppercase tracking-wide font-bold ${selectedTables.includes(table.id) ? "text-white" : "text-primary"}`}>
                  {table.seats} Seats
                </p>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {menu.map(item => (
                <div key={item.id} className="bg-[#F5F3F2] flex flex-col group relative overflow-hidden">
                  <div className="relative w-full aspect-[2/3] bg-muted overflow-hidden">
                    <Image src="/food.png" alt={item.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-primary mb-2 block">Available</span>
                    <h4 className="font-serif font-bold text-lg leading-snug mb-1 group-hover:text-primary transition-colors">{item.name}</h4>
                    <p className="text-foreground/70 text-sm mb-4 flex-1">Rp {item.list_price.toLocaleString()}</p>
                    
                    <div className="flex items-center justify-between border-t border-muted/50 pt-4 mt-auto">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white" onClick={() => handleUpdatePreorder(item.id, -1)}>-</Button>
                      <span className="font-bold text-lg">{getPreorderQty(item.id)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white" onClick={() => handleUpdatePreorder(item.id, 1)}>+</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {preorders.length > 0 && (
              <div className="p-4 bg-primary/5 text-primary text-right font-bold text-lg border border-primary/10">
                Total Price: Rp <span id="preorder-total">{calculateTotal().toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="max-w-xl mx-auto space-y-8 bg-[#F5F3F2] p-8 md:p-12">
            {!isLoggedIn && (
              <div className="p-4 bg-amber-500/10 text-amber-800 text-sm rounded-xl font-medium border border-amber-500/20" id="guest-booking-notice">
                You are currently booking as a guest. Click &quot;Confirm Reservation&quot; below to quickly register/log in and save this booking to your account history.
              </div>
            )}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-[13px] uppercase tracking-wide font-bold">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} className="h-12 rounded-none border-0 bg-white" required={isLoggedIn} />
              </div>
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-[13px] uppercase tracking-wide font-bold">Phone Number</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} className="h-12 rounded-none border-0 bg-white" required={isLoggedIn} />
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="email" className="text-[13px] uppercase tracking-wide font-bold">Email (Optional)</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-12 rounded-none border-0 bg-white" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-[13px] uppercase tracking-wide font-bold">Special Requests</Label>
              <Input id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="h-12 rounded-none border-0 bg-white" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-16 pt-8 border-t border-muted max-w-4xl mx-auto">
        <Button variant="ghost" className="rounded-none text-sm font-bold uppercase tracking-wide" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1 || loading}>
          Back
        </Button>
        
        {step === 1 && (
          <Button onClick={handleFetchTables} disabled={!date || timeStart === null || timeEnd === null || loading} className="rounded-none px-8 h-12 text-sm font-bold uppercase tracking-wide">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Find Tables
          </Button>
        )}
        {step === 2 && (
          <Button onClick={() => setStep(3)} disabled={selectedTables.length === 0} className="rounded-none px-8 h-12 text-sm font-bold uppercase tracking-wide">
            Next
          </Button>
        )}
        {step === 3 && (
          <Button onClick={() => setStep(4)} className="rounded-none px-8 h-12 text-sm font-bold uppercase tracking-wide">
            {preorders.length > 0 ? "Next" : "Skip Pre-order"}
          </Button>
        )}
        {step === 4 && (
          <Button onClick={handleSubmit} disabled={loading || (isLoggedIn && (!name || !phone))} className="rounded-none px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-wide">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {preorders.length > 0 ? "Proceed to Payment" : "Confirm Reservation"}
          </Button>
        )}
      </div>
    </div>
  );
}
