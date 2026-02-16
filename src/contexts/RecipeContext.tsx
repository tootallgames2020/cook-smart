import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {Alert} from 'react-native';
import recipeService, {
  Recipe,
  RecipeDetails,
  SavedRecipe,
} from '../services/recipeService';
import {useAuth} from './AuthContext';
import {isSessionExpiredError} from '../utils/auth';

interface RecipeContextType {
  recipes: Recipe[];
  savedRecipes: SavedRecipe[];
  isLoading: boolean;
  error: string | null;
  provider: string | null;
  searchRecipes: (
    ingredients: string[],
    filters?: {maxCalories?: number; mealType?: string},
  ) => Promise<void>;
  getRecipeDetails: (recipeId: number | string) => Promise<RecipeDetails>;
  saveRecipe: (recipe: RecipeDetails) => Promise<void>;
  deleteSavedRecipe: (recipeId: number) => Promise<void>;
  fetchSavedRecipes: () => Promise<void>;
  isRecipeSaved: (recipeId: number) => Promise<boolean>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};

interface RecipeProviderProps {
  children: ReactNode;
}

export const RecipeProvider: React.FC<RecipeProviderProps> = ({children}) => {
  const {logout} = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const handleSessionExpired = useCallback(async () => {
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please log in again.',
      [
        {
          text: 'OK',
          onPress: async () => {
            await logout();
          },
        },
      ],
      {cancelable: false},
    );
  }, [logout]);

  const searchRecipes = useCallback(
    async (
      ingredients: string[],
      filters?: {maxCalories?: number; mealType?: string},
    ) => {
      setIsLoading(true);
      setError(null);
      setProvider(null);
      try {
        const response: any = await recipeService.searchByIngredients(
          ingredients,
          filters,
        );
        // Handle both array response and object with recipes property
        if (!response) {
          setRecipes([]);
          return;
        }

        if (Array.isArray(response)) {
          setRecipes(response);
          setProvider(response[0]?.provider || null);
        } else if (response.recipes) {
          setRecipes(response.recipes || []);
          setProvider(response.provider || null);
        } else {
          setRecipes([]);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to search recipes';
        setError(errorMessage);
        console.error('Search recipes error:', err);

        if (isSessionExpiredError(errorMessage)) {
          await handleSessionExpired();
        }
      } finally {
        setIsLoading(false);
      }
    },
    [handleSessionExpired],
  );

  const getRecipeDetails = useCallback(
    async (recipeId: number | string): Promise<RecipeDetails> => {
      setIsLoading(true);
      setError(null);
      try {
        const details = await recipeService.getRecipeDetails(recipeId);
        return details;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch recipe details';
        setError(errorMessage);
        console.error('[RecipeContext] Get recipe details error:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const saveRecipe = useCallback(async (recipe: RecipeDetails) => {
    setIsLoading(true);
    setError(null);
    try {
      await recipeService.saveRecipe(recipe);
      // Refresh saved recipes
      await fetchSavedRecipes();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save recipe';
      setError(errorMessage);
      console.error('Save recipe error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSavedRecipe = useCallback(async (recipeId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await recipeService.deleteSavedRecipe(recipeId);
      // Update state immediately
      setSavedRecipes(prev => prev.filter(r => r.recipe.id !== recipeId));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete recipe';
      setError(errorMessage);
      console.error('Delete recipe error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSavedRecipes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const saved = await recipeService.getSavedRecipes();
      setSavedRecipes(saved);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch saved recipes';
      setError(errorMessage);
      console.error('Fetch saved recipes error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isRecipeSaved = useCallback(
    async (recipeId: number): Promise<boolean> => {
      try {
        return await recipeService.isRecipeSaved(recipeId);
      } catch (err) {
        console.error('Check recipe saved error:', err);
        return false;
      }
    },
    [],
  );

  const value: RecipeContextType = {
    recipes,
    savedRecipes,
    isLoading,
    error,
    provider,
    searchRecipes,
    getRecipeDetails,
    saveRecipe,
    deleteSavedRecipe,
    fetchSavedRecipes,
    isRecipeSaved,
  };

  return (
    <RecipeContext.Provider value={value}>{children}</RecipeContext.Provider>
  );
};
