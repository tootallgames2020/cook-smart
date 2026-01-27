import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { mealPlanningService } from '../services/mealPlanningService';

interface MealPlan {
  id: string;
  name: string;
  plan_duration_days: number;
  meals: Meal[];
  nutrition_summary: NutritionSummary;
  shopping_list: ShoppingItem[];
}

interface Meal {
  id: string;
  day: number;
  meal_type: string;
  recipe_name: string;
  estimated_prep_time: number;
  nutrition: NutritionSummary;
}

interface ShoppingItem {
  ingredient: string;
  quantity: string;
}

interface NutritionSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyMealPlan {
  date: string;
  day_of_week: string;
  meals: Meal[];
  daily_nutrition: NutritionSummary;
  prep_time_total: number;
  difficulty_rating: number;
}

export const AIMealPlanningScreen: React.FC = () => {
  const { user } = useAuth();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  
  // Generation preferences
  const [planDuration, setPlanDuration] = useState(7);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [targetNutrition, setTargetNutrition] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
  });

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      setLoading(true);
      const plans = await mealPlanningService.getUserMealPlans();
      setMealPlans(plans);
    } catch (error) {
      console.error('Error loading meal plans:', error);
      Alert.alert('Error', 'Could not load meal plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateMealPlan = async () => {
    try {
      setGenerating(true);
      setGenerateModalVisible(false);

      const planRequest = {
        plan_duration_days: planDuration,
        dietary_restrictions: dietaryRestrictions,
        target_nutrition: targetNutrition,
        preferences: {
          cuisine_types: ['american', 'italian', 'mexican'],
          cooking_skill_level: 'intermediate',
          max_prep_time: 60,
          budget_per_meal: 15,
        },
      };

      const newPlan = await mealPlanningService.generateMealPlan(planRequest);
      
      Alert.alert(
        'Meal Plan Generated!',
        `Your ${planDuration}-day meal plan "${newPlan.name}" is ready.`,
        [
          { text: 'View Plan', onPress: () => setSelectedPlan(newPlan) },
          { text: 'OK' },
        ]
      );

      await loadMealPlans();
    } catch (error) {
      console.error('Error generating meal plan:', error);
      Alert.alert('Error', 'Could not generate meal plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const deleteMealPlan = (planId: string, planName: string) => {
    Alert.alert(
      'Delete Meal Plan',
      `Delete "${planName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await mealPlanningService.deleteMealPlan(planId);
              await loadMealPlans();
              Alert.alert('Success', 'Meal plan deleted.');
            } catch (error) {
              Alert.alert('Error', 'Could not delete meal plan.');
            }
          },
        },
      ]
    );
  };

  const exportShoppingList = async (planId: string) => {
    try {
      const shoppingList = await mealPlanningService.getMealPlanShoppingList(planId);
      
      Alert.alert(
        'Shopping List',
        `Shopping list for this meal plan:\n\n${shoppingList.items.map(item => 
          `• ${item.ingredient} - ${item.quantity}`
        ).join('\n')}`,
        [
          { text: 'Add to Shopping List', onPress: () => addToShoppingList(shoppingList.items) },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not export shopping list.');
    }
  };

  const addToShoppingList = async (items: ShoppingItem[]) => {
    try {
      // This would integrate with the shopping list service
      Alert.alert('Success', `Added ${items.length} items to your shopping list.`);
    } catch (error) {
      Alert.alert('Error', 'Could not add items to shopping list.');
    }
  };

  const getDayName = (dayNumber: number): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const targetDate = new Date(today.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000);
    return days[targetDate.getDay()];
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'wb-sunny';
      case 'lunch': return 'restaurant';
      case 'dinner': return 'nights-stay';
      case 'snack': return 'local-dining';
      default: return 'restaurant';
    }
  };

  const renderMealPlanCard = (plan: MealPlan) => (
    <TouchableOpacity
      key={plan.id}
      style={styles.planCard}
      onPress={() => setSelectedPlan(plan)}
    >
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        <TouchableOpacity
          onPress={() => deleteMealPlan(plan.id, plan.name)}
        >
          <Icon name="delete" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.planDuration}>
        {plan.plan_duration_days} days • {plan.meals.length} meals
      </Text>
      
      <View style={styles.nutritionPreview}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{plan.nutrition_summary.calories}</Text>
          <Text style={styles.nutritionLabel}>cal/day</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{plan.nutrition_summary.protein}g</Text>
          <Text style={styles.nutritionLabel}>protein</Text>
        </View>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{plan.shopping_list.length}</Text>
          <Text style={styles.nutritionLabel}>ingredients</Text>
        </View>
      </View>

      <View style={styles.planActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => exportShoppingList(plan.id)}
        >
          <Icon name="list" size={16} color="#4ECDC4" />
          <Text style={styles.actionButtonText}>Shopping List</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderMealPlanDetails = () => {
    if (!selectedPlan) return null;

    const mealsByDay = selectedPlan.meals.reduce((acc, meal) => {
      if (!acc[meal.day]) acc[meal.day] = [];
      acc[meal.day].push(meal);
      return acc;
    }, {} as Record<number, Meal[]>);

    return (
      <Modal
        visible={!!selectedPlan}
        animationType="slide"
        onRequestClose={() => setSelectedPlan(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedPlan.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPlan(null)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {Object.entries(mealsByDay).map(([day, meals]) => (
              <View key={day} style={styles.daySection}>
                <Text style={styles.dayTitle}>
                  Day {day} - {getDayName(parseInt(day))}
                </Text>
                
                {meals.map((meal) => (
                  <View key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealHeader}>
                      <Icon 
                        name={getMealIcon(meal.meal_type)} 
                        size={20} 
                        color="#4ECDC4" 
                      />
                      <Text style={styles.mealType}>
                        {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                      </Text>
                      <Text style={styles.prepTime}>{meal.estimated_prep_time} min</Text>
                    </View>
                    
                    <Text style={styles.recipeName}>{meal.recipe_name}</Text>
                    
                    <View style={styles.mealNutrition}>
                      <Text style={styles.nutritionText}>
                        {meal.nutrition.calories} cal • {meal.nutrition.protein}g protein
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.shoppingSection}>
              <Text style={styles.sectionTitle}>Shopping List</Text>
              {selectedPlan.shopping_list.map((item, index) => (
                <View key={index} style={styles.shoppingItem}>
                  <Text style={styles.ingredientName}>{item.ingredient}</Text>
                  <Text style={styles.ingredientQuantity}>{item.quantity}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading meal plans...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Meal Planning</Text>
        <Text style={styles.subtitle}>
          Let AI create personalized meal plans based on your preferences and nutrition goals
        </Text>
      </View>

      {/* Generate New Plan Button */}
      <View style={styles.generateSection}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => setGenerateModalVisible(true)}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Icon name="auto-awesome" size={24} color="white" />
          )}
          <Text style={styles.generateButtonText}>
            {generating ? 'Generating...' : 'Generate New Meal Plan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Meal Plans List */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionTitle}>Your Meal Plans</Text>
        
        {mealPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="restaurant" size={60} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Meal Plans Yet</Text>
            <Text style={styles.emptySubtitle}>
              Generate your first AI-powered meal plan to get started
            </Text>
          </View>
        ) : (
          mealPlans.map(renderMealPlanCard)
        )}
      </View>

      {/* Generate Modal */}
      <Modal
        visible={generateModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.generateModalContainer}>
            <Text style={styles.modalTitle}>Generate Meal Plan</Text>
            
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Plan Duration</Text>
              <View style={styles.durationButtons}>
                {[3, 7, 14].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.durationButton,
                      planDuration === days && styles.durationButtonActive,
                    ]}
                    onPress={() => setPlanDuration(days)}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      planDuration === days && styles.durationButtonTextActive,
                    ]}>
                      {days} days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Daily Calorie Target</Text>
              <TextInput
                style={styles.textInput}
                value={targetNutrition.calories.toString()}
                onChangeText={(text) => setTargetNutrition(prev => ({
                  ...prev,
                  calories: parseInt(text) || 2000
                }))}
                keyboardType="numeric"
                placeholder="2000"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setGenerateModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={generateMealPlan}
              >
                <Text style={styles.confirmButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderMealPlanDetails()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  generateSection: {
    padding: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 15,
    borderRadius: 12,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 10,
  },
  plansSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 15,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  planCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  planDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  nutritionPreview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  planActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F8F5',
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '600',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  daySection: {
    marginBottom: 25,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  mealCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
    marginLeft: 8,
    flex: 1,
  },
  prepTime: {
    fontSize: 12,
    color: '#666',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  mealNutrition: {
    marginTop: 4,
  },
  nutritionText: {
    fontSize: 12,
    color: '#666',
  },
  shoppingSection: {
    marginTop: 20,
  },
  shoppingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ingredientName: {
    fontSize: 14,
    color: '#2C3E50',
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateModalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  durationButtonActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#E8F8F5',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  durationButtonTextActive: {
    color: '#4ECDC4',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default AIMealPlanningScreen;