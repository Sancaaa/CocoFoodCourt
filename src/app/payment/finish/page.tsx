"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

function PaymentFinish() {
  const params = useSearchParams();
  const status = params.get("transaction_status") || "";
  const orderId = params.get("order_id") || "";

  const paid = status === "settlement" || status === "capture";
  const pending = status === "pending";

  return (
    <div className="container mx-auto py-20 px-4 max-w-md flex flex-col items-center justify-center">
      <Card className="w-full text-center shadow-xl border-primary/10 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">
            {paid ? "Payment Successful" : pending ? "Payment Pending" : "Payment Not Completed"}
          </CardTitle>
          {orderId && <CardDescription>Order {orderId}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <div className="flex justify-center">
            {paid ? (
              <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            ) : pending ? (
              <Clock className="h-16 w-16 text-amber-500" />
            ) : (
              <XCircle className="h-16 w-16 text-destructive" />
            )}
          </div>
          <p className="text-muted-foreground">
            {paid
              ? "Thanks! We’re confirming your reservation now — a confirmation email is on its way."
              : pending
              ? "Your payment is being processed. Your reservation will be confirmed once payment is settled."
              : "Your payment was not completed. Your held table will be released shortly if payment isn’t received."}
          </p>
          <Link href="/dashboard">
            <Button className="w-full h-12 rounded-2xl">Go to My Reservations</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentFinishPage() {
  return (
    <Suspense fallback={<div className="container py-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary" /></div>}>
      <PaymentFinish />
    </Suspense>
  );
}
