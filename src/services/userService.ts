import {API_BASE_URL} from '../config/api';
import {getAuthToken} from '../utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  dietaryRestrictions?: string[];
  allergies?: string[];
  showNutrition?: boolean;
  preferredUnits?: string;
  hasLifetimeSubscription?: boolean;
  subscriptionStatus?: string;
  isCoFounder?: boolean;
  isSpecialUser?: boolean;
  isCreator?: boolean;
}

export interface UserStats {
  totalRecipes: number;
  totalFavorites: number;
  totalRatings: number;
  averageRating: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalPoints: number;
  level: number;
  rank?: number;
}

class UserService {
  // Get current user profile
  async getCurrentUser(): Promise<UserProfile> {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user profile');
      }

      return {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.first_name,
        lastName: data.user.last_name,
        username: data.user.email?.split('@')[0] || 'user',
        dietaryRestrictions: data.user.dietary_restrictions,
        allergies: data.user.allergies,
        showNutrition: data.user.show_nutrition,
        preferredUnits: data.user.preferred_units,
        hasLifetimeSubscription: data.user.has_lifetime_subscription,
        subscriptionStatus: data.user.subscription_status,
        isCoFounder: data.user.is_co_founder,
        isSpecialUser: data.user.is_special_user,
        isCreator: data.user.is_creator,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Get leaderboard
  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const token = await getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/v1/points/leaderboard?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leaderboard');
      }

      return data.map((entry: any, index: number) => ({
        userId: entry.user_id,
        username: entry.username || entry.email?.split('@')[0] || 'user',
        totalPoints: entry.total_points,
        level: entry.level,
        rank: index + 1,
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  // Get user stats
  async getUserStats(): Promise<UserStats> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/users/stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user stats');
      }

      const data = await response.json();
      return data.stats || {
        totalRecipes: 0,
        totalFavorites: 0,
        totalRatings: 0,
        averageRating: 0,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Return default stats on error
      return {
        totalRecipes: 0,
        totalFavorites: 0,
        totalRatings: 0,
        averageRating: 0,
      };
    }
  }
}

export const userService = new UserService();
