import React, {useState, useEffect} from 'react';
import {StyleSheet, SafeAreaView, Alert} from 'react-native';
import {RecipeSearchBar} from '../components/RecipeSearchBar';
import {RecipeFilterModal} from '../components/RecipeFilterModal';
import {SortSelector, SortOption} from '../components/SortSelector';
import {RecipeList} from '../components/RecipeList';
import recipeService from '../services/recipeService';
import {useIngredients} from '../contexts/IngredientContext';

interface SearchFilters {
  ingredients?: string[];
  cuisine?: string;
  mealType?: string;
  cookingTime?: number;
  difficulty?: string;
  servings?: number;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  cookingTime: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  imageUrl?: string;
  isCompatible?: boolean;
  conflictCount?: number;
}

export const RecipeSearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const {ingredients} = useIngredients();

  useEffect(() => {
    if (searchQuery || filters.ingredients?.length) {
      searchRecipes();
    } else {
      setRecipes([]);
    }
  }, [searchQuery, filters, sortBy]);

  const searchRecipes = async () => {
    try {
      setLoading(true);

      // Use user's ingredients if no specific search
      const searchIngredients =
        filters.ingredients ||
        ingredients.map(ing => ing.name || '').filter(Boolean);

      if (searchIngredients.length === 0 && !searchQuery) {
        setRecipes([]);
        return;
      }

      const results =
        await recipeService.searchByIngredients(searchIngredients);

      // Convert to local Recipe format
      const formattedRecipes: Recipe[] = results.map(r => ({
        id: r.id.toString(),
        title: r.title,
        description: `Uses ${r.usedIngredientCount} of your ingredients`,
        cookingTime: 30, // Default, would need from details
        servings: 4, // Default, would need from details
        difficulty: 'medium',
        cuisine: '',
        imageUrl: r.image,
        isCompatible: r.missedIngredientCount === 0,
        conflictCount: r.missedIngredientCount,
      }));

      setRecipes(formattedRecipes);
    } catch (error) {
      console.error('Error searching recipes:', error);
      Alert.alert('Error', 'Failed to search recipes. Please try again.');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleApplyFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
  };

  const handleRecipePress = (recipe: Recipe) => {
    // Navigate to recipe detail
  };

  const conflictData = recipes.reduce(
    (acc, recipe) => {
      acc[recipe.id] = recipe.conflictCount || 0;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <SafeAreaView style={styles.container}>
      <RecipeSearchBar
        onSearch={handleSearch}
        onFilterPress={() => setShowFilterModal(true)}
      />

      <SortSelector
        selectedSort={sortBy}
        onSortChange={handleSortChange}
        showCompatibility={true}
      />

      <RecipeList
        recipes={recipes}
        loading={loading}
        onRecipePress={handleRecipePress}
        conflictData={conflictData}
      />

      <RecipeFilterModal
        visible={showFilterModal}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClose={() => setShowFilterModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
