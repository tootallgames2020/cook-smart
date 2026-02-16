import {API_BASE_URL, getAuthHeader} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Achievement {
  id: number;
  badge_type: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  earned_at: string;
  progress?: number;
  target?: number;
}

/**
 * Service for managing user achievements and badges
 * Tracks progress and earned achievements across the app
 */
class AchievementService {
  /**
   * Get all achievements earned by the user
   * Returns list of badges and their earn dates
   * 
   * @returns Promise<Achievement[]> - Array of earned achievements or empty array if none
   * 
   * @example
   * ```typescript
   * const achievements = await achievementService.getUserAchievements();
   * achievements.forEach(achievement => {
   *   console.log(`${achievement.badge_name}: ${achievement.badge_description}`);
   *   console.log(`Earned: ${achievement.earned_at}`);
   * });
   * ```
   */
  async getUserAchievements(): Promise<Achievement[]> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) return [];

      const response = await fetch(`${API_BASE_URL}/api/v1/achievements`, {
        headers: getAuthHeader(authToken),
      });
      const data = await response.json();
      return data.achievements || [];
    } catch (error) {
      console.error('Failed to get achievements:', error);
      return [];
    }
  }

  /**
   * Get progress towards unearned achievements
   * Shows how close user is to earning each badge
   * 
   * @returns Promise<any> - Progress data for all achievements or null if not authenticated
   * 
   * @example
   * ```typescript
   * const progress = await achievementService.getAchievementProgress();
   * if (progress) {
   *   progress.inProgress.forEach(item => {
   *     console.log(`${item.badge_name}: ${item.progress}/${item.target}`);
   *     const percent = (item.progress / item.target * 100).toFixed(0);
   *     console.log(`${percent}% complete`);
   *   });
   * }
   * ```
   */
  async getAchievementProgress(): Promise<any> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) return null;

      const response = await fetch(
        `${API_BASE_URL}/api/v1/achievements/progress`,
        {
          headers: getAuthHeader(authToken),
        },
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to get achievement progress:', error);
      return null;
    }
  }
}

export default new AchievementService();
