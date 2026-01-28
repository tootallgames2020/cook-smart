import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    is_admin?: boolean;
    is_co_founder?: boolean;
    is_special_user?: boolean;
    subscription_status?: string;
    family_id?: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required',
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Get user from database with family information
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          u.id, 
          u.email, 
          u.is_admin, 
          u.is_co_founder, 
          u.is_special_user, 
          u.subscription_status,
          fm.family_id::text as family_id
        FROM users u
        LEFT JOIN family_members fm ON u.id = fm.user_id
        WHERE u.id = $1
      `, [decoded.userId]);

      if (result.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid token - user not found',
        });
        return;
      }

      req.user = result.rows[0];
      next();
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.is_admin) {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }
  next();
};

export const requireSubscription = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const validStatuses = ['active', 'trialing', 'lifetime'];
  if (!req.user?.subscription_status || !validStatuses.includes(req.user.subscription_status)) {
    res.status(403).json({
      success: false,
      message: 'Active subscription required',
      subscriptionRequired: true,
    });
    return;
  }
  next();
};