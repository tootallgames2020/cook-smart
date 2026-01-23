import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's points summary (root endpoint)
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Prevent caching to ensure fresh points data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, points, updated_at FROM users WHERE id = $1',
        [req.user!.id]
      );

      const user = result.rows[0];
      const points = user?.points || 0;
      
      // Calculate level based on points
      const calculateLevel = (totalPoints: number): number => {
        if (totalPoints < 100) return 0;
        if (totalPoints < 500) return 1;
        if (totalPoints < 2000) return 2;
        if (totalPoints < 5000) return 3;
        if (totalPoints < 10000) return 4;
        return 5;
      };

      const level = calculateLevel(points);
      
      logger.info(`Points for user ${req.user!.id}: ${points}, level: ${level}`);

      res.json({
        userId: user?.id || req.user!.id,
        totalPoints: points,
        level: level,
        lastUpdated: user?.updated_at || new Date(),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get points error:', error);
    next(createError('Failed to get points', 500));
  }
});

// Get user's points
router.get('/my-points', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Prevent caching to ensure fresh points data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT points FROM users WHERE id = $1',
        [req.user!.id]
      );

      const points = result.rows[0]?.points || 0;
      logger.info(`My-points for user ${req.user!.id}: ${points}`);

      res.json({
        success: true,
        points: points,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get points error:', error);
    next(createError('Failed to get points', 500));
  }
});

// Get leaderboard
router.get('/leaderboard', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, first_name, last_name, points,
                ROW_NUMBER() OVER (ORDER BY points DESC) as rank
         FROM users 
         WHERE points > 0
         ORDER BY points DESC 
         LIMIT $1`,
        [parseInt(limit as string)]
      );

      const leaderboard = result.rows.map(row => ({
        userId: row.id,
        username: row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : 'Anonymous',
        totalPoints: row.points,
        rank: parseInt(row.rank),
      }));

      res.json({
        success: true,
        leaderboard,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    next(createError('Failed to get leaderboard', 500));
  }
});

// Get points history
router.get('/history', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const client = await pool.connect();
    try {
      // Check if points_transactions table exists, if not return empty array
      const tableCheck = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'points_transactions'
        )`
      );

      if (!tableCheck.rows[0].exists) {
        // Return empty history if table doesn't exist yet
        res.json([]);
        return;
      }

      const result = await client.query(
        `SELECT id, points, action, description, created_at
         FROM points_transactions 
         WHERE user_id = $1
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [req.user!.id, parseInt(limit as string), parseInt(offset as string)]
      );

      const transactions = result.rows.map(row => ({
        id: row.id,
        userId: req.user!.id,
        points: row.points,
        action: row.action,
        description: row.description,
        dateCreated: row.created_at,
      }));

      res.json(transactions);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get points history error:', error);
    // Return empty array on error to prevent app crashes
    res.json([]);
  }
});

export default router;