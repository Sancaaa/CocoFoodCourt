"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Simulate successful login localState too
        localStorage.setItem("userLoggedIn", "true");
        // Trigger storage event so other components (Navbar) update immediately
        window.dispatchEvent(new Event("storage")); 
        router.push("/dashboard");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (_err) {
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
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
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl font-medium" id="login-error">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-semibold">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-semibold">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl" />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 rounded-b-3xl p-6 mt-4 flex flex-col gap-4">
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-lg shadow-md hover:shadow-primary/20 transition-all">
              {loading ? "Logging in..." : "Login"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Register here
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
