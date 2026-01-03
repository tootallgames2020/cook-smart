'use client';

import { Button } from './ui/button';
import { Smartphone } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 px-4 py-2 text-sm font-semibold border-2 border-green-500/30">
              <span className="text-xl">🎉</span>
              <span className="text-green-700 dark:text-green-400">FREE BETA</span>
              <span className="text-muted-foreground">- Join Early Testers!</span>
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Cook Smarter,
              <br />
              <span className="text-primary">Eat Better</span>
            </h1>

            <p className="text-lg text-muted-foreground md:text-xl">
              Plan your meals, discover delicious recipes, and master your kitchen with Cook Smart.
              Your personal cooking companion for healthier, happier meals.
            </p>

            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                <strong>🎁 Limited Time:</strong> Get full access FREE during our BETA phase! Help
                us improve and enjoy premium features at no cost.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg">🍳</span>
                </div>
                <div>
                  <h3 className="font-semibold">Smart Meal Planning</h3>
                  <p className="text-sm text-muted-foreground">Plan your week in minutes</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg">📱</span>
                </div>
                <div>
                  <h3 className="font-semibold">Recipe Discovery</h3>
                  <p className="text-sm text-muted-foreground">Thousands of tested recipes</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg">🛒</span>
                </div>
                <div>
                  <h3 className="font-semibold">Auto Shopping Lists</h3>
                  <p className="text-sm text-muted-foreground">Never forget an ingredient</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg">💪</span>
                </div>
                <div>
                  <h3 className="font-semibold">Nutrition Tracking</h3>
                  <p className="text-sm text-muted-foreground">Stay on top of your goals</p>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button size="lg" className="gap-2" asChild>
                <Link href="/contact/">
                  <Smartphone className="h-5 w-5" />
                  Join Beta Program
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link href="/faq/">Learn More</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              🎯 Currently in BETA testing. Download links sent to approved beta testers via email.
            </p>

            {/* Social Proof */}
            <div className="flex items-center gap-8 pt-4">
              <div>
                <div className="text-2xl font-bold">100+</div>
                <div className="text-sm text-muted-foreground">Beta Testers</div>
              </div>
              <div>
                <div className="text-2xl font-bold">1M+</div>
                <div className="text-sm text-muted-foreground">Recipes</div>
              </div>
              <div>
                <div className="text-2xl font-bold">🎉 BETA</div>
                <div className="text-sm text-muted-foreground">Join Now</div>
              </div>
            </div>
          </div>

          {/* Right Column - App Preview */}
          <div className="relative">
            <div className="relative mx-auto max-w-md">
              {/* Phone Frame Mockup */}
              <div className="relative rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 p-8 shadow-2xl">
                <div className="aspect-[9/19] overflow-hidden rounded-2xl bg-white shadow-xl">
                  {/* Actual App Screenshot */}
                  <img
                    src="/images/app-screenshot-home.png"
                    alt="Cook Smart App - Home Screen showing Quick Actions including My Ingredients, Find Recipes, Trending, Seasonal, Community, and Send Feedback"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -right-4 top-1/4 rounded-lg bg-white p-4 shadow-lg">
                <div className="text-2xl">🥗</div>
              </div>
              <div className="absolute -left-4 top-1/2 rounded-lg bg-white p-4 shadow-lg">
                <div className="text-2xl">🍕</div>
              </div>
              <div className="absolute -right-4 bottom-1/4 rounded-lg bg-white p-4 shadow-lg">
                <div className="text-2xl">🍜</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-1/4 bottom-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </section>
  );
}
