import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import {Holiday} from '../utils/holidays';
import recipeService from '../services/recipeService';

interface HolidayRecipeSectionProps {
  holiday: Holiday;
  onRecipePress: (recipeId: string) => void;
}

export default function HolidayRecipeSection({
  holiday,
  onRecipePress,
}: HolidayRecipeSectionProps) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    checkIfHidden();
    loadRecipes();
  }, [holiday]);

  const checkIfHidden = async () => {
    try {
      const hiddenHolidays = await AsyncStorage.getItem('hidden_holidays');
      if (hiddenHolidays) {
        const hiddenList = JSON.parse(hiddenHolidays);
        setHidden(hiddenList.includes(holiday.name));
      }
    } catch (error) {
      console.error('Error checking hidden holidays:', error);
    }
  };

  const loadRecipes = async () => {
    try {
      // Search for holiday recipes using first search term
      const results = await recipeService.searchByIngredients([
        holiday.searchTerms[0],
      ]);
      if (results.length > 0) {
      }
      setRecipes(results.slice(0, 4));
    } catch (error) {
      console.error('Failed to load holiday recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#10B981" />
      </View>
    );
  }

  if (recipes.length === 0 || hidden) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{holiday.emoji}</Text>
        <Text style={styles.title}>{holiday.name} Recipes</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {recipes.map(recipe => (
          <TouchableOpacity
            key={recipe.id}
            style={styles.recipeCard}
            onPress={() => {
              onRecipePress(recipe.id);
            }}>
            <Image source={{uri: recipe.image}} style={styles.recipeImage} />
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeName} numberOfLines={2}>
                {recipe.title}
              </Text>
              <Text style={styles.recipeTime}>{recipe.readyInMinutes} min</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recipeCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#E5E7EB',
  },
  recipeInfo: {
    padding: 12,
  },
  recipeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 18,
  },
  recipeTime: {
    fontSize: 12,
    color: '#6B7280',
  },
});
