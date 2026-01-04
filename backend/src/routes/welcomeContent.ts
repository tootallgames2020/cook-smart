import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Get user's personalized welcome content
router.get('/my-welcome', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's welcome settings
      const userResult = await client.query(
        `SELECT welcome_screen_type, welcome_music_file, welcome_title, welcome_emoji,
                is_creator, is_special_user, is_developer, first_name
         FROM users WHERE id = $1`,
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = userResult.rows[0];

      // If user doesn't have a welcome screen configured, return null
      if (!user.welcome_screen_type) {
        return res.json({
          success: true,
          hasWelcomeScreen: false,
          welcomeContent: null,
        });
      }

      // Get user's welcome content
      const contentResult = await client.query(
        `SELECT content_type, content_text, display_order
         FROM user_welcome_content 
         WHERE user_id = $1 
         ORDER BY display_order ASC`,
        [req.user!.id]
      );

      // Organize content by type
      const content = {
        paragraphs: [] as string[],
        boldParagraphs: [] as string[],
        signature: '',
        postscript: '',
      };

      contentResult.rows.forEach(row => {
        switch (row.content_type) {
          case 'letter_paragraph':
            content.paragraphs.push(row.content_text);
            break;
          case 'letter_bold':
            content.boldParagraphs.push(row.content_text);
            break;
          case 'signature':
            content.signature = row.content_text;
            break;
          case 'postscript':
            content.postscript = row.content_text;
            break;
        }
      });

      // Determine badge text
      let badgeText = '⭐ SPECIAL ACCESS - LIFETIME';
      if (user.is_creator) {
        badgeText = '👑 CREATOR - LIFETIME ACCESS';
      } else if (user.is_special_user) {
        badgeText = '💐 SPECIAL USER - LIFETIME ACCESS';
      } else if (user.is_developer) {
        badgeText = '🔧 DEVELOPER - FULL ACCESS';
      }

      const welcomeData = {
        hasWelcomeScreen: true,
        screenType: user.welcome_screen_type,
        title: user.welcome_title || `Welcome, ${user.first_name || 'Friend'}!`,
        emoji: user.welcome_emoji || '⭐',
        musicFile: user.welcome_music_file,
        badgeText,
        content,
        storageKey: `welcome_shown_${req.user!.id}`, // Individual storage key
      };

      logger.info(`Welcome content fetched for user ${req.user!.id}`);

      return res.json({
        success: true,
        hasWelcomeScreen: true,
        welcomeContent: welcomeData,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get welcome content error:', error);
    return next(createError('Failed to get welcome content', 500));
  }
});

// Admin endpoint to set user's welcome content
router.post('/set-welcome/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    // Check if user is admin or developer
    const adminCheck = await pool.connect();
    try {
      const adminResult = await adminCheck.query(
        'SELECT is_admin, is_developer FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (adminResult.rows.length === 0 || (!adminResult.rows[0].is_admin && !adminResult.rows[0].is_developer)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }
    } finally {
      adminCheck.release();
    }

    const { userId } = req.params;
    const { 
      screenType, 
      title, 
      emoji, 
      musicFile, 
      content 
    } = req.body;

    if (!screenType || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'screenType, title, and content are required',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user's welcome settings
      await client.query(
        `UPDATE users SET 
         welcome_screen_type = $1,
         welcome_title = $2,
         welcome_emoji = $3,
         welcome_music_file = $4,
         updated_at = NOW()
         WHERE id = $5`,
        [screenType, title, emoji, musicFile, userId]
      );

      // Delete existing content
      await client.query(
        'DELETE FROM user_welcome_content WHERE user_id = $1',
        [userId]
      );

      // Insert new content
      let displayOrder = 1;
      
      // Insert paragraphs
      if (content.paragraphs && Array.isArray(content.paragraphs)) {
        for (const paragraph of content.paragraphs) {
          await client.query(
            `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
             VALUES ($1, 'letter_paragraph', $2, $3)`,
            [userId, paragraph, displayOrder++]
          );
        }
      }

      // Insert bold paragraphs
      if (content.boldParagraphs && Array.isArray(content.boldParagraphs)) {
        for (const paragraph of content.boldParagraphs) {
          await client.query(
            `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
             VALUES ($1, 'letter_bold', $2, $3)`,
            [userId, paragraph, displayOrder++]
          );
        }
      }

      // Insert signature
      if (content.signature) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'signature', $2, $3)`,
          [userId, content.signature, displayOrder++]
        );
      }

      // Insert postscript
      if (content.postscript) {
        await client.query(
          `INSERT INTO user_welcome_content (user_id, content_type, content_text, display_order)
           VALUES ($1, 'postscript', $2, $3)`,
          [userId, content.postscript, displayOrder++]
        );
      }

      await client.query('COMMIT');

      logger.info(`Welcome content set for user ${userId} by admin ${req.user!.id}`);

      return res.json({
        success: true,
        message: 'Welcome content updated successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Set welcome content error:', error);
    return next(createError('Failed to set welcome content', 500));
  }
});

export default router;