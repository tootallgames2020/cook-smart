import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {View, Text, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../contexts/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import {IngredientInventoryScreen} from '../screens/ingredients/IngredientInventoryScreen';
import {ErrorBoundary} from '../components/ErrorBoundary';
import {AddIngredientScreen} from '../screens/ingredients/AddIngredientScreen';
import {RecipeSearchScreen} from '../screens/recipes/RecipeSearchScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import {SavedRecipesScreen} from '../screens/recipes/SavedRecipesScreen';
import SubscriptionPlansScreen from '../screens/SubscriptionPlansScreen';
import SubscriptionDetailsScreen from '../screens/SubscriptionDetailsScreen';
import {ShoppingListScreen} from '../screens/ShoppingListScreen';
import ProfileScreen from '../screens/ProfileScreenNew';
import DietaryPreferencesScreen from '../screens/DietaryPreferencesScreen';
import {PrivacySecurityScreen} from '../screens/PrivacySecurityScreen';
import {ChangePasswordScreen} from '../screens/ChangePasswordScreen';
import {DataPolicyScreen} from '../screens/DataPolicyScreen';
import {TwoFactorScreen} from '../screens/TwoFactorScreen';
import {PrivacyPolicyScreen} from '../screens/PrivacyPolicyScreen';
import {TermsOfServiceScreen} from '../screens/TermsOfServiceScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ReferralScreen from '../screens/ReferralScreen';
import MyRecipesScreen from '../screens/MyRecipesScreen';
import CreateRecipeScreen from '../screens/CreateRecipeScreen';
import MealPlanningScreen from '../screens/MealPlanningScreen';
import RecipeCollectionsScreen from '../screens/RecipeCollectionsScreen';
import HolidayPreferencesScreen from '../screens/HolidayPreferencesScreen';
import CommunityFeedScreen from '../screens/CommunityFeedScreen';
import TrendingRecipesScreen from '../screens/TrendingRecipesScreen';
import StepByStepCookingScreen from '../screens/StepByStepCookingScreen';
import AISettingsScreen from '../screens/AISettingsScreen';
import AIMealPlanningScreen from '../screens/AIMealPlanningScreen';
import PredictiveAnalyticsScreen from '../screens/PredictiveAnalyticsScreen';
import MaintenanceBotScreen from '../screens/MaintenanceBotScreen';
import ApexIntelligenceScreen from '../screens/ApexIntelligenceScreen';
import VoiceDemoScreen from '../screens/VoiceDemoScreen';
import FamilyManagementScreen from '../screens/FamilyManagementScreen';
// import PreservationSystemScreen from '../screens/PreservationSystemScreen';
import SeasonalRecipesScreen from '../screens/SeasonalRecipesScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Ingredients Stack Navigator
const IngredientsStack = () => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('🚨 INGREDIENTS STACK ERROR:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }}>
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen
        name="IngredientInventory"
        component={IngredientInventoryScreen}
      />
      <Stack.Screen name="AddIngredient" component={AddIngredientScreen} />
    </Stack.Navigator>
  </ErrorBoundary>
);

// Recipes Stack Navigator
const RecipesStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="RecipeSearch" component={RecipeSearchScreen} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="MyRecipes" component={MyRecipesScreen} />
    <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} />
    <Stack.Screen
      name="StepByStepCooking"
      component={StepByStepCookingScreen}
    />
    <Stack.Screen name="CommunityFeed" component={CommunityFeedScreen} />
    <Stack.Screen name="TrendingRecipes" component={TrendingRecipesScreen} />
    <Stack.Screen name="SeasonalRecipes" component={SeasonalRecipesScreen} />
  </Stack.Navigator>
);

// Saved Recipes Stack Navigator
const SavedRecipesStack = () => (
  <Stack.Navigator
    screenOptions={{headerShown: false}}
    initialRouteName="SavedRecipesList">
    <Stack.Screen name="SavedRecipesList" component={SavedRecipesScreen} />
    <Stack.Screen name="MealPlanning" component={MealPlanningScreen} />
    <Stack.Screen name="Collections" component={RecipeCollectionsScreen} />
  </Stack.Navigator>
);

// Shopping List Stack Navigator
const ShoppingListStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="ShoppingList" component={ShoppingListScreen} />
  </Stack.Navigator>
);

// Account Stack Navigator (with subscription and profile screens)
const AccountStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen
      name="DietaryPreferences"
      component={DietaryPreferencesScreen}
    />
    <Stack.Screen name="AISettings" component={AISettingsScreen} />
    <Stack.Screen name="AIMealPlanning" component={AIMealPlanningScreen} />
    <Stack.Screen name="PredictiveAnalytics" component={PredictiveAnalyticsScreen} />
    <Stack.Screen name="MaintenanceBot" component={MaintenanceBotScreen} />
    <Stack.Screen name="ApexIntelligence" component={ApexIntelligenceScreen} />
    <Stack.Screen name="VoiceDemo" component={VoiceDemoScreen} />
    <Stack.Screen name="FamilyManagement" component={FamilyManagementScreen} />
    {/* <Stack.Screen name="PreservationSystem" component={PreservationSystemScreen} /> */}
    <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen name="DataPolicy" component={DataPolicyScreen} />
    <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
    <Stack.Screen name="PrivacyPolicyView" component={PrivacyPolicyScreen} />
    <Stack.Screen name="TermsOfServiceView" component={TermsOfServiceScreen} />
    <Stack.Screen
      name="NotificationSettings"
      component={NotificationSettingsScreen}
    />
    <Stack.Screen name="Achievements" component={AchievementsScreen} />
    <Stack.Screen name="ReferralScreen" component={ReferralScreen} />
    <Stack.Screen
      name="HolidayPreferences"
      component={HolidayPreferencesScreen}
    />
    <Stack.Screen
      name="SubscriptionDetails"
      component={SubscriptionDetailsScreen}
    />
    <Stack.Screen
      name="SubscriptionPlans"
      component={SubscriptionPlansScreen}
    />
  </Stack.Navigator>
);

const MainTabNavigator = () => {
  const {user} = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: insets.bottom + 5,
          paddingTop: 5,
          height: 60 + insets.bottom,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
          color: '#374151',
        },
        headerRight: () => (
          <View style={styles.headerRight}>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
            {(user?.is_co_founder || user?.is_creator || user?.is_developer) && (
              <View style={styles.coFounderBadgeSmall}>
                <Text style={styles.coFounderTextSmall}>
                  {user?.is_developer ? '💻' : user?.is_creator ? '💕' : '👑'}
                </Text>
              </View>
            )}
          </View>
        ),
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Cook Smart 🍳',
          tabBarLabel: 'Home',
          tabBarIcon: ({color, size}) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Ingredients"
        component={IngredientsStack}
        options={{
          title: 'My Ingredients',
          tabBarLabel: 'Ingredients',
          tabBarIcon: ({color, size}) => (
            <Icon name="kitchen" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Recipes"
        component={RecipesStack}
        options={{
          title: 'Find Recipes',
          tabBarLabel: 'Recipes',
          tabBarIcon: ({color, size}) => (
            <Icon name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SavedRecipes"
        component={SavedRecipesStack}
        options={{
          title: 'Saved Recipes',
          tabBarLabel: 'Saved',
          tabBarIcon: ({color, size}) => (
            <Icon name="favorite" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ShoppingList"
        component={ShoppingListStack}
        options={{
          title: 'Shopping List',
          tabBarLabel: 'Shopping',
          tabBarIcon: ({color, size}) => (
            <Icon name="shopping-cart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountStack}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({color, size}) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 8,
  },
  betaBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  betaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  coFounderBadgeSmall: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coFounderTextSmall: {
    fontSize: 12,
  },
});

export default MainTabNavigator;
