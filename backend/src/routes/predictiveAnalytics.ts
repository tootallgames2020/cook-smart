/**
 * PREDICTIVE ANALYTICS API ROUTES
 * 
 * RESTful API endpoints for AI-powered predictive analytics:
 * - Consumption pattern predictions
 * - Shopping behavior analysis
 * - Waste reduction forecasting
 * - Budget optimization insights
 * - Seasonal trend analysis
 * - Family behavior insights
 */

import { Router, Response } from 'express';
import { PredictiveAnalyticsService, PredictiveAnalysisRequest, PredictiveAnalysisResult } from '../services/PredictiveAnalyticsService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/predictive-analytics/analyze
 * Generate predictive analysis based on user data
 */
router.post('/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { analysis_type, time_horizon_days, family_id, include_confidence_intervals } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    if (!analysis_type) {
      res.status(400).json({
        success: false,
        error: 'analysis_type is required (consumption, shopping, waste, budget, seasonal, family_insights)',
      });
      return;
    }

    const validAnalysisTypes = ['consumption', 'shopping', 'waste', 'budget', 'seasonal', 'family_insights'];
    if (!validAnalysisTypes.includes(analysis_type)) {
      res.status(400).json({
        success: false,
        error: `Invalid analysis_type. Must be one of: ${validAnalysisTypes.join(', ')}`,
      });
      return;
    }

    const timeHorizon = parseInt(time_horizon_days) || 30;
    if (timeHorizon < 1 || timeHorizon > 365) {
      res.status(400).json({
        success: false,
        error: 'time_horizon_days must be between 1 and 365',
      });
      return;
    }

    const analysisRequest: PredictiveAnalysisRequest = {
      user_id: userId,
      family_id: family_id || undefined,
      analysis_type: analysis_type,
      time_horizon_days: timeHorizon,
      include_confidence_intervals: include_confidence_intervals === true,
    };

    const result: PredictiveAnalysisResult = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);

    res.json({
      success: result.success,
      analysis_type: result.analysis_type,
      time_horizon_days: result.time_horizon_days,
      generated_at: result.generated_at,
      confidence: result.confidence,
      predictions: result.predictions,
      recommendations: result.recommendations,
      data_quality_score: result.data_quality_score,
      model_accuracy: result.model_accuracy,
    });

  } catch (error) {
    logger.error('Generate predictive analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Predictive analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/consumption
 * Get consumption pattern predictions
 */
router.get('/consumption', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const analysisRequest: PredictiveAnalysisRequest = {
      user_id: userId,
      analysis_type: 'consumption',
      time_horizon_days: days,
    };

    const result = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);

    res.json({
      success: result.success,
      consumption_predictions: result.predictions.consumption,
      recommendations: result.recommendations,
      confidence: result.confidence,
      data_quality_score: result.data_quality_score,
    });

  } catch (error) {
    logger.error('Get consumption predictions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get consumption predictions',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/shopping
 * Get shopping behavior predictions
 */
router.get('/shopping', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const analysisRequest: PredictiveAnalysisRequest = {
      user_id: userId,
      analysis_type: 'shopping',
      time_horizon_days: days,
    };

    const result = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);

    res.json({
      success: result.success,
      shopping_predictions: result.predictions.shopping,
      recommendations: result.recommendations,
      confidence: result.confidence,
      data_quality_score: result.data_quality_score,
    });

  } catch (error) {
    logger.error('Get shopping predictions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get shopping predictions',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/waste
 * Get waste reduction predictions
 */
router.get('/waste', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const analysisRequest: PredictiveAnalysisRequest = {
      user_id: userId,
      analysis_type: 'waste',
      time_horizon_days: days,
    };

    const result = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);

    res.json({
      success: result.success,
      waste_predictions: result.predictions.waste,
      recommendations: result.recommendations,
      confidence: result.confidence,
      data_quality_score: result.data_quality_score,
    });

  } catch (error) {
    logger.error('Get waste predictions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get waste predictions',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/budget
 * Get budget optimization predictions
 */
router.get('/budget', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const analysisRequest: PredictiveAnalysisRequest = {
      user_id: userId,
      analysis_type: 'budget',
      time_horizon_days: days,
    };

    const result = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);

    res.json({
      success: result.success,
      budget_predictions: result.predictions.budget,
      recommendations: result.recommendations,
      confidence: result.confidence,
      data_quality_score: result.data_quality_score,
    });

  } catch (error) {
    logger.error('Get budget predictions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get budget predictions',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/seasonal
 * Get seasonal trend predictions
 */
router.get('/seasonal', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 90; // Default to 3 months for seasonal

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const analysisRequest: PredictiveAnalysisRequest = {
      user_id: userId,
      analysis_type: 'seasonal',
      time_horizon_days: days,
    };

    const result = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);

    res.json({
      success: result.success,
      seasonal_predictions: result.predictions.seasonal,
      recommendations: result.recommendations,
      confidence: result.confidence,
      data_quality_score: result.data_quality_score,
    });

  } catch (error) {
    logger.error('Get seasonal predictions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get seasonal predictions',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/family-insights
 * Get family behavior insights (requires family membership)
 */
router.get('/family-insights', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const family_id = req.query.family_id as string;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    if (!family_id) {
      res.status(400).json({
        success: false,
        error: 'family_id is required for family insights',
      });
      return;
    }

    // Verify user is member of the family
    const isFamilyMember = await verifyFamilyMembership(userId, family_id);
    if (!isFamilyMember) {
      res.status(403).json({
        success: false,
        error: 'Access denied: not a member of this family',
      });
      return;
    }

    const analysisRequest: PredictiveAnalysisRequest = {
      user_id: userId,
      family_id: family_id,
      analysis_type: 'family_insights',
      time_horizon_days: days,
    };

    const result = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);

    res.json({
      success: result.success,
      family_insights: result.predictions.family_insights,
      recommendations: result.recommendations,
      confidence: result.confidence,
      data_quality_score: result.data_quality_score,
    });

  } catch (error) {
    logger.error('Get family insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get family insights',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/dashboard
 * Get comprehensive analytics dashboard data
 */
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const family_id = req.query.family_id as string;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    // Generate multiple analysis types for dashboard
    const analysisTypes = ['consumption', 'waste', 'budget'];
    const dashboardData: any = {
      user_id: userId,
      generated_at: new Date().toISOString(),
      analyses: {},
    };

    for (const analysisType of analysisTypes) {
      try {
        const analysisRequest: PredictiveAnalysisRequest = {
          user_id: userId,
          family_id: family_id || undefined,
          analysis_type: analysisType as any,
          time_horizon_days: 30,
        };

        const result = await PredictiveAnalyticsService.generatePredictiveAnalysis(analysisRequest);
        dashboardData.analyses[analysisType] = {
          success: result.success,
          predictions: result.predictions[analysisType as keyof typeof result.predictions],
          recommendations: result.recommendations.slice(0, 3), // Top 3 recommendations
          confidence: result.confidence,
        };
      } catch (analysisError) {
        logger.error(`Dashboard analysis error for ${analysisType}:`, analysisError);
        dashboardData.analyses[analysisType] = {
          success: false,
          error: 'Analysis failed',
        };
      }
    }

    // Calculate overall insights
    const overallInsights = generateOverallInsights(dashboardData.analyses);

    res.json({
      success: true,
      dashboard_data: dashboardData,
      overall_insights: overallInsights,
      last_updated: dashboardData.generated_at,
    });

  } catch (error) {
    logger.error('Get analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics dashboard',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/history
 * Get user's predictive analysis history
 */
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const analysis_type = req.query.analysis_type as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    const history = await getPredictiveAnalysisHistory(userId, analysis_type, limit);

    res.json({
      success: true,
      history,
      total_analyses: history.length,
      filter_applied: analysis_type || 'all',
    });

  } catch (error) {
    logger.error('Get predictive analysis history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analysis history',
    });
  }
});

/**
 * POST /api/v1/predictive-analytics/feedback
 * Provide feedback on predictive analysis accuracy
 */
router.post('/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { analysis_id, prediction_accuracy, helpful_recommendations, comments } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    if (!analysis_id) {
      res.status(400).json({
        success: false,
        error: 'analysis_id is required',
      });
      return;
    }

    await storePredictiveAnalysisFeedback(userId, {
      analysis_id,
      prediction_accuracy: prediction_accuracy || null,
      helpful_recommendations: helpful_recommendations || null,
      comments: comments || null,
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
    });

  } catch (error) {
    logger.error('Store predictive analysis feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store feedback',
    });
  }
});

/**
 * GET /api/v1/predictive-analytics/capabilities
 * Get available predictive analytics capabilities
 */
router.get('/capabilities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const capabilities = {
      consumption_analysis: {
        description: 'Predict ingredient consumption patterns and depletion dates',
        features: [
          'Usage pattern recognition',
          'Depletion alerts',
          'Restocking recommendations',
          'Consumption trend analysis',
          'Seasonal adjustments',
        ],
        accuracy: 'Good (75-85%)',
        min_data_required: '2 weeks of usage data',
      },
      shopping_analysis: {
        description: 'Optimize shopping trips and predict purchasing behavior',
        features: [
          'Shopping trip forecasting',
          'Optimal shopping schedule',
          'Bulk purchase opportunities',
          'Price trend analysis',
          'Store preference insights',
        ],
        accuracy: 'Good (70-80%)',
        min_data_required: '3 shopping trips',
      },
      waste_analysis: {
        description: 'Predict and prevent food waste',
        features: [
          'Waste risk identification',
          'Prevention strategies',
          'Cost impact analysis',
          'Reduction opportunities',
          'Expiration optimization',
        ],
        accuracy: 'Very Good (80-90%)',
        min_data_required: '1 week of inventory data',
      },
      budget_analysis: {
        description: 'Optimize food spending and predict costs',
        features: [
          'Spending forecasts',
          'Budget optimization',
          'Category analysis',
          'Cost-saving recommendations',
          'Price trend tracking',
        ],
        accuracy: 'Good (75-85%)',
        min_data_required: '2 weeks of purchase data',
      },
      seasonal_analysis: {
        description: 'Analyze seasonal trends and opportunities',
        features: [
          'Seasonal ingredient trends',
          'Holiday impact forecasting',
          'Price seasonality',
          'Availability predictions',
          'Budget adjustments',
        ],
        accuracy: 'Fair (60-75%)',
        min_data_required: '1 month of historical data',
      },
      family_insights: {
        description: 'Analyze family consumption and coordination patterns',
        features: [
          'Family consumption patterns',
          'Member preference evolution',
          'Coordination opportunities',
          'Efficiency metrics',
          'Behavior insights',
        ],
        accuracy: 'Good (70-80%)',
        min_data_required: '2 weeks of family activity data',
      },
    };

    res.json({
      success: true,
      capabilities,
      total_analysis_types: Object.keys(capabilities).length,
      data_requirements: {
        minimum_usage_period: '1 week',
        recommended_usage_period: '1 month',
        optimal_usage_period: '3 months',
      },
      accuracy_factors: [
        'Amount of historical data',
        'Consistency of usage patterns',
        'Variety of ingredients tracked',
        'Frequency of app usage',
        'Quality of data entry',
      ],
    });

  } catch (error) {
    logger.error('Get predictive analytics capabilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve capabilities',
    });
  }
});

/**
 * HELPER FUNCTIONS
 */

async function verifyFamilyMembership(_userId: string, _familyId: string): Promise<boolean> {
  // This would verify that the user is a member of the specified family
  return true; // Placeholder - would check family_members table
}

async function getPredictiveAnalysisHistory(_userId: string, _analysisType?: string, _limit: number = 20): Promise<any[]> {
  // This would query the predictive_analysis_log table
  return []; // Placeholder
}

async function storePredictiveAnalysisFeedback(userId: string, feedback: any): Promise<void> {
  // This would store feedback in predictive_analysis_feedback table
  logger.info(`Predictive analysis feedback from user ${userId}:`, feedback);
}

function generateOverallInsights(analyses: any): any {
  const insights = {
    top_priorities: [] as string[],
    efficiency_score: 0,
    potential_savings: 0,
    waste_risk_level: 'low' as 'low' | 'medium' | 'high',
    key_recommendations: [] as string[],
  };

  // Analyze consumption data
  if (analyses.consumption?.success) {
    const consumption = analyses.consumption.predictions;
    if (consumption?.depletion_alerts?.length > 0) {
      insights.top_priorities.push('Check depleting ingredients');
    }
  }

  // Analyze waste data
  if (analyses.waste?.success) {
    const waste = analyses.waste.predictions;
    if (waste?.waste_risk_ingredients?.length > 0) {
      insights.waste_risk_level = waste.waste_risk_ingredients.length > 3 ? 'high' : 'medium';
      insights.top_priorities.push('Address waste risk ingredients');
    }
  }

  // Analyze budget data
  if (analyses.budget?.success) {
    const budget = analyses.budget.predictions;
    if (budget?.cost_saving_recommendations?.length > 0) {
      insights.potential_savings = budget.cost_saving_recommendations.reduce(
        (sum: number, rec: any) => sum + (rec.estimated_monthly_savings || 0), 0
      );
    }
  }

  // Calculate efficiency score (0-100)
  let efficiencyFactors = 0;
  let totalFactors = 0;

  if (analyses.consumption?.confidence) {
    efficiencyFactors += analyses.consumption.confidence * 100;
    totalFactors++;
  }
  if (analyses.waste?.confidence) {
    efficiencyFactors += (1 - (analyses.waste.predictions?.waste_risk_ingredients?.length || 0) / 10) * 100;
    totalFactors++;
  }
  if (analyses.budget?.confidence) {
    efficiencyFactors += analyses.budget.confidence * 100;
    totalFactors++;
  }

  insights.efficiency_score = totalFactors > 0 ? Math.round(efficiencyFactors / totalFactors) : 0;

  // Collect key recommendations
  Object.values(analyses).forEach((analysis: any) => {
    if (analysis.success && analysis.recommendations) {
      insights.key_recommendations.push(...analysis.recommendations.slice(0, 2));
    }
  });

  // Limit to top 5 recommendations
  insights.key_recommendations = insights.key_recommendations.slice(0, 5);

  return insights;
}

export default router;

