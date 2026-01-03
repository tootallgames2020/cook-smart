import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContactPage(): React.ReactElement {

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="mb-4 text-4xl font-bold">Contact Us</h1>
          <p className="text-lg text-muted-foreground">
            Have a question or feedback? We'd love to hear from you!
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2">
          {/* Contact Form */}
          <div>
            <h2 className="mb-6 text-2xl font-bold">Send us a message</h2>
            <form action="https://api.cooksmartapp.com/contact" method="POST" className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-1">Subject *</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="What is this about?"
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-1">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Tell us more..."
                  required
                  rows={6}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
              >
                <Mail className="h-4 w-4" />
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="mb-6 text-2xl font-bold">Other ways to reach us</h2>
            <div className="space-y-6">
              {/* Discord Community */}
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                  <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Join Our Community</h3>
                  <p className="text-sm text-muted-foreground">
                    <a
                      href="https://discord.gg/btemMmWy2e"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      Discord Community
                    </a>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chat with other users, share recipes, and get instant help
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">Email</h3>
                  <p className="text-sm text-muted-foreground">
                    <a
                      href="mailto:services.cooksmart@gmail.com"
                      className="hover:text-primary hover:underline"
                    >
                      services.cooksmart@gmail.com
                    </a>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We typically respond within 24-48 hours
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="mt-8 rounded-lg border bg-muted/50 p-6">
              <h3 className="mb-2 font-semibold">Looking for quick answers?</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Check out our FAQ page for answers to common questions.
              </p>
              <Button variant="outline" asChild>
                <a href="/faq/">Visit FAQ</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
