import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { RecipeCard } from '../components/RecipeCard';

interface FavoriteRecipe {
  id: string;
  recipeId: string;
  title: string;
  description: string;
  cookingTime: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  imageUrl?: string;
  dateAdded: Date;
  notes?: string;
}

interface Props {
  userId: string;
}

export const FavoritesScreen: React.FC<Props> = ({ userId }) => {
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data
  const mockFavorites: FavoriteRecipe[] = [
    {
      id: '1',
      recipeId: 'recipe1',
      title: 'Vegetarian Pasta Primavera',
      description: 'A colorful and healthy pasta dish loaded with fresh vegetables',
      cookingTime: 25,
      servings: 4,
      difficulty: 'easy',
      cuisine: 'italian',
      dateAdded: new Date(Date.now() - 86400000),
      notes: 'Perfect for weeknight dinners'
    },
    {
      id: '2',
      recipeId: 'recipe2',
      title: 'Chicken Teriyaki Bowl',
      description: 'Tender chicken with vegetables over rice',
      cookingTime: 30,
      servings: 2,
      difficulty: 'medium',
      cuisine: 'asian',
      dateAdded: new Date(Date.now() - 172800000)
    },
    {
      id: '3',
      recipeId: 'recipe3',
      title: 'Chocolate Chip Cookies',
      description: 'Classic homemade cookies that are crispy outside, chewy inside',
      cookingTime: 15,
      servings: 24,
      difficulty: 'easy',
      cuisine: 'american',
      dateAdded: new Date(Date.now() - 259200000),
      notes: 'Kids love these!'
    }
  ];

  useEffect(() => {
    loadFavorites();
  }, [userId]);

  const loadFavorites = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setFavorites(mockFavorites);
      setLoading(false);
    }, 1000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRecipePress = (recipe: FavoriteRecipe) => {
    // Navigate to recipe detail
  };

  const renderFavorite = ({ item }: { item: FavoriteRecipe }) => (
    <RecipeCard
      recipe={{
        id: item.recipeId,
        title: item.title,
        description: item.description,
        cookingTime: item.cookingTime,
        servings: item.servings,
        difficulty: item.difficulty,
        cuisine: item.cuisine,
        imageUrl: item.imageUrl
      }}
      onPress={() => handleRecipePress(item)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>❤️</Text>
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptyText}>
        Start exploring recipes and tap the heart icon to save your favorites!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>My Favorites</Text>
      <Text style={styles.subtitle}>
        {favorites.length} recipe{favorites.length !== 1 ? 's' : ''} saved
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={renderFavorite}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={favorites.length === 0 ? styles.emptyContainer : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});