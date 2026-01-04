import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, age_verified } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (!age_verified) {
      return res.status(400).json({
        success: false,
        message: 'Age verification is required',
      });
    }

    const client = await pool.connect();
    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email',
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = uuidv4();
      const result = await client.query(
        `INSERT INTO users (
          id, email, password_hash, first_name, last_name, 
          is_admin, is_co_founder, is_special_user, is_creator, is_developer,
          has_lifetime_subscription, subscription_status, points,
          age_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING id, email, first_name, last_name, is_co_founder, is_special_user, 
                  is_creator, is_developer, has_lifetime_subscription, subscription_status, points`,
        [
          userId,
          email.toLowerCase(),
          hashedPassword,
          first_name || null,
          last_name || null,
          false, // is_admin
          false, // is_co_founder
          false, // is_special_user
          false, // is_creator
          false, // is_developer
          false, // has_lifetime_subscription
          'free', // subscription_status
          0, // points
          age_verified,
        ]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '90d' }
      );

      logger.info(`New user registered: ${email}`);

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_co_founder: user.is_co_founder,
          is_special_user: user.is_special_user,
          is_creator: user.is_creator,
          is_developer: user.is_developer,
          has_lifetime_subscription: user.has_lifetime_subscription,
          subscription_status: user.subscription_status,
          points: user.points,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Registration error:', error);
    return next(createError('Registration failed', 500));
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const client = await pool.connect();
    try {
      // Get user from database
      const result = await client.query(
        `SELECT id, email, password_hash, first_name, last_name, 
                is_admin, is_co_founder, is_special_user, is_creator, is_developer,
                has_lifetime_subscription, subscription_status, points,
                dietary_restrictions, allergies, show_nutrition, preferred_units
         FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Update last login
      await client.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '90d' }
      );

      logger.info(`User logged in: ${email}`);

      // Prepare response
      const response: any = {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          is_co_founder: user.is_co_founder,
          is_special_user: user.is_special_user,
          is_creator: user.is_creator,
          is_developer: user.is_developer,
          has_lifetime_subscription: user.has_lifetime_subscription,
          subscription_status: user.subscription_status,
          points: user.points,
          dietary_restrictions: user.dietary_restrictions,
          allergies: user.allergies,
          show_nutrition: user.show_nutrition,
          preferred_units: user.preferred_units,
        },
      };

      // Add special messages for special users
      if (user.is_co_founder) {
        response.special_message = 'Welcome back, Co-Founder! 🚀';
      } else if (user.is_special_user) {
        response.special_message = 'Welcome back, Special User! ⭐';
      } else if (user.has_lifetime_subscription) {
        response.lifetime_access = true;
        response.special_message = 'Lifetime access active! 🎉';
      }

      return res.json(response);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Login error:', error);
    return next(createError('Login failed', 500));
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, email, first_name, last_name, 
                is_admin, is_co_founder, is_special_user, is_creator, is_developer,
                has_lifetime_subscription, subscription_status, points,
                dietary_restrictions, allergies, show_nutrition, preferred_units,
                created_at, last_login_at
         FROM users WHERE id = $1`,
        [req.user!.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      return res.json({
        success: true,
        user: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get user error:', error);
    return next(createError('Failed to get user data', 500));
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, (req: AuthRequest, res) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token from storage
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;