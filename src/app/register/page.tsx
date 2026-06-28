"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Password match check
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => {
          router.push("/login?registered=true");
        }, 1500);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (_err) {
      setError("An error occurred during registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-20 px-4 max-w-md flex flex-col items-center justify-center">
      <Card className="w-full shadow-friendly border-0 rounded-3xl">
        <CardHeader className="bg-primary/5 rounded-t-3xl pb-8 border-b border-primary/10">
          <CardTitle className="text-2xl text-primary font-bold">Create Account</CardTitle>
          <CardDescription className="text-base">Sign up to make and manage restaurant table bookings.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4 pt-8">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-xl font-medium" id="register-error">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 text-sm rounded-xl font-medium" id="register-success">
                {success}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-semibold">Full Name</Label>
              <Input id="name" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-semibold">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-semibold">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base font-semibold">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="h-12 rounded-xl" />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 rounded-b-3xl p-6 mt-4 flex flex-col gap-4">
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-lg shadow-md hover:shadow-primary/20 transition-all">
              {loading ? "Registering..." : "Register"}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Login here
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
