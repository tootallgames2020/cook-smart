import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useIngredients} from '../../contexts/IngredientContext';
import {IngredientCard} from '../../components/common/IngredientCard';
import {Ingredient} from '../../services/ingredientService';
import ingredientService from '../../services/ingredientService';

interface GroupedIngredients {
  title: string;
  data: Ingredient[];
}

export const IngredientInventoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    ingredients,
    customIngredients,
    isLoading,
    error,
    fetchIngredients,
    updateIngredient,
    deleteIngredient,
  } = useIngredients();

  const [refreshing, setRefreshing] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null,
  );
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [categories, setCategories] = useState<Array<{id: string; name: string; icon: string}>>([]);
  const [_loading, _setLoading] = useState(false);

  useEffect(() => {
    fetchIngredients();
    fetchCategories();
  }, [fetchIngredients]);

  const fetchCategories = async () => {
    try {
      const result = await ingredientService.getCategories();
      setCategories(result);
    } catch (fetchError) {
      console.error('Error fetching categories:', fetchError);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchIngredients();
    setRefreshing(false);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Ingredient',
      'Are you sure you want to remove this ingredient?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIngredient(id);
            } catch (_err) {
              Alert.alert('Error', 'Failed to delete ingredient');
            }
          },
        },
      ],
    );
  };

  const handleFixCategories = async () => {
    try {
      _setLoading(true);
      const result = await ingredientService.fixUncategorizedIngredients();
      
      // Check if any items were actually fixed
      if (result && result.updated && result.updated.length > 0) {
        Alert.alert(
          'Success! 🎉', 
          `Fixed ${result.updated.length} uncategorized ingredient${result.updated.length > 1 ? 's' : ''}! Refreshing list...`
        );
      } else {
        Alert.alert(
          'All Good! ✅', 
          'No uncategorized ingredients found. Your inventory is already organized!'
        );
      }
      
      await fetchIngredients();
    } catch (err) {
      console.error('Error fixing categories:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fix categories. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      _setLoading(false);
    }
  };

  const handleDeleteAll = () => {
    const totalCount = ingredients.length + customIngredients.length;
    if (totalCount === 0) {
      Alert.alert('No Ingredients', 'Your inventory is already empty.');
      return;
    }

    Alert.alert(
      'Delete All Ingredients',
      `Remove all ${totalCount} ingredient${totalCount > 1 ? 's' : ''} from your inventory?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all ingredients one by one
              const allIngredients = [...ingredients, ...customIngredients];
              for (const ingredient of allIngredients) {
                await deleteIngredient(ingredient.id);
              }
              Alert.alert('Success', 'All ingredients deleted');
            } catch (_err) {
              Alert.alert('Error', 'Failed to delete all ingredients');
            }
          },
        },
      ],
    );
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setEditQuantity(ingredient.quantity?.toString() || '1');
    setEditUnit(ingredient.unit || 'unit');
    setEditCategory(ingredient.category || 'Other');
  };

  const handleSaveEdit = async () => {
    if (!editingIngredient) return;

    try {
      await updateIngredient(editingIngredient.id, {
        quantity: parseFloat(editQuantity) || 1,
        unit: editUnit.trim() || 'unit',
        category: editCategory,
      });

      Alert.alert('Success', 'Ingredient updated successfully!');
      setEditingIngredient(null);

      // Refresh the list to show updated values
      await fetchIngredients();
    } catch (_err) {
      Alert.alert('Error', 'Failed to update ingredient');
    }
  };

  const groupIngredientsByCategory = (): GroupedIngredients[] => {
    const allIngredients = [
      ...(ingredients || []),
      ...(customIngredients || []),
    ];

    if (allIngredients.length === 0) {
      return [];
    }

    const grouped: {[key: string]: Ingredient[]} = {};

    allIngredients.forEach(ingredient => {
      // Better category fallback - handle null, undefined, empty string, or whitespace
      let category = ingredient.category;
      if (!category || category.trim() === '' || category.toLowerCase() === 'null') {
        category = 'Uncategorized';
      }
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(ingredient);
    });

    // Sort categories with "Uncategorized" at the end
    return Object.keys(grouped)
      .sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
      })
      .map(category => ({
        title: category,
        data: grouped[category],
      }));
  };

  const groupedData = groupIngredientsByCategory();

  if (isLoading && !refreshing && groupedData.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading ingredients...</Text>
      </View>
    );
  }

  if (error && groupedData.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchIngredients}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (groupedData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="kitchen" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Ingredients Yet</Text>
          <Text style={styles.emptySubtext}>
            Start building your ingredient inventory by tapping the + button
            below
          </Text>
        </View>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddIngredient' as never)}>
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.deleteAllContainer}>
        <TouchableOpacity
          style={styles.fixCategoriesButton}
          onPress={handleFixCategories}>
          <Text style={styles.fixCategoriesText}>🏷️ Fix Uncategorized Items</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteAllButton}
          onPress={handleDeleteAll}>
          <Text style={styles.deleteAllText}>🗑️ Delete All Ingredients</Text>
        </TouchableOpacity>
      </View>
      <SectionList
        sections={groupedData}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <IngredientCard
            ingredient={item}
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
        renderSectionHeader={({section: {title}}) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddIngredient' as never)}>
        <Icon name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Edit Ingredient Modal */}
      <Modal
        visible={editingIngredient !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditingIngredient(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Ingredient</Text>
              <TouchableOpacity onPress={() => setEditingIngredient(null)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.ingredientName}>
                {editingIngredient?.ingredient_name || editingIngredient?.name}
              </Text>

              <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.formGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={editUnit}
                    onChangeText={setEditUnit}
                    placeholder="unit"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Category Picker */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        editCategory === cat.name && styles.categoryChipSelected,
                      ]}
                      onPress={() => setEditCategory(cat.name)}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.categoryChipText,
                          editCategory === cat.name && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
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
  deleteAllContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  fixCategoriesButton: {
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  fixCategoriesText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  deleteAllButton: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef5350',
  },
  deleteAllText: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  ingredientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
});
