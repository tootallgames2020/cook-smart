'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll for sticky header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Features', href: '#features' },
    { name: 'Recipes', href: '/recipes/' },
    { name: 'About', href: '/about/' },
    { name: 'Contact', href: '/contact/' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
        isScrolled
          ? 'bg-background/95 shadow-md backdrop-blur supports-backdrop-filter:bg-background/60'
          : 'bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'
      }`}
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">CS</span>
          </div>
          <span className="text-xl font-bold">Cook Smart</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center space-x-8 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden items-center space-x-4 md:flex">
          <Button variant="outline" asChild>
            <Link href="/faq/">Learn More</Link>
          </Button>
          <Button asChild>
            <Link href="/contact/">Join Beta</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-background md:hidden">
          <div className="container mx-auto space-y-1 px-4 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="space-y-2 pt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/faq/" onClick={() => setMobileMenuOpen(false)}>
                  Learn More
                </Link>
              </Button>
              <Button className="w-full" asChild>
                <Link href="/contact/" onClick={() => setMobileMenuOpen(false)}>
                  Join Beta
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
