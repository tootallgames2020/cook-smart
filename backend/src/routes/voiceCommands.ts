/**
 * VOICE COMMANDS API ROUTES
 * 
 * RESTful API endpoints for voice command processing:
 * - Process voice commands with natural language understanding
 * - Get voice command history and analytics
 * - Configure voice processing preferences
 */

import { Router, Response } from 'express';
import { VoiceCommandService, VoiceCommand, VoiceResponse } from '../services/VoiceCommandService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/voice-commands/process
 * Process a voice command
 */
router.post('/process', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { command_text, processing_method } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    if (!command_text || typeof command_text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'command_text is required and must be a string',
      });
    }

    const voiceCommand: VoiceCommand = {
      user_id: userId,
      command_text: command_text.trim(),
      processing_method: processing_method || 'local',
    };

    const result: VoiceResponse = await VoiceCommandService.processVoiceCommand(voiceCommand);

    res.json({
      success: result.success,
      response_text: result.response_text,
      action_taken: result.action_taken,
      data: result.data,
      confidence: result.confidence,
      processing_time_ms: result.processing_time_ms,
    });

  } catch (error) {
    logger.error('Process voice command error:', error);
    res.status(500).json({
      success: false,
      error: 'Voice command processing failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/voice-commands/history
 * Get user's voice command history
 */
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    // Get voice command history from database
    const history = await getVoiceCommandHistory(userId, limit);

    res.json({
      success: true,
      history,
      total_commands: history.length,
    });

  } catch (error) {
    logger.error('Get voice command history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice command history',
    });
  }
});

/**
 * GET /api/v1/voice-commands/analytics
 * Get voice command usage analytics
 */
router.get('/analytics', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const days = parseInt(req.query.days as string) || 30;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    const analytics = await getVoiceCommandAnalytics(userId, days);

    res.json({
      success: true,
      analytics,
      period_days: days,
    });

  } catch (error) {
    logger.error('Get voice command analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice command analytics',
    });
  }
});

/**
 * POST /api/v1/voice-commands/feedback
 * Provide feedback on voice command results
 */
router.post('/feedback', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { command_id, feedback_type, rating, comments } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    if (!command_id || !feedback_type) {
      return res.status(400).json({
        success: false,
        error: 'command_id and feedback_type are required',
      });
    }

    await storeVoiceCommandFeedback(userId, {
      command_id,
      feedback_type,
      rating: rating || null,
      comments: comments || null,
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
    });

  } catch (error) {
    logger.error('Store voice command feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store feedback',
    });
  }
});

/**
 * GET /api/v1/voice-commands/capabilities
 * Get available voice command capabilities and examples
 */
router.get('/capabilities', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const capabilities = {
      ingredient_management: {
        description: 'Manage your ingredient inventory with voice',
        examples: [
          'I used 2 cups flour',
          'I finished the milk',
          'How much chicken do we have?',
          'What ingredients are expiring soon?',
        ],
        confidence: 0.9,
      },
      shopping_lists: {
        description: 'Add items to shopping lists',
        examples: [
          'Add milk to shopping list',
          'We need bread',
          'Put eggs on the list',
        ],
        confidence: 0.85,
      },
      recipe_search: {
        description: 'Find recipes using available ingredients',
        examples: [
          'Find a recipe with chicken and rice',
          'What can I make with tomatoes?',
          'Recipe for dinner using pasta',
        ],
        confidence: 0.8,
      },
      meal_planning: {
        description: 'Get help with meal planning',
        examples: [
          'What should I cook tonight?',
          'Plan meals for this week',
          'Suggest dinner ideas',
        ],
        confidence: 0.75,
      },
      inventory_checks: {
        description: 'Check ingredient quantities and status',
        examples: [
          'Do we have enough flour for baking?',
          'Check if we have onions',
          'What dairy products do we have?',
        ],
        confidence: 0.9,
      },
    };

    res.json({
      success: true,
      capabilities,
      total_categories: Object.keys(capabilities).length,
      processing_methods: {
        local_only: {
          description: 'Privacy-first processing on device',
          accuracy: 'Good',
          privacy: 'Maximum',
          speed: 'Fast',
        },
        cloud_enhanced: {
          description: 'Advanced AI processing with user consent',
          accuracy: 'Excellent',
          privacy: 'Controlled',
          speed: 'Medium',
        },
      },
    });

  } catch (error) {
    logger.error('Get voice capabilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice capabilities',
    });
  }
});

/**
 * POST /api/v1/voice-commands/test
 * Test voice command processing with sample commands
 */
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
    }

    const testCommands = [
      'I used 1 cup flour',
      'Add milk to shopping list',
      'How much chicken do we have?',
      'What\'s expiring soon?',
      'Find a recipe with pasta',
    ];

    const testResults = [];

    for (const commandText of testCommands) {
      try {
        const voiceCommand: VoiceCommand = {
          user_id: userId,
          command_text: commandText,
          processing_method: 'local',
        };

        const result = await VoiceCommandService.processVoiceCommand(voiceCommand);
        
        testResults.push({
          command: commandText,
          success: result.success,
          response: result.response_text,
          confidence: result.confidence,
          processing_time_ms: result.processing_time_ms,
        });
      } catch (testError) {
        testResults.push({
          command: commandText,
          success: false,
          response: 'Test failed',
          confidence: 0,
          processing_time_ms: 0,
          error: testError instanceof Error ? testError.message : 'Unknown error',
        });
      }
    }

    const successfulTests = testResults.filter(r => r.success).length;
    const averageConfidence = testResults.reduce((sum, r) => sum + r.confidence, 0) / testResults.length;

    res.json({
      success: true,
      test_results: testResults,
      summary: {
        total_tests: testResults.length,
        successful_tests: successfulTests,
        success_rate: successfulTests / testResults.length,
        average_confidence: averageConfidence,
      },
    });

  } catch (error) {
    logger.error('Voice command test error:', error);
    res.status(500).json({
      success: false,
      error: 'Voice command testing failed',
    });
  }
});

/**
 * HELPER FUNCTIONS
 */

async function getVoiceCommandHistory(userId: string, limit: number): Promise<any[]> {
  // This would query the voice_command_log table
  // For now, return empty array as table doesn't exist yet
  return [];
}

async function getVoiceCommandAnalytics(userId: string, days: number): Promise<any> {
  // This would analyze voice command usage patterns
  return {
    total_commands: 0,
    successful_commands: 0,
    success_rate: 0,
    most_used_intents: [],
    average_confidence: 0,
    processing_time_trends: [],
  };
}

async function storeVoiceCommandFeedback(userId: string, feedback: any): Promise<void> {
  // This would store feedback in voice_command_feedback table
  logger.info(`Voice command feedback from user ${userId}:`, feedback);
}

export default router;
