import React from 'react';
import { Search, Filter, Clock, Users, ChefHat, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Sample recipes for static display
const sampleRecipes = [
  {
    id: 1,
    title: "Classic Spaghetti Carbonara",
    description: "Creamy Italian pasta dish with eggs, cheese, and pancetta",
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=400&fit=crop",
    cookingTime: 20,
    servings: 4,
    difficulty: "medium",
    calories: 520,
    protein: 22,
    carbs: 45,
    fat: 28,
    featured: true
  },
  {
    id: 2,
    title: "Grilled Chicken Salad",
    description: "Fresh mixed greens with grilled chicken and balsamic dressing",
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop",
    cookingTime: 15,
    servings: 2,
    difficulty: "easy",
    calories: 320,
    protein: 35,
    carbs: 12,
    fat: 15,
    featured: false
  },
  {
    id: 3,
    title: "Vegetarian Buddha Bowl",
    description: "Nutritious bowl with quinoa, roasted vegetables, and tahini dressing",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop",
    cookingTime: 30,
    servings: 2,
    difficulty: "easy",
    calories: 420,
    protein: 18,
    carbs: 52,
    fat: 16,
    featured: true
  },
  {
    id: 4,
    title: "Beef Stir Fry",
    description: "Quick and flavorful stir fry with tender beef and crisp vegetables",
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=400&fit=crop",
    cookingTime: 25,
    servings: 4,
    difficulty: "medium",
    calories: 380,
    protein: 28,
    carbs: 20,
    fat: 22,
    featured: false
  },
  {
    id: 5,
    title: "Chocolate Chip Cookies",
    description: "Classic homemade cookies with gooey chocolate chips",
    imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop",
    cookingTime: 45,
    servings: 24,
    difficulty: "easy",
    calories: 180,
    protein: 3,
    carbs: 24,
    fat: 9,
    featured: false
  },
  {
    id: 6,
    title: "Salmon with Lemon Herbs",
    description: "Pan-seared salmon with fresh herbs and lemon butter sauce",
    imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=400&fit=crop",
    cookingTime: 20,
    servings: 2,
    difficulty: "medium",
    calories: 450,
    protein: 42,
    carbs: 5,
    fat: 28,
    featured: true
  }
];

export default function RecipesPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-4xl font-bold">Recipe Collection</h1>
            <p className="text-xl text-muted-foreground">
              Discover delicious recipes powered by FatSecret. Browse our curated collection 
              from over 1 million recipes available in our mobile app.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters Info */}
        <div className="mb-8 space-y-6">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Full Recipe Search Available in Mobile App
                </h3>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  Search through over 1 million recipes, filter by dietary preferences, ingredients, 
                  cooking time, and more. Get personalized recommendations and save your favorites.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" asChild>
                    <Link href="/contact/">Download App</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/about/">Learn More</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Recipes */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Featured Recipes</h2>
          <p className="text-muted-foreground mb-6">
            Here's a taste of what you'll find in our mobile app
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sampleRecipes.map((recipe) => (
            <Card key={recipe.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                />
                {recipe.featured && (
                  <Badge className="absolute top-2 left-2" variant="secondary">
                    Featured
                  </Badge>
                )}
                {recipe.calories && (
                  <Badge className="absolute top-2 right-2" variant="outline">
                    {recipe.calories} cal
                  </Badge>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="mb-2 font-semibold line-clamp-2">
                  {recipe.title}
                </h3>
                
                <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                  {recipe.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{recipe.cookingTime}m</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{recipe.servings}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <span className="capitalize">{recipe.difficulty}</span>
                  </div>
                </div>

                {/* Nutrition info */}
                {(recipe.protein || recipe.carbs || recipe.fat) && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {recipe.protein && <span>Protein: {recipe.protein}g</span>}
                      {recipe.carbs && <span>Carbs: {recipe.carbs}g</span>}
                      {recipe.fat && <span>Fat: {recipe.fat}g</span>}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Download CTA */}
        <div className="mt-16 rounded-lg bg-primary p-8 text-center text-primary-foreground">
          <ChefHat className="mx-auto mb-4 h-16 w-16 opacity-90" />
          <h2 className="mb-2 text-2xl font-bold">Get the Full Recipe Experience</h2>
          <p className="mb-6 text-lg opacity-90">
            Download our mobile app for the complete recipe database, personalized meal planning, 
            shopping lists, and more!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/contact/">Join Beta Program</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/about/">Learn More</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}