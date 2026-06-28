"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

function PaymentSimulator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('order_id');
  
  const [status, setStatus] = useState<"pending" | "processing" | "success">("pending");

  const handlePay = async () => {
    setStatus("processing");
    
    // Simulate PG webhook delay
    setTimeout(async () => {
      try {
        const res = await fetch("/api/webhooks/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: orderId,
            transaction_status: "settlement",
            transaction_id: "MOCK-TXN-" + Math.floor(Math.random() * 10000)
          })
        });
        
        if (res.ok) {
          setStatus("success");
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        }
      } catch (e) {
        console.error(e);
        setStatus("pending");
      }
    }, 1500);
  };

  if (!orderId) return <div>Invalid payment link</div>;

  return (
    <div className="container mx-auto py-20 px-4 max-w-md flex flex-col items-center justify-center">
      <Card className="w-full text-center shadow-2xl shadow-primary/10 border-primary/20 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Payment Simulator</CardTitle>
          <CardDescription>Order ID: {orderId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "pending" && (
            <>
              <p className="text-muted-foreground">Click below to simulate a successful payment from your bank or e-wallet.</p>
              <Button onClick={handlePay} size="lg" className="w-full h-14 text-lg rounded-2xl shadow-lg hover:-translate-y-1 hover:shadow-primary/25 transition-all">
                Pay Now
              </Button>
            </>
          )}
          
          {status === "processing" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Processing your payment...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-xl font-bold text-green-700">Payment Successful!</p>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentMock() {
  return (
    <Suspense fallback={<div className="container py-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8 text-primary"/></div>}>
      <PaymentSimulator />
    </Suspense>
  );
}
