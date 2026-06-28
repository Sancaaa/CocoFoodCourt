"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(localStorage.getItem("userLoggedIn") === "true");
    };
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userLoggedIn");
    setIsLoggedIn(false);
    router.push("/");
  };

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary tracking-tight">CocoFoodCourt</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                My History
              </Link>
              <Button variant="ghost" onClick={handleLogout} className="text-sm font-medium hover:text-primary transition-colors">
                Logout
              </Button>
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Login
            </Link>
          )}

          <Link href="/book">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 shadow-sm hover:shadow-primary/20">
              Book Table
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

