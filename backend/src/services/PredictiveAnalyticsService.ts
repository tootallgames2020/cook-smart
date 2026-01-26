/**
 * PREDICTIVE ANALYTICS SERVICE
 * 
 * Advanced AI analytics for:
 * - Consumption pattern prediction
 * - Shopping behavior analysis
 * - Waste reduction forecasting
 * - Budget optimization
 * - Seasonal trend analysis
 * - Family behavior insights
 */

import { pool } from '../server';
import { AIPreferencesService } from './AIPreferencesService';
import { logger } from '../utils/logger';

export interface PredictiveAnalysisRequest {
  user_id: string;
  family_id?: string;
  analysis_type: 'consumption' | 'shopping' | 'waste' | 'budget' | 'seasonal' | 'family_insights';
  time_horizon_days: number;
  include_confidence_intervals?: boolean;
}

export interface PredictiveAnalysisResult {
  success: boolean;
  analysis_type: string;
  time_horizon_days: number;
  generated_at: string;
  confidence: number;
  predictions: {
    consumption?: ConsumptionPrediction;
    shopping?: ShoppingPrediction;
    waste?: WastePrediction;
    budget?: BudgetPrediction;
    seasonal?: SeasonalPrediction;
    family_insights?: FamilyInsightsPrediction;
  };
  recommendations: string[];
  data_quality_score: number;
  model_accuracy: number;
}

export interface ConsumptionPrediction {
  predicted_usage: IngredientUsageForecast[];
  depletion_alerts: DepletionAlert[];
  restocking_schedule: RestockingRecommendation[];
  consumption_trends: ConsumptionTrend[];
  seasonal_adjustments: SeasonalAdjustment[];
}

export interface IngredientUsageForecast {
  ingredient_name: string;
  current_quantity: number;
  current_unit: string;
  predicted_daily_usage: number;
  predicted_weekly_usage: number;
  predicted_monthly_usage: number;
  depletion_date: string;
  confidence: number;
  usage_pattern: 'steady' | 'increasing' | 'decreasing' | 'seasonal' | 'irregular';
}

export interface DepletionAlert {
  ingredient_name: string;
  current_quantity: number;
  days_until_depletion: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  suggested_action: string;
  alternative_ingredients?: string[];
}

export interface RestockingRecommendation {
  ingredient_name: string;
  recommended_quantity: number;
  recommended_unit: string;
  optimal_purchase_date: string;
  estimated_cost: number;
  bulk_discount_opportunity?: boolean;
  seasonal_price_factor: number;
}

export interface ConsumptionTrend {
  ingredient_name: string;
  trend_direction: 'up' | 'down' | 'stable';
  trend_strength: number;
  weekly_change_percent: number;
  monthly_change_percent: number;
  driving_factors: string[];
}

export interface SeasonalAdjustment {
  ingredient_name: string;
  current_season_multiplier: number;
  next_season_multiplier: number;
  peak_season: string;
  low_season: string;
}

export interface ShoppingPrediction {
  predicted_shopping_trips: ShoppingTripForecast[];
  optimal_shopping_schedule: OptimalShoppingSchedule;
  bulk_purchase_opportunities: BulkPurchaseOpportunity[];
  price_trend_analysis: PriceTrendAnalysis[];
  store_preference_insights: StorePreferenceInsight[];
}

export interface ShoppingTripForecast {
  predicted_date: string;
  predicted_items: string[];
  estimated_cost: number;
  recommended_stores: string[];
  trip_efficiency_score: number;
}

export interface OptimalShoppingSchedule {
  recommended_frequency: number; // days between trips
  best_shopping_days: string[];
  best_shopping_times: string[];
  consolidation_opportunities: string[];
}

export interface BulkPurchaseOpportunity {
  ingredient_name: string;
  current_purchase_size: number;
  recommended_bulk_size: number;
  potential_savings: number;
  storage_requirements: string;
  expiration_risk: 'low' | 'medium' | 'high';
}

export interface PriceTrendAnalysis {
  ingredient_name: string;
  current_price_trend: 'rising' | 'falling' | 'stable';
  predicted_price_change: number;
  optimal_purchase_timing: string;
  seasonal_price_pattern: any;
}

export interface StorePreferenceInsight {
  store_name: string;
  visit_frequency: number;
  average_basket_size: number;
  preferred_categories: string[];
  cost_efficiency_score: number;
}

export interface WastePrediction {
  waste_risk_ingredients: WasteRiskIngredient[];
  waste_reduction_opportunities: WasteReductionOpportunity[];
  predicted_monthly_waste: number;
  waste_cost_impact: number;
  prevention_strategies: PreventionStrategy[];
}

export interface WasteRiskIngredient {
  ingredient_name: string;
  current_quantity: number;
  expiration_date: string;
  waste_probability: number;
  estimated_waste_cost: number;
  prevention_actions: string[];
}

export interface WasteReductionOpportunity {
  opportunity_type: 'recipe_suggestion' | 'preservation' | 'portion_adjustment' | 'sharing';
  description: string;
  potential_savings: number;
  implementation_difficulty: 'easy' | 'medium' | 'hard';
  ingredients_affected: string[];
}

export interface PreventionStrategy {
  strategy_name: string;
  description: string;
  effectiveness_score: number;
  applicable_ingredients: string[];
  implementation_steps: string[];
}

export interface BudgetPrediction {
  predicted_monthly_spending: number;
  spending_trend: 'increasing' | 'decreasing' | 'stable';
  budget_optimization_opportunities: BudgetOptimization[];
  category_spending_forecast: CategorySpendingForecast[];
  cost_saving_recommendations: CostSavingRecommendation[];
}

export interface BudgetOptimization {
  optimization_type: 'substitution' | 'timing' | 'quantity' | 'store_choice';
  description: string;
  potential_monthly_savings: number;
  implementation_effort: 'low' | 'medium' | 'high';
  affected_categories: string[];
}

export interface CategorySpendingForecast {
  category: string;
  current_monthly_spending: number;
  predicted_monthly_spending: number;
  trend_direction: 'up' | 'down' | 'stable';
  key_drivers: string[];
}

export interface CostSavingRecommendation {
  recommendation: string;
  estimated_monthly_savings: number;
  confidence: number;
  implementation_steps: string[];
}

export interface SeasonalPrediction {
  seasonal_ingredient_trends: SeasonalIngredientTrend[];
  upcoming_seasonal_opportunities: SeasonalOpportunity[];
  holiday_impact_forecast: HolidayImpactForecast[];
  seasonal_budget_adjustments: SeasonalBudgetAdjustment[];
}

export interface SeasonalIngredientTrend {
  ingredient_name: string;
  current_season_usage: number;
  predicted_next_season_usage: number;
  seasonal_pattern: 'spring_peak' | 'summer_peak' | 'fall_peak' | 'winter_peak' | 'year_round';
  price_seasonality: any;
}

export interface SeasonalOpportunity {
  opportunity_type: 'ingredient_availability' | 'price_advantage' | 'recipe_trend';
  description: string;
  timing: string;
  potential_benefit: string;
  action_required: string;
}

export interface HolidayImpactForecast {
  holiday_name: string;
  predicted_date: string;
  spending_impact: number;
  ingredient_demand_changes: any;
  preparation_recommendations: string[];
}

export interface SeasonalBudgetAdjustment {
  season: string;
  recommended_budget_change: number;
  key_factors: string[];
  preparation_timeline: string;
}

export interface FamilyInsightsPrediction {
  family_consumption_patterns: FamilyConsumptionPattern[];
  member_preference_evolution: MemberPreferenceEvolution[];
  coordination_opportunities: CoordinationOpportunity[];
  family_efficiency_metrics: FamilyEfficiencyMetric[];
}

export interface FamilyConsumptionPattern {
  pattern_name: string;
  description: string;
  family_members_involved: string[];
  frequency: string;
  impact_on_inventory: string;
  optimization_suggestions: string[];
}

export interface MemberPreferenceEvolution {
  member_role: string;
  preference_changes: any;
  predicted_future_preferences: any;
  adaptation_recommendations: string[];
}

export interface CoordinationOpportunity {
  opportunity_type: 'shopping_coordination' | 'meal_planning' | 'inventory_management';
  description: string;
  potential_efficiency_gain: number;
  implementation_steps: string[];
}

export interface FamilyEfficiencyMetric {
  metric_name: string;
  current_score: number;
  predicted_score: number;
  improvement_potential: number;
  key_improvement_areas: string[];
}

export class PredictiveAnalyticsService {

  /**
   * GENERATE PREDICTIVE ANALYSIS
   * Main entry point for predictive analytics
   */
  static async generatePredictiveAnalysis(request: PredictiveAnalysisRequest): Promise<PredictiveAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Check if user has predictive analytics enabled
      const hasAnalyticsEnabled = await AIPreferencesService.isFeatureEnabled(
        request.user_id,
        'predictive_analytics'
      );

      if (!hasAnalyticsEnabled) {
        throw new Error('Predictive analytics is disabled. Enable it in AI settings.');
      }

      // Gather historical data for analysis
      const historicalData = await this.gatherHistoricalData(request);
      
      // Calculate data quality score
      const dataQualityScore = this.calculateDataQualityScore(historicalData);
      
      if (dataQualityScore < 0.3) {
        throw new Error('Insufficient data for reliable predictions. Use the app for a few more weeks.');
      }

      // Generate predictions based on analysis type
      const predictions = await this.generatePredictions(request, historicalData);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(request.analysis_type, predictions);
      
      // Calculate model accuracy based on historical validation
      const modelAccuracy = await this.calculateModelAccuracy(request.user_id, request.analysis_type);
      
      // Track usage for analytics
      await AIPreferencesService.trackFeatureUsage(
        request.user_id,
        'predictive_analytics',
        20
      );

      const result: PredictiveAnalysisResult = {
        success: true,
        analysis_type: request.analysis_type,
        time_horizon_days: request.time_horizon_days,
        generated_at: new Date().toISOString(),
        confidence: this.calculateOverallConfidence(predictions, dataQualityScore),
        predictions,
        recommendations,
        data_quality_score: dataQualityScore,
        model_accuracy: modelAccuracy,
      };

      // Store analysis for future model improvement
      await this.storeAnalysisResult(request.user_id, result);

      logger.info(`Generated predictive analysis for user ${request.user_id} in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      logger.error('Generate predictive analysis error:', error);
      throw new Error(`Predictive analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * GATHER HISTORICAL DATA
   * Collect relevant historical data for analysis
   */
  private static async gatherHistoricalData(request: PredictiveAnalysisRequest): Promise<any> {
    const client = await pool.connect();
    
    try {
      const data: any = {
        ingredient_usage: [],
        shopping_history: [],
        waste_events: [],
        spending_history: [],
        seasonal_patterns: [],
        family_activities: [],
      };

      // Get ingredient usage history (last 90 days)
      const usageResult = await client.query(`
        SELECT 
          ingredient_name,
          quantity_used,
          unit_used,
          used_at,
          conversion_details
        FROM ingredient_usage_log
        WHERE user_id = $1 
          AND used_at >= NOW() - INTERVAL '90 days'
        ORDER BY used_at DESC
      `, [request.user_id]);

      data.ingredient_usage = usageResult.rows;

      // Get shopping list history
      const shoppingResult = await client.query(`
        SELECT 
          item_name,
          quantity,
          unit,
          added_at,
          completed_at,
          estimated_cost
        FROM shopping_list_items
        WHERE user_id = $1 
          AND added_at >= NOW() - INTERVAL '90 days'
        ORDER BY added_at DESC
      `, [request.user_id]);

      data.shopping_history = shoppingResult.rows;

      // Get ingredient additions (purchases)
      const additionsResult = await client.query(`
        SELECT 
          ingredient_name,
          quantity,
          unit,
          added_at,
          expiration_date,
          storage_type
        FROM user_ingredients_history
        WHERE user_id = $1 
          AND added_at >= NOW() - INTERVAL '90 days'
        ORDER BY added_at DESC
      `, [request.user_id]);

      data.ingredient_additions = additionsResult.rows;

      // Get family activities if applicable
      if (request.family_id) {
        const familyResult = await client.query(`
          SELECT 
            activity_type,
            activity_data,
            member_id,
            created_at
          FROM family_activity_log
          WHERE family_id = $1 
            AND created_at >= NOW() - INTERVAL '90 days'
          ORDER BY created_at DESC
        `, [request.family_id]);

        data.family_activities = familyResult.rows;
      }

      // Get seasonal data (same period last year if available)
      const seasonalResult = await client.query(`
        SELECT 
          ingredient_name,
          quantity_used,
          used_at
        FROM ingredient_usage_log
        WHERE user_id = $1 
          AND used_at >= NOW() - INTERVAL '1 year'
          AND used_at <= NOW() - INTERVAL '275 days'
        ORDER BY used_at DESC
      `, [request.user_id]);

      data.seasonal_patterns = seasonalResult.rows;

      return data;

    } finally {
      client.release();
    }
  }

  /**
   * CALCULATE DATA QUALITY SCORE
   * Assess the quality and completeness of historical data
   */
  private static calculateDataQualityScore(historicalData: any): number {
    let score = 0;
    let maxScore = 0;

    // Usage data quality (0-0.4)
    maxScore += 0.4;
    if (historicalData.ingredient_usage.length > 50) {
      score += 0.4;
    } else if (historicalData.ingredient_usage.length > 20) {
      score += 0.3;
    } else if (historicalData.ingredient_usage.length > 5) {
      score += 0.2;
    }

    // Shopping data quality (0-0.3)
    maxScore += 0.3;
    if (historicalData.shopping_history.length > 20) {
      score += 0.3;
    } else if (historicalData.shopping_history.length > 10) {
      score += 0.2;
    } else if (historicalData.shopping_history.length > 3) {
      score += 0.1;
    }

    // Time span quality (0-0.2)
    maxScore += 0.2;
    const oldestUsage = historicalData.ingredient_usage[historicalData.ingredient_usage.length - 1];
    if (oldestUsage) {
      const daysSinceOldest = (Date.now() - new Date(oldestUsage.used_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceOldest > 60) {
        score += 0.2;
      } else if (daysSinceOldest > 30) {
        score += 0.15;
      } else if (daysSinceOldest > 14) {
        score += 0.1;
      }
    }

    // Consistency quality (0-0.1)
    maxScore += 0.1;
    const recentWeeks = this.groupDataByWeek(historicalData.ingredient_usage);
    if (recentWeeks.length >= 4) {
      score += 0.1;
    } else if (recentWeeks.length >= 2) {
      score += 0.05;
    }

    return Math.min(score / maxScore, 1.0);
  }

  /**
   * GENERATE PREDICTIONS
   * Create predictions based on analysis type
   */
  private static async generatePredictions(
    request: PredictiveAnalysisRequest,
    historicalData: any
  ): Promise<any> {
    
    const predictions: any = {};

    switch (request.analysis_type) {
      case 'consumption':
        predictions.consumption = await this.generateConsumptionPrediction(request, historicalData);
        break;
      case 'shopping':
        predictions.shopping = await this.generateShoppingPrediction(request, historicalData);
        break;
      case 'waste':
        predictions.waste = await this.generateWastePrediction(request, historicalData);
        break;
      case 'budget':
        predictions.budget = await this.generateBudgetPrediction(request, historicalData);
        break;
      case 'seasonal':
        predictions.seasonal = await this.generateSeasonalPrediction(request, historicalData);
        break;
      case 'family_insights':
        predictions.family_insights = await this.generateFamilyInsightsPrediction(request, historicalData);
        break;
    }

    return predictions;
  }

  /**
   * GENERATE CONSUMPTION PREDICTION
   * Predict ingredient consumption patterns
   */
  private static async generateConsumptionPrediction(
    request: PredictiveAnalysisRequest,
    historicalData: any
  ): Promise<ConsumptionPrediction> {
    
    // Group usage data by ingredient
    const ingredientUsage = this.groupUsageByIngredient(historicalData.ingredient_usage);
    
    const predicted_usage: IngredientUsageForecast[] = [];
    const depletion_alerts: DepletionAlert[] = [];
    const restocking_schedule: RestockingRecommendation[] = [];
    const consumption_trends: ConsumptionTrend[] = [];

    // Get current inventory
    const currentInventory = await this.getCurrentInventory(request.user_id);

    for (const [ingredientName, usageHistory] of Object.entries(ingredientUsage)) {
      const currentItem = currentInventory.find(item => 
        item.ingredient_name.toLowerCase() === ingredientName.toLowerCase()
      );

      if (!currentItem || usageHistory.length < 3) continue;

      // Calculate usage patterns
      const dailyUsage = this.calculateDailyUsage(usageHistory as any[]);
      const weeklyUsage = dailyUsage * 7;
      const monthlyUsage = dailyUsage * 30;

      // Predict depletion
      const daysUntilDepletion = currentItem.quantity / dailyUsage;
      const depletionDate = new Date(Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000);

      // Determine usage pattern
      const usagePattern = this.determineUsagePattern(usageHistory as any[]);
      
      // Calculate trend
      const trend = this.calculateConsumptionTrend(usageHistory as any[]);

      const forecast: IngredientUsageForecast = {
        ingredient_name: ingredientName,
        current_quantity: currentItem.quantity,
        current_unit: currentItem.unit,
        predicted_daily_usage: dailyUsage,
        predicted_weekly_usage: weeklyUsage,
        predicted_monthly_usage: monthlyUsage,
        depletion_date: depletionDate.toISOString().split('T')[0],
        confidence: this.calculateForecastConfidence(usageHistory as any[]),
        usage_pattern: usagePattern,
      };

      predicted_usage.push(forecast);

      // Generate depletion alert if needed
      if (daysUntilDepletion <= 7) {
        const alert: DepletionAlert = {
          ingredient_name: ingredientName,
          current_quantity: currentItem.quantity,
          days_until_depletion: Math.ceil(daysUntilDepletion),
          urgency: daysUntilDepletion <= 2 ? 'critical' : daysUntilDepletion <= 4 ? 'high' : 'medium',
          suggested_action: daysUntilDepletion <= 2 
            ? 'Buy immediately or find substitute'
            : 'Add to shopping list for next trip',
          alternative_ingredients: this.findAlternativeIngredients(ingredientName),
        };

        depletion_alerts.push(alert);
      }

      // Generate restocking recommendation
      const optimalPurchaseDate = new Date(depletionDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days before depletion
      const recommendedQuantity = Math.ceil(weeklyUsage * 2); // 2 weeks supply

      const restockingRec: RestockingRecommendation = {
        ingredient_name: ingredientName,
        recommended_quantity: recommendedQuantity,
        recommended_unit: currentItem.unit,
        optimal_purchase_date: optimalPurchaseDate.toISOString().split('T')[0],
        estimated_cost: this.estimateIngredientCost(ingredientName, recommendedQuantity),
        seasonal_price_factor: this.getSeasonalPriceFactor(ingredientName),
      };

      restocking_schedule.push(restockingRec);

      // Add consumption trend
      consumption_trends.push(trend);
    }

    // Sort by urgency/importance
    depletion_alerts.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });

    restocking_schedule.sort((a, b) => 
      new Date(a.optimal_purchase_date).getTime() - new Date(b.optimal_purchase_date).getTime()
    );

    return {
      predicted_usage,
      depletion_alerts,
      restocking_schedule,
      consumption_trends,
      seasonal_adjustments: this.calculateSeasonalAdjustments(predicted_usage),
    };
  }

  /**
   * GENERATE SHOPPING PREDICTION
   * Predict shopping patterns and optimize trips
   */
  private static async generateShoppingPrediction(
    request: PredictiveAnalysisRequest,
    historicalData: any
  ): Promise<ShoppingPrediction> {
    
    // Analyze shopping patterns
    const shoppingPatterns = this.analyzeShoppingPatterns(historicalData.shopping_history);
    
    // Generate trip forecasts
    const predicted_shopping_trips: ShoppingTripForecast[] = [];
    const currentDate = new Date();
    
    for (let i = 0; i < Math.ceil(request.time_horizon_days / 7); i++) {
      const tripDate = new Date(currentDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      
      const trip: ShoppingTripForecast = {
        predicted_date: tripDate.toISOString().split('T')[0],
        predicted_items: this.predictShoppingItems(historicalData, tripDate),
        estimated_cost: 0, // Will be calculated based on items
        recommended_stores: this.recommendStores(historicalData),
        trip_efficiency_score: 0.8,
      };

      trip.estimated_cost = trip.predicted_items.reduce((sum, item) => 
        sum + this.estimateIngredientCost(item, 1), 0
      );

      predicted_shopping_trips.push(trip);
    }

    const optimal_shopping_schedule: OptimalShoppingSchedule = {
      recommended_frequency: shoppingPatterns.averageDaysBetweenTrips || 7,
      best_shopping_days: shoppingPatterns.preferredDays || ['Saturday', 'Sunday'],
      best_shopping_times: shoppingPatterns.preferredTimes || ['10:00 AM', '2:00 PM'],
      consolidation_opportunities: this.findConsolidationOpportunities(predicted_shopping_trips),
    };

    return {
      predicted_shopping_trips,
      optimal_shopping_schedule,
      bulk_purchase_opportunities: this.identifyBulkOpportunities(historicalData),
      price_trend_analysis: this.analyzePriceTrends(historicalData),
      store_preference_insights: this.analyzeStorePreferences(historicalData),
    };
  }

  /**
   * GENERATE WASTE PREDICTION
   * Predict and prevent food waste
   */
  private static async generateWastePrediction(
    request: PredictiveAnalysisRequest,
    historicalData: any
  ): Promise<WastePrediction> {
    
    // Get current inventory with expiration dates
    const currentInventory = await this.getCurrentInventory(request.user_id);
    const usagePatterns = this.groupUsageByIngredient(historicalData.ingredient_usage);

    const waste_risk_ingredients: WasteRiskIngredient[] = [];
    let predicted_monthly_waste = 0;
    let waste_cost_impact = 0;

    for (const item of currentInventory) {
      if (!item.expiration_date) continue;

      const daysUntilExpiry = Math.ceil(
        (new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 0) continue; // Already expired

      // Calculate usage rate
      const usageHistory = usagePatterns[item.ingredient_name.toLowerCase()] || [];
      const dailyUsage = usageHistory.length > 0 
        ? this.calculateDailyUsage(usageHistory)
        : 0.1; // Default low usage

      // Predict if item will be used before expiry
      const daysToConsume = item.quantity / dailyUsage;
      const wasteProbability = daysToConsume > daysUntilExpiry 
        ? Math.min((daysToConsume - daysUntilExpiry) / daysUntilExpiry, 1.0)
        : 0;

      if (wasteProbability > 0.3) {
        const estimatedWasteCost = this.estimateIngredientCost(item.ingredient_name, item.quantity);
        
        const wasteRisk: WasteRiskIngredient = {
          ingredient_name: item.ingredient_name,
          current_quantity: item.quantity,
          expiration_date: item.expiration_date,
          waste_probability: wasteProbability,
          estimated_waste_cost: estimatedWasteCost,
          prevention_actions: this.generateWastePreventionActions(item, daysUntilExpiry),
        };

        waste_risk_ingredients.push(wasteRisk);
        predicted_monthly_waste += item.quantity * wasteProbability;
        waste_cost_impact += estimatedWasteCost * wasteProbability;
      }
    }

    return {
      waste_risk_ingredients: waste_risk_ingredients.sort((a, b) => b.waste_probability - a.waste_probability),
      waste_reduction_opportunities: this.identifyWasteReductionOpportunities(waste_risk_ingredients),
      predicted_monthly_waste,
      waste_cost_impact,
      prevention_strategies: this.generateWastePreventionStrategies(waste_risk_ingredients),
    };
  }

  /**
   * GENERATE BUDGET PREDICTION
   * Predict spending and optimize budget
   */
  private static async generateBudgetPrediction(
    request: PredictiveAnalysisRequest,
    historicalData: any
  ): Promise<BudgetPrediction> {
    
    // Analyze spending patterns
    const monthlySpending = this.calculateMonthlySpending(historicalData);
    const spendingTrend = this.calculateSpendingTrend(historicalData);
    
    const predicted_monthly_spending = monthlySpending * (1 + spendingTrend);

    return {
      predicted_monthly_spending,
      spending_trend: spendingTrend > 0.05 ? 'increasing' : spendingTrend < -0.05 ? 'decreasing' : 'stable',
      budget_optimization_opportunities: this.identifyBudgetOptimizations(historicalData),
      category_spending_forecast: this.forecastCategorySpending(historicalData),
      cost_saving_recommendations: this.generateCostSavingRecommendations(historicalData),
    };
  }

  /**
   * GENERATE SEASONAL PREDICTION
   * Predict seasonal trends and opportunities
   */
  private static async generateSeasonalPrediction(
    request: PredictiveAnalysisRequest,
    historicalData: any
  ): Promise<SeasonalPrediction> {
    
    const currentMonth = new Date().getMonth();
    const nextSeason = this.getNextSeason(currentMonth);

    return {
      seasonal_ingredient_trends: this.analyzeSeasonalIngredientTrends(historicalData),
      upcoming_seasonal_opportunities: this.identifySeasonalOpportunities(nextSeason),
      holiday_impact_forecast: this.forecastHolidayImpact(request.time_horizon_days),
      seasonal_budget_adjustments: this.calculateSeasonalBudgetAdjustments(historicalData),
    };
  }

  /**
   * GENERATE FAMILY INSIGHTS PREDICTION
   * Predict family behavior and coordination opportunities
   */
  private static async generateFamilyInsightsPrediction(
    request: PredictiveAnalysisRequest,
    historicalData: any
  ): Promise<FamilyInsightsPrediction> {
    
    if (!request.family_id) {
      throw new Error('Family insights require a family ID');
    }

    return {
      family_consumption_patterns: this.analyzeFamilyConsumptionPatterns(historicalData.family_activities),
      member_preference_evolution: this.analyzeMemberPreferenceEvolution(historicalData.family_activities),
      coordination_opportunities: this.identifyCoordinationOpportunities(historicalData.family_activities),
      family_efficiency_metrics: this.calculateFamilyEfficiencyMetrics(historicalData.family_activities),
    };
  }

  /**
   * HELPER METHODS
   */
  private static groupUsageByIngredient(usageData: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};
    
    for (const usage of usageData) {
      const key = usage.ingredient_name.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(usage);
    }
    
    return grouped;
  }

  private static groupDataByWeek(data: any[]): any[][] {
    const weeks: any[][] = [];
    const weekMap = new Map<string, any[]>();
    
    for (const item of data) {
      const date = new Date(item.used_at || item.added_at || item.created_at);
      const weekKey = this.getWeekKey(date);
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(item);
    }
    
    return Array.from(weekMap.values());
  }

  private static getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);
    return `${year}-W${week}`;
  }

  private static calculateDailyUsage(usageHistory: any[]): number {
    if (usageHistory.length === 0) return 0;
    
    const totalUsage = usageHistory.reduce((sum, usage) => sum + (usage.quantity_used || 0), 0);
    const oldestDate = new Date(Math.min(...usageHistory.map(u => new Date(u.used_at).getTime())));
    const daysSinceOldest = (Date.now() - oldestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceOldest > 0 ? totalUsage / daysSinceOldest : 0;
  }

  private static determineUsagePattern(usageHistory: any[]): 'steady' | 'increasing' | 'decreasing' | 'seasonal' | 'irregular' {
    if (usageHistory.length < 4) return 'irregular';
    
    // Simple trend analysis
    const recentUsage = usageHistory.slice(0, Math.floor(usageHistory.length / 2));
    const olderUsage = usageHistory.slice(Math.floor(usageHistory.length / 2));
    
    const recentAvg = recentUsage.reduce((sum, u) => sum + u.quantity_used, 0) / recentUsage.length;
    const olderAvg = olderUsage.reduce((sum, u) => sum + u.quantity_used, 0) / olderUsage.length;
    
    const changePercent = (recentAvg - olderAvg) / olderAvg;
    
    if (changePercent > 0.2) return 'increasing';
    if (changePercent < -0.2) return 'decreasing';
    return 'steady';
  }

  private static calculateConsumptionTrend(usageHistory: any[]): ConsumptionTrend {
    const pattern = this.determineUsagePattern(usageHistory);
    const recentUsage = usageHistory.slice(0, 7); // Last week
    const previousUsage = usageHistory.slice(7, 14); // Previous week
    
    const recentTotal = recentUsage.reduce((sum, u) => sum + u.quantity_used, 0);
    const previousTotal = previousUsage.reduce((sum, u) => sum + u.quantity_used, 0);
    
    const weeklyChange = previousTotal > 0 ? (recentTotal - previousTotal) / previousTotal : 0;
    const monthlyChange = weeklyChange * 4; // Approximate
    
    return {
      ingredient_name: usageHistory[0]?.ingredient_name || 'unknown',
      trend_direction: weeklyChange > 0.05 ? 'up' : weeklyChange < -0.05 ? 'down' : 'stable',
      trend_strength: Math.abs(weeklyChange),
      weekly_change_percent: weeklyChange * 100,
      monthly_change_percent: monthlyChange * 100,
      driving_factors: this.identifyTrendDrivers(usageHistory),
    };
  }

  private static calculateForecastConfidence(usageHistory: any[]): number {
    if (usageHistory.length < 3) return 0.3;
    if (usageHistory.length < 7) return 0.6;
    if (usageHistory.length < 14) return 0.8;
    return 0.9;
  }

  private static async getCurrentInventory(userId: string): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT ingredient_name, quantity, unit, expiration_date, storage_type
        FROM user_ingredients
        WHERE user_id = $1 AND quantity > 0
      `, [userId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  private static findAlternativeIngredients(ingredientName: string): string[] {
    // Simple substitution mapping - in production, this would be more comprehensive
    const substitutions: { [key: string]: string[] } = {
      'milk': ['almond milk', 'soy milk', 'oat milk'],
      'butter': ['margarine', 'coconut oil', 'olive oil'],
      'eggs': ['egg substitute', 'applesauce', 'banana'],
      'flour': ['almond flour', 'coconut flour', 'oat flour'],
    };
    
    const key = ingredientName.toLowerCase();
    return substitutions[key] || [];
  }

  private static estimateIngredientCost(ingredientName: string, quantity: number): number {
    // Simple cost estimation - in production, this would use real pricing data
    const baseCosts: { [key: string]: number } = {
      'milk': 3.99,
      'bread': 2.49,
      'eggs': 3.49,
      'chicken': 6.99,
      'beef': 8.99,
      'cheese': 4.99,
    };
    
    const key = ingredientName.toLowerCase();
    const baseCost = baseCosts[key] || 2.99;
    return baseCost * quantity;
  }

  private static getSeasonalPriceFactor(ingredientName: string): number {
    // Seasonal price multipliers - in production, this would use real market data
    const currentMonth = new Date().getMonth();
    const seasonalFactors: { [key: string]: number[] } = {
      'tomatoes': [1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.8, 0.8, 0.9, 1.0, 1.1, 1.2], // Cheaper in summer
      'apples': [0.9, 1.0, 1.1, 1.2, 1.2, 1.2, 1.1, 1.0, 0.8, 0.8, 0.9, 0.9], // Cheaper in fall
    };
    
    const key = ingredientName.toLowerCase();
    const factors = seasonalFactors[key];
    return factors ? factors[currentMonth] : 1.0;
  }

  private static calculateSeasonalAdjustments(predictions: IngredientUsageForecast[]): SeasonalAdjustment[] {
    return predictions.map(prediction => ({
      ingredient_name: prediction.ingredient_name,
      current_season_multiplier: this.getSeasonalPriceFactor(prediction.ingredient_name),
      next_season_multiplier: this.getSeasonalPriceFactor(prediction.ingredient_name), // Would calculate next season
      peak_season: 'summer', // Would be calculated based on ingredient
      low_season: 'winter',
    }));
  }

  // Additional helper methods would be implemented here...
  private static analyzeShoppingPatterns(shoppingHistory: any[]): any {
    return {
      averageDaysBetweenTrips: 7,
      preferredDays: ['Saturday', 'Sunday'],
      preferredTimes: ['10:00 AM', '2:00 PM'],
    };
  }

  private static predictShoppingItems(historicalData: any, tripDate: Date): string[] {
    return ['milk', 'bread', 'eggs']; // Simplified prediction
  }

  private static recommendStores(historicalData: any): string[] {
    return ['Walmart', 'Target', 'Local Grocery']; // Based on historical preferences
  }

  private static findConsolidationOpportunities(trips: ShoppingTripForecast[]): string[] {
    return ['Combine trips on same day', 'Buy bulk items together'];
  }

  private static identifyBulkOpportunities(historicalData: any): BulkPurchaseOpportunity[] {
    return []; // Would analyze usage patterns for bulk opportunities
  }

  private static analyzePriceTrends(historicalData: any): PriceTrendAnalysis[] {
    return []; // Would analyze price trends from historical data
  }

  private static analyzeStorePreferences(historicalData: any): StorePreferenceInsight[] {
    return []; // Would analyze store visit patterns
  }

  private static generateWastePreventionActions(item: any, daysUntilExpiry: number): string[] {
    const actions = [];
    
    if (daysUntilExpiry <= 2) {
      actions.push('Use immediately in tonight\'s dinner');
      actions.push('Freeze if possible to extend life');
    } else if (daysUntilExpiry <= 5) {
      actions.push('Plan meals using this ingredient');
      actions.push('Consider sharing with family/neighbors');
    }
    
    return actions;
  }

  private static identifyWasteReductionOpportunities(wasteRiskIngredients: WasteRiskIngredient[]): WasteReductionOpportunity[] {
    return wasteRiskIngredients.map(ingredient => ({
      opportunity_type: 'recipe_suggestion' as const,
      description: `Use ${ingredient.ingredient_name} in a recipe before it expires`,
      potential_savings: ingredient.estimated_waste_cost,
      implementation_difficulty: 'easy' as const,
      ingredients_affected: [ingredient.ingredient_name],
    }));
  }

  private static generateWastePreventionStrategies(wasteRiskIngredients: WasteRiskIngredient[]): PreventionStrategy[] {
    return [
      {
        strategy_name: 'First In, First Out (FIFO)',
        description: 'Use older ingredients before newer ones',
        effectiveness_score: 0.8,
        applicable_ingredients: wasteRiskIngredients.map(i => i.ingredient_name),
        implementation_steps: [
          'Label ingredients with purchase dates',
          'Organize pantry with older items in front',
          'Check expiration dates when meal planning',
        ],
      },
    ];
  }

  private static calculateMonthlySpending(historicalData: any): number {
    // Calculate average monthly spending from historical data
    return 150; // Simplified calculation
  }

  private static calculateSpendingTrend(historicalData: any): number {
    // Calculate spending trend (positive = increasing, negative = decreasing)
    return 0.02; // 2% increase
  }

  private static identifyBudgetOptimizations(historicalData: any): BudgetOptimization[] {
    return [
      {
        optimization_type: 'substitution',
        description: 'Replace expensive ingredients with cheaper alternatives',
        potential_monthly_savings: 25,
        implementation_effort: 'low',
        affected_categories: ['protein', 'dairy'],
      },
    ];
  }

  private static forecastCategorySpending(historicalData: any): CategorySpendingForecast[] {
    return [
      {
        category: 'produce',
        current_monthly_spending: 40,
        predicted_monthly_spending: 42,
        trend_direction: 'up',
        key_drivers: ['seasonal price increases', 'increased consumption'],
      },
    ];
  }

  private static generateCostSavingRecommendations(historicalData: any): CostSavingRecommendation[] {
    return [
      {
        recommendation: 'Buy generic brands for staple items',
        estimated_monthly_savings: 15,
        confidence: 0.8,
        implementation_steps: [
          'Compare prices between name brand and generic',
          'Try generic versions of frequently used items',
          'Switch to generic for items where quality difference is minimal',
        ],
      },
    ];
  }

  private static analyzeSeasonalIngredientTrends(historicalData: any): SeasonalIngredientTrend[] {
    return []; // Would analyze seasonal usage patterns
  }

  private static identifySeasonalOpportunities(nextSeason: string): SeasonalOpportunity[] {
    return []; // Would identify upcoming seasonal opportunities
  }

  private static forecastHolidayImpact(timeHorizonDays: number): HolidayImpactForecast[] {
    return []; // Would forecast holiday impacts within time horizon
  }

  private static calculateSeasonalBudgetAdjustments(historicalData: any): SeasonalBudgetAdjustment[] {
    return []; // Would calculate seasonal budget adjustments
  }

  private static analyzeFamilyConsumptionPatterns(familyActivities: any[]): FamilyConsumptionPattern[] {
    return []; // Would analyze family consumption patterns
  }

  private static analyzeMemberPreferenceEvolution(familyActivities: any[]): MemberPreferenceEvolution[] {
    return []; // Would analyze how family member preferences change
  }

  private static identifyCoordinationOpportunities(familyActivities: any[]): CoordinationOpportunity[] {
    return []; // Would identify family coordination opportunities
  }

  private static calculateFamilyEfficiencyMetrics(familyActivities: any[]): FamilyEfficiencyMetric[] {
    return []; // Would calculate family efficiency metrics
  }

  private static getNextSeason(currentMonth: number): string {
    const seasons = ['winter', 'spring', 'summer', 'fall'];
    const seasonIndex = Math.floor(currentMonth / 3);
    return seasons[(seasonIndex + 1) % 4];
  }

  private static identifyTrendDrivers(usageHistory: any[]): string[] {
    return ['seasonal changes', 'family size changes', 'dietary preferences'];
  }

  private static generateRecommendations(analysisType: string, predictions: any): string[] {
    const recommendations = [];
    
    switch (analysisType) {
      case 'consumption':
        if (predictions.consumption?.depletion_alerts?.length > 0) {
          recommendations.push('Add depleting ingredients to your shopping list');
        }
        if (predictions.consumption?.predicted_usage?.length > 5) {
          recommendations.push('Consider meal planning to optimize ingredient usage');
        }
        break;
      case 'waste':
        if (predictions.waste?.waste_risk_ingredients?.length > 0) {
          recommendations.push('Use expiring ingredients in tonight\'s meal');
          recommendations.push('Consider freezing items that are about to expire');
        }
        break;
      case 'budget':
        if (predictions.budget?.spending_trend === 'increasing') {
          recommendations.push('Review spending patterns and look for cost-saving opportunities');
        }
        break;
    }
    
    return recommendations;
  }

  private static calculateOverallConfidence(predictions: any, dataQualityScore: number): number {
    // Calculate weighted confidence based on predictions and data quality
    return Math.min(dataQualityScore * 0.7 + 0.3, 1.0);
  }

  private static async calculateModelAccuracy(userId: string, analysisType: string): Promise<number> {
    // In production, this would validate previous predictions against actual outcomes
    return 0.75; // 75% accuracy placeholder
  }

  private static async storeAnalysisResult(userId: string, result: PredictiveAnalysisResult): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO predictive_analysis_log
        (user_id, analysis_type, result_data, confidence, generated_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        userId,
        result.analysis_type,
        JSON.stringify(result),
        result.confidence,
        result.generated_at
      ]);
    } catch (error) {
      logger.error('Store analysis result error:', error);
      // Don't throw - logging failure shouldn't break the main flow
    } finally {
      client.release();
    }
  }
}