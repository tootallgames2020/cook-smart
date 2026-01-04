import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's points
router.get('/my-points', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT points FROM users WHERE id = $1',
        [req.user!.id]
      );

      res.json({
        success: true,
        points: result.rows[0]?.points || 0,
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

export default router;