/**
 * Universal Feedback API Routes
 * 
 * Provides endpoints for all feedback functionality across the app
 */

import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { UniversalFeedbackService } from '../services/UniversalFeedbackService';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Record user feedback
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const {
      feedback_type,
      feature_area,
      original_data,
      corrected_data,
      context_data,
      confidence_score
    } = req.body;

    // Validate required fields
    if (!feedback_type || !feature_area || !original_data || !corrected_data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: feedback_type, feature_area, original_data, corrected_data'
      });
    }

    // Validate feedback_type
    const validFeedbackTypes = [
      'ingredient_category',
      'recipe_match',
      'dietary_flag',
      'cooking_time',
      'difficulty_rating',
      'substitution_success',
      'shopping_organization',
      'search_intent',
      'nutrition_accuracy',
      'meal_plan_satisfaction',
      'instruction_clarity'
    ];

    if (!validFeedbackTypes.includes(feedback_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid feedback_type. Must be one of: ${validFeedbackTypes.join(', ')}`
      });
    }

    await UniversalFeedbackService.recordFeedback({
      userId: req.user!.id.toString(),
      feedbackType: feedback_type,
      featureArea: feature_area,
      originalData: original_data,
      correctedData: corrected_data,
      contextData: context_data,
      confidenceScore: confidence_score || 1.0
    });

    // Award points for providing feedback
    const client = await req.app.locals.pool.connect();
    try {
      await client.query(
        'UPDATE users SET points = points + 5 WHERE id = $1',
        [req.user!.id]
      );
    } finally {
      client.release();
    }

    logger.info(`Feedback recorded: ${feedback_type} by user ${req.user!.id}`);

    return res.json({
      success: true,
      message: 'Feedback recorded successfully',
      points_awarded: 5
    });
  } catch (error) {
    logger.error('Record feedback error:', error);
    return next(createError('Failed to record feedback', 500));
  }
});

// Get learning patterns for a feature
router.get('/patterns/:pattern_type', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { pattern_type } = req.params;
    const { min_confidence = 60 } = req.query;

    const patterns = await UniversalFeedbackService.getLearningPatterns(
      pattern_type,
      parseInt(min_confidence as string)
    );

    return res.json({
      success: true,
      patterns,
      count: patterns.length
    });
  } catch (error) {
    logger.error('Get patterns error:', error);
    return next(createError('Failed to get learning patterns', 500));
  }
});

// Apply learning to improve a decision
router.post('/apply-learning', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { pattern_type, input_key, default_value } = req.body;

    if (!pattern_type || !input_key) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pattern_type, input_key'
      });
    }

    const improvedValue = await UniversalFeedbackService.applyLearning(
      pattern_type,
      input_key,
      default_value
    );

    return res.json({
      success: true,
      original_value: default_value,
      improved_value: improvedValue,
      learning_applied: improvedValue !== default_value
    });
  } catch (error) {
    logger.error('Apply learning error:', error);
    return next(createError('Failed to apply learning', 500));
  }
});

// Get feedback analytics (admin/monitoring)
router.get('/analytics', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await UniversalFeedbackService.getFeedbackAnalytics(
      parseInt(days as string)
    );

    return res.json({
      success: true,
      analytics,
      period_days: parseInt(days as string)
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    return next(createError('Failed to get feedback analytics', 500));
  }
});

// Get system insights
router.get('/insights', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const insights = await UniversalFeedbackService.getSystemInsights();

    return res.json({
      success: true,
      insights
    });
  } catch (error) {
    logger.error('Get insights error:', error);
    return next(createError('Failed to get system insights', 500));
  }
});

// Validate system accuracy for a feature
router.get('/accuracy/:feedback_type', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { feedback_type } = req.params;

    const validation = await UniversalFeedbackService.validateSystemAccuracy(feedback_type);

    return res.json({
      success: true,
      feedback_type,
      validation
    });
  } catch (error) {
    logger.error('Validate accuracy error:', error);
    return next(createError('Failed to validate system accuracy', 500));
  }
});

// Export learning data (admin only)
router.get('/export', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Check if user is admin (you can implement admin check)
    // For now, allow all authenticated users
    
    const { pattern_type } = req.query;

    const exportData = await UniversalFeedbackService.exportLearningData(
      pattern_type as string
    );

    return res.json({
      success: true,
      export_data: exportData,
      exported_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Export learning data error:', error);
    return next(createError('Failed to export learning data', 500));
  }
});

// Get user's feedback history
router.get('/my-feedback', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const client = await req.app.locals.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          feedback_type,
          feature_area,
          original_data,
          corrected_data,
          confidence_score,
          feedback_quality,
          created_at
        FROM user_feedback
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [req.user!.id, parseInt(limit as string), parseInt(offset as string)]);

      const countResult = await client.query(
        'SELECT COUNT(*) FROM user_feedback WHERE user_id = $1',
        [req.user!.id]
      );

      return res.json({
        success: true,
        feedback: result.rows,
        total_count: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get user feedback error:', error);
    return next(createError('Failed to get user feedback history', 500));
  }
});

// Feedback statistics for user dashboard
router.get('/my-stats', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await req.app.locals.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          feedback_type,
          COUNT(*) as feedback_count,
          AVG(confidence_score) as avg_confidence,
          COUNT(CASE WHEN feedback_quality = 'applied' THEN 1 END) as applied_count
        FROM user_feedback
        WHERE user_id = $1
        GROUP BY feedback_type
        ORDER BY feedback_count DESC
      `, [req.user!.id]);

      const totalResult = await client.query(`
        SELECT 
          COUNT(*) as total_feedback,
          COUNT(CASE WHEN feedback_quality = 'applied' THEN 1 END) as total_applied,
          AVG(confidence_score) as overall_confidence
        FROM user_feedback
        WHERE user_id = $1
      `, [req.user!.id]);

      return res.json({
        success: true,
        by_type: result.rows.map((row: any) => ({
          feedback_type: row.feedback_type,
          count: parseInt(row.feedback_count),
          avg_confidence: parseFloat(row.avg_confidence),
          applied_count: parseInt(row.applied_count)
        })),
        overall: {
          total_feedback: parseInt(totalResult.rows[0].total_feedback),
          total_applied: parseInt(totalResult.rows[0].total_applied),
          overall_confidence: parseFloat(totalResult.rows[0].overall_confidence),
          impact_rate: totalResult.rows[0].total_feedback > 0 ? 
            (parseInt(totalResult.rows[0].total_applied) / parseInt(totalResult.rows[0].total_feedback)) * 100 : 0
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get user stats error:', error);
    return next(createError('Failed to get user feedback statistics', 500));
  }
});

export default router;