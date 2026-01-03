import { ChefHat, Users, Heart, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AboutPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="mb-4 text-4xl font-bold">About Cook Smart</h1>
          <p className="text-lg text-muted-foreground">
            Empowering home cooks to create delicious meals with confidence
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12">
            <h2 className="mb-4 text-3xl font-bold">Our Mission</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Cook Smart was created to make home cooking accessible, enjoyable, and stress-free for
              everyone. We believe that cooking should be a joyful experience, not a daily chore.
              Our app combines smart meal planning, personalized recipes, and intuitive tools to
              help you cook better, save time, and reduce food waste.
            </p>
          </div>

          <div className="mb-12 grid gap-6 sm:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Our Vision</h3>
              <p className="text-muted-foreground">
                To become the world's most trusted cooking companion, helping millions of people
                discover the joy of home cooking.
              </p>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Our Values</h3>
              <p className="text-muted-foreground">
                Simplicity, quality, and community. We're committed to creating tools that make
                cooking easier while fostering a supportive community of food lovers.
              </p>
            </Card>
          </div>

          <div className="mb-12">
            <h2 className="mb-6 text-3xl font-bold">What We Offer</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ChefHat className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">Massive Recipe Database</h3>
                  <p className="text-muted-foreground">
                    Access over 1 million recipes from the world's largest recipe database! Search
                    by ingredients, dietary preferences, or browse trending recipes updated twice
                    daily.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-semibold">Beta Community</h3>
                  <p className="text-muted-foreground">
                    Join 100+ beta testers helping shape Cook Smart. Your feedback directly
                    influences features and improvements.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-linear-to-r from-blue-600 to-purple-600 p-8 text-center text-white">
            <h2 className="mb-4 text-3xl font-bold">Join Our BETA Program</h2>
            <p className="mb-2 text-lg opacity-90">
              Be part of shaping the future of Cook Smart! Join our beta testing program today.
            </p>
            <p className="mb-6 text-sm opacity-80">
              🎉 100% FREE during BETA • Early access to new features • Direct input on development
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/contact/"
                className="rounded-lg bg-white px-6 py-3 font-semibold text-blue-600 hover:bg-gray-100 transition-colors"
              >
                Apply for Beta Access
              </a>
              <a
                href="/faq/"
                className="rounded-lg border-2 border-white px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
