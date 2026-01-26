/**
 * AUTONOMOUS MAINTENANCE BOT API ROUTES
 * 
 * API endpoints for monitoring and controlling the autonomous maintenance bot.
 * Provides system health metrics, maintenance logs, and bot control.
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import AutonomousMaintenanceBot from '../services/AutonomousMaintenanceBot';
import { logger } from '../utils/logger';
import { pool } from '../server';

const router = Router();

/**
 * GET /api/v1/maintenance-bot/health
 * Get current system health metrics
 */
router.get('/health', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get current system metrics
    const metrics = await AutonomousMaintenanceBot['collectSystemMetrics']();
    
    res.json({
      success: true,
      data: metrics,
      message: 'System health metrics retrieved successfully'
    });

  } catch (error) {
    logger.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system health metrics'
    });
  }
});

/**
 * GET /api/v1/maintenance-bot/status
 * Get maintenance bot status and recent activity
 */
router.get('/status', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const client = await pool.connect();
    
    try {
      // Get recent maintenance actions
      const actionsResult = await client.query(`
        SELECT * FROM maintenance_actions_log 
        ORDER BY executed_at DESC 
        LIMIT 20
      `);
      
      // Get recent system health logs
      const healthResult = await client.query(`
        SELECT * FROM system_health_log 
        ORDER BY recorded_at DESC 
        LIMIT 10
      `);
      
      res.json({
        success: true,
        data: {
          bot_status: 'operational',
          uptime_hours: Math.floor(process.uptime() / 3600),
          recent_actions: actionsResult.rows,
          health_history: healthResult.rows,
          last_check: new Date().toISOString()
        },
        message: 'Maintenance bot status retrieved successfully'
      });
      
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Get maintenance bot status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance bot status'
    });
  }
});

/**
 * POST /api/v1/maintenance-bot/start
 * Start the autonomous maintenance bot
 */
router.post('/start', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await AutonomousMaintenanceBot.startAutonomousMonitoring();
    
    res.json({
      success: true,
      message: 'Autonomous maintenance bot started successfully'
    });

  } catch (error) {
    logger.error('Start maintenance bot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start maintenance bot'
    });
  }
});

/**
 * POST /api/v1/maintenance-bot/manual-check
 * Trigger a manual system health check
 */
router.post('/manual-check', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Trigger manual monitoring cycle
    await AutonomousMaintenanceBot['monitoringCycle']();
    
    res.json({
      success: true,
      message: 'Manual system check completed successfully'
    });

  } catch (error) {
    logger.error('Manual system check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform manual system check'
    });
  }
});

/**
 * GET /api/v1/maintenance-bot/issues
 * Get current system issues and recommended actions
 */
router.get('/issues', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get current system metrics
    const metrics = await AutonomousMaintenanceBot['collectSystemMetrics']();
    
    // Detect current issues
    const issues = await AutonomousMaintenanceBot['detectSystemIssues'](metrics);
    
    res.json({
      success: true,
      data: {
        total_issues: issues.length,
        critical_issues: issues.filter(i => i.severity === 'critical').length,
        auto_fixable_issues: issues.filter(i => i.auto_fixable).length,
        issues: issues
      },
      message: 'System issues retrieved successfully'
    });

  } catch (error) {
    logger.error('Get system issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system issues'
    });
  }
});

/**
 * GET /api/v1/maintenance-bot/performance
 * Get system performance analytics
 */
router.get('/performance', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const daysInt = parseInt(days as string);
    
    const client = await pool.connect();
    
    try {
      // Get performance trends
      const performanceResult = await client.query(`
        SELECT 
          DATE(recorded_at) as date,
          AVG(health_score) as avg_health_score,
          COUNT(*) as checks_performed
        FROM system_health_log 
        WHERE recorded_at >= NOW() - INTERVAL '${daysInt} days'
        GROUP BY DATE(recorded_at)
        ORDER BY date DESC
      `);
      
      // Get maintenance actions summary
      const actionsResult = await client.query(`
        SELECT 
          action_type,
          COUNT(*) as count,
          AVG(execution_time_ms) as avg_execution_time
        FROM maintenance_actions_log 
        WHERE executed_at >= NOW() - INTERVAL '${daysInt} days'
        GROUP BY action_type
      `);
      
      res.json({
        success: true,
        data: {
          performance_trends: performanceResult.rows,
          maintenance_summary: actionsResult.rows,
          analysis_period_days: daysInt
        },
        message: 'Performance analytics retrieved successfully'
      });
      
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Get performance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance analytics'
    });
  }
});

/**
 * GET /api/v1/maintenance-bot/capabilities
 * Get maintenance bot capabilities and configuration
 */
router.get('/capabilities', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        bot_name: 'Cook Smart Autonomous Maintenance Bot',
        version: '1.0.0',
        capabilities: {
          system_monitoring: {
            description: 'Continuous monitoring of system health and performance',
            features: [
              'Real-time metrics collection',
              'Database performance monitoring',
              'API response time tracking',
              'Resource usage monitoring',
              'Error rate detection'
            ]
          },
          automatic_repair: {
            description: 'Autonomous detection and repair of system issues',
            features: [
              'Database optimization',
              'API performance tuning',
              'Memory management',
              'Error resolution',
              'Preventive maintenance'
            ]
          },
          ai_model_management: {
            description: 'Automatic AI model updates and optimization',
            features: [
              'Model accuracy monitoring',
              'Automatic retraining',
              'Performance optimization',
              'User feedback integration',
              'Model version management'
            ]
          },
          predictive_maintenance: {
            description: 'Predict and prevent issues before they occur',
            features: [
              'Trend analysis',
              'Anomaly detection',
              'Capacity planning',
              'Performance forecasting',
              'Proactive optimization'
            ]
          }
        },
        monitoring_intervals: {
          health_check: '60 seconds',
          performance_analysis: '5 minutes',
          ai_model_update: '1 hour',
          deep_system_scan: '24 hours'
        },
        auto_fix_capabilities: [
          'Database query optimization',
          'Memory cache clearing',
          'Connection pool management',
          'API endpoint optimization',
          'AI model retraining',
          'Resource cleanup',
          'Error pattern resolution'
        ],
        safety_features: [
          'Rollback mechanisms for all actions',
          'Success probability assessment',
          'Impact analysis before execution',
          'Human override capabilities',
          'Comprehensive logging',
          'Self-monitoring and error recovery'
        ]
      },
      message: 'Maintenance bot capabilities retrieved successfully'
    });

  } catch (error) {
    logger.error('Get maintenance bot capabilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance bot capabilities'
    });
  }
});

export default router;