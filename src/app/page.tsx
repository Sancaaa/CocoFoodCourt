import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Utensils } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center bg-background min-h-screen">
      {/* Hero Section */}
      <section className="w-full relative bg-[#F5F3F2] flex flex-col items-center overflow-hidden">
        <div className="container mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col items-start space-y-6">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground leading-tight">
              Savor the Moment at <br />
              <span className="text-primary italic">Coco Foodcourt</span>
            </h1>
            <p className="text-lg text-foreground/80 max-w-lg leading-relaxed">
              Reserve your table and pre-order your favorite meals. Skip the
              line, enjoy the dine in a warm, welcoming atmosphere.
            </p>
            <div className="flex gap-4 pt-4">
              <Link href="/book">
                <Button
                  size="lg"
                  className="h-14 px-8 text-sm font-bold uppercase tracking-widest rounded-none shadow-none hover:bg-primary/90 transition-colors"
                >
                  Reserve a Table
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative h-[500px] w-full hidden md:block">
            <Image
              src="/hero.png"
              alt="Food Court Ambience"
              fill
              className="object-cover rounded-none"
              priority
            />
          </div>
        </div>
      </section>

      {/* Intro / Featured Section */}
      <section className="w-full py-20 flex justify-center bg-white">
        <div className="container mx-auto px-4 max-w-5xl text-center space-y-16">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-primary">
              How It Works
            </h2>
            <h3 className="text-3xl font-serif font-bold">
              A Better Way to Dine
            </h3>
            <p className="text-foreground/70 text-lg leading-relaxed">
              We’ve designed our process to be as seamless and friendly as
              possible. No more waiting in long queues—just great food and great
              times.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {/* Card 1 */}
            <div className="bg-[#F5F3F2] p-8 flex flex-col group hover:bg-primary/5 transition-colors duration-300">
              <Clock className="h-8 w-8 text-primary mb-6" />
              <h4 className="text-xl font-bold mb-3 font-serif group-hover:text-primary transition-colors">
                1. Pick a Time
              </h4>
              <p className="text-foreground/70 leading-relaxed">
                Choose your ideal dining slot. Our system ensures you never
                arrive to a full house.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-[#F5F3F2] p-8 flex flex-col group hover:bg-primary/5 transition-colors duration-300">
              <CheckCircle2 className="h-8 w-8 text-primary mb-6" />
              <h4 className="text-xl font-bold mb-3 font-serif group-hover:text-primary transition-colors">
                2. Reserve a Table
              </h4>
              <p className="text-foreground/70 leading-relaxed">
                Select your preferred seating area. Whether it&apos;s a cozy
                corner or a large family table, it&apos;s yours.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-[#F5F3F2] p-8 flex flex-col group hover:bg-primary/5 transition-colors duration-300">
              <Utensils className="h-8 w-8 text-primary mb-6" />
              <h4 className="text-xl font-bold mb-3 font-serif group-hover:text-primary transition-colors">
                3. Pre-Order (Optional)
              </h4>
              <p className="text-foreground/70 leading-relaxed">
                Browse our tenant menus and order ahead. Your food will be
                prepared fresh just as you arrive.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
