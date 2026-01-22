import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useRecipes} from '../../contexts/RecipeContext';
import ingredientService from '../../services/ingredientService';
import {Recipe} from '../../services/recipeService';
import {RecipeImage} from '../../components/RecipeImage';

interface RecipeSearchScreenProps {
  navigation: any;
}

// Meal type filtering: When specific meal type selected, search by meal type only
// When "All" selected, search by user's ingredients
const MEAL_TYPES = [
  {label: 'All', value: null, description: 'Recipes with your ingredients'},
  {
    label: 'Breakfast',
    value: 'Breakfast and Brunch',
    description: 'Breakfast recipes',
  },
  {label: 'Lunch', value: 'Main Dishes', description: 'Lunch recipes'},
  {label: 'Dinner', value: 'Main Dishes', description: 'Dinner recipes'},
  {
    label: 'Snack',
    value: 'Appetizers and Snacks',
    description: 'Snack recipes',
  },
];

export const RecipeSearchScreen: React.FC<RecipeSearchScreenProps> = ({
  navigation,
}) => {
  const {recipes, isLoading, error, provider, searchRecipes} = useRecipes();
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [maxCalories, setMaxCalories] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);

  useEffect(() => {
    // Auto-search on mount
    handleSearch();
  }, []);

  // Re-search when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Refresh recipes when returning to this screen
      console.log('🔄 Recipe screen focused - refreshing...');
      handleSearch();
    });

    return unsubscribe;
  }, [navigation]);

  const handleSearch = async () => {
    try {
      console.log('🔍 Starting recipe search...');
      setHasSearched(true);

      // Get user's ingredients
      const response = await ingredientService.getUserIngredients();
      console.log('📦 Got ingredients:', response);

      if (!response || (!response.ingredients && !response.customIngredients)) {
        console.log('⚠️  No ingredients response');
        return;
      }

      const allIngredients = [
        ...(response.ingredients || []),
        ...(response.customIngredients || []),
      ];

      if (allIngredients.length === 0) {
        console.log('⚠️  No ingredients found');
        return;
      }

      // Extract ingredient names
      const ingredientNames = allIngredients
        .map(ing => ing?.ingredient_name || ing?.name || '')
        .filter(name => name && name.length > 0);

      console.log('🥘 Ingredient names:', ingredientNames);

      if (ingredientNames.length === 0) {
        console.log('⚠️  No valid ingredient names');
        return;
      }

      // Build filters object
      const filters: {maxCalories?: number; mealType?: string} = {};
      if (maxCalories && parseInt(maxCalories, 10) > 0) {
        filters.maxCalories = parseInt(maxCalories, 10);
      }
      if (selectedMealType) {
        filters.mealType = selectedMealType;
      }

      // Search recipes with filters
      console.log('🚀 Calling searchRecipes with:', ingredientNames, filters);
      const hasFilters = Object.keys(filters).length > 0;
      await searchRecipes(ingredientNames, hasFilters ? filters : undefined);
      console.log('✅ Search complete');
    } catch (err) {
      const errorMsg =
        err && typeof err === 'object' && 'message' in err
          ? (err as Error).message
          : 'Unknown error';
      console.error('❌ Search error:', errorMsg);
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    handleSearch();
  };

  const clearFilters = () => {
    setMaxCalories('');
    setSelectedMealType(null);
    setShowFilters(false);
    handleSearch();
  };

  const hasActiveFilters = maxCalories !== '' || selectedMealType !== null;

  const onRefresh = async () => {
    setRefreshing(true);
    await handleSearch();
    setRefreshing(false);
  };

  const renderRecipeCard = ({item}: {item: Recipe}) => (
    <TouchableOpacity
      style={styles.recipeCard}
      onPress={() => navigation.navigate('RecipeDetail', {recipeId: item.id})}
      activeOpacity={0.7}>
      <RecipeImage
        imageUrl={item.image}
        style={styles.recipeImage}
        placeholderStyle={styles.placeholderImage}
        showSubtext={false}
      />

      {/* Nutrition Badge */}
      {item.calories && (
        <View style={styles.nutritionBadge}>
          <Icon name="local-fire-department" size={14} color="#FFFFFF" />
          <Text style={styles.nutritionBadgeText}>{item.calories} cal</Text>
        </View>
      )}

      <View style={styles.recipeInfo}>
        <Text style={styles.recipeTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Nutrition Info Row */}
        {(item.calories || item.protein || item.carbs || item.fat) && (
          <View style={styles.nutritionRow}>
            {item.calories && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Cal</Text>
                <Text style={styles.nutritionValue}>{item.calories}</Text>
              </View>
            )}
            {item.protein && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Protein</Text>
                <Text style={styles.nutritionValue}>{item.protein}g</Text>
              </View>
            )}
            {item.carbs && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Carbs</Text>
                <Text style={styles.nutritionValue}>{item.carbs}g</Text>
              </View>
            )}
            {item.fat && (
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Fat</Text>
                <Text style={styles.nutritionValue}>{item.fat}g</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="favorite" size={16} color="#EF4444" />
            <Text style={styles.statText}>{item.likes}</Text>
          </View>
        </View>

        {item.missedIngredientCount > 0 && (
          <View style={styles.missingIngredientsContainer}>
            <Text style={styles.missingLabel}>Missing:</Text>
            <Text style={styles.missingText} numberOfLines={1}>
              {item.missedIngredients.map(ing => ing.name).join(', ')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (isLoading) {
      return null;
    }

    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <Icon name="restaurant" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Finding Recipes...</Text>
          <Text style={styles.emptyText}>
            We're searching for recipes based on your ingredients
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Icon name="error-outline" size={64} color="#EF4444" />
          <Text style={styles.emptyTitle}>Oops!</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleSearch}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (recipes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="search-off" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Matching Recipes Found</Text>
          <Text style={styles.emptyText}>
            No recipes found that match your current ingredients. Try adding
            more ingredients to your inventory!
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              // Navigate to the Ingredients tab
              const parent = navigation.getParent();
              if (parent) {
                parent.navigate('Ingredients');
              }
            }}>
            <Icon name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Ingredients</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Beta Label */}
      <View style={styles.betaBanner}>
        <Icon name="science" size={16} color="#8B5CF6" />
        <Text style={styles.betaText}>Beta - Recipe Database</Text>
        {provider && <Text style={styles.providerText}>• {provider}</Text>}
      </View>

      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerText}>
            {recipes.length > 0
              ? `Found ${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} matching your ingredients`
              : 'Searching for recipes...'}
          </Text>
          <Text style={styles.pullToRefreshHint}>Pull down to refresh</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}>
            <Icon
              name="filter-list"
              size={24}
              color={hasActiveFilters ? '#FFFFFF' : '#6B7280'}
            />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSearch}
            disabled={isLoading}
            style={styles.refreshButton}>
            <Icon
              name="refresh"
              size={24}
              color={isLoading ? '#9CA3AF' : '#10B981'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recipe List */}
      <FlatList
        data={recipes}
        renderItem={renderRecipeCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          recipes.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={true}
      />

      {/* Loading Overlay */}
      {isLoading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Finding recipes...</Text>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Recipes</Text>
              <TouchableOpacity
                onPress={() => setShowFilters(false)}
                style={styles.modalCloseButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Calorie Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Max Calories</Text>
              <TextInput
                style={styles.calorieInput}
                placeholder="e.g., 500"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={maxCalories}
                onChangeText={setMaxCalories}
              />
              <Text style={styles.filterHint}>
                Leave empty for no calorie limit
              </Text>
            </View>

            {/* Meal Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Meal Type</Text>
              <Text style={styles.filterHint}>
                "All" shows recipes with your ingredients. Other options show
                meal-specific recipes.
              </Text>
              <View style={styles.mealTypeChips}>
                {MEAL_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.label}
                    style={[
                      styles.mealTypeChip,
                      selectedMealType === type.value &&
                        styles.mealTypeChipActive,
                    ]}
                    onPress={() => setSelectedMealType(type.value)}>
                    <Text
                      style={[
                        styles.mealTypeChipText,
                        selectedMealType === type.value &&
                          styles.mealTypeChipTextActive,
                      ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  pullToRefreshHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#10B981',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  recipeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  nutritionBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  nutritionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  recipeInfo: {
    padding: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  nutritionValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
  },
  missingIngredientsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  missingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  missingText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  betaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3E8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9D5FF',
  },
  betaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerText: {
    fontSize: 11,
    color: '#A78BFA',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  calorieInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  filterHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  mealTypeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mealTypeChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  mealTypeChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  mealTypeChipTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
