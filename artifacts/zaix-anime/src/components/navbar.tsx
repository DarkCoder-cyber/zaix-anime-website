import { Link, useLocation } from "wouter";
import { Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/categories", label: "Categories" },
    { href: "/trending", label: "Trending" },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        isScrolled
          ? "bg-black/80 backdrop-blur-md border-primary/50 shadow-neon"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold font-heading text-primary text-shadow-neon tracking-wider" data-testid="link-home-logo">
            ZAIX
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary relative group ${
                  location === link.href ? "text-primary" : "text-foreground/80"
                }`}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full shadow-neon"></span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-primary hover:bg-primary/10" data-testid="button-search">
            <Search className="h-5 w-5" />
          </Button>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="hover:text-primary hover:bg-primary/10" data-testid="button-login">
              Login
            </Button>
            <Button className="bg-primary text-black hover:bg-primary/90 shadow-neon" data-testid="button-signup">
              Sign Up
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:text-primary" data-testid="button-mobile-menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-card/95 backdrop-blur-xl border-primary/20">
              <nav className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium hover:text-primary transition-colors"
                    data-testid={`link-mobile-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-border my-4" />
                <Button variant="outline" className="w-full justify-start" data-testid="button-mobile-login">
                  Login
                </Button>
                <Button className="w-full bg-primary text-black shadow-neon justify-start" data-testid="button-mobile-signup">
                  Sign Up
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
