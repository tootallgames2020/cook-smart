import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import ingredientService from '../services/ingredientService';

interface Props {
  ingredients: string[];
  ingredientsWithStatus?: Array<{
    ingredient: string;
    hasIngredient: boolean;
  }>;
  conflictingIngredients?: string[];
  substitutions?: Array<{
    original: string;
    substitutes: Array<{
      ingredient: string;
      ratio: string;
      notes?: string;
    }>;
  }>;
  servings: number;
  onServingsChange?: (servings: number) => void;
  onIngredientUsed?: (ingredient: string, quantity: number, unit: string) => void;
}

interface ParsedIngredient {
  original: string;
  name: string;
  quantity: number;
  unit: string;
}

// Unit conversion system
const UNIT_CONVERSIONS: { [key: string]: { [key: string]: number } } = {
  // Weight conversions (to grams as base)
  'lb': { 'g': 453.592, 'kg': 0.453592, 'oz': 16 },
  'lbs': { 'g': 453.592, 'kg': 0.453592, 'oz': 16 },
  'pound': { 'g': 453.592, 'kg': 0.453592, 'oz': 16 },
  'pounds': { 'g': 453.592, 'kg': 0.453592, 'oz': 16 },
  'oz': { 'g': 28.3495, 'lb': 0.0625 },
  'ounce': { 'g': 28.3495, 'lb': 0.0625 },
  'ounces': { 'g': 28.3495, 'lb': 0.0625 },
  'kg': { 'g': 1000, 'lb': 2.20462 },
  'g': { 'kg': 0.001, 'lb': 0.00220462, 'oz': 0.035274 },
  'gram': { 'kg': 0.001, 'lb': 0.00220462, 'oz': 0.035274 },
  'grams': { 'kg': 0.001, 'lb': 0.00220462, 'oz': 0.035274 },
  
  // Volume conversions (to ml as base)
  'cup': { 'ml': 236.588, 'l': 0.236588, 'tbsp': 16, 'tsp': 48, 'fl oz': 8 },
  'cups': { 'ml': 236.588, 'l': 0.236588, 'tbsp': 16, 'tsp': 48, 'fl oz': 8 },
  'tbsp': { 'ml': 14.7868, 'cup': 0.0625, 'tsp': 3, 'fl oz': 0.5 },
  'tablespoon': { 'ml': 14.7868, 'cup': 0.0625, 'tsp': 3, 'fl oz': 0.5 },
  'tablespoons': { 'ml': 14.7868, 'cup': 0.0625, 'tsp': 3, 'fl oz': 0.5 },
  'tsp': { 'ml': 4.92892, 'cup': 0.0208333, 'tbsp': 0.333333, 'fl oz': 0.166667 },
  'teaspoon': { 'ml': 4.92892, 'cup': 0.0208333, 'tbsp': 0.333333, 'fl oz': 0.166667 },
  'teaspoons': { 'ml': 4.92892, 'cup': 0.0208333, 'tbsp': 0.333333, 'fl oz': 0.166667 },
  'l': { 'ml': 1000, 'cup': 4.22675 },
  'liter': { 'ml': 1000, 'cup': 4.22675 },
  'liters': { 'ml': 1000, 'cup': 4.22675 },
  'ml': { 'l': 0.001, 'cup': 0.00422675, 'tbsp': 0.067628, 'tsp': 0.202884 },
  'fl oz': { 'ml': 29.5735, 'cup': 0.125, 'tbsp': 2, 'tsp': 6 },
  
  // Special conversions for common ingredients
  'flour': {
    // 1 cup all-purpose flour ≈ 120g ≈ 0.26 lbs
    'cup_to_lb': 0.26, 'cup_to_g': 120, 'cup_to_oz': 4.2,
    'lb_to_cup': 3.85, 'g_to_cup': 0.0083, 'oz_to_cup': 0.24
  },
  'sugar': {
    // 1 cup granulated sugar ≈ 200g ≈ 0.44 lbs
    'cup_to_lb': 0.44, 'cup_to_g': 200, 'cup_to_oz': 7.05,
    'lb_to_cup': 2.27, 'g_to_cup': 0.005, 'oz_to_cup': 0.14
  },
  'butter': {
    // 1 cup butter ≈ 227g ≈ 0.5 lbs
    'cup_to_lb': 0.5, 'cup_to_g': 227, 'cup_to_oz': 8,
    'lb_to_cup': 2, 'g_to_cup': 0.0044, 'oz_to_cup': 0.125
  }
};

// Convert between units
const convertUnits = (fromQuantity: number, fromUnit: string, toUnit: string, ingredientName?: string): number | null => {
  if (fromUnit === toUnit) return fromQuantity;
  
  const normalizeUnit = (unit: string) => unit.toLowerCase().replace(/s$/, ''); // Remove plural 's'
  const normalizedFrom = normalizeUnit(fromUnit);
  const normalizedTo = normalizeUnit(toUnit);
  
  // Check for ingredient-specific conversions first
  if (ingredientName) {
    const ingredientKey = ingredientName.toLowerCase();
    for (const [key, conversions] of Object.entries(UNIT_CONVERSIONS)) {
      if (ingredientKey.includes(key)) {
        const conversionKey = `${normalizedFrom}_to_${normalizedTo}`;
        if (conversions[conversionKey]) {
          return fromQuantity * conversions[conversionKey];
        }
      }
    }
  }
  
  // Standard unit conversions
  if (UNIT_CONVERSIONS[normalizedFrom] && UNIT_CONVERSIONS[normalizedFrom][normalizedTo]) {
    return fromQuantity * UNIT_CONVERSIONS[normalizedFrom][normalizedTo];
  }
  
  // Try reverse conversion
  if (UNIT_CONVERSIONS[normalizedTo] && UNIT_CONVERSIONS[normalizedTo][normalizedFrom]) {
    return fromQuantity / UNIT_CONVERSIONS[normalizedTo][normalizedFrom];
  }
  
  return null; // No conversion available
};

export const IngredientsList: React.FC<Props> = ({
  ingredients,
  ingredientsWithStatus = [],
  conflictingIngredients = [],
  substitutions = [],
  servings,
  onServingsChange,
  onIngredientUsed
}) => {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [processingIngredients, setProcessingIngredients] = useState<Set<string>>(new Set());

  // Parse ingredient text to extract quantity, unit, and name
  const parseIngredient = (ingredientText: string): ParsedIngredient => {
    const original = ingredientText.trim();
    
    // Common patterns: "2 cups flour", "1 tbsp olive oil", "3 large eggs"
    const quantityMatch = original.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]*)\s+(.+)$/);
    
    if (quantityMatch) {
      const [, quantityStr, unit, name] = quantityMatch;
      let quantity = parseFloat(quantityStr);
      
      // Handle fractions like "1/2"
      if (quantityStr.includes('/')) {
        const [num, den] = quantityStr.split('/');
        quantity = parseFloat(num) / parseFloat(den);
      }
      
      return {
        original,
        name: name.trim(),
        quantity,
        unit: unit.trim() || 'unit'
      };
    }
    
    // Fallback: treat as 1 unit of the whole ingredient
    return {
      original,
      name: original,
      quantity: 1,
      unit: 'unit'
    };
  };

  const toggleIngredient = async (ingredient: string) => {
    const isCurrentlyChecked = checkedIngredients.has(ingredient);
    
    if (!isCurrentlyChecked) {
      // Checking ingredient - deduct from inventory
      setProcessingIngredients(prev => new Set(prev).add(ingredient));
      
      try {
        const parsed = parseIngredient(ingredient);
        
        // Try to deduct from user's inventory
        await deductFromInventory(parsed);
        
        // Update local state
        const newChecked = new Set(checkedIngredients);
        newChecked.add(ingredient);
        setCheckedIngredients(newChecked);
        
        // Notify parent component
        if (onIngredientUsed) {
          onIngredientUsed(parsed.name, parsed.quantity, parsed.unit);
        }
        
      } catch (error) {
        console.error('Error deducting ingredient:', error);
        Alert.alert(
          'Inventory Update Failed', 
          `Could not deduct ${ingredient} from your inventory. You can still check it off for tracking.`
        );
        
        // Still allow checking for tracking purposes
        const newChecked = new Set(checkedIngredients);
        newChecked.add(ingredient);
        setCheckedIngredients(newChecked);
      } finally {
        setProcessingIngredients(prev => {
          const newSet = new Set(prev);
          newSet.delete(ingredient);
          return newSet;
        });
      }
    } else {
      // Unchecking ingredient - just update UI (don't add back to inventory)
      const newChecked = new Set(checkedIngredients);
      newChecked.delete(ingredient);
      setCheckedIngredients(newChecked);
    }
  };

  const deductFromInventory = async (parsed: ParsedIngredient) => {
    try {
      // Get user's current ingredients
      const response = await ingredientService.getUserIngredients();
      const userIngredients = response.ingredients || [];
      
      // Find matching ingredient in user's inventory
      const matchingIngredient = userIngredients.find(userIng => {
        const userIngName = (userIng.ingredient_name || userIng.name || '').toLowerCase();
        const parsedName = parsed.name.toLowerCase();
        
        // Try exact match first
        if (userIngName === parsedName) return true;
        
        // Try partial matches
        if (userIngName.includes(parsedName) || parsedName.includes(userIngName)) return true;
        
        // Try word-based matching
        const userWords = userIngName.split(' ').filter(w => w.length > 2);
        const parsedWords = parsedName.split(' ').filter(w => w.length > 2);
        
        return userWords.some(userWord => 
          parsedWords.some(parsedWord => 
            userWord === parsedWord || 
            userWord.includes(parsedWord) || 
            parsedWord.includes(userWord)
          )
        );
      });
      
      if (matchingIngredient) {
        const currentQuantity = matchingIngredient.quantity || 0;
        const inventoryUnit = matchingIngredient.unit || 'unit';
        const recipeUnit = parsed.unit;
        
        let quantityToDeduct = parsed.quantity;
        
        // Try to convert units if they're different
        if (inventoryUnit !== recipeUnit) {
          const convertedQuantity = convertUnits(
            parsed.quantity, 
            recipeUnit, 
            inventoryUnit, 
            parsed.name
          );
          
          if (convertedQuantity !== null) {
            quantityToDeduct = convertedQuantity;
            console.log(`🔄 Converted ${parsed.quantity} ${recipeUnit} to ${convertedQuantity} ${inventoryUnit} for ${parsed.name}`);
          } else {
            // If conversion fails, show a helpful message but still allow the action
            Alert.alert(
              'Unit Conversion', 
              `Cannot convert ${recipeUnit} to ${inventoryUnit} for ${parsed.name}. The ingredient will be marked as used but inventory won't be updated.`,
              [{ text: 'OK' }]
            );
            console.log(`⚠️ Cannot convert ${recipeUnit} to ${inventoryUnit} for ${parsed.name}`);
            return; // Don't update inventory but allow checking
          }
        }
        
        const newQuantity = Math.max(0, currentQuantity - quantityToDeduct);
        
        // Update the ingredient quantity
        await ingredientService.updateIngredient(matchingIngredient.id, {
          quantity: newQuantity,
          unit: inventoryUnit // Keep original unit
        });
        
        console.log(`✅ Deducted ${quantityToDeduct} ${inventoryUnit} of ${parsed.name} from inventory (${currentQuantity} → ${newQuantity})`);
        
        // Show success message with conversion info if applicable
        if (inventoryUnit !== recipeUnit) {
          Alert.alert(
            'Inventory Updated! 🎉', 
            `Used ${parsed.quantity} ${recipeUnit} (${quantityToDeduct.toFixed(2)} ${inventoryUnit}) of ${parsed.name}.\n\nRemaining: ${newQuantity.toFixed(2)} ${inventoryUnit}`,
            [{ text: 'Great!' }]
          );
        }
      } else {
        console.log(`⚠️ Ingredient "${parsed.name}" not found in user's inventory`);
        Alert.alert(
          'Ingredient Not Found', 
          `"${parsed.name}" is not in your inventory. The ingredient will be marked as used for tracking.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error deducting from inventory:', error);
      throw error;
    }
  };

  const isConflicting = (ingredient: string) => {
    return conflictingIngredients.some(conflict =>
      ingredient.toLowerCase().includes(conflict.toLowerCase())
    );
  };

  const getSubstitution = (ingredient: string) => {
    return substitutions.find(sub => sub.original === ingredient);
  };

  // Check if user has this ingredient in their inventory
  const hasIngredient = (ingredient: string) => {
    const statusItem = ingredientsWithStatus.find(item => item.ingredient === ingredient);
    return statusItem?.hasIngredient || false;
  };

  // Get missing ingredients for shopping list
  const getMissingIngredients = () => {
    return ingredients.filter(ingredient => !hasIngredient(ingredient));
  };

  // Add missing ingredients to shopping list
  const addMissingToShoppingList = async () => {
    const missingIngredients = getMissingIngredients();
    if (missingIngredients.length === 0) {
      Alert.alert('Great!', 'You already have all the ingredients for this recipe!');
      return;
    }

    try {
      // Import shopping list service
      const {shoppingListService} = await import('../services/shoppingListService');
      
      // Convert missing ingredients to shopping list items
      const items = missingIngredients.map(ing => {
        // Parse ingredient string (e.g., "2 cups flour" or "1 tablespoon olive oil")
        const parts = ing.description.trim().split(' ');
        let quantity = '1';
        let unit = '';
        let ingredient = ing.description;

        if (parts.length >= 2) {
          // Try to extract quantity and unit
          const firstPart = parts[0];
          if (!isNaN(Number(firstPart)) || firstPart.match(/^\d+\/\d+$/)) {
            quantity = firstPart;
            unit = parts[1] || '';
            ingredient = parts.slice(2).join(' ') || parts.slice(1).join(' ');
          }
        }

        return {
          ingredient: ingredient || ing.description,
          quantity: quantity,
          unit: unit,
          category: 'Uncategorized',
        };
      });

      // Add items to shopping list
      await shoppingListService.addItems(items);
      
      Alert.alert(
        'Added to Shopping List! 🛒',
        `Added ${missingIngredients.length} missing ingredient${missingIngredients.length > 1 ? 's' : ''} to your shopping list.`,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      Alert.alert('Error', 'Failed to add ingredients to shopping list. Please try again.');
    }
  };

  const adjustServings = (newServings: number) => {
    if (newServings > 0 && onServingsChange) {
      onServingsChange(newServings);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ingredients</Text>
        {onServingsChange && (
          <View style={styles.servingsControl}>
            <TouchableOpacity 
              style={styles.servingsButton}
              onPress={() => adjustServings(servings - 1)}
            >
              <Text style={styles.servingsButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.servingsText}>{servings} servings</Text>
            <TouchableOpacity 
              style={styles.servingsButton}
              onPress={() => adjustServings(servings + 1)}
            >
              <Text style={styles.servingsButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Missing Ingredients Button */}
      {getMissingIngredients().length > 0 && (
        <TouchableOpacity 
          style={styles.shoppingListButton}
          onPress={addMissingToShoppingList}
        >
          <Text style={styles.shoppingListButtonText}>
            🛒 Add {getMissingIngredients().length} Missing to Shopping List
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.list}>
        {ingredients.map((ingredient, index) => {
          const isChecked = checkedIngredients.has(ingredient);
          const isProcessing = processingIngredients.has(ingredient);
          const hasConflict = isConflicting(ingredient);
          const substitution = getSubstitution(ingredient);
          const userHasIngredient = hasIngredient(ingredient);

          return (
            <View key={index} style={styles.ingredientContainer}>
              <View style={[
                styles.ingredientRow,
                userHasIngredient ? styles.hasIngredientRow : styles.needsIngredientRow
              ]}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => toggleIngredient(ingredient)}
                  disabled={isProcessing}
                >
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxText}>
                      {isProcessing ? '⏳' : isChecked ? '✅' : '☐'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <View style={styles.ingredientContent}>
                  <View style={styles.ingredientTextContainer}>
                    {userHasIngredient && (
                      <Text style={styles.hasIngredientIcon}>✓</Text>
                    )}
                    <Text style={[
                      styles.ingredientText,
                      userHasIngredient ? styles.hasIngredientText : styles.needsIngredientText,
                      isChecked && styles.checkedText,
                      hasConflict && styles.conflictText,
                      isProcessing && styles.processingText
                    ]}>
                      {ingredient}
                    </Text>
                    {!userHasIngredient && (
                      <Text style={styles.needsIngredientIcon}>🛒</Text>
                    )}
                  </View>
                  {hasConflict && (
                    <Text style={styles.warningIcon}>⚠️</Text>
                  )}
                </View>
              </View>

              {substitution && (
                <View style={styles.substitutionContainer}>
                  <Text style={styles.substitutionLabel}>Alternative:</Text>
                  <Text style={styles.substitutionText}>
                    {substitution.substitutes[0].ingredient} ({substitution.substitutes[0].ratio})
                  </Text>
                  {substitution.substitutes[0].notes && (
                    <Text style={styles.substitutionNotes}>
                      {substitution.substitutes[0].notes}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  servingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  servingsText: {
    fontSize: 14,
    color: '#666',
  },
  shoppingListButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  shoppingListButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    maxHeight: 300,
  },
  ingredientContainer: {
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  hasIngredientRow: {
    backgroundColor: '#E8F5E8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  needsIngredientRow: {
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    // No additional styling needed
  },
  checkboxText: {
    fontSize: 18,
  },
  ingredientContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hasIngredientIcon: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  needsIngredientIcon: {
    color: '#FF9800',
    fontSize: 16,
    marginLeft: 8,
  },
  ingredientText: {
    fontSize: 16,
    flex: 1,
  },
  hasIngredientText: {
    color: '#2E7D32',
    fontWeight: '500',
  },
  needsIngredientText: {
    color: '#666',
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  processingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  conflictText: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  warningIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  substitutionContainer: {
    marginLeft: 30,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  substitutionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  substitutionText: {
    fontSize: 14,
    color: '#333',
  },
  substitutionNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
});