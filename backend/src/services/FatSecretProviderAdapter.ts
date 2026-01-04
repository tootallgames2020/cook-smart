/**
 * FatSecret Provider Adapter - WITH INGREDIENT MATCHING
 *
 * Simple adapter that uses FatSecret's ingredient filtering.
 * Now includes ingredient matching calculations for user ingredients.
 */

import {
  IRecipeProvider,
  Recipe,
  RecipeDetails,
} from '../interfaces/IRecipeProvider';
import FatSecretService from './FatSecretService';
import {RecipeMatchingService} from './RecipeMatchingService';

class FatSecretProviderAdapter implements IRecipeProvider {
  private service = new FatSecretService();

  private getValidImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl || imageUrl.trim() === '') {
      return '';
    }

    try {
      new URL(imageUrl);
      return imageUrl;
    } catch {
      console.log('[FatSecretAdapter] Invalid image URL:', imageUrl);
      return '';
    }
  }

  private extractIngredientsFromRecipe(recipe: any): string[] {
    const ingredients: string[] = [];

    // FatSecret search results may include ingredients in different formats
    if (recipe.ingredients?.ingredient) {
      const ingredientList = Array.isArray(recipe.ingredients.ingredient)
        ? recipe.ingredients.ingredient
        : [recipe.ingredients.ingredient];

      for (const ing of ingredientList) {
        let description = ing.ingredient_description || ing.food_name || '';
        let amount = ing.number_of_units || '';
        let unit = ing.measurement_description || '';

        // Convert metric units to US units
        const convertedUnit = this.convertToUSUnits(amount, unit);
        if (convertedUnit) {
          amount = convertedUnit.amount;
          unit = convertedUnit.unit;
          description = this.removeMetricFromDescription(description);
        }

        const ingredientText = `${amount} ${unit} ${description}`.trim();
        if (ingredientText.length > 0) {
          ingredients.push(ingredientText);
        }
      }
    }

    // If no detailed ingredients, try to extract from recipe description or other fields
    if (ingredients.length === 0 && recipe.recipe_description) {
      // Sometimes FatSecret includes basic ingredient info in description
      // This is a fallback for search results that don't have detailed ingredient data
      console.log(
        `[FatSecretAdapter] No detailed ingredients for ${recipe.recipe_name}, using fallback`,
      );
    }

    return ingredients;
  }

  private convertToUSUnits(
    amount: string,
    unit: string,
  ): {amount: string; unit: string} | null {
    if (!amount || !unit) return null;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return null;

    const unitLower = unit.toLowerCase().trim();

    // Metric to US conversions
    const conversions: {[key: string]: {factor: number; newUnit: string}} = {
      // Weight conversions
      gram: {factor: 0.035274, newUnit: 'oz'},
      grams: {factor: 0.035274, newUnit: 'oz'},
      g: {factor: 0.035274, newUnit: 'oz'},
      kilogram: {factor: 2.20462, newUnit: 'lb'},
      kilograms: {factor: 2.20462, newUnit: 'lb'},
      kg: {factor: 2.20462, newUnit: 'lb'},

      // Volume conversions
      milliliter: {factor: 0.202884, newUnit: 'tsp'}, // ml to tsp (more useful for cooking)
      milliliters: {factor: 0.202884, newUnit: 'tsp'},
      ml: {factor: 0.202884, newUnit: 'tsp'},
      liter: {factor: 4.22675, newUnit: 'cup'}, // liters to cups
      liters: {factor: 4.22675, newUnit: 'cup'},
      l: {factor: 4.22675, newUnit: 'cup'},

      // Common cooking conversions
      centiliter: {factor: 0.67628, newUnit: 'tbsp'}, // cl to tbsp
      centiliters: {factor: 0.67628, newUnit: 'tbsp'},
      cl: {factor: 0.67628, newUnit: 'tbsp'},
    };

    const conversion = conversions[unitLower];
    if (conversion) {
      const convertedAmount = numAmount * conversion.factor;

      // Round to reasonable precision
      let roundedAmount: string;
      if (convertedAmount < 1) {
        roundedAmount = convertedAmount.toFixed(2);
      } else if (convertedAmount < 10) {
        roundedAmount = convertedAmount.toFixed(1);
      } else {
        roundedAmount = Math.round(convertedAmount).toString();
      }

      // Convert decimal amounts to fractions for common cooking measurements
      if (
        conversion.newUnit === 'cup' ||
        conversion.newUnit === 'tbsp' ||
        conversion.newUnit === 'tsp'
      ) {
        const fractionAmount = this.convertToFraction(
          parseFloat(roundedAmount),
        );
        if (fractionAmount) {
          roundedAmount = fractionAmount;
        }
      }

      return {
        amount: roundedAmount,
        unit: conversion.newUnit,
      };
    }

    return null;
  }

  private convertToFraction(decimal: number): string | null {
    // Common cooking fractions
    const fractions = [
      {decimal: 0.125, fraction: '1/8'},
      {decimal: 0.25, fraction: '1/4'},
      {decimal: 0.33, fraction: '1/3'},
      {decimal: 0.5, fraction: '1/2'},
      {decimal: 0.67, fraction: '2/3'},
      {decimal: 0.75, fraction: '3/4'},
    ];

    const wholePart = Math.floor(decimal);
    const fractionalPart = decimal - wholePart;

    // Find closest fraction
    for (const frac of fractions) {
      if (Math.abs(fractionalPart - frac.decimal) < 0.05) {
        if (wholePart > 0) {
          return `${wholePart} ${frac.fraction}`;
        } else {
          return frac.fraction;
        }
      }
    }

    return null;
  }

  private removeMetricFromDescription(description: string): string {
    if (!description) return description;

    // Remove metric measurements from description to avoid duplication
    // Pattern: number + metric unit
    const metricPattern =
      /\b\d+(?:\.\d+)?\s*(g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|cl|centiliters?)\b/gi;

    return description
      .replace(metricPattern, '') // Remove metric measurements
      .replace(/\s+/g, ' ') // Clean up extra spaces
      .trim();
  }

  async searchByIngredients(
    ingredients: string[],
    limit: number = 10,
    options?: {maxCalories?: number; mealType?: string; userId?: string},
  ): Promise<Recipe[]> {
    try {
      console.log('[FatSecretAdapter] Searching by ingredients:', {
        ingredients: ingredients.slice(0, 5),
        limit,
        options,
      });

      // When meal type is specified, use broad search
      if (options && options.mealType) {
        const mealTypeKeywords: {[key: string]: string} = {
          'Breakfast and Brunch': 'breakfast',
          'Main Dishes': 'dinner',
          'Appetizers and Snacks': 'snack appetizer',
        };

        const searchKeyword = mealTypeKeywords[options.mealType] || 'recipe';
        const searchOptions: any = {
          query: searchKeyword,
          maxResults: limit,
        };

        if (options.maxCalories) {
          searchOptions.maxCalories = options.maxCalories;
        }

        const recipes = await this.service.searchRecipesByIngredients([searchKeyword], limit);
        return this.formatRecipes(recipes.slice(0, limit));
      }

      // For ingredient-based search, let FatSecret do the filtering
      const searchIngredients = ingredients.slice(0, 6).join(',');
      const searchOptions: any = {
        mustIncludeIngredients: searchIngredients,
        maxResults: limit,
      };

      if (options?.maxCalories) {
        searchOptions.maxCalories = options.maxCalories;
      }

      console.log(
        '[FatSecretAdapter] Using FatSecret ingredient search:',
        searchIngredients,
      );

      const recipes = await this.service.searchRecipesByIngredients(
        ingredients.slice(0, 6),
        limit
      );
      console.log(
        `[FatSecretAdapter] FatSecret returned ${recipes.length} recipes`,
      );

      if (recipes.length === 0) {
        // Try with fewer ingredients if no results
        const fallbackOptions: any = {
          mustIncludeIngredients: ingredients.slice(0, 3).join(','),
          maxResults: limit,
        };
        if (options?.maxCalories) {
          fallbackOptions.maxCalories = options.maxCalories;
        }

        const fallbackRecipes = await this.service.searchRecipesByIngredients(
          ingredients.slice(0, 3),
          limit
        );
        console.log(
          `[FatSecretAdapter] Fallback search returned ${fallbackRecipes.length} recipes`,
        );

        const formattedFallbackRecipes = this.formatRecipes(
          fallbackRecipes.slice(0, limit),
        );

        // Add ingredient matching data for fallback recipes too
        if (ingredients && ingredients.length > 0) {
          console.log(
            '[FatSecretAdapter] Adding ingredient matching data to fallback recipes...',
          );
          return await RecipeMatchingService.formatRecipesWithMatching(
            formattedFallbackRecipes,
            ingredients,
          );
        }

        return formattedFallbackRecipes;
      }

      const formattedRecipes = this.formatRecipes(recipes.slice(0, limit));

      // Add ingredient matching data if user ingredients provided
      if (ingredients && ingredients.length > 0) {
        console.log('[FatSecretAdapter] Adding ingredient matching data...');
        return await RecipeMatchingService.formatRecipesWithMatching(
          formattedRecipes,
          ingredients,
        );
      }

      return formattedRecipes;
    } catch (error: any) {
      console.error('[FatSecretAdapter] Search error:', error);
      return [];
    }
  }

  public formatRecipes(recipes: any[]): Recipe[] {
    console.log(
      `[FatSecretAdapter] DEPLOYMENT TEST v4 - Formatting ${recipes.length} recipes`,
    );

    return recipes.map(
      (recipe: any): Recipe => ({
        id: recipe.recipe_id,
        title: recipe.recipe_name,
        image: this.getValidImageUrl(recipe.recipe_image),
        servings: parseInt(recipe.number_of_servings) || 4,
        readyInMinutes: parseInt(recipe.cooking_time_min) || 30,
        sourceUrl: `https://www.fatsecret.com/recipes/${recipe.recipe_id}`,
        summary: recipe.recipe_description || '',
        ingredients: this.extractIngredientsFromRecipe(recipe),
        instructions: '',
        cuisines: [],
        dishTypes: [recipe.recipe_types || 'main course'],
        diets: [],
        provider: 'fatsecret-v4-ingredients',
        // Add FatSecret nutrition data
        calories: recipe.calories ? parseInt(recipe.calories) : undefined,
        protein: recipe.protein ? parseFloat(recipe.protein) : undefined,
        carbs: recipe.carbohydrate
          ? parseFloat(recipe.carbohydrate)
          : undefined,
        fat: recipe.fat ? parseFloat(recipe.fat) : undefined,
        likes: 0,
      }),
    );
  }

  async getRecipeDetails(recipeId: string): Promise<RecipeDetails | null> {
    try {
      const cleanId = recipeId.replace(/^fatsecret_/, '');
      console.log('[FatSecretAdapter] Getting recipe details:', cleanId);

      const recipe = await this.service.getRecipeDetails(cleanId);

      if (!recipe) {
        console.log('[FatSecretAdapter] No recipe returned from FatSecret');
        return null;
      }

      // Parse ingredients as strings with US unit conversion
      const ingredients: string[] = [];
      if (recipe.ingredients?.ingredient) {
        const ingredientList = Array.isArray(recipe.ingredients.ingredient)
          ? recipe.ingredients.ingredient
          : [recipe.ingredients.ingredient];

        for (const ing of ingredientList) {
          let description = ing.ingredient_description || ing.food_name || '';
          let amount = ing.number_of_units || '';
          let unit = ing.measurement_description || '';

          // Convert metric units to US units and clean up the description
          const convertedUnit = this.convertToUSUnits(amount, unit);
          if (convertedUnit) {
            amount = convertedUnit.amount;
            unit = convertedUnit.unit;

            // Clean metric units from description to avoid duplication
            description = this.removeMetricFromDescription(description);
          }

          ingredients.push(`${amount} ${unit} ${description}`.trim());
        }
      }

      // Parse instructions
      let instructions = '';
      if (recipe.directions?.direction) {
        const directionList = Array.isArray(recipe.directions.direction)
          ? recipe.directions.direction
          : [recipe.directions.direction];

        instructions = directionList
          .map(
            (d: any, index: number) =>
              `${index + 1}. ${d.direction_description || d}`,
          )
          .join('\n');
      }

      // 🖼️ IMAGE PRESERVATION: FatSecret detail API often doesn't include images
      // Try to get image from the recipe data, with fallback logic
      let imageUrl = this.getValidImageUrl(recipe.recipe_image);

      // If no image in details, try to construct one from recipe ID
      if (!imageUrl && recipe.recipe_id) {
        // FatSecret images often follow a pattern, try common formats
        const possibleImageUrls = [
          `https://m.ftscrt.com/static/recipe/${recipe.recipe_id}.jpg`,
          `https://m.ftscrt.com/static/recipe/${recipe.recipe_id}.png`,
          `https://images.fatsecret.com/recipe/${recipe.recipe_id}.jpg`,
        ];

        // Use the first format as fallback (most common)
        imageUrl = possibleImageUrls[0];
        console.log(
          `📷 Using fallback image URL for recipe ${recipe.recipe_id}: ${imageUrl}`,
        );
      }

      return {
        id: recipe.recipe_id,
        title: recipe.recipe_name,
        image: imageUrl,
        servings: parseInt(recipe.number_of_servings) || 4,
        readyInMinutes: parseInt(recipe.cooking_time_min) || 30,
        sourceUrl: `https://www.fatsecret.com/recipes/${recipe.recipe_id}`,
        summary: recipe.recipe_description || '',
        instructions,
        ingredients,
        cuisines: [],
        dishTypes: [recipe.recipe_types || 'main course'],
        diets: [],
        provider: 'fatsecret',
        calories: recipe.calories ? parseInt(recipe.calories) : undefined,
        protein: recipe.protein ? parseFloat(recipe.protein) : undefined,
        carbs: recipe.carbohydrate
          ? parseFloat(recipe.carbohydrate)
          : undefined,
        fat: recipe.fat ? parseFloat(recipe.fat) : undefined,
        fiber: recipe.fiber ? parseFloat(recipe.fiber) : undefined,
        sugar: recipe.sugar ? parseFloat(recipe.sugar) : undefined,
        sodium: recipe.sodium ? parseFloat(recipe.sodium) : undefined,
        saturatedFat: recipe.saturated_fat
          ? parseFloat(recipe.saturated_fat)
          : undefined,
        cholesterol: recipe.cholesterol
          ? parseFloat(recipe.cholesterol)
          : undefined,
      };
    } catch (error) {
      console.error('[FatSecretAdapter] Get details error:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const recipes = await this.service.searchRecipesByIngredients(['chicken'], 1);
      return recipes.length > 0;
    } catch (error) {
      console.error('[FatSecretAdapter] Availability check failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'FatSecret';
  }
}

export default new FatSecretProviderAdapter();
