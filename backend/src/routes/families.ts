import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { SmartFamilyCoordinationService } from '../services/SmartFamilyCoordinationService';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Create a new family
router.post('/create', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { family_name } = req.body;

    if (!family_name || family_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Family name is required',
      });
    }

    if (family_name.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Family name must be 50 characters or less',
      });
    }

    const result = await SmartFamilyCoordinationService.createFamily(
      req.user!.id,
      family_name.trim()
    );

    return res.status(201).json({
      success: true,
      message: 'Family created successfully',
      family: result,
    });
  } catch (error) {
    logger.error('Create family error:', error);
    return next(createError('Failed to create family', 500));
  }
});

// Join a family using invite code
router.post('/join', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { invite_code, display_name } = req.body;

    if (!invite_code || invite_code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invite code is required',
      });
    }

    if (!display_name || display_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Display name is required',
      });
    }

    const result = await SmartFamilyCoordinationService.joinFamily(
      req.user!.id,
      invite_code.trim().toUpperCase(),
      display_name.trim()
    );

    return res.json({
      success: true,
      message: 'Successfully joined family',
      family: result,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid invite code') {
        return res.status(404).json({
          success: false,
          message: 'Invalid invite code. Please check and try again.',
        });
      }
      if (error.message === 'User already in this family') {
        return res.status(409).json({
          success: false,
          message: 'You are already a member of this family.',
        });
      }
    }
    
    logger.error('Join family error:', error);
    return next(createError('Failed to join family', 500));
  }
});

// Get user's family information
router.get('/my-family', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's family
      const familyResult = await client.query(`
        SELECT f.id, f.family_name, f.invite_code, f.created_at,
               fm.role, fm.display_name, fm.joined_at
        FROM families f
        JOIN family_members fm ON f.id = fm.family_id
        WHERE fm.user_id = $1
      `, [req.user!.id]);

      if (familyResult.rows.length === 0) {
        return res.json({
          success: true,
          has_family: false,
          message: 'User is not part of any family',
        });
      }

      const family = familyResult.rows[0];

      // Get all family members
      const membersResult = await client.query(`
        SELECT fm.user_id, fm.display_name, fm.role, fm.joined_at,
               u.name as full_name, u.email
        FROM family_members fm
        JOIN users u ON fm.user_id = u.id
        WHERE fm.family_id = $1
        ORDER BY fm.role DESC, fm.joined_at ASC
      `, [family.id]);

      // Get family statistics
      const statsResult = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM user_ingredients WHERE family_id = $1) as total_ingredients,
          (SELECT COUNT(*) FROM shopping_list_items WHERE family_id = $1 AND completed = false) as shopping_items,
          (SELECT COUNT(*) FROM store_visits sv JOIN family_members fm ON sv.user_id = fm.user_id 
           WHERE fm.family_id = $1 AND sv.detected_at >= CURRENT_DATE - INTERVAL '7 days') as store_visits_week
      `, [family.id]);

      return res.json({
        success: true,
        has_family: true,
        family: {
          id: family.id,
          name: family.family_name,
          invite_code: family.invite_code,
          created_at: family.created_at,
          user_role: family.role,
          user_display_name: family.display_name,
          joined_at: family.joined_at,
        },
        members: membersResult.rows,
        statistics: statsResult.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get family error:', error);
    return next(createError('Failed to get family information', 500));
  }
});

// Get family dashboard with smart insights
router.get('/dashboard', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get user's family ID
      const familyResult = await client.query(`
        SELECT fm.family_id, f.family_name
        FROM family_members fm
        JOIN families f ON fm.family_id = f.id
        WHERE fm.user_id = $1
      `, [req.user!.id]);

      if (familyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User is not part of any family',
        });
      }

      const familyId = familyResult.rows[0].family_id;
      const familyName = familyResult.rows[0].family_name;

      // Get recent family activity
      const activityResult = await client.query(`
        SELECT 
          'ingredient_added' as activity_type,
          ui.ingredient_name as item_name,
          u.name as member_name,
          ui.added_at as activity_time
        FROM user_ingredients ui
        JOIN users u ON ui.user_id = u.id
        WHERE ui.family_id = $1 AND ui.added_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'ingredient_used' as activity_type,
          iul.ingredient_name as item_name,
          u.name as member_name,
          iul.used_at as activity_time
        FROM ingredient_usage_log iul
        JOIN users u ON iul.user_id = u.id
        JOIN family_members fm ON u.id = fm.user_id
        WHERE fm.family_id = $1 AND iul.used_at >= CURRENT_DATE - INTERVAL '7 days'
        
        UNION ALL
        
        SELECT 
          'store_visit' as activity_type,
          sv.store_name as item_name,
          u.name as member_name,
          sv.detected_at as activity_time
        FROM store_visits sv
        JOIN users u ON sv.user_id = u.id
        JOIN family_members fm ON u.id = fm.user_id
        WHERE fm.family_id = $1 AND sv.detected_at >= CURRENT_DATE - INTERVAL '7 days'
        
        ORDER BY activity_time DESC
        LIMIT 20
      `, [familyId]);

      // Get family shopping list summary
      const shoppingResult = await client.query(`
        SELECT 
          COUNT(*) as total_items,
          COUNT(*) FILTER (WHERE urgent = true) as urgent_items,
          COUNT(DISTINCT user_id) as contributors
        FROM shopping_list_items
        WHERE family_id = $1 AND completed = false
      `, [familyId]);

      // Get expiring ingredients
      const expiringResult = await client.query(`
        SELECT 
          ingredient_name,
          expiration_date,
          EXTRACT(DAY FROM (expiration_date - CURRENT_DATE)) as days_until_expiry
        FROM user_ingredients
        WHERE family_id = $1
          AND expiration_date IS NOT NULL
          AND expiration_date <= CURRENT_DATE + INTERVAL '3 days'
          AND expiration_date >= CURRENT_DATE
          AND quantity > 0
        ORDER BY expiration_date ASC
        LIMIT 10
      `, [familyId]);

      return res.json({
        success: true,
        dashboard: {
          family_name: familyName,
          recent_activity: activityResult.rows,
          shopping_summary: shoppingResult.rows[0],
          expiring_ingredients: expiringResult.rows,
          last_updated: new Date().toISOString(),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get family dashboard error:', error);
    return next(createError('Failed to get family dashboard', 500));
  }
});

// Report store visit (manual or automatic)
router.post('/store-visit', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { 
      latitude, 
      longitude, 
      place_name, 
      wifi_networks = [],
      detection_method = 'manual'
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates are required',
      });
    }

    const storeVisit = await SmartFamilyCoordinationService.detectStoreVisit(
      req.user!.id,
      { latitude, longitude },
      wifi_networks,
      place_name
    );

    if (!storeVisit) {
      return res.json({
        success: true,
        store_detected: false,
        message: 'No grocery store detected at this location',
      });
    }

    return res.json({
      success: true,
      store_detected: true,
      store_visit: storeVisit,
      message: `Detected visit to ${storeVisit.store_name}. Family has been notified!`,
    });
  } catch (error) {
    logger.error('Store visit detection error:', error);
    return next(createError('Failed to process store visit', 500));
  }
});

// Add item to family shopping list from store visit
router.post('/add-shopping-item', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { 
      item_name, 
      quantity = 1, 
      unit = 'piece', 
      urgent = false, 
      notes,
      for_shopper_user_id 
    } = req.body;

    if (!item_name || item_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Item name is required',
      });
    }

    const client = await pool.connect();
    try {
      // Get user's family
      const familyResult = await client.query(`
        SELECT family_id FROM family_members WHERE user_id = $1
      `, [req.user!.id]);

      if (familyResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User is not part of any family',
        });
      }

      const familyId = familyResult.rows[0].family_id;

      // Add item to family shopping list
      const result = await client.query(`
        INSERT INTO shopping_list_items 
        (user_id, family_id, item_name, quantity, unit, urgent, notes, added_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `, [req.user!.id, familyId, item_name.trim(), quantity, unit, urgent, notes]);

      // If this is for a specific shopper, notify them
      if (for_shopper_user_id) {
        // Send notification to shopper
        const { PushNotificationService } = await import('../services/PushNotificationService');
        await PushNotificationService.sendNotification(
          parseInt(for_shopper_user_id),
          '🛒 Item Added to Your Shopping Trip!',
          `Family added: ${item_name}${urgent ? ' (URGENT)' : ''}`,
          {
            type: 'shopping_item_added',
            item_name,
            urgent,
            added_by: req.user!.id,
          }
        );
      }

      return res.status(201).json({
        success: true,
        message: 'Item added to family shopping list',
        item: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add shopping item error:', error);
    return next(createError('Failed to add shopping item', 500));
  }
});

// Leave family
router.post('/leave', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Check if user is in a family
      const memberResult = await client.query(`
        SELECT fm.family_id, fm.role, f.family_name
        FROM family_members fm
        JOIN families f ON fm.family_id = f.id
        WHERE fm.user_id = $1
      `, [req.user!.id]);

      if (memberResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User is not part of any family',
        });
      }

      const member = memberResult.rows[0];

      // Check if this is the last admin
      if (member.role === 'admin') {
        const adminCount = await client.query(`
          SELECT COUNT(*) as count FROM family_members 
          WHERE family_id = $1 AND role = 'admin'
        `, [member.family_id]);

        if (parseInt(adminCount.rows[0].count) === 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot leave family as the only admin. Transfer admin role first or delete the family.',
          });
        }
      }

      // Remove user from family
      await client.query(`
        DELETE FROM family_members WHERE family_id = $1 AND user_id = $2
      `, [member.family_id, req.user!.id]);

      return res.json({
        success: true,
        message: `Successfully left ${member.family_name}`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Leave family error:', error);
    return next(createError('Failed to leave family', 500));
  }
});

export default router;