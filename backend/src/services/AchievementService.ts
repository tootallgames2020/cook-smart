/**
 * Achievement Service
 * Handles user achievements and badges
 */

import pool from '../config/database';

export interface Achievement {
  id: number;
  user_id: number;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  earned_at: Date;
}

const ACHIEVEMENTS = {
  FIRST_RECIPE: {
    type: 'first_recipe',
    name: 'First Recipe',
    description: 'Viewed your first recipe',
    icon: '🍳',
  },
  FIVE_RECIPES: {
    type: 'five_recipes',
    name: 'Recipe Explorer',
    description: 'Viewed 5 different recipes',
    icon: '👨‍🍳',
  },
  WASTE_WARRIOR: {
    type: 'waste_warrior',
    name: 'Waste Warrior',
    description: 'Used 10 ingredients before expiry',
    icon: '♻️',
  },
  WEEK_STREAK: {
    type: 'week_streak',
    name: 'Week Streak',
    description: 'Logged in 7 days in a row',
    icon: '🔥',
  },
  FIRST_SCAN: {
    type: 'first_scan',
    name: 'Scanner Pro',
    description: 'Scanned your first barcode',
    icon: '📱',
  },
  TEN_INGREDIENTS: {
    type: 'ten_ingredients',
    name: 'Stocked Kitchen',
    description: 'Added 10 ingredients to inventory',
    icon: '📦',
  },
};

export class AchievementService {
  /**
   * Check and award achievement if earned
   */
  static async checkAndAward(
    userId: number,
    achievementType: string,
  ): Promise<Achievement | null> {
    try {
      // Check if already earned
      const existing = await pool.query(
        'SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_type = $2',
        [userId, achievementType],
      );

      if (existing.rows.length > 0) {
        return null; // Already earned
      }

      // Get achievement details
      const achievement = Object.values(ACHIEVEMENTS).find(
        a => a.type === achievementType,
      );

      if (!achievement) {
        return null;
      }

      // Award achievement
      const result = await pool.query(
        `INSERT INTO user_achievements (user_id, achievement_type, achievement_name, achievement_description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, achievement.type, achievement.name, achievement.description],
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return null;
    }
  }

  /**
   * Get user's achievements
   */
  static async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_achievements WHERE user_id = $1 ORDER BY earned_at DESC',
        [userId],
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }

  /**
   * Get all available achievements with earned status
   */
  static async getAllAchievements(userId: string) {
    try {
      const earned = await this.getUserAchievements(userId);
      const earnedTypes = new Set(earned.map(a => a.achievement_type));

      return Object.values(ACHIEVEMENTS).map(achievement => ({
        ...achievement,
        earned: earnedTypes.has(achievement.type),
        earnedAt: earned.find(e => e.achievement_type === achievement.type)
          ?.earned_at,
      }));
    } catch (error) {
      console.error('Error getting all achievements:', error);
      return [];
    }
  }

  /**
   * Check recipe view achievements
   */
  static async checkRecipeAchievements(userId: number): Promise<void> {
    try {
      // Count recipe views (you'll need to track this)
      const result = await pool.query(
        'SELECT COUNT(DISTINCT recipe_id) as count FROM recipe_views WHERE user_id = $1',
        [userId],
      );

      const count = parseInt(result.rows[0]?.count || '0');

      if (count >= 1) {
        await this.checkAndAward(userId, 'first_recipe');
      }
      if (count >= 5) {
        await this.checkAndAward(userId, 'five_recipes');
      }
    } catch (error) {
      console.error('Error checking recipe achievements:', error);
    }
  }

  /**
   * Check ingredient achievements
   */
  static async checkIngredientAchievements(userId: number): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM user_ingredients WHERE user_id = $1',
        [userId],
      );

      const count = parseInt(result.rows[0]?.count || '0');

      if (count >= 10) {
        await this.checkAndAward(userId, 'ten_ingredients');
      }
    } catch (error) {
      console.error('Error checking ingredient achievements:', error);
    }
  }
}
