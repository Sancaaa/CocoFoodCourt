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

  // The httpOnly `session` cookie (via /api/auth/session) is the single
  // source of truth for auth state — no localStorage fallback.
  const checkLogin = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setIsLoggedIn(true);
          return;
        }
      }
    } catch (e) {
      console.error('Navbar session check error:', e);
    }
    setIsLoggedIn(false);
  };

  useEffect(() => {
    // Deferred so the async session check doesn't setState within the effect body.
    setTimeout(() => { checkLogin(); }, 0);
    // Login/logout dispatch "auth-change" so the navbar refreshes immediately.
    window.addEventListener("auth-change", checkLogin);

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("auth-change", checkLogin);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request error:', e);
    }
    setIsLoggedIn(false);
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
  };

  return (
    <nav className={`bg-white sticky top-0 z-50 transition-shadow duration-300 ${scrolled ? 'shadow-sally' : 'border-b border-muted'}`}>
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Image src="/logo.svg" alt="CocoFoodCourt Logo" width={44} height={44} className="object-contain" style={{ width: "44px", height: "auto" }} />
          <span className="text-2xl font-bold font-serif text-foreground tracking-tight group-hover:text-primary transition-colors">
            CocoFoodCourt
          </span>
        </Link>
        <div className="flex items-center gap-6">
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
