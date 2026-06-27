import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Utensils } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full relative bg-muted py-24 md:py-32 overflow-hidden flex justify-center items-center">
        <div className="absolute inset-0 bg-primary/5 pattern-dots pointer-events-none"></div>
        <div className="container px-4 md:px-6 relative z-10 flex flex-col items-center text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">
            Savor the Moment at <span className="text-primary">CocoFoodCourt</span>
          </h1>
          <p className="max-w-[600px] text-lg text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Reserve your table and pre-order your favorite meals. Skip the line, enjoy the dine.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/book">
              <Button size="lg" className="h-12 px-8 text-base font-medium shadow-xl hover:shadow-primary/25 transition-all">
                Book a Table Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 bg-background flex justify-center">
        <div className="container px-4 md:px-6">
          <div className="grid gap-12 sm:grid-cols-3">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Easy Reservations</h3>
              <p className="text-muted-foreground">Pick your date and time to secure your spot effortlessly.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">No Waiting</h3>
              <p className="text-muted-foreground">Your table is ready when you arrive. Maximize your break.</p>
            </div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <Utensils className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold">Pre-Order Food</h3>
              <p className="text-muted-foreground">Order ahead from our diverse tenants. Fresh and hot upon arrival.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
