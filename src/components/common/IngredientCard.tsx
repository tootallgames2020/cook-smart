import React, { useState } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {API_BASE_URL} from '../../config/api';
import {Ingredient} from '../../services/ingredientService';
import { IngredientCategorizationFeedback } from '../IngredientCategorizationFeedback';

interface IngredientCardProps {
  ingredient: Ingredient;
  onDelete: (id: number) => void;
  onEdit?: (ingredient: Ingredient) => void;
  onCategoryUpdated?: (ingredient: Ingredient, newCategory: string) => void;
}

const getCategoryIcon = (category: string | null | undefined): string => {
  const categoryMap: {[key: string]: string} = {
    proteins: 'set-meal',
    vegetables: 'eco',
    fruits: 'apple',
    grains: 'grain',
    dairy: 'local-drink',
    spices: 'spa',
    other: 'category',
  };
  
  // Handle null, undefined, or empty category
  if (!category || category.trim() === '') {
    return 'category';
  }
  
  return categoryMap[category.toLowerCase()] || 'category';
};

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  onDelete,
  onEdit,
  onCategoryUpdated,
}) => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const displayName =
    ingredient.ingredient_name || ingredient.name || 'Unknown';
  const iconName = getCategoryIcon(ingredient.category);

  const handleFeedbackSubmitted = (correctCategory: string) => {
    if (onCategoryUpdated) {
      onCategoryUpdated(ingredient, correctCategory);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onEdit?.(ingredient)}
        activeOpacity={onEdit ? 0.7 : 1}>
        {ingredient.photo_url ? (
          <Image
            source={{uri: `${API_BASE_URL}${ingredient.photo_url}`}}
            style={styles.photo}
          />
        ) : (
          <View style={styles.iconContainer}>
            <Icon name={iconName} size={24} color="#10B981" />
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.name}>{displayName}</Text>
          <TouchableOpacity 
            style={styles.categoryContainer}
            onPress={() => setShowFeedbackModal(true)}
          >
            <Text style={styles.category}>
              {ingredient.category || 'Uncategorized'}
            </Text>
            <Icon name="edit" size={12} color="#6B7280" style={styles.editIcon} />
          </TouchableOpacity>
          {ingredient.quantity && ingredient.unit && (
            <Text style={styles.quantity}>
              {ingredient.quantity} {ingredient.unit}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(ingredient.id)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="delete" size={20} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>

      <IngredientCategorizationFeedback
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        ingredientName={displayName}
        currentCategory={ingredient.category || 'Uncategorized'}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  photo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginRight: 4,
  },
  editIcon: {
    marginLeft: 2,
  },
  quantity: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
});
