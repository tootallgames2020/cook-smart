import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import ingredientService, {
  Ingredient,
  CreateIngredientDto,
  UpdateIngredientDto,
} from '../services/ingredientService';
import {useAuth} from './AuthContext';
import {isSessionExpiredError} from '../utils/auth';

interface IngredientContextType {
  ingredients: Ingredient[];
  customIngredients: Ingredient[];
  isLoading: boolean;
  error: string | null;
  fetchIngredients: () => Promise<void>;
  addIngredient: (ingredient: CreateIngredientDto) => Promise<void>;
  updateIngredient: (id: number, updates: UpdateIngredientDto) => Promise<void>;
  deleteIngredient: (id: number) => Promise<void>;
  searchIngredients: (query: string) => Promise<Ingredient[]>;
}

const IngredientContext = createContext<IngredientContextType | undefined>(
  undefined,
);

export const useIngredients = () => {
  const context = useContext(IngredientContext);
  if (!context) {
    throw new Error('useIngredients must be used within an IngredientProvider');
  }
  return context;
};

interface IngredientProviderProps {
  children: ReactNode;
}

export const IngredientProvider: React.FC<IngredientProviderProps> = ({
  children,
}) => {
  const {logout} = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSessionExpired = useCallback(async () => {
    // Silently log out user when session expires
    // They'll just see the login screen - clean and simple
    await logout();
  }, [logout]);

  const fetchIngredients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ingredientService.getUserIngredients();
      setIngredients(data.ingredients);
      setCustomIngredients(data.customIngredients);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch ingredients';
      setError(errorMessage);
      console.error('Fetch ingredients error:', err);

      if (isSessionExpiredError(errorMessage)) {
        await handleSessionExpired();
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleSessionExpired]);

  const addIngredient = useCallback(
    async (ingredientData: CreateIngredientDto) => {
      setIsLoading(true);
      setError(null);
      try {
        await ingredientService.addIngredient(ingredientData);
        // Refresh the ingredients list after adding
        await fetchIngredients();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add ingredient';
        setError(errorMessage);
        console.error('Add ingredient error:', err);

        if (isSessionExpiredError(errorMessage)) {
          await handleSessionExpired();
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchIngredients, handleSessionExpired],
  );

  const updateIngredient = useCallback(
    async (id: number, updates: UpdateIngredientDto) => {
      setIsLoading(true);
      setError(null);
      try {
        await ingredientService.updateIngredient(id, updates);

        // Optimistically update in state by merging the updates
        setIngredients(prev =>
          (prev || []).map(ing => (ing.id === id ? {...ing, ...updates} : ing)),
        );
        setCustomIngredients(prev =>
          (prev || []).map(ing => (ing.id === id ? {...ing, ...updates} : ing)),
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update ingredient';
        setError(errorMessage);
        console.error('Update ingredient error:', err);

        if (isSessionExpiredError(errorMessage)) {
          await handleSessionExpired();
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [handleSessionExpired],
  );

  const deleteIngredient = useCallback(
    async (id: number) => {
      setIsLoading(true);
      setError(null);
      try {
        await ingredientService.deleteIngredient(id);

        // Optimistic update - remove from state (safely handle null/undefined)
        setIngredients(prev => (prev || []).filter(ing => ing.id !== id));
        setCustomIngredients(prev => (prev || []).filter(ing => ing.id !== id));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete ingredient';
        setError(errorMessage);
        console.error('Delete ingredient error:', err);

        if (isSessionExpiredError(errorMessage)) {
          await handleSessionExpired();
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [handleSessionExpired],
  );

  const searchIngredients = useCallback(
    async (query: string): Promise<Ingredient[]> => {
      if (!query.trim()) {
        return [];
      }

      try {
        const results = await ingredientService.searchIngredients(query);
        return results;
      } catch (err) {
        console.error('Search ingredients error:', err);
        return [];
      }
    },
    [],
  );

  const value: IngredientContextType = {
    ingredients,
    customIngredients,
    isLoading,
    error,
    fetchIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
    searchIngredients,
  };

  return (
    <IngredientContext.Provider value={value}>
      {children}
    </IngredientContext.Provider>
  );
};
