import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Navbar() {
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
          <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
            My History
          </Link>
          <Link href="/book">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Book Table
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
