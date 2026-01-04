import express from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/dashboard', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  res.json({
    success: true,
    dashboard: {
      users: 0,
      recipes: 0,
      message: 'Admin dashboard coming soon',
    },
  });
});

export default router;