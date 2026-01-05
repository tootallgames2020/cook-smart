import express from 'express';
import { pool } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Predefined dietary restrictions that match the frontend expectations
const DIETARY_RESTRICTIONS = [
  { id: 1, name: 'Vegetarian', category: 'diet', description: 'No meat or fish', excluded_ingredients: ['meat', 'fish', 'chicken', 'beef', 'pork'], excluded_tags: ['meat'] },
  { id: 2, name: 'Vegan', category: 'diet', description: 'No animal products', excluded_ingredients: ['meat', 'fish', 'dairy', 'eggs', 'honey'], excluded_tags: ['meat', 'dairy'] },
  { id: 3, name: 'Gluten-Free', category: 'diet', description: 'No gluten', excluded_ingredients: ['wheat', 'barley', 'rye', 'gluten'], excluded_tags: ['gluten'] },
  { id: 4, name: 'Dairy-Free', category: 'diet', description: 'No dairy products', excluded_ingredients: ['milk', 'cheese', 'butter', 'cream'], excluded_tags: ['dairy'] },
  { id: 5, name: 'Keto', category: 'diet', description: 'Low carb, high fat', excluded_ingredients: ['bread', 'pasta', 'rice', 'sugar'], excluded_tags: ['high-carb'] },
  { id: 6, name: 'Paleo', category: 'diet', description: 'No processed foods', excluded_ingredients: ['grains', 'legumes', 'dairy'], excluded_tags: ['processed'] },
  { id: 7, name: 'Low-Sodium', category: 'diet', description: 'Low sodium content', excluded_ingredients: ['salt', 'soy sauce'], excluded_tags: ['high-sodium'] },
  { id: 8, name: 'Halal', category: 'religious', description: 'Islamic dietary laws', excluded_ingredients: ['pork', 'alcohol'], excluded_tags: ['pork', 'alcohol'] },
  { id: 9, name: 'Kosher', category: 'religious', description: 'Jewish dietary laws', excluded_ingredients: ['pork', 'shellfish'], excluded_tags: ['pork', 'shellfish'] },
];

const ALLERGIES = [
  { id: 1, name: 'Peanut Allergy', severity: 'high', description: 'Allergic to peanuts', trigger_ingredients: ['peanuts', 'peanut oil'], cross_reactive_ingredients: ['tree nuts'] },
  { id: 2, name: 'Tree Nut Allergy', severity: 'high', description: 'Allergic to tree nuts', trigger_ingredients: ['almonds', 'walnuts', 'cashews', 'pecans'], cross_reactive_ingredients: ['peanuts'] },
  { id: 3, name: 'Dairy Allergy', severity: 'medium', description: 'Allergic to dairy', trigger_ingredients: ['milk', 'cheese', 'butter', 'cream'], cross_reactive_ingredients: [] },
  { id: 4, name: 'Egg Allergy', severity: 'medium', description: 'Allergic to eggs', trigger_ingredients: ['eggs', 'egg whites', 'egg yolks'], cross_reactive_ingredients: [] },
  { id: 5, name: 'Wheat Allergy', severity: 'medium', description: 'Allergic to wheat', trigger_ingredients: ['wheat', 'wheat flour'], cross_reactive_ingredients: ['gluten'] },
  { id: 6, name: 'Soy Allergy', severity: 'medium', description: 'Allergic to soy', trigger_ingredients: ['soy', 'soy sauce', 'tofu'], cross_reactive_ingredients: [] },
  { id: 7, name: 'Fish Allergy', severity: 'high', description: 'Allergic to fish', trigger_ingredients: ['fish', 'salmon', 'tuna'], cross_reactive_ingredients: ['shellfish'] },
  { id: 8, name: 'Shellfish Allergy', severity: 'high', description: 'Allergic to shellfish', trigger_ingredients: ['shrimp', 'crab', 'lobster'], cross_reactive_ingredients: ['fish'] },
  { id: 9, name: 'Sesame Allergy', severity: 'medium', description: 'Allergic to sesame', trigger_ingredients: ['sesame', 'tahini'], cross_reactive_ingredients: [] },
];

// Get all available dietary restrictions
router.get('/restrictions', async (req, res, next) => {
  try {
    res.json(DIETARY_RESTRICTIONS);
  } catch (error) {
    logger.error('Get dietary restrictions error:', error);
    next(createError('Failed to get dietary restrictions', 500));
  }
});

// Get all available allergies
router.get('/allergies', async (req, res, next) => {
  try {
    res.json(ALLERGIES);
  } catch (error) {
    logger.error('Get allergies error:', error);
    next(createError('Failed to get allergies', 500));
  }
});

// Get user's selected dietary restrictions
router.get('/restrictions/user/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT dietary_restrictions FROM users WHERE id = $1',
        [userId]
      );

      const userRestrictionIds = result.rows[0]?.dietary_restrictions || [];
      const userRestrictions = DIETARY_RESTRICTIONS.filter(r => userRestrictionIds.includes(r.id));

      res.json(userRestrictions);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get user dietary restrictions error:', error);
    next(createError('Failed to get user dietary restrictions', 500));
  }
});

// Get user's selected allergies
router.get('/allergies/user/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT allergies FROM users WHERE id = $1',
        [userId]
      );

      const userAllergyIds = result.rows[0]?.allergies || [];
      const userAllergies = ALLERGIES.filter(a => userAllergyIds.includes(a.id));

      res.json(userAllergies);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get user allergies error:', error);
    next(createError('Failed to get user allergies', 500));
  }
});

// Add dietary restriction for user
router.post('/restrictions/user/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;
    const { restrictionId } = req.body;

    const client = await pool.connect();
    try {
      // Get current restrictions
      const result = await client.query(
        'SELECT dietary_restrictions FROM users WHERE id = $1',
        [userId]
      );

      const currentRestrictions = result.rows[0]?.dietary_restrictions || [];
      
      // Add new restriction if not already present
      if (!currentRestrictions.includes(restrictionId)) {
        const updatedRestrictions = [...currentRestrictions, restrictionId];
        
        await client.query(
          'UPDATE users SET dietary_restrictions = $1 WHERE id = $2',
          [JSON.stringify(updatedRestrictions), userId]
        );
      }

      res.json({ success: true, message: 'Dietary restriction added successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add dietary restriction error:', error);
    next(createError('Failed to add dietary restriction', 500));
  }
});

// Add allergy for user
router.post('/allergies/user/:userId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { userId } = req.params;
    const { allergyId } = req.body;

    const client = await pool.connect();
    try {
      // Get current allergies
      const result = await client.query(
        'SELECT allergies FROM users WHERE id = $1',
        [userId]
      );

      const currentAllergies = result.rows[0]?.allergies || [];
      
      // Add new allergy if not already present
      if (!currentAllergies.includes(allergyId)) {
        const updatedAllergies = [...currentAllergies, allergyId];
        
        await client.query(
          'UPDATE users SET allergies = $1 WHERE id = $2',
          [JSON.stringify(updatedAllergies), userId]
        );
      }

      res.json({ success: true, message: 'Allergy added successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Add allergy error:', error);
    next(createError('Failed to add allergy', 500));
  }
});

// Remove dietary restriction
router.delete('/restrictions/user/:userId/:restrictionId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { userId, restrictionId } = req.params;

    const client = await pool.connect();
    try {
      // Get current restrictions
      const result = await client.query(
        'SELECT dietary_restrictions FROM users WHERE id = $1',
        [userId]
      );

      const currentRestrictions = result.rows[0]?.dietary_restrictions || [];
      const updatedRestrictions = currentRestrictions.filter((id: number) => id !== parseInt(restrictionId));
      
      await client.query(
        'UPDATE users SET dietary_restrictions = $1 WHERE id = $2',
        [JSON.stringify(updatedRestrictions), userId]
      );

      res.json({ success: true, message: 'Dietary restriction removed successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Remove dietary restriction error:', error);
    next(createError('Failed to remove dietary restriction', 500));
  }
});

// Remove allergy
router.delete('/allergies/user/:userId/:allergyId', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { userId, allergyId } = req.params;

    const client = await pool.connect();
    try {
      // Get current allergies
      const result = await client.query(
        'SELECT allergies FROM users WHERE id = $1',
        [userId]
      );

      const currentAllergies = result.rows[0]?.allergies || [];
      const updatedAllergies = currentAllergies.filter((id: number) => id !== parseInt(allergyId));
      
      await client.query(
        'UPDATE users SET allergies = $1 WHERE id = $2',
        [JSON.stringify(updatedAllergies), userId]
      );

      res.json({ success: true, message: 'Allergy removed successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Remove allergy error:', error);
    next(createError('Failed to remove allergy', 500));
  }
});

// Legacy endpoints for backward compatibility
// Get user's dietary preferences (old format)
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT dietary_restrictions, allergies FROM users WHERE id = $1',
        [req.user!.id]
      );

      res.json({
        success: true,
        dietary_restrictions: result.rows[0]?.dietary_restrictions || [],
        allergies: result.rows[0]?.allergies || [],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Get dietary preferences error:', error);
    next(createError('Failed to get dietary preferences', 500));
  }
});

// Update dietary restrictions (old format)
router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { dietary_restrictions } = req.body;

    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET dietary_restrictions = $1 WHERE id = $2',
        [JSON.stringify(dietary_restrictions || []), req.user!.id]
      );

      res.json({
        success: true,
        message: 'Dietary restrictions updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update dietary restrictions error:', error);
    next(createError('Failed to update dietary restrictions', 500));
  }
});

// Update allergies (old format)
router.post('/allergies', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { allergies } = req.body;

    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET allergies = $1 WHERE id = $2',
        [JSON.stringify(allergies || []), req.user!.id]
      );

      res.json({
        success: true,
        message: 'Allergies updated successfully',
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Update allergies error:', error);
    next(createError('Failed to update allergies', 500));
  }
});

export default router;