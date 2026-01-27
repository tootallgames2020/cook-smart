import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { AIPreferencesService } from '../services/AIPreferencesService';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's AI preferences
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const preferences = await AIPreferencesService.getUserPreferences(req.user!.id);
    
    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'AI preferences not found',
      });
    }

    return res.json({
      success: true,
      preferences,
      message: 'All AI features included free in your current plan',
    });
  } catch (error) {
    logger.error('Get AI preferences error:', error);
    return next(createError('Failed to get AI preferences', 500));
  }
});

// Update single AI preference
router.post('/update', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { feature_name, enabled } = req.body;

    if (!feature_name || typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Feature name and enabled status are required',
      });
    }

    // Create update object with the specific feature
    const updates = { [feature_name]: enabled };

    const updatedPreferences = await AIPreferencesService.updateUserPreferences(
      req.user!.id,
      updates
    );

    if (!updatedPreferences) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update AI preference',
      });
    }

    return res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'AI preference updated successfully',
    });
  } catch (error) {
    logger.error('Update single AI preference error:', error);
    return next(createError('Failed to update AI preference', 500));
  }
});

// Update intelligence level
router.post('/intelligence-level', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { category, intelligence_level } = req.body;

    if (!category || !intelligence_level) {
      return res.status(400).json({
        success: false,
        message: 'Category and intelligence level are required',
      });
    }

    if (!['minimal', 'helpful', 'genius'].includes(intelligence_level)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid intelligence level. Must be: minimal, helpful, or genius',
      });
    }

    // Update the intelligence level for the category
    const fieldName = `${category}_intelligence_level`;
    const updates = { [fieldName]: intelligence_level };

    const updatedPreferences = await AIPreferencesService.updateUserPreferences(
      req.user!.id,
      updates
    );

    if (!updatedPreferences) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update intelligence level',
      });
    }

    return res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Intelligence level updated successfully',
    });
  } catch (error) {
    logger.error('Update intelligence level error:', error);
    return next(createError('Failed to update intelligence level', 500));
  }
});

// Bulk update AI preferences
router.post('/bulk-update', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Preferences object is required',
      });
    }

    const updatedPreferences = await AIPreferencesService.updateUserPreferences(
      req.user!.id,
      preferences
    );

    if (!updatedPreferences) {
      return res.status(500).json({
        success: false,
        message: 'Failed to bulk update AI preferences',
      });
    }

    return res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'AI preferences updated successfully',
    });
  } catch (error) {
    logger.error('Bulk update AI preferences error:', error);
    return next(createError('Failed to bulk update AI preferences', 500));
  }
});

// Get feature usage analytics
router.get('/usage', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          feature_name,
          usage_count,
          last_used,
          user_rating as satisfaction_score,
          usage_count as total_value_points
        FROM ai_feature_usage
        WHERE user_id = $1
        ORDER BY usage_count DESC
      `, [req.user!.id]);

      return res.json({
        success: true,
        usage: result.rows,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get feature usage error:', error);
    return next(createError('Failed to get feature usage', 500));
  }
});

// Track feature usage
router.post('/track-usage', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { feature_name, value_points = 1 } = req.body;

    if (!feature_name) {
      return res.status(400).json({
        success: false,
        message: 'Feature name is required',
      });
    }

    await AIPreferencesService.trackFeatureUsage(
      req.user!.id,
      feature_name,
      5 // Default satisfaction score
    );

    return res.json({
      success: true,
      message: 'Feature usage tracked',
    });
  } catch (error) {
    logger.error('Track feature usage error:', error);
    // Don't throw error for tracking - it's not critical
    return res.json({
      success: true,
      message: 'Feature usage tracking skipped',
    });
  }
});

// Provide feature feedback
router.post('/feedback', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { feature_name, satisfaction_score, feedback } = req.body;

    if (!feature_name || typeof satisfaction_score !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Feature name and satisfaction score are required',
      });
    }

    if (satisfaction_score < 1 || satisfaction_score > 5) {
      return res.status(400).json({
        success: false,
        message: 'Satisfaction score must be between 1 and 5',
      });
    }

    await AIPreferencesService.trackFeatureUsage(
      req.user!.id,
      feature_name,
      satisfaction_score
    );

    return res.json({
      success: true,
      message: 'Feature feedback recorded',
    });
  } catch (error) {
    logger.error('Provide feature feedback error:', error);
    return next(createError('Failed to record feature feedback', 500));
  }
});

// Get AI recommendations
router.get('/recommendations', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // For now, return static recommendations
    const recommendations = [
      {
        feature: 'voice_commands',
        title: 'Try Voice Commands',
        description: 'Update ingredients hands-free while cooking',
        confidence: 0.8,
        benefits: ['Hands-free cooking', 'Faster updates', 'Natural interaction']
      },
      {
        feature: 'photo_analysis',
        title: 'Enable Photo Analysis',
        description: 'Scan receipts to automatically update your inventory',
        confidence: 0.9,
        benefits: ['Effortless inventory', 'Receipt scanning', 'Visual tracking']
      }
    ];

    return res.json({
      success: true,
      recommendations,
    });
  } catch (error) {
    logger.error('Get AI recommendations error:', error);
    return next(createError('Failed to get AI recommendations', 500));
  }
});

// Reset AI preferences
router.post('/reset', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Reset to default preferences
    const defaultPreferences = {
      voice_commands: false,
      apex_voice_intelligence: false,
      voice_processing: 'local_only' as const,
      voice_intelligence_level: 'helpful' as const,
      photo_analysis: false,
      receipt_scanning: false,
      photo_intelligence_level: 'helpful' as const,
      nutrition_coaching: false,
      meal_optimization: false,
      nutrition_intelligence_level: 'helpful' as const,
      auto_meal_planning: false,
      predictive_analytics: false,
      planning_intelligence_level: 'helpful' as const,
      family_coordination: false,
      family_intelligence_level: 'helpful' as const,
      data_sharing_consent: false,
      analytics_consent: false,
      personalization_consent: false,
    };

    const updatedPreferences = await AIPreferencesService.updateUserPreferences(
      req.user!.id,
      defaultPreferences
    );

    if (!updatedPreferences) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reset AI preferences',
      });
    }

    return res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'AI preferences reset to defaults',
    });
  } catch (error) {
    logger.error('Reset AI preferences error:', error);
    return next(createError('Failed to reset AI preferences', 500));
  }
});

// Update user's AI preferences
router.put('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const updates = req.body;

    // Validate AI assistance level
    if (updates.ai_assistance_level && !['minimal', 'helpful', 'genius'].includes(updates.ai_assistance_level)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AI assistance level. Must be: minimal, helpful, or genius',
      });
    }

    // Validate location sharing
    if (updates.location_sharing && !['off', 'family_only', 'full'].includes(updates.location_sharing)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location sharing setting. Must be: off, family_only, or full',
      });
    }

    // Validate voice processing
    if (updates.voice_processing && !['off', 'local_only', 'cloud_enhanced'].includes(updates.voice_processing)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid voice processing setting. Must be: off, local_only, or cloud_enhanced',
      });
    }

    const updatedPreferences = await AIPreferencesService.updateUserPreferences(
      req.user!.id,
      updates
    );

    if (!updatedPreferences) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update AI preferences',
      });
    }

    return res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'AI preferences updated successfully',
    });
  } catch (error) {
    logger.error('Update AI preferences error:', error);
    return next(createError('Failed to update AI preferences', 500));
  }
});

// Get AI feature descriptions and benefits
router.get('/features', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const featureDescriptions = {
      core_features: {
        smart_recipe_suggestions: {
          name: 'Smart Recipe Suggestions',
          description: 'AI suggests recipes based on your available ingredients and family preferences',
          benefits: ['Reduces food waste by 40%', 'Saves 2 hours/week meal planning', 'Discovers new family favorites'],
          privacy_impact: 'low',
          default_enabled: true,
          examples: ['Try chicken stir-fry with your ingredients', 'Perfect recipe for using expiring vegetables']
        },
        expiration_intelligence: {
          name: 'Expiration Intelligence',
          description: 'Smart alerts about expiring ingredients with recipe suggestions and preservation tips',
          benefits: ['Prevents food waste', 'Suggests preservation methods', 'Recipe ideas for expiring items'],
          privacy_impact: 'low',
          default_enabled: true,
          examples: ['Bananas expire tomorrow - try banana bread!', 'Freeze chicken to extend life 60 days']
        },
        family_coordination: {
          name: 'Family Coordination',
          description: 'Automatic grocery store detection with smart family shopping coordination',
          benefits: ['Prevents duplicate purchases', 'Saves average $15/week', 'Real-time family coordination'],
          privacy_impact: 'medium',
          default_enabled: true,
          examples: ['Dad is at Walmart! 3 items on family list', 'Mom already added milk - merge with your list?']
        },
        shopping_predictions: {
          name: 'Shopping Predictions',
          description: 'AI predicts what you need before you run out based on family consumption patterns',
          benefits: ['Never run out of essentials', 'Optimizes shopping trips', 'Learns family patterns'],
          privacy_impact: 'medium',
          default_enabled: true,
          examples: ['Family usually needs milk by now', 'Stock up on soup - cold weather coming']
        }
      },
      
      advanced_features: {
        auto_meal_planning: {
          name: 'Auto Meal Planning',
          description: 'AI creates weekly meal plans based on family preferences, budget, and available ingredients',
          benefits: ['Saves 3+ hours/week planning', 'Optimizes nutrition and budget', 'Reduces decision fatigue'],
          privacy_impact: 'medium',
          default_enabled: false,
          examples: ['Week planned: 5 dinners, 2 prep days, $67 budget', 'Balanced nutrition with family favorites']
        },
        voice_commands: {
          name: 'Voice Commands',
          description: 'Hands-free interaction while cooking - update inventory, get recipe help, add shopping items',
          benefits: ['Hands-free while cooking', 'Faster ingredient updates', 'Natural conversation'],
          privacy_impact: 'high',
          default_enabled: false,
          examples: ['Hey Cook Smart, I used 2 cups flour', 'Add milk to shopping list', 'What\'s next in this recipe?']
        },
        photo_analysis: {
          name: 'Photo Analysis',
          description: 'Scan grocery receipts, analyze pantry photos, and get cooking progress feedback',
          benefits: ['Effortless inventory updates', 'Visual pantry management', 'Cooking guidance'],
          privacy_impact: 'high',
          default_enabled: false,
          examples: ['Scan receipt to auto-add 15 ingredients', 'Photo of pantry shows low milk', 'Perfect! Onions are caramelized']
        },
        predictive_analytics: {
          name: 'Predictive Analytics',
          description: 'Advanced consumption forecasting, budget optimization, and waste prevention',
          benefits: ['Predicts needs 3-7 days ahead', 'Optimizes bulk buying', 'Prevents 60% more waste'],
          privacy_impact: 'medium',
          default_enabled: false,
          examples: ['Family will need groceries in 3.2 days', 'Costco trip saves $23 this month', 'Buy 1.5 gallons milk (not 2)']
        }
      },
      
      assistance_levels: {
        minimal: {
          name: 'Minimal AI',
          description: 'Basic features only - you stay in full control',
          features: ['Basic ingredient tracking', 'Simple shopping lists', 'Manual recipe search'],
          best_for: 'Users who prefer manual control and minimal automation'
        },
        helpful: {
          name: 'Helpful AI (Recommended)',
          description: 'Smart suggestions that you can accept or ignore',
          features: ['Smart recipe suggestions', 'Expiration alerts', 'Family coordination', 'Shopping predictions'],
          best_for: 'Most users - balanced intelligence without being pushy'
        },
        genius: {
          name: 'Genius AI',
          description: 'Full AI power with advanced automation and predictions',
          features: ['All helpful features', 'Auto meal planning', 'Predictive analytics', 'Advanced coordination'],
          best_for: 'Tech-savvy users who want maximum automation and intelligence'
        }
      }
    };

    return res.json({
      success: true,
      features: featureDescriptions,
      pricing_note: 'All AI features included free in your current plan - no additional charges',
    });
  } catch (error) {
    logger.error('Get AI features error:', error);
    return next(createError('Failed to get AI features', 500));
  }
});

// Record user action on AI suggestion (for learning)
router.post('/suggestion-feedback', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { suggestion_type, action, feedback } = req.body;

    if (!suggestion_type || !action) {
      return res.status(400).json({
        success: false,
        message: 'Suggestion type and action are required',
      });
    }

    if (!['accepted', 'rejected', 'ignored', 'modified'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be: accepted, rejected, ignored, or modified',
      });
    }

    await AIPreferencesService.recordSuggestionAction(
      req.user!.id,
      suggestion_type,
      action
    );

    // Track feature usage with rating based on action
    const rating = action === 'accepted' ? 5 : action === 'modified' ? 4 : action === 'rejected' ? 2 : 3;
    await AIPreferencesService.trackFeatureUsage(
      req.user!.id,
      `ai_suggestion_${suggestion_type}`,
      rating
    );

    return res.json({
      success: true,
      message: 'Feedback recorded - helps improve AI suggestions',
    });
  } catch (error) {
    logger.error('Record suggestion feedback error:', error);
    return next(createError('Failed to record feedback', 500));
  }
});

// Get user's AI usage analytics
router.get('/usage-analytics', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's feature usage
      const usageResult = await client.query(`
        SELECT 
          feature_name,
          usage_count,
          user_rating,
          last_used
        FROM ai_feature_usage
        WHERE user_id = $1
        ORDER BY usage_count DESC
      `, [req.user!.id]);

      // Get user's suggestion history
      const suggestionsResult = await client.query(`
        SELECT 
          suggestion_type,
          COUNT(*) as total_suggestions,
          COUNT(*) FILTER (WHERE user_action = 'accepted') as accepted,
          COUNT(*) FILTER (WHERE user_action = 'rejected') as rejected,
          AVG(confidence_score) as avg_confidence
        FROM ai_suggestions_log
        WHERE user_id = $1
        GROUP BY suggestion_type
        ORDER BY total_suggestions DESC
      `, [req.user!.id]);

      return res.json({
        success: true,
        analytics: {
          feature_usage: usageResult.rows,
          suggestion_history: suggestionsResult.rows,
          privacy_note: 'Analytics help improve your AI experience and are never shared with third parties',
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get usage analytics error:', error);
    return next(createError('Failed to get usage analytics', 500));
  }
});

// Check if specific AI feature is enabled for user
router.get('/feature/:featureName/enabled', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { featureName } = req.params;
    
    const isEnabled = await AIPreferencesService.isFeatureEnabled(
      req.user!.id,
      featureName as any
    );

    return res.json({
      success: true,
      feature_name: featureName,
      enabled: isEnabled,
    });
  } catch (error) {
    logger.error('Check feature enabled error:', error);
    return next(createError('Failed to check feature status', 500));
  }
});

export default router;