import express from 'express';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Contact form submission
router.post('/', async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and message are required',
      });
    }

    // Log the contact form submission
    logger.info('Contact form submission:', {
      name,
      email,
      subject: subject || 'No subject',
      messageLength: message.length,
    });

    // In production, this would send an email via Resend
    // For now, just log and return success
    
    return res.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    logger.error('Contact form error:', error);
    return next(createError('Failed to send message', 500));
  }
});

export default router;