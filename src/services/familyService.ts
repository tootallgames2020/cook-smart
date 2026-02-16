import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authService';

export interface Family {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  member_count: number;
  settings: {
    auto_share_shopping_lists: boolean;
    location_notifications: boolean;
    meal_planning_shared: boolean;
  };
}

export interface FamilyMember {
  id: string;
  user_id: string;
  family_id: string;
  role: 'admin' | 'member' | 'child';
  name: string;
  email: string;
  joined_at: string;
  last_active?: string;
  location_sharing_enabled: boolean;
}

export interface FamilyLocation {
  member_id: string;
  member_name: string;
  location_type: 'grocery_store' | 'home' | 'other';
  store_name?: string;
  detected_at: string;
  suggestions: string[];
}

/**
 * Service for family coordination and shared features
 * Handles family groups, location sharing, meal planning, and notifications
 */
class FamilyService {
  private baseUrl = `${API_BASE_URL}/api/v1/families`;

  /**
   * Get the family the user belongs to
   * Returns family details and all members
   * 
   * @returns Promise with family and members, or null if user is not in a family
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const familyData = await familyService.getUserFamily();
   * if (familyData) {
   *   console.log(`Family: ${familyData.family.name}`);
   *   console.log(`Members: ${familyData.members.length}`);
   *   console.log(`Invite code: ${familyData.family.invite_code}`);
   * } else {
   *   console.log('Not in a family');
   * }
   * ```
   */
  async getUserFamily(): Promise<{ family: Family; members: FamilyMember[] } | null> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/my-family`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        return null; // User is not in a family
      }

      if (!response.ok) {
        throw new Error(`Get family failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get user family error:', error);
      throw error;
    }
  }

  /**
   * Create a new family
   * Creates a family group and makes you the admin
   * 
   * @param name - Name for the family
   * @returns Promise<Family> - Created family with invite code
   * @throws Error if creation fails
   * 
   * @example
   * ```typescript
   * const family = await familyService.createFamily('Smith Family');
   * console.log(`Family created! Invite code: ${family.invite_code}`);
   * console.log('Share this code with family members to join');
   * ```
   */
  async createFamily(name: string): Promise<Family> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error(`Create family failed: ${response.status}`);
      }

      const data = await response.json();
      return data.family;
    } catch (error) {
      console.error('Create family error:', error);
      throw error;
    }
  }

  /**
   * Join an existing family using invite code
   * Adds you to a family group
   * 
   * @param inviteCode - 6-character invite code from family admin
   * @returns Promise<void>
   * @throws Error if join fails or code is invalid
   * 
   * @example
   * ```typescript
   * try {
   *   await familyService.joinFamily('ABC123');
   *   console.log('Successfully joined family!');
   * } catch (error) {
   *   console.error('Invalid invite code or family is full');
   * }
   * ```
   */
  async joinFamily(inviteCode: string): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      if (!response.ok) {
        throw new Error(`Join family failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Join family error:', error);
      throw error;
    }
  }

  /**
   * Leave the current family
   * Removes you from your family group
   * 
   * @returns Promise<void>
   * @throws Error if leave fails
   * 
   * @example
   * ```typescript
   * await familyService.leaveFamily();
   * console.log('Left family successfully');
   * ```
   */
  async leaveFamily(): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Leave family failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Leave family error:', error);
      throw error;
    }
  }

  /**
   * Remove a member from the family
   * Admin-only action to remove a family member
   * 
   * @param memberId - ID of member to remove
   * @returns Promise<void>
   * @throws Error if removal fails or user is not admin
   * 
   * @example
   * ```typescript
   * await familyService.removeFamilyMember('member_123');
   * console.log('Member removed from family');
   * ```
   */
  async removeFamilyMember(memberId: string): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Remove member failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Remove family member error:', error);
      throw error;
    }
  }

  /**
   * Update a family member's role
   * Admin-only action to change member permissions
   * 
   * @param memberId - ID of member to update
   * @param role - New role ('admin', 'member', or 'child')
   * @returns Promise<void>
   * @throws Error if update fails or user is not admin
   * 
   * @example
   * ```typescript
   * // Promote member to admin
   * await familyService.updateMemberRole('member_123', 'admin');
   * 
   * // Set child account restrictions
   * await familyService.updateMemberRole('member_456', 'child');
   * ```
   */
  async updateMemberRole(memberId: string, role: 'admin' | 'member' | 'child'): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error(`Update member role failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Update member role error:', error);
      throw error;
    }
  }

  /**
   * Get current locations of family members
   * Returns location data for members with location sharing enabled
   * 
   * @returns Promise<FamilyLocation[]> - Array of member locations or empty array if none
   * 
   * @example
   * ```typescript
   * const locations = await familyService.getFamilyLocations();
   * locations.forEach(loc => {
   *   if (loc.location_type === 'grocery_store') {
   *     console.log(`${loc.member_name} is at ${loc.store_name}`);
   *     console.log('Suggestions:', loc.suggestions.join(', '));
   *   }
   * });
   * ```
   */
  async getFamilyLocations(): Promise<FamilyLocation[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/locations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get family locations failed: ${response.status}`);
      }

      const data = await response.json();
      return data.locations || [];
    } catch (error) {
      console.error('Get family locations error:', error);
      return [];
    }
  }

  /**
   * Update user's current location
   * Shares location with family for coordination features
   * 
   * @param latitude - GPS latitude
   * @param longitude - GPS longitude
   * @param locationContext - Optional context about activity and confidence
   * @returns Promise<void>
   * @throws Error if update fails
   * 
   * @example
   * ```typescript
   * await familyService.updateLocation(
   *   40.7128,
   *   -74.0060,
   *   { activity: 'shopping', confidence: 0.95 }
   * );
   * ```
   */
  async updateLocation(
    latitude: number,
    longitude: number,
    locationContext?: {
      activity?: string;
      confidence?: number;
    }
  ): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          context: locationContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Update location failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Update location error:', error);
      throw error;
    }
  }

  /**
   * Get shopping suggestions based on family member locations
   * Returns smart suggestions when family members are near stores
   * 
   * @returns Promise<any[]> - Array of shopping suggestions or empty array if none
   * 
   * @example
   * ```typescript
   * const suggestions = await familyService.getFamilyShoppingSuggestions();
   * suggestions.forEach(suggestion => {
   *   console.log(`${suggestion.member_name} is near ${suggestion.store_name}`);
   *   console.log('Suggested items:', suggestion.items.join(', '));
   * });
   * ```
   */
  async getFamilyShoppingSuggestions(): Promise<any[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/shopping-suggestions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get shopping suggestions failed: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Get family shopping suggestions error:', error);
      return [];
    }
  }

  /**
   * Send a notification to family members
   * Broadcasts a message to all family members
   * 
   * @param message - Notification message text
   * @param notificationType - Type of notification ('meal_ready', 'shopping_reminder', 'general', 'location_alert')
   * @returns Promise<void>
   * @throws Error if send fails
   * 
   * @example
   * ```typescript
   * // Notify family that dinner is ready
   * await familyService.sendFamilyNotification(
   *   'Dinner is ready!',
   *   'meal_ready'
   * );
   * 
   * // Send shopping reminder
   * await familyService.sendFamilyNotification(
   *   'Don\'t forget to pick up milk',
   *   'shopping_reminder'
   * );
   * ```
   */
  async sendFamilyNotification(
    message: string,
    notificationType: 'meal_ready' | 'shopping_reminder' | 'general' | 'location_alert'
  ): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          notification_type: notificationType,
        }),
      });

      if (!response.ok) {
        throw new Error(`Send notification failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Send family notification error:', error);
      throw error;
    }
  }

  /**
   * Get shared family meal plans
   * Returns meal plans visible to all family members
   * 
   * @returns Promise<any[]> - Array of family meal plans or empty array if none
   * 
   * @example
   * ```typescript
   * const mealPlans = await familyService.getFamilyMealPlans();
   * mealPlans.forEach(plan => {
   *   console.log(`${plan.date}: ${plan.meal_name}`);
   *   console.log(`Assigned to: ${plan.assigned_member}`);
   * });
   * ```
   */
  async getFamilyMealPlans(): Promise<any[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/meal-plans`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get family meal plans failed: ${response.status}`);
      }

      const data = await response.json();
      return data.meal_plans || [];
    } catch (error) {
      console.error('Get family meal plans error:', error);
      return [];
    }
  }

  /**
   * Update family coordination settings
   * Configures how family features work
   * 
   * @param settings - Settings to update
   * @param settings.auto_share_shopping_lists - Automatically share shopping lists with family
   * @param settings.location_notifications - Enable location-based notifications
   * @param settings.meal_planning_shared - Share meal plans with all members
   * @returns Promise<void>
   * @throws Error if update fails
   * 
   * @example
   * ```typescript
   * await familyService.updateFamilySettings({
   *   auto_share_shopping_lists: true,
   *   location_notifications: true,
   *   meal_planning_shared: true
   * });
   * console.log('Family settings updated');
   * ```
   */
  async updateFamilySettings(settings: {
    auto_share_shopping_lists?: boolean;
    location_notifications?: boolean;
    meal_planning_shared?: boolean;
  }): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error(`Update family settings failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Update family settings error:', error);
      throw error;
    }
  }

  /**
   * Get recent family activity and coordination events
   * Returns activity feed showing what family members are doing
   * 
   * @param limit - Maximum number of activities to return (default: 20)
   * @returns Promise<any[]> - Array of activity items or empty array if none
   * 
   * @example
   * ```typescript
   * const activities = await familyService.getFamilyActivityFeed(10);
   * activities.forEach(activity => {
   *   console.log(`${activity.member_name} ${activity.action}`);
   *   console.log(`Time: ${activity.timestamp}`);
   * });
   * ```
   */
  async getFamilyActivityFeed(limit: number = 20): Promise<any[]> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/activity?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get family activity failed: ${response.status}`);
      }

      const data = await response.json();
      return data.activities || [];
    } catch (error) {
      console.error('Get family activity error:', error);
      return [];
    }
  }

  /**
   * Enable or disable location sharing for family coordination
   * Controls whether your location is visible to family members
   * 
   * @param enabled - True to enable location sharing, false to disable
   * @returns Promise<void>
   * @throws Error if update fails
   * 
   * @example
   * ```typescript
   * // Enable location sharing
   * await familyService.enableLocationSharing(true);
   * console.log('Location sharing enabled');
   * 
   * // Disable location sharing
   * await familyService.enableLocationSharing(false);
   * console.log('Location sharing disabled');
   * ```
   */
  async enableLocationSharing(enabled: boolean): Promise<void> {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${this.baseUrl}/location-sharing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error(`Update location sharing failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Update location sharing error:', error);
      throw error;
    }
  }
}

export const familyService = new FamilyService();
export default familyService;