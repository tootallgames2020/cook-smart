import {Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {API_BASE_URL, getAuthHeader} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  expiry_alerts: boolean;
  recipe_suggestions: boolean;
  achievement_notifications: boolean;
  daily_reminders: boolean;
}

/**
 * Service for managing push notifications and user notification preferences
 * Handles Firebase Cloud Messaging integration and notification settings
 */
class NotificationService {
  /**
   * Request notification permissions from the user and register FCM token
   * Must be called before sending push notifications
   * 
   * @returns Promise<string | null> - FCM token if successful, null if permission denied
   * 
   * @example
   * ```typescript
   * const token = await notificationService.registerForPushNotifications();
   * if (token) {
   *   console.log('Notifications enabled with token:', token);
   * } else {
   *   console.log('User denied notification permission');
   * }
   * ```
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        return null;
      }
      // Get FCM token
      const token = await messaging().getToken();
      if (!token) {
        return null;
      }

      // Register token with backend
      await this.registerToken(token);
      return token;
    } catch (error) {
      console.error('🔔 ERROR:', error);
      return null;
    }
  }

  /**
   * Register FCM token with the backend server
   * Associates the device token with the user's account
   * 
   * @param token - Firebase Cloud Messaging token
   * @returns Promise<void>
   * @private
   * 
   * @example
   * ```typescript
   * await notificationService.registerToken(fcmToken);
   * ```
   */
  async registerToken(token: string): Promise<void> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) return;

      await fetch(`${API_BASE_URL}/api/v1/notifications/register`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(authToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({token, platform: Platform.OS}),
      });
    } catch (error) {
      console.error('Failed to register notification token:', error);
    }
  }

  /**
   * Get the user's notification preferences
   * Returns settings for different notification types
   * 
   * @returns Promise<NotificationPreferences | null> - User's notification settings or null if not authenticated
   * 
   * @example
   * ```typescript
   * const prefs = await notificationService.getPreferences();
   * if (prefs) {
   *   console.log('Expiry alerts:', prefs.expiry_alerts);
   *   console.log('Recipe suggestions:', prefs.recipe_suggestions);
   * }
   * ```
   */
  async getPreferences(): Promise<NotificationPreferences | null> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) return null;

      const response = await fetch(
        `${API_BASE_URL}/api/v1/notifications/preferences`,
        {
          headers: getAuthHeader(authToken),
        },
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return null;
    }
  }

  /**
   * Update the user's notification preferences
   * Can update one or more notification settings
   * 
   * @param preferences - Partial preferences object with settings to update
   * @param preferences.expiry_alerts - Enable/disable expiration alerts
   * @param preferences.recipe_suggestions - Enable/disable recipe suggestions
   * @param preferences.achievement_notifications - Enable/disable achievement notifications
   * @param preferences.daily_reminders - Enable/disable daily reminders
   * @returns Promise<boolean> - True if update successful, false otherwise
   * 
   * @example
   * ```typescript
   * const success = await notificationService.updatePreferences({
   *   expiry_alerts: true,
   *   recipe_suggestions: false,
   *   daily_reminders: true
   * });
   * if (success) {
   *   console.log('Preferences updated');
   * }
   * ```
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>,
  ): Promise<boolean> {
    try {
      const authToken = await AsyncStorage.getItem('auth_token');
      if (!authToken) return false;

      await fetch(`${API_BASE_URL}/api/v1/notifications/preferences`, {
        method: 'PUT',
        headers: {
          ...getAuthHeader(authToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }

  /**
   * Check if notifications are currently enabled for the app
   * Attempts to get FCM token and checks permission status
   * 
   * @returns Promise<boolean> - True if notifications are enabled, false otherwise
   * 
   * @example
   * ```typescript
   * const enabled = await notificationService.areNotificationsEnabled();
   * if (enabled) {
   *   console.log('Notifications are enabled');
   * } else {
   *   console.log('Notifications are disabled - prompt user to enable');
   * }
   * ```
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      // Try to get a token - if we can get one, notifications are enabled
      try {
        const token = await messaging().getToken();
        if (token) {
          // We have a token, so notifications ARE enabled
          await this.registerToken(token);
          return true;
        }
      } catch (tokenError) {
      }

      // If we couldn't get a token, check permission status
      const authStatus = await messaging().hasPermission();
      const isEnabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      return isEnabled;
    } catch (error) {
      console.error('Failed to check notification status:', error);
      return false;
    }
  }
}

export default new NotificationService();
