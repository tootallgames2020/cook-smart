import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Calculate access extension date based on months earned
 */
function calculateAccessExtension(monthsEarned: number): Date | null {
  if (monthsEarned <= 0) return null;
  
  const now = new Date();
  const extensionDate = new Date(now);
  extensionDate.setMonth(extensionDate.getMonth() + monthsEarned);
  
  return extensionDate;
}

// Create/Get referral code for user (matches frontend expectation)
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Check if user already has an active referral code
      const existingCode = await client.query(
        'SELECT referral_code FROM referrals WHERE referrer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [req.user!.id, 'active']
      );

      if (existingCode.rows.length > 0) {
        return res.json({
          success: true,
          referralCode: existingCode.rows[0].referral_code,
          message: 'Using existing referral code',
        });
      }

      // Generate new referral code
      const referralCode = `COOK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Insert new referral code
      await client.query(`
        INSERT INTO referrals (referrer_id, referral_code, status, created_at, expires_at)
        VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 year')
      `, [req.user!.id, referralCode]);

      return res.json({
        success: true,
        referralCode: referralCode,
        message: 'New referral code generated',
        shareUrl: `${process.env.APP_URL || 'https://cooksmartapp.com'}/signup?ref=${referralCode}`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Generate referral code error:', error);
    return next(createError('Failed to generate referral code', 500));
  }
});

// Get user's referral access info (matches frontend expectation)
router.get('/access-info', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get referral statistics for access info
      const stats = await client.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN reward_granted = true THEN reward_months ELSE 0 END), 0) as total_months_earned,
          COUNT(CASE WHEN status = 'completed' AND subscription_purchased = true THEN 1 END) as active_referrals
        FROM referrals 
        WHERE referrer_id = $1
      `, [req.user!.id]);

      const statsData = stats.rows[0];

      return res.json({
        success: true,
        totalMonthsEarned: parseInt(statsData.total_months_earned) || 0,
        accessExtendedUntil: calculateAccessExtension(parseInt(statsData.total_months_earned) || 0),
        activeReferrals: parseInt(statsData.active_referrals) || 0,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get referral access info error:', error);
    return next(createError('Failed to get referral access info', 500));
  }
});

// Generate referral code for user (legacy endpoint)
router.post('/generate-code', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Check if user already has an active referral code
      const existingCode = await client.query(
        'SELECT referral_code FROM referrals WHERE referrer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [req.user!.id, 'active']
      );

      if (existingCode.rows.length > 0) {
        return res.json({
          success: true,
          referralCode: existingCode.rows[0].referral_code,
          message: 'Using existing referral code',
        });
      }

      // Generate new referral code
      const referralCode = `COOK${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Insert new referral code
      await client.query(`
        INSERT INTO referrals (referrer_id, referral_code, status, created_at, expires_at)
        VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 year')
      `, [req.user!.id, referralCode]);

      return res.json({
        success: true,
        referralCode: referralCode,
        message: 'New referral code generated',
        shareUrl: `${process.env.APP_URL || 'https://cooksmartapp.com'}/signup?ref=${referralCode}`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Generate referral code error:', error);
    return next(createError('Failed to generate referral code', 500));
  }
});

// Get user's referral statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Get referral statistics
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_referrals,
          COUNT(CASE WHEN subscription_purchased = true THEN 1 END) as paid_referrals,
          COALESCE(SUM(CASE WHEN reward_granted = true THEN reward_months ELSE 0 END), 0) as total_months_earned
        FROM referrals 
        WHERE referrer_id = $1
      `, [req.user!.id]);

      // Get recent referrals
      const recentReferrals = await client.query(`
        SELECT 
          r.referral_code,
          r.referred_email,
          r.status,
          r.subscription_purchased,
          r.reward_granted,
          r.reward_months,
          r.created_at,
          r.completed_at,
          u.first_name,
          u.last_name
        FROM referrals r
        LEFT JOIN users u ON r.referred_user_id = u.id
        WHERE r.referrer_id = $1
        ORDER BY r.created_at DESC
        LIMIT 10
      `, [req.user!.id]);

      // Get active referral code
      const activeCode = await client.query(
        'SELECT referral_code FROM referrals WHERE referrer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [req.user!.id, 'active']
      );

      const statsData = stats.rows[0];

      return res.json({
        success: true,
        stats: {
          totalReferrals: parseInt(statsData.total_referrals) || 0,
          successfulReferrals: parseInt(statsData.successful_referrals) || 0,
          paidReferrals: parseInt(statsData.paid_referrals) || 0,
          totalMonthsEarned: parseInt(statsData.total_months_earned) || 0,
        },
        activeReferralCode: activeCode.rows[0]?.referral_code || null,
        shareUrl: activeCode.rows[0] ? 
          `${process.env.APP_URL || 'https://cooksmartapp.com'}/signup?ref=${activeCode.rows[0].referral_code}` : null,
        recentReferrals: recentReferrals.rows.map(ref => ({
          code: ref.referral_code,
          email: ref.referred_email,
          name: ref.first_name && ref.last_name ? `${ref.first_name} ${ref.last_name}` : null,
          status: ref.status,
          subscriptionPurchased: ref.subscription_purchased,
          rewardGranted: ref.reward_granted,
          monthsEarned: ref.reward_months || 0,
          referredAt: ref.created_at,
          completedAt: ref.completed_at,
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get referral stats error:', error);
    return next(createError('Failed to get referral statistics', 500));
  }
});

// Validate referral code (public endpoint for signup)
router.get('/validate/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required',
      });
    }

    const client = await pool.connect();
    try {
      // Check if referral code exists and is active
      const referral = await client.query(`
        SELECT 
          r.id,
          r.referrer_id,
          r.referral_code,
          r.status,
          r.expires_at,
          u.first_name,
          u.last_name
        FROM referrals r
        JOIN users u ON r.referrer_id = u.id
        WHERE r.referral_code = $1 AND r.status = 'active' AND r.expires_at > NOW()
      `, [code.toUpperCase()]);

      if (referral.rows.length === 0) {
        return res.status(404).json({
          success: false,
          valid: false,
          message: 'Invalid or expired referral code',
        });
      }

      const referralData = referral.rows[0];

      return res.json({
        success: true,
        valid: true,
        referralCode: referralData.referral_code,
        referrerName: `${referralData.first_name} ${referralData.last_name}`.trim(),
        message: `You've been referred by ${referralData.first_name}! Sign up to get started.`,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Validate referral code error:', error);
    return next(createError('Failed to validate referral code', 500));
  }
});

// Process referral (called during user registration)
router.post('/process', async (req, res, next) => {
  try {
    const { referralCode, newUserId, newUserEmail } = req.body;

    if (!referralCode || !newUserId || !newUserEmail) {
      return res.status(400).json({
        success: false,
        message: 'Referral code, user ID, and email are required',
      });
    }

    const client = await pool.connect();
    try {
      // Find the referral
      const referral = await client.query(
        'SELECT id, referrer_id FROM referrals WHERE referral_code = $1 AND status = $2',
        [referralCode.toUpperCase(), 'active']
      );

      if (referral.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Invalid referral code',
        });
      }

      const referralData = referral.rows[0];

      // Update referral with referred user info
      await client.query(`
        UPDATE referrals 
        SET referred_user_id = $1, referred_email = $2, status = 'pending'
        WHERE id = $3
      `, [newUserId, newUserEmail, referralData.id]);

      return res.json({
        success: true,
        message: 'Referral processed successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Process referral error:', error);
    return next(createError('Failed to process referral', 500));
  }
});

// Complete referral (called when referred user purchases yearly subscription)
router.post('/complete', async (req, res, next) => {
  try {
    const { userId, subscriptionType } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find pending referral for this user
      const referral = await client.query(
        'SELECT id, referrer_id FROM referrals WHERE referred_user_id = $1 AND status = $2',
        [userId, 'pending']
      );

      if (referral.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.json({
          success: true,
          message: 'No pending referral found',
        });
      }

      const referralData = referral.rows[0];

      // Only grant reward for yearly subscriptions
      if (subscriptionType === 'yearly' || subscriptionType === 'yearly_postbeta') {
        // Mark referral as completed with subscription purchase
        await client.query(`
          UPDATE referrals 
          SET status = 'completed', 
              subscription_purchased = true,
              reward_granted = true,
              reward_months = 1,
              completed_at = NOW()
          WHERE id = $1
        `, [referralData.id]);

        // Add 1 month to referrer's subscription
        await client.query(`
          UPDATE subscriptions 
          SET current_period_end = current_period_end + INTERVAL '1 month',
              referral_months_added = referral_months_added + 1
          WHERE user_id = $1 AND status IN ('active', 'trialing')
        `, [referralData.referrer_id]);

        // Create referral reward record
        await client.query(`
          INSERT INTO referral_rewards (referrer_id, referral_id, reward_type, reward_value, granted_at)
          VALUES ($1, $2, 'subscription_extension', 1, NOW())
        `, [referralData.referrer_id, referralData.id]);

        // Award points to referrer
        await client.query(`
          UPDATE users SET points = points + 100 WHERE id = $1
        `, [referralData.referrer_id]);

        await client.query(`
          INSERT INTO points_transactions (user_id, points, action, description)
          VALUES ($1, 100, 'referral_reward', 'Referral reward: 1 month subscription extension')
        `, [referralData.referrer_id]);

        await client.query('COMMIT');

        return res.json({
          success: true,
          message: 'Referral completed successfully - 1 month added to referrer subscription',
          rewardGranted: true,
          monthsAdded: 1,
        });
      } else {
        // Mark as completed but no reward for non-yearly subscriptions
        await client.query(`
          UPDATE referrals 
          SET status = 'completed', 
              subscription_purchased = false,
              completed_at = NOW()
          WHERE id = $1
        `, [referralData.id]);

        await client.query('COMMIT');

        return res.json({
          success: true,
          message: 'Referral completed - no reward for non-yearly subscription',
          rewardGranted: false,
        });
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Complete referral error:', error);
    return next(createError('Failed to complete referral', 500));
  }
});

// Get all referrals for user (detailed view) - moved to end to avoid conflicts
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const referrals = await client.query(`
        SELECT 
          r.*,
          u.first_name as referred_first_name,
          u.last_name as referred_last_name,
          u.email as referred_user_email,
          rr.reward_type,
          rr.reward_value,
          rr.granted_at as reward_granted_at
        FROM referrals r
        LEFT JOIN users u ON r.referred_user_id = u.id
        LEFT JOIN referral_rewards rr ON r.id = rr.referral_id
        WHERE r.referrer_id = $1
        ORDER BY r.created_at DESC
      `, [req.user!.id]);

      return res.json({
        success: true,
        referrals: referrals.rows.map(ref => ({
          id: ref.id,
          code: ref.referral_code,
          status: ref.status,
          referredEmail: ref.referred_email,
          referredUser: ref.referred_first_name && ref.referred_last_name ? {
            name: `${ref.referred_first_name} ${ref.referred_last_name}`,
            email: ref.referred_user_email,
          } : null,
          subscriptionPurchased: ref.subscription_purchased,
          rewardGranted: ref.reward_granted,
          rewardMonths: ref.reward_months || 0,
          rewardDetails: ref.reward_type ? {
            type: ref.reward_type,
            value: ref.reward_value,
            grantedAt: ref.reward_granted_at,
          } : null,
          createdAt: ref.created_at,
          completedAt: ref.completed_at,
          expiresAt: ref.expires_at,
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get referrals error:', error);
    return next(createError('Failed to get referrals', 500));
  }
});

export default router;