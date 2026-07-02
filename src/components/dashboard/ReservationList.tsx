"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

export interface Reservation {
  id: number;
  name: string;
  reservation_date: string;
  time_start: number;
  time_end: number;
  state: string;
  amount_total: number;
}

const CANCELLABLE = ["draft", "confirmed"];

function formatTime(timeFloat: number) {
  const hours = Math.floor(timeFloat);
  const minutes = Math.round((timeFloat - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function stateClasses(state: string) {
  if (state === "confirmed" || state === "checked_in") return "bg-primary text-primary-foreground";
  if (state === "cancelled" || state === "no_show") return "bg-destructive/10 text-destructive";
  if (state === "completed") return "bg-emerald-500/10 text-emerald-700";
  return "";
}

export default function ReservationList({ reservations }: { reservations: Reservation[] }) {
  const [items, setItems] = useState(reservations);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-dismiss the toast notification.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      const res = await fetch("/api/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems(prev => prev.map(r => (r.id === id ? { ...r, state: "cancelled" } : r)));
        const name = items.find(r => r.id === id)?.name ?? "Reservation";
        setToast({ type: "success", text: `${name} has been cancelled and the table released.` });
      } else {
        throw new Error(data?.error || "Could not cancel the reservation.");
      }
    } catch (e) {
      setToast({ type: "error", text: e instanceof Error ? e.message : "Could not cancel the reservation." });
    } finally {
      setCancellingId(null);
      setConfirmingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">You have no reservations yet.</p>
      </div>
    );
  }

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium border ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          <span id="reservation-toast">{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-4">
        {items.map((res) => {
          const canCancel = CANCELLABLE.includes(res.state);
          return (
            <Card key={res.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{res.name}</CardTitle>
                    <CardDescription>{res.reservation_date}</CardDescription>
                  </div>
                  <Badge variant="secondary" className={stateClasses(res.state)}>
                    {res.state.replace("_", " ").toUpperCase()}
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

                {canCancel && (
                  <div className="mt-5 pt-4 border-t border-muted/60 flex justify-end">
                    {confirmingId === res.id ? (
                      <div className="flex items-center gap-3 w-full justify-end">
                        <span className="text-sm text-muted-foreground mr-auto">Cancel this reservation?</span>
                        <Button
                          variant="ghost"
                          className="rounded-none"
                          onClick={() => setConfirmingId(null)}
                          disabled={cancellingId === res.id}
                        >
                          Keep
                        </Button>
                        <Button
                          className="rounded-none bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => handleCancel(res.id)}
                          disabled={cancellingId === res.id}
                        >
                          {cancellingId === res.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Yes, cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="rounded-none" onClick={() => setConfirmingId(res.id)}>
                        Cancel reservation
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
