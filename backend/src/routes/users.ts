import express, {Response} from 'express';
import {authenticateToken, AuthRequest} from '../middleware/auth';
import {UserModel} from '../models/User';

const router = express.Router();

// Get user profile
router.get(
  '/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({error: 'User not authenticated'});
        return;
      }

      const user = await UserModel.findById(userId);

      if (!user) {
        res.status(404).json({error: 'User not found'});
        return;
      }

      // Return user profile without sensitive data
      res.json({
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_creator: user.is_creator,
          is_co_founder: user.is_co_founder,
          is_special_user: user.is_special_user,
          created_at: user.created_at,
        },
      });
    } catch (error) {
      console.error('[User Profile] Error:', error);
      res.status(500).json({error: 'Failed to get user profile'});
    }
  },
);

// Update user profile
router.patch(
  '/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({error: 'User not authenticated'});
        return;
      }

      const {first_name, last_name} = req.body;

      // Validate input
      if (!first_name && !last_name) {
        res.status(400).json({error: 'No fields to update'});
        return;
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (first_name) {
        updates.push(`first_name = $${paramCount++}`);
        values.push(first_name.trim());
      }
      if (last_name) {
        updates.push(`last_name = $${paramCount++}`);
        values.push(last_name.trim());
      }

      values.push(userId);

      const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name
    `;

      const pool = require('../config/database').default;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json({error: 'User not found'});
        return;
      }

      res.json({
        message: 'Profile updated successfully',
        user: result.rows[0],
      });
    } catch (error) {
      console.error('[Update Profile] Error:', error);
      res.status(500).json({error: 'Failed to update profile'});
    }
  },
);

export default router;

// Get user statistics
router.get(
  '/stats',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({error: 'User not authenticated'});
        return;
      }

      const pool = require('../config/database').default;

      // Get user statistics
      const statsQuery = `
        SELECT
          (SELECT COUNT(*) FROM user_recipes WHERE user_id = $1) as total_recipes,
          (SELECT COUNT(*) FROM favorites WHERE user_id = $1) as total_favorites,
          (SELECT COUNT(*) FROM recipe_ratings WHERE user_id = $1) as total_ratings,
          (SELECT COALESCE(AVG(rating), 0) FROM recipe_ratings WHERE user_id = $1) as average_rating
      `;

      const result = await pool.query(statsQuery, [userId]);
      const stats = result.rows[0];

      res.json({
        success: true,
        stats: {
          totalRecipes: parseInt(stats.total_recipes) || 0,
          totalFavorites: parseInt(stats.total_favorites) || 0,
          totalRatings: parseInt(stats.total_ratings) || 0,
          averageRating: parseFloat(stats.average_rating) || 0,
        },
      });
    } catch (error) {
      console.error('[User Stats] Error:', error);
      res.status(500).json({error: 'Failed to get user statistics'});
    }
  },
);
