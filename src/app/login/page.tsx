"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Simulate successful login
      localStorage.setItem("userLoggedIn", "true");
      // Trigger storage event so other components (Navbar) update immediately
      window.dispatchEvent(new Event("storage")); 
      router.push("/dashboard");
    }
  };

  return (
    <div className="container mx-auto py-20 px-4 max-w-md flex flex-col items-center justify-center">
      <Card className="w-full shadow-friendly border-0 rounded-3xl">
        <CardHeader className="bg-primary/5 rounded-t-3xl pb-8 border-b border-primary/10">
          <CardTitle className="text-2xl text-primary font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-base">Log in to view your reservation history.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 pt-8">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-semibold">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-semibold">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl" />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 rounded-b-3xl p-6 mt-4">
            <Button type="submit" className="w-full h-12 rounded-xl text-lg shadow-md hover:shadow-primary/20 transition-all">
              Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
