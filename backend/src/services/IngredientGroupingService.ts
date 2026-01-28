import pool from '../config/database';

interface GroupingRule {
  base_name: string;
  strip_modifiers: string[];
  keep_distinctions: string[];
}

export class IngredientGroupingService {
  // Common modifiers to strip (community learned + defaults)
  private static DEFAULT_STRIP_MODIFIERS = [
    'brown', 'white', 'large', 'small', 'medium', 'organic', 'free-range',
    'cage-free', 'fresh', 'frozen', 'canned', 'dried', 'raw', 'cooked'
  ];

  // Important distinctions to keep
  private static DEFAULT_KEEP_DISTINCTIONS = [
    'whole', 'skim', '2%', 'low-fat', 'ground', 'breast', 'thigh', 'wing'
  ];

  /**
   * Get grouped ingredients for a user
   */
  static async getGroupedUserIngredients(userId: string) {
    const query = `
      WITH user_prefs AS (
        SELECT ingredient_id, group_id, action
        FROM user_ingredient_preferences
        WHERE user_id = $1
      ),
      grouped_ingredients AS (
        SELECT 
          ui.id,
          ui.user_id,
          ui.ingredient_id,
          ui.quantity,
          ui.unit,
          ui.expiration_date,
          ui.notes,
          i.name,
          i.category,
          COALESCE(up.group_id, igm.group_id) as group_id,
          COALESCE(up.action, 'merge') as user_action,
          ig.base_name
        FROM user_ingredients ui
        JOIN ingredients i ON ui.ingredient_id = i.id
        LEFT JOIN user_prefs up ON ui.ingredient_id = up.ingredient_id
        LEFT JOIN ingredient_group_mappings igm ON ui.ingredient_id = igm.ingredient_id
        LEFT JOIN ingredient_groups ig ON COALESCE(up.group_id, igm.group_id) = ig.id
        WHERE ui.user_id = $1
      )
      SELECT 
        COALESCE(base_name, name) as display_name,
        group_id,
        category,
        json_agg(json_build_object(
          'id', id,
          'ingredient_id', ingredient_id,
          'name', name,
          'quantity', quantity,
          'unit', unit,
          'expiration_date', expiration_date,
          'notes', notes
        )) as items,
        SUM(quantity) as total_quantity,
        array_agg(DISTINCT unit) as units
      FROM grouped_ingredients
      WHERE user_action != 'split'
      GROUP BY COALESCE(base_name, name), group_id, category
      ORDER BY category, display_name
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Smart match ingredient to group
   */
  static async matchIngredientToGroup(ingredientName: string): Promise<string | null> {
    const normalized = this.normalizeIngredientName(ingredientName);
    
    // Check existing groups
    const query = `
      SELECT id, base_name, strip_modifiers, keep_distinctions
      FROM ingredient_groups
      ORDER BY usage_count DESC
    `;
    const result = await pool.query(query);
    
    for (const group of result.rows) {
      const score = this.calculateMatchScore(normalized, group);
      if (score > 70) {
        return group.id;
      }
    }
    
    return null;
  }

  /**
   * Normalize ingredient name for matching
   */
  private static normalizeIngredientName(name: string): string {
    return name.toLowerCase().trim();
  }

  /**
   * Calculate match score between ingredient and group
   */
  private static calculateMatchScore(ingredientName: string, group: GroupingRule): number {
    const baseName = group.base_name.toLowerCase();
    let workingName = ingredientName;
    
    // Strip modifiers
    const modifiers = [...this.DEFAULT_STRIP_MODIFIERS, ...group.strip_modifiers];
    modifiers.forEach(mod => {
      workingName = workingName.replace(new RegExp(`\\b${mod}\\b`, 'gi'), '').trim();
    });
    
    // Check if important distinctions exist
    const distinctions = [...this.DEFAULT_KEEP_DISTINCTIONS, ...group.keep_distinctions];
    const hasDistinction = distinctions.some(dist => 
      ingredientName.includes(dist.toLowerCase())
    );
    
    // If has important distinction, lower score
    if (hasDistinction && !baseName.includes(workingName)) {
      return 50;
    }
    
    // Calculate similarity
    if (workingName === baseName) return 100;
    if (workingName.includes(baseName) || baseName.includes(workingName)) return 90;
    
    // Fuzzy match
    const similarity = this.stringSimilarity(workingName, baseName);
    return similarity * 100;
  }

  /**
   * Simple string similarity (Dice coefficient)
   */
  private static stringSimilarity(str1: string, str2: string): number {
    const bigrams1 = this.getBigrams(str1);
    const bigrams2 = this.getBigrams(str2);
    
    const intersection = bigrams1.filter(b => bigrams2.includes(b)).length;
    return (2 * intersection) / (bigrams1.length + bigrams2.length);
  }

  private static getBigrams(str: string): string[] {
    const bigrams = [];
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.substring(i, i + 2));
    }
    return bigrams;
  }

  /**
   * Create or get group for ingredient
   */
  static async createOrGetGroup(baseName: string): Promise<string> {
    const checkQuery = 'SELECT id FROM ingredient_groups WHERE base_name = $1';
    const existing = await pool.query(checkQuery, [baseName]);
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    
    const insertQuery = `
      INSERT INTO ingredient_groups (base_name, strip_modifiers, keep_distinctions)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await pool.query(insertQuery, [
      baseName,
      JSON.stringify([]),
      JSON.stringify([])
    ]);
    
    return result.rows[0].id;
  }

  /**
   * User merges ingredients
   */
  static async userMergeIngredients(
    userId: string,
    ingredientIds: string[],
    groupName: string
  ) {
    const groupId = await this.createOrGetGroup(groupName);
    
    // Record user preference
    for (const ingredientId of ingredientIds) {
      await pool.query(`
        INSERT INTO user_ingredient_preferences (user_id, ingredient_id, group_id, action)
        VALUES ($1, $2, $3, 'merge')
        ON CONFLICT (user_id, ingredient_id) 
        DO UPDATE SET group_id = $3, action = 'merge', updated_at = NOW()
      `, [userId, ingredientId, groupId]);
    }
    
    // Update community learning
    await this.updateCommunityLearning(ingredientIds, groupId);
  }

  /**
   * User splits ingredient from group
   */
  static async userSplitIngredient(userId: string, ingredientId: string) {
    await pool.query(`
      INSERT INTO user_ingredient_preferences (user_id, ingredient_id, group_id, action)
      VALUES ($1, $2, NULL, 'split')
      ON CONFLICT (user_id, ingredient_id)
      DO UPDATE SET action = 'split', updated_at = NOW()
    `, [userId, ingredientId]);
  }

  /**
   * Update community learning from user actions
   */
  private static async updateCommunityLearning(ingredientIds: string[], groupId: string) {
    // Increment usage count
    await pool.query(`
      UPDATE ingredient_groups 
      SET usage_count = usage_count + 1 
      WHERE id = $1
    `, [groupId]);
    
    // Add/update mappings
    for (const ingredientId of ingredientIds) {
      await pool.query(`
        INSERT INTO ingredient_group_mappings (ingredient_id, group_id, is_community_learned)
        VALUES ($1, $2, true)
        ON CONFLICT (ingredient_id)
        DO UPDATE SET 
          group_id = $2,
          confidence_score = LEAST(ingredient_group_mappings.confidence_score + 5, 100),
          updated_at = NOW()
      `, [ingredientId, groupId]);
    }
  }

  /**
   * Auto-group new ingredient based on community learning
   */
  static async autoGroupIngredient(ingredientId: string, ingredientName: string) {
    const groupId = await this.matchIngredientToGroup(ingredientName);
    
    if (groupId) {
      await pool.query(`
        INSERT INTO ingredient_group_mappings (ingredient_id, group_id, confidence_score, is_community_learned)
        VALUES ($1, $2, 75, true)
        ON CONFLICT (ingredient_id) DO NOTHING
      `, [ingredientId, groupId]);
    }
  }
}
