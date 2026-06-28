"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(localStorage.getItem("userLoggedIn") === "true");
    };
    checkLogin();
    window.addEventListener("storage", checkLogin);
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userLoggedIn");
    setIsLoggedIn(false);
    router.push("/");
  };

  return (
    <nav className={`bg-white sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-sally' : 'border-b border-muted'}`}>
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.png" alt="CocoFoodCourt Logo" width={40} height={40} className="object-contain" />
          <span className="text-2xl font-bold font-serif text-foreground tracking-tight group-hover:text-primary transition-colors">
            CocoFoodCourt
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[13px] uppercase tracking-wide font-bold hover:text-primary transition-colors">
            Home
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link href="/dashboard" className="text-[13px] uppercase tracking-wide font-bold hover:text-primary transition-colors">
                My History
              </Link>
              <button onClick={handleLogout} className="text-[13px] uppercase tracking-wide font-bold hover:text-primary transition-colors cursor-pointer bg-transparent border-0">
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="text-[13px] uppercase tracking-wide font-bold hover:text-primary transition-colors">
              Login
            </Link>
          )}

          <Link href="/book">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wide px-8 h-12 shadow-none rounded-none transition-colors">
              Reserve
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
