import Link from 'next/link';
import { Clock, Users, Heart } from 'lucide-react';
import { Card, CardContent, CardFooter } from './ui/card';
import { Recipe } from '@/lib/api/recipes';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        {/* Recipe Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <span className="text-6xl">🍽️</span>
            </div>
          )}
          {recipe.featured && (
            <div className="absolute right-2 top-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Featured
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Recipe Title */}
          <h3 className="mb-2 line-clamp-2 text-lg font-semibold group-hover:text-primary">
            {recipe.title}
          </h3>

          {/* Recipe Description */}
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
            {recipe.description}
          </p>

          {/* Recipe Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{recipe.cookingTime} min</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{recipe.servings} servings</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t p-4">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {recipe.provider === 'fatsecret' ? (
                <span className="text-xs text-muted-foreground">FatSecret</span>
              ) : (
                <span className="text-xs text-muted-foreground">Cook Smart</span>
              )}
            </div>
            <button
              className="text-muted-foreground hover:text-red-500 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Implement favorite functionality
              }}
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
