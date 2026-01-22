import {Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import AdminUserModel from '../models/AdminUser';
import ApprovedAdminEmailModel from '../models/ApprovedAdminEmail';
import AdminActivityLogger from '../services/AdminActivityLogger';

const JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '8h';

export class AdminAuthController {
  /**
   * Sign up a new admin user
   * POST /api/admin/auth/signup
   */
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const {email, username, password, name} = req.body;

      // Validate required fields
      if (!email || !username || !password) {
        res
          .status(400)
          .json({error: 'Email, username, and password are required'});
        return;
      }

      // Check if email is approved
      const isApproved = await ApprovedAdminEmailModel.isApproved(email);
      if (!isApproved) {
        res.status(403).json({error: 'Email not authorized for admin access'});
        return;
      }

      // Check if username or email already exists
      const existingByEmail = await AdminUserModel.findByEmail(email);
      if (existingByEmail) {
        res.status(409).json({error: 'Email already registered'});
        return;
      }

      const existingByUsername = await AdminUserModel.findByUsername(username);
      if (existingByUsername) {
        res.status(409).json({error: 'Username already taken'});
        return;
      }

      // Create admin user
      const admin = await AdminUserModel.create({
        email,
        username,
        password,
        name,
      });

      // Log signup
      await AdminActivityLogger.logSignup(
        email,
        true,
        req.ip,
        req.get('user-agent'),
      );

      // Send verification email with token
      try {
        const emailService = require('../services/EmailService');
        const verificationUrl = `${process.env.ADMIN_FRONTEND_URL || 'https://admin.cooksmartapp.com'}/verify-email?token=${admin.verification_token}`;
        await emailService.sendAdminVerificationEmail(email, verificationUrl);
        console.log(`Verification email sent to admin: ${email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }

      // For development, auto-verify
      if (process.env.NODE_ENV === 'development') {
        await AdminUserModel.verifyEmail(admin.verification_token!);
      }

      res.status(201).json({
        message:
          'Registration successful. Please check your email for verification.',
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({error: 'Registration failed'});
    }
  }

  /**
   * Verify email with token
   * POST /api/admin/auth/verify-email
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const {token} = req.body;

      if (!token) {
        res.status(400).json({error: 'Verification token is required'});
        return;
      }

      const success = await AdminUserModel.verifyEmail(token);

      if (!success) {
        res.status(400).json({error: 'Invalid or expired verification token'});
        return;
      }

      res.json({message: 'Email verified successfully'});
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({error: 'Email verification failed'});
    }
  }

  /**
   * Login admin user
   * POST /api/admin/auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const {username, email, password} = req.body;
      const loginIdentifier = username || email;

      if (!loginIdentifier || !password) {
        res
          .status(400)
          .json({error: 'Username/email and password are required'});
        return;
      }

      // Find admin by username or email
      let admin = null;
      if (loginIdentifier.includes('@')) {
        // If it contains @, treat as email
        admin = await AdminUserModel.findByEmail(loginIdentifier);
      } else {
        // Otherwise, treat as username
        admin = await AdminUserModel.findByUsername(loginIdentifier);
      }

      if (!admin) {
        await AdminActivityLogger.logFailedLogin(
          loginIdentifier,
          req.ip,
          req.get('user-agent'),
        );
        res.status(401).json({error: 'Invalid credentials'});
        return;
      }

      // Check if email is verified
      if (!admin.email_verified) {
        res
          .status(403)
          .json({error: 'Email not verified. Please check your email.'});
        return;
      }

      // Verify password
      const isValidPassword = await AdminUserModel.verifyPassword(
        password,
        admin.password_hash,
      );

      if (!isValidPassword) {
        await AdminActivityLogger.logFailedLogin(
          loginIdentifier,
          req.ip,
          req.get('user-agent'),
        );
        res.status(401).json({error: 'Invalid credentials'});
        return;
      }

      // Update last login
      await AdminUserModel.updateLastLogin(admin.id);

      // Log successful login
      await AdminActivityLogger.logLogin(
        admin.id,
        req.ip,
        req.get('user-agent'),
      );

      // Check if super admin
      const isSuperAdmin = await ApprovedAdminEmailModel.isSuperAdmin(
        admin.email,
      );

      // Generate JWT token
      const token = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          is_super_admin: isSuperAdmin,
        },
        JWT_SECRET,
        {expiresIn: JWT_EXPIRES_IN},
      );

      res.json({
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
          is_super_admin: isSuperAdmin,
          last_login: admin.last_login,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({error: 'Login failed'});
    }
  }

  /**
   * Logout admin user
   * POST /api/admin/auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    // With JWT, logout is handled client-side by removing the token
    // We just return a success message
    res.json({message: 'Logged out successfully'});
  }

  /**
   * Get current admin user
   * GET /api/admin/auth/me
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).admin?.id;

      if (!adminId) {
        res.status(401).json({error: 'Not authenticated'});
        return;
      }

      const admin = await AdminUserModel.findById(adminId);

      if (!admin) {
        res.status(404).json({error: 'Admin not found'});
        return;
      }

      const isSuperAdmin = await ApprovedAdminEmailModel.isSuperAdmin(
        admin.email,
      );

      res.json({
        admin: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          name: admin.name,
          is_super_admin: isSuperAdmin,
          last_login: admin.last_login,
          created_at: admin.created_at,
        },
      });
    } catch (error) {
      console.error('Get current admin error:', error);
      res.status(500).json({error: 'Failed to get admin info'});
    }
  }

  /**
   * Request password reset
   * POST /api/admin/auth/forgot-password
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const {email} = req.body;

      if (!email) {
        res.status(400).json({error: 'Email is required'});
        return;
      }

      const admin = await AdminUserModel.findByEmail(email);

      if (!admin) {
        // Don't reveal if email exists
        res.json({
          message: 'If the email exists, a password reset link has been sent.',
        });
        return;
      }

      const resetToken = await AdminUserModel.setResetToken(email);

      if (!resetToken) {
        res.status(500).json({error: 'Failed to generate reset token'});
        return;
      }

      // Send password reset email with token
      try {
        const emailService = require('../services/EmailService');
        const resetUrl = `${process.env.ADMIN_FRONTEND_URL || 'https://admin.cooksmartapp.com'}/reset-password?token=${resetToken}`;
        await emailService.sendAdminPasswordResetEmail(email, resetUrl);
        console.log(`Password reset email sent to admin: ${email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }

      // For development, log the token
      if (process.env.NODE_ENV === 'development') {
        console.log(`Password reset token for ${email}: ${resetToken}`);
      }

      res.json({
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({error: 'Password reset request failed'});
    }
  }

  /**
   * Reset password with token
   * POST /api/admin/auth/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const {token, newPassword} = req.body;

      if (!token || !newPassword) {
        res.status(400).json({error: 'Token and new password are required'});
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({error: 'Password must be at least 8 characters'});
        return;
      }

      const success = await AdminUserModel.resetPassword(token, newPassword);

      if (!success) {
        res.status(400).json({error: 'Invalid or expired reset token'});
        return;
      }

      res.json({message: 'Password reset successfully'});
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({error: 'Password reset failed'});
    }
  }
}

export default new AdminAuthController();
