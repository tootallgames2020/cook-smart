import {API_BASE_URL, getAuthHeader} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserRecipeIngredient {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface UserRecipe {
  id: number;
  userId: string;
  title: string;
  description?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl?: string;
  isPublic: boolean;
  views: number;
  favorites: number;
  dateCreated: Date;
  dateUpdated: Date;
}

export interface UserRecipeWithDetails extends UserRecipe {
  ingredients: Array<{
    id: number;
    name: string;
    quantity?: string;
    unit?: string;
    sortOrder: number;
  }>;
  instructions: Array<{
    id: number;
    stepNumber: number;
    instruction: string;
  }>;
}

export interface CreateRecipeData {
  title: string;
  description?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl?: string;
  isPublic?: boolean;
  ingredients: UserRecipeIngredient[];
  instructions: string[];
}

/**
 * Create a new user-generated recipe
 * Allows users to share their own recipes with the community
 * 
 * @param data - The recipe data to create
 * @param data.title - Recipe title
 * @param data.description - Recipe description (optional)
 * @param data.prepTime - Preparation time in minutes
 * @param data.cookTime - Cooking time in minutes
 * @param data.servings - Number of servings
 * @param data.category - Recipe category (optional)
 * @param data.difficulty - Difficulty level ('easy' | 'medium' | 'hard')
 * @param data.imageUrl - URL of recipe image (optional)
 * @param data.isPublic - Whether recipe is public (optional, default: false)
 * @param data.ingredients - Array of ingredients with quantities
 * @param data.instructions - Array of instruction steps
 * @returns Promise<UserRecipe> - The created recipe
 * @throws Error if not authenticated or creation fails
 * 
 * @example
 * ```typescript
 * const recipe = await createUserRecipe({
 *   title: 'My Famous Pasta',
 *   description: 'A family favorite',
 *   prepTime: 15,
 *   cookTime: 20,
 *   servings: 4,
 *   difficulty: 'easy',
 *   isPublic: true,
 *   ingredients: [
 *     { name: 'Pasta', quantity: '1', unit: 'lb' },
 *     { name: 'Tomato Sauce', quantity: '2', unit: 'cups' }
 *   ],
 *   instructions: [
 *     'Boil water and cook pasta',
 *     'Heat sauce in pan',
 *     'Combine and serve'
 *   ]
 * });
 * ```
 */
export const createUserRecipe = async (data: CreateRecipeData): Promise<UserRecipe> => {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/api/v1/user-recipes`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to create recipe');
  return response.json();
};

/**
 * Upload a photo for a recipe or other entity
 * Handles image upload to the server and returns the photo URL
 * 
 * @param photo - Base64 encoded photo data
 * @param entityType - Type of entity ('recipe', 'ingredient', etc.)
 * @param entityId - ID of the entity (optional, for existing entities)
 * @returns Promise<string> - URL of the uploaded photo
 * @throws Error if not authenticated or upload fails
 * 
 * @example
 * ```typescript
 * const photoUrl = await uploadPhoto(
 *   base64ImageData,
 *   'recipe',
 *   12345
 * );
 * console.log('Photo uploaded:', photoUrl);
 * ```
 */
export const uploadPhoto = async (
  photo: string,
  entityType: string,
  entityId?: number,
) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/api/v1/photos/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({photo, entityType, entityId}),
  });

  if (!response.ok) throw new Error('Failed to upload photo');
  const data = await response.json();
  return data.photoUrl;
};

/**
 * Get all recipes created by the current user
 * Returns both public and private recipes
 * 
 * @returns Promise<UserRecipe[]> - Array of user's recipes
 * @throws Error if not authenticated or request fails
 * 
 * @example
 * ```typescript
 * const myRecipes = await getUserRecipes();
 * console.log(`You have created ${myRecipes.length} recipes`);
 * myRecipes.forEach(recipe => {
 *   console.log(`${recipe.title} - ${recipe.views} views`);
 * });
 * ```
 */
export const getUserRecipes = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(
    `${API_BASE_URL}/api/v1/user-recipes/my-recipes`,
    {
      headers: getAuthHeader(token),
    },
  );

  if (!response.ok) throw new Error('Failed to get recipes');
  const data = await response.json();
  return data.recipes;
};

/**
 * User recipe service for creating and managing custom recipes
 * Provides functions for recipe creation, photo upload, and retrieval
 */
export const userRecipeService = {
  createRecipe: createUserRecipe,
  getUserRecipes,
  uploadPhoto,
};
