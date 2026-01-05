import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, SafeAreaView, Alert, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecipeDetailHeader } from '../components/RecipeDetailHeader';
import { IngredientsList } from '../components/IngredientsList';
import { CookingInstructions } from '../components/CookingInstructions';
import { useRecipes } from '../contexts/RecipeContext';
import { RecipeDetails } from '../services/recipeService';
import { API_BASE_URL } from '../config/api';

interface Props {
  route: {
    params: {
      recipeId: number | string;
    };
  };
  navigation: any;
}

export const RecipeDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { recipeId } = route.params;
  const { getRecipeDetails, saveRecipe, isRecipeSaved } = useRecipes();
  const [recipe, setRecipe] = useState<RecipeDetails | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [servings, setServings] = useState(4);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecipe = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('[RecipeDetailScreen] Loading recipe:', recipeId);
        
        const recipeDetails = await getRecipeDetails(recipeId);
        console.log('[RecipeDetailScreen] Recipe loaded:', {
          id: recipeDetails?.id,
          title: recipeDetails?.title,
          hasIngredients: !!recipeDetails?.ingredients,
          ingredientsCount: recipeDetails?.ingredients?.length || 0,
          hasIngredientsWithStatus: !!recipeDetails?.ingredientsWithStatus,
          ingredientsWithStatusCount: recipeDetails?.ingredientsWithStatus?.length || 0,
        });
        
        setRecipe(recipeDetails);
        setServings(recipeDetails.servings || 4);
        
        // Check if recipe is already saved
        const saved = await isRecipeSaved(recipeDetails.id);
        setIsFavorite(saved);
      } catch (err) {
        console.error('[RecipeDetailScreen] Error loading recipe:', err);
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      } finally {
        setIsLoading(false);
      }
    };

    if (recipeId) {
      loadRecipe();
    }
  }, [recipeId, getRecipeDetails, isRecipeSaved]);

  const handleFavoritePress = async () => {
    if (!recipe) return;
    
    try {
      if (isFavorite) {
        // TODO: Implement remove from favorites
        setIsFavorite(false);
        Alert.alert('Removed from Favorites', `${recipe.title} has been removed from your favorites.`);
      } else {
        await saveRecipe(recipe);
        setIsFavorite(true);
        Alert.alert('Added to Favorites', `${recipe.title} has been added to your favorites.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update favorites';
      if (errorMessage === 'Recipe already saved') {
        setIsFavorite(true);
        Alert.alert('Already Saved', `${recipe.title} is already in your favorites.`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handleSharePress = () => {
    if (!recipe) return;
    Alert.alert('Share Recipe', `Share ${recipe.title} with friends!`);
  };

  const handleServingsChange = (newServings: number) => {
    if (!recipe) return;
    
    const oldServings = servings;
    const scaleFactor = newServings / oldServings;
    
    // Scale ingredient quantities
    const scaledIngredients = recipe.ingredients.map(ingredient => {
      return scaleIngredientQuantity(ingredient, scaleFactor);
    });
    
    // Update recipe with scaled ingredients
    setRecipe(prev => prev ? {
      ...prev,
      ingredients: scaledIngredients,
      servings: newServings
    } : null);
    
    setServings(newServings);
  };

  // Helper function to scale ingredient quantities
  const scaleIngredientQuantity = (ingredient: string, scaleFactor: number): string => {
    // Common patterns: "2 cups flour", "1 tbsp olive oil", "3 large eggs"
    const quantityMatch = ingredient.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s+(.+)$/);
    
    if (quantityMatch) {
      const [, quantityStr, rest] = quantityMatch;
      let quantity = parseFloat(quantityStr);
      
      // Handle fractions like "1/2"
      if (quantityStr.includes('/')) {
        const [num, den] = quantityStr.split('/');
        quantity = parseFloat(num) / parseFloat(den);
      }
      
      const scaledQuantity = quantity * scaleFactor;
      
      // Format the scaled quantity nicely
      let formattedQuantity: string;
      if (scaledQuantity % 1 === 0) {
        // Whole number
        formattedQuantity = scaledQuantity.toString();
      } else if (scaledQuantity < 1) {
        // Convert to fraction for small amounts
        const fraction = decimalToFraction(scaledQuantity);
        formattedQuantity = fraction;
      } else {
        // Decimal with up to 2 decimal places
        formattedQuantity = scaledQuantity.toFixed(2).replace(/\.?0+$/, '');
      }
      
      return `${formattedQuantity} ${rest}`;
    }
    
    // If no quantity found, return original ingredient
    return ingredient;
  };

  // Helper function to convert decimal to fraction
  const decimalToFraction = (decimal: number): string => {
    const tolerance = 1.0E-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = decimal;
    
    do {
      const a = Math.floor(b);
      let aux = h1; h1 = a * h1 + h2; h2 = aux;
      aux = k1; k1 = a * k1 + k2; k2 = aux;
      b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);
    
    return k1 === 1 ? h1.toString() : `${h1}/${k1}`;
  };

  const handleCookedThis = async () => {
    if (!recipe) return;
    
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        Alert.alert('Error', 'Please log in to track your cooking');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/recipe-enhancements/mark-cooked`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeId: recipe.id.toString(),
          recipeType: 'fatsecret',
          rating: null, // Could add rating later
          notes: null,  // Could add notes later
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          '🎉 Cooking Tracked!', 
          'Great job! You\'ve earned points for cooking this recipe. Keep up the great work!',
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        throw new Error(data.error || 'Failed to track cooking');
      }
    } catch (err) {
      console.error('Error tracking cooking:', err);
      Alert.alert('Error', 'Failed to track your cooking. Please try again.');
    }
  };

  // Convert backend recipe data to component-compatible format
  const getRecipeForHeader = () => {
    if (!recipe) return null;
    
    return {
      id: recipe.id.toString(),
      title: recipe.title,
      description: recipe.summary || 'No description available',
      cookingTime: recipe.readyInMinutes || 30,
      servings: recipe.servings || 4,
      difficulty: 'medium', // Default since backend doesn't provide this
      cuisine: recipe.cuisines?.[0] || 'Unknown',
      imageUrl: recipe.image || undefined,
    };
  };

  // Get ingredients with user's pantry status for enhanced display
  const getIngredientsWithStatus = () => {
    if (!recipe?.ingredients) return [];
    
    // If backend provides ingredientsWithStatus, use it for enhanced display
    if (recipe.ingredientsWithStatus && recipe.ingredientsWithStatus.length > 0) {
      return recipe.ingredients.map((ingredient, index) => {
        const status = recipe.ingredientsWithStatus?.[index];
        return {
          ingredient,
          hasIngredient: status?.hasIngredient || false,
        };
      });
    }
    
    // Fallback to plain ingredients list
    return recipe.ingredients.map(ingredient => ({
      ingredient,
      hasIngredient: false,
    }));
  };

  // Convert instructions string to array
  const getInstructionsArray = () => {
    if (!recipe?.instructions) return [];
    
    // If instructions is already an array, return it
    if (Array.isArray(recipe.instructions)) {
      return recipe.instructions;
    }
    
    // If instructions is a string, split by numbered steps or newlines
    const instructionsText = recipe.instructions;
    
    // Try to split by numbered steps (1. 2. 3. etc.)
    const numberedSteps = instructionsText.split(/\d+\.\s+/).filter(step => step.trim().length > 0);
    if (numberedSteps.length > 1) {
      return numberedSteps;
    }
    
    // Fallback: split by newlines
    return instructionsText.split('\n').filter(step => step.trim().length > 0);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading recipe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              // Trigger reload by changing a dependency
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.errorText}>Recipe not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerRecipe = getRecipeForHeader();
  const ingredientsWithStatus = getIngredientsWithStatus();
  const instructionsArray = getInstructionsArray();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.backButtonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        
        {headerRecipe && (
          <RecipeDetailHeader
            recipe={headerRecipe}
            isFavorite={isFavorite}
            onFavoritePress={handleFavoritePress}
            onSharePress={handleSharePress}
          />
        )}
        
        {/* Ingredient Match Info */}
        {recipe.ingredientsWithStatus && recipe.matchPercentage !== undefined && (
          <View style={styles.matchInfoContainer}>
            <Text style={styles.matchInfoTitle}>Ingredient Match</Text>
            <Text style={styles.matchInfoText}>
              You have {recipe.matchedCount || 0} of {recipe.totalIngredients || 0} ingredients ({recipe.matchPercentage}% match)
            </Text>
          </View>
        )}
        
        <IngredientsList
          ingredients={recipe.ingredients}
          ingredientsWithStatus={getIngredientsWithStatus()}
          conflictingIngredients={[]} // TODO: Implement dietary conflict detection
          substitutions={[]} // TODO: Implement ingredient substitutions
          servings={servings}
          onServingsChange={handleServingsChange}
        />
        
        {instructionsArray.length > 0 && (
          <CookingInstructions
            instructions={instructionsArray}
            estimatedTime={recipe.readyInMinutes}
          />
        )}

        {/* I Cooked This Button */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.cookedButton}
            onPress={handleCookedThis}
          >
            <Icon name="restaurant" size={24} color="#FFFFFF" />
            <Text style={styles.cookedButtonText}>I Cooked This! 🍽️</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  matchInfoContainer: {
    backgroundColor: '#E8F5E8',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  matchInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  matchInfoText: {
    fontSize: 14,
    color: '#374151',
  },
  actionButtonsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  cookedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cookedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});