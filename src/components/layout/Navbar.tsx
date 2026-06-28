"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const checkLogin = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setIsLoggedIn(true);
          setUserName(data.user.name);
          return;
        }
      }
    } catch (e) {
      console.error('Navbar session check error:', e);
    }
    // Fallback to local storage
    const localLoggedIn = localStorage.getItem("userLoggedIn") === "true";
    setIsLoggedIn(localLoggedIn);
    if (!localLoggedIn) {
      setUserName('');
    } else {
      setUserName('User');
    }
  };

  useEffect(() => {
    setTimeout(() => {
      checkLogin();
    }, 0);
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request error:', e);
    }
    localStorage.removeItem("userLoggedIn");
    setIsLoggedIn(false);
    setUserName('');
    window.dispatchEvent(new Event("storage"));
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
              {userName && (
                <span className="text-[13px] font-bold text-foreground/80" id="navbar-user-name">
                  Hi, {userName}
                </span>
              )}
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
