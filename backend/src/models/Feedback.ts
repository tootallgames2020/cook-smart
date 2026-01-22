import { pool } from '../server';

interface Feedback {
  id: string;
  user_id: string;
  rating?: number;
  category?: string;
  message: string;
  screenshot_url?: string;
  status: 'new' | 'read' | 'in_progress' | 'resolved' | 'ignored';
  created_at: Date;
  updated_at: Date;
}

interface CreateFeedbackParams {
  user_id: string;
  rating?: number;
  category?: string;
  message: string;
  screenshot_url?: string;
}

interface UpdateFeedbackStatusParams {
  id: string;
  status: 'new' | 'read' | 'in_progress' | 'resolved' | 'ignored';
}

class FeedbackModel {
  /**
   * Create a new feedback entry
   */
  async create(params: CreateFeedbackParams): Promise<Feedback> {
    const query = `
      INSERT INTO feedback (user_id, rating, category, message, screenshot_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      params.user_id,
      params.rating || null,
      params.category || null,
      params.message,
      params.screenshot_url || null,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find feedback by user ID
   */
  async findByUserId(userId: string, limit: number = 50): Promise<Feedback[]> {
    const query = `
      SELECT * FROM feedback
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Find feedback by status
   */
  async findByStatus(status: string, limit: number = 50): Promise<Feedback[]> {
    const query = `
      SELECT f.*, u.name as user_name, u.email as user_email
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.status = $1
      ORDER BY f.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [status, limit]);
    return result.rows;
  }

  /**
   * Find all feedback (for admin)
   */
  async findAll(limit: number = 100, offset: number = 0): Promise<Feedback[]> {
    const query = `
      SELECT f.*, u.name as user_name, u.email as user_email
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Find feedback by ID
   */
  async findById(id: string): Promise<Feedback | null> {
    const query = `
      SELECT f.*, u.name as user_name, u.email as user_email
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Update feedback status
   */
  async updateStatus(params: UpdateFeedbackStatusParams): Promise<Feedback> {
    const query = `
      UPDATE feedback
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [params.status, params.id]);
    return result.rows[0];
  }

  /**
   * Get feedback statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    averageRating: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        status,
        COUNT(*) as status_count,
        category,
        COUNT(*) as category_count,
        AVG(rating) as avg_rating
      FROM feedback
      GROUP BY status, category
    `;

    const result = await pool.query(query);

    let total = 0;
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalRating = 0;
    let ratingCount = 0;

    for (const row of result.rows) {
      total += parseInt(row.total);
      
      if (row.status) {
        byStatus[row.status] = (byStatus[row.status] || 0) + parseInt(row.status_count);
      }
      
      if (row.category) {
        byCategory[row.category] = (byCategory[row.category] || 0) + parseInt(row.category_count);
      }
      
      if (row.avg_rating) {
        totalRating += parseFloat(row.avg_rating);
        ratingCount++;
      }
    }

    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    return {
      total,
      byStatus,
      byCategory,
      averageRating,
    };
  }

  /**
   * Delete feedback by ID
   */
  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM feedback
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }
}

export default new FeedbackModel();
export { Feedback, CreateFeedbackParams, UpdateFeedbackStatusParams };
