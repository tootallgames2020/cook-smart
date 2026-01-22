/**
 * Universal Feedback Service
 * 
 * Handles all user feedback and machine learning across the entire app.
 * This service enables any feature to collect user corrections and learn from them.
 */

import { pool } from '../server';
import { logger } from '../utils/logger';

export interface FeedbackData {
  userId: string;
  feedbackType: string;
  featureArea: string;
  originalData: any;
  correctedData: any;
  contextData?: any;
  confidenceScore?: number;
}

export interface LearningPattern {
  patternKey: string;
  learnedValue: any;
  confidence: number;
  evidenceCount: number;
  lastSeen: Date;
}

export interface FeedbackAnalytics {
  feedbackType: string;
  date: string;
  totalFeedback: number;
  positiveFeedback: number;
  appliedCorrections: number;
  systemAccuracy: number;
  avgConfidence: number;
  satisfactionRate: number;
  activePatterns: number;
}

export class UniversalFeedbackService {
  
  /**
   * Record user feedback for any feature
   */
  static async recordFeedback(feedback: FeedbackData): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO user_feedback (
            user_id, feedback_type, feature_area, original_data, 
            corrected_data, context_data, confidence_score
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id, feedback_type, original_data, corrected_data) 
          DO UPDATE SET 
            confidence_score = GREATEST(user_feedback.confidence_score, EXCLUDED.confidence_score),
            updated_at = NOW()
        `, [
          feedback.userId,
          feedback.feedbackType,
          feedback.featureArea,
          JSON.stringify(feedback.originalData),
          JSON.stringify(feedback.correctedData),
          JSON.stringify(feedback.contextData || {}),
          feedback.confidenceScore || 1.0
        ]);

        logger.info(`Feedback recorded: ${feedback.feedbackType} by user ${feedback.userId}`);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error recording feedback:', error);
      throw error;
    }
  }

  /**
   * Get learning patterns for a specific feature
   */
  static async getLearningPatterns(patternType: string, minConfidence: number = 60): Promise<LearningPattern[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT pattern_key, pattern_value, confidence, evidence_count, last_reinforced
          FROM learning_patterns
          WHERE pattern_type = $1 AND confidence >= $2
          ORDER BY confidence DESC, evidence_count DESC
        `, [patternType, minConfidence]);

        return result.rows.map(row => ({
          patternKey: row.pattern_key,
          learnedValue: row.pattern_value,
          confidence: parseFloat(row.confidence),
          evidenceCount: parseInt(row.evidence_count),
          lastSeen: row.last_reinforced
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error getting learning patterns:', error);
      return [];
    }
  }

  /**
   * Apply learned pattern to improve system decision
   */
  static async applyLearning(patternType: string, inputKey: string, defaultValue: any): Promise<any> {
    try {
      const patterns = await this.getLearningPatterns(patternType);
      
      // Find exact match first
      let bestMatch = patterns.find(p => p.patternKey === inputKey);
      
      // If no exact match, try fuzzy matching for high-confidence patterns
      if (!bestMatch && patterns.length > 0) {
        bestMatch = patterns.find(p => 
          p.confidence >= 80 && 
          (inputKey.includes(p.patternKey) || p.patternKey.includes(inputKey))
        );
      }
      
      if (bestMatch && bestMatch.confidence >= 70) {
        logger.info(`Applied learning: ${patternType}/${inputKey} -> ${JSON.stringify(bestMatch.learnedValue)} (${bestMatch.confidence}% confidence)`);
        return bestMatch.learnedValue;
      }
      
      return defaultValue;
    } catch (error) {
      logger.error('Error applying learning:', error);
      return defaultValue;
    }
  }

  /**
   * Get feedback analytics for monitoring
   */
  static async getFeedbackAnalytics(days: number = 30): Promise<FeedbackAnalytics[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT * FROM feedback_dashboard
          WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
          ORDER BY date DESC, feedback_type
        `);

        return result.rows.map(row => ({
          feedbackType: row.feedback_type,
          date: row.date,
          totalFeedback: parseInt(row.total_feedback),
          positiveFeedback: parseInt(row.positive_feedback),
          appliedCorrections: parseInt(row.applied_corrections),
          systemAccuracy: parseFloat(row.system_accuracy),
          avgConfidence: parseFloat(row.avg_confidence),
          satisfactionRate: parseFloat(row.satisfaction_rate),
          activePatterns: parseInt(row.active_patterns)
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error getting feedback analytics:', error);
      return [];
    }
  }

  /**
   * Get system-wide learning insights
   */
  static async getSystemInsights(): Promise<{
    totalPatterns: number;
    highConfidencePatterns: number;
    recentFeedback: number;
    topLearningAreas: Array<{ area: string; patterns: number; avgConfidence: number }>;
  }> {
    try {
      const client = await pool.connect();
      try {
        // Get pattern counts
        const patternStats = await client.query(`
          SELECT 
            COUNT(*) as total_patterns,
            COUNT(CASE WHEN confidence >= 80 THEN 1 END) as high_confidence_patterns
          FROM learning_patterns
        `);

        // Get recent feedback count
        const recentFeedback = await client.query(`
          SELECT COUNT(*) as recent_count
          FROM user_feedback
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `);

        // Get top learning areas
        const topAreas = await client.query(`
          SELECT 
            pattern_type as area,
            COUNT(*) as patterns,
            AVG(confidence) as avg_confidence
          FROM learning_patterns
          WHERE confidence >= 60
          GROUP BY pattern_type
          ORDER BY COUNT(*) DESC, AVG(confidence) DESC
          LIMIT 10
        `);

        return {
          totalPatterns: parseInt(patternStats.rows[0].total_patterns),
          highConfidencePatterns: parseInt(patternStats.rows[0].high_confidence_patterns),
          recentFeedback: parseInt(recentFeedback.rows[0].recent_count),
          topLearningAreas: topAreas.rows.map(row => ({
            area: row.area,
            patterns: parseInt(row.patterns),
            avgConfidence: parseFloat(row.avg_confidence)
          }))
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error getting system insights:', error);
      return {
        totalPatterns: 0,
        highConfidencePatterns: 0,
        recentFeedback: 0,
        topLearningAreas: []
      };
    }
  }

  /**
   * Validate and improve system accuracy
   */
  static async validateSystemAccuracy(feedbackType: string): Promise<{
    accuracy: number;
    totalSamples: number;
    recommendedActions: string[];
  }> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            COUNT(*) as total_feedback,
            COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) as high_confidence_feedback,
            AVG(confidence_score) as avg_confidence
          FROM user_feedback
          WHERE feedback_type = $1
          AND created_at >= NOW() - INTERVAL '30 days'
        `, [feedbackType]);

        const stats = result.rows[0];
        const totalSamples = parseInt(stats.total_feedback);
        const accuracy = totalSamples > 0 ? 
          (parseInt(stats.high_confidence_feedback) / totalSamples) * 100 : 0;

        const recommendedActions: string[] = [];
        
        if (accuracy < 70) {
          recommendedActions.push('System accuracy is low - review and improve algorithms');
        }
        if (totalSamples < 10) {
          recommendedActions.push('Insufficient feedback data - encourage more user corrections');
        }
        if (parseFloat(stats.avg_confidence) < 0.6) {
          recommendedActions.push('Users have low confidence - improve UI clarity and system transparency');
        }

        return {
          accuracy: Math.round(accuracy * 100) / 100,
          totalSamples,
          recommendedActions
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error validating system accuracy:', error);
      return {
        accuracy: 0,
        totalSamples: 0,
        recommendedActions: ['Error occurred while validating accuracy']
      };
    }
  }

  /**
   * Export learning data for analysis
   */
  static async exportLearningData(patternType?: string): Promise<{
    patterns: LearningPattern[];
    feedback: Array<{
      feedbackType: string;
      originalData: any;
      correctedData: any;
      confidence: number;
      createdAt: Date;
    }>;
  }> {
    try {
      const client = await pool.connect();
      try {
        // Get patterns
        const patternQuery = patternType ? 
          'SELECT * FROM learning_patterns WHERE pattern_type = $1 ORDER BY confidence DESC' :
          'SELECT * FROM learning_patterns ORDER BY confidence DESC';
        const patternParams = patternType ? [patternType] : [];
        
        const patterns = await client.query(patternQuery, patternParams);

        // Get recent feedback
        const feedbackQuery = patternType ?
          'SELECT feedback_type, original_data, corrected_data, confidence_score, created_at FROM user_feedback WHERE feedback_type = $1 ORDER BY created_at DESC LIMIT 1000' :
          'SELECT feedback_type, original_data, corrected_data, confidence_score, created_at FROM user_feedback ORDER BY created_at DESC LIMIT 1000';
        const feedbackParams = patternType ? [patternType] : [];
        
        const feedback = await client.query(feedbackQuery, feedbackParams);

        return {
          patterns: patterns.rows.map(row => ({
            patternKey: row.pattern_key,
            learnedValue: row.pattern_value,
            confidence: parseFloat(row.confidence),
            evidenceCount: parseInt(row.evidence_count),
            lastSeen: row.last_reinforced
          })),
          feedback: feedback.rows.map(row => ({
            feedbackType: row.feedback_type,
            originalData: row.original_data,
            correctedData: row.corrected_data,
            confidence: parseFloat(row.confidence_score),
            createdAt: row.created_at
          }))
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error exporting learning data:', error);
      return { patterns: [], feedback: [] };
    }
  }
}