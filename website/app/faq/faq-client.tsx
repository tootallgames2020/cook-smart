'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronDown, Mail } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  lastUpdated: Date;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I join the Cook Smart BETA?',
    answer:
      "Cook Smart is currently in BETA testing. To join, contact us through our website contact form or email services.cooksmart@gmail.com. Once approved, you'll receive download instructions via email with access to the app through Firebase App Distribution.",
    category: 'Getting Started',
    lastUpdated: new Date('2025-11-30'),
  },
  {
    id: '2',
    question: 'Is Cook Smart free to use?',
    answer:
      'Cook Smart is currently in BETA and FREE for all beta testers! After beta, we offer flexible premium plans: Weekly ($2.99), Monthly ($6.99), or Yearly ($34.99 - save $40!). Beta testers and referrals get special pricing of $24.99/year for the first year.',
    category: 'Pricing',
    lastUpdated: new Date('2025-11-30'),
  },
  {
    id: '3',
    question: 'Can I create and share my own recipes?',
    answer:
      'Yes! All users can create and share their own recipes with the Cook Smart community. Simply tap the "Create Recipe" button in the app, add your ingredients and instructions, and publish it for others to enjoy.',
    category: 'Features',
    lastUpdated: new Date('2024-01-20'),
  },
  {
    id: '4',
    question: 'How does the meal planner work?',
    answer:
      'The meal planner lets you schedule recipes for specific days and meals. Simply browse recipes, tap "Add to Meal Plan," and select the date and meal time. The app will automatically generate a shopping list based on your planned meals.',
    category: 'Features',
    lastUpdated: new Date('2024-01-18'),
  },
  {
    id: '5',
    question: 'Can I filter recipes by dietary preferences?',
    answer:
      'Absolutely! Cook Smart supports filtering by various dietary preferences including vegetarian, vegan, gluten-free, dairy-free, keto, paleo, and more. You can set your preferences in the app settings or use filters when browsing recipes.',
    category: 'Features',
    lastUpdated: new Date('2024-01-12'),
  },
  {
    id: '6',
    question: 'How do I cancel my subscription?',
    answer:
      'You can cancel your subscription anytime through your device settings. For iOS, go to Settings > Your Name > Subscriptions. For Android, open Google Play Store > Menu > Subscriptions. Your premium features will remain active until the end of your billing period. All plans include a 7-day free trial.',
    category: 'Pricing',
    lastUpdated: new Date('2025-11-30'),
  },
  {
    id: '7',
    question: 'Is my data synced across devices?',
    answer:
      'Yes! When you create an account, all your recipes, meal plans, and shopping lists are automatically synced across all your devices. Simply log in with the same account on any device to access your data.',
    category: 'Technical Support',
    lastUpdated: new Date('2024-01-14'),
  },
  {
    id: '8',
    question: 'How do I report inappropriate content?',
    answer:
      'If you encounter inappropriate content, tap the three dots menu on any recipe or comment and select "Report." Our moderation team reviews all reports within 24 hours and takes appropriate action.',
    category: 'Technical Support',
    lastUpdated: new Date('2024-01-16'),
  },
];

const CATEGORIES = Array.from(new Set(FAQ_DATA.map((item) => item.category)));

export default function FAQClient(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    let filtered = FAQ_DATA;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  // Group FAQs by category
  const groupedFAQs = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {};
    filteredFAQs.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredFAQs]);

  const toggleItem = (id: string): void => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="mb-4 text-4xl font-bold">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about Cook Smart
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-4xl">
          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-base"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="mb-8 flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              size="sm"
            >
              All Categories
            </Button>
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Results Count */}
          {searchQuery && (
            <div className="mb-4 text-sm text-muted-foreground">
              Found {filteredFAQs.length} result{filteredFAQs.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* FAQ Items */}
          {Object.keys(groupedFAQs).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedFAQs).map(([category, items]) => (
                <div key={category}>
                  <h2 className="mb-4 text-2xl font-bold">{category}</h2>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-lg border">
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                        >
                          <span className="flex-1 pr-4 font-medium">
                            {highlightText(item.question, searchQuery)}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 shrink-0 transition-transform ${
                              expandedItems.has(item.id) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {expandedItems.has(item.id) && (
                          <div className="border-t p-4">
                            <p className="text-muted-foreground">
                              {highlightText(item.answer, searchQuery)}
                            </p>
                            <p className="mt-3 text-xs text-muted-foreground">
                              Last updated:{' '}
                              {item.lastUpdated.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed p-12 text-center">
              <div className="mb-4 text-6xl">🔍</div>
              <h3 className="mb-2 text-xl font-semibold">No results found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or browse all categories
              </p>
            </div>
          )}

          {/* Contact CTA */}
          <div className="mt-12 rounded-lg border bg-muted/50 p-8 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">Still have questions?</h3>
            <p className="mb-4 text-muted-foreground">
              Can't find what you're looking for? We're here to help!
            </p>
            <Button asChild>
              <Link href="/contact/">Contact Support</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
