import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/feed', authenticateToken, async (req: AuthRequest, res) => {
  res.json({
    success: true,
    feed: [],
    message: 'Social feed coming soon',
  });
});

export default router;