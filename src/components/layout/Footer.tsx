export function Footer() {
  return (
    <footer className="border-t bg-muted/50 mt-12 py-8">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CocoFoodCourt. All rights reserved.</p>
        <p className="text-sm mt-2">Powered by Odoo Next.js Integration</p>
      </div>
    </footer>
  );
}
