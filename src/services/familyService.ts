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

class FamilyService {
  private baseUrl = `${API_BASE_URL}/api/v1/families`;

  /**
   * GET USER'S FAMILY
   * Get the family the user belongs to
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
   * CREATE FAMILY
   * Create a new family
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
   * JOIN FAMILY
   * Join an existing family using invite code
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
   * LEAVE FAMILY
   * Leave the current family
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
   * REMOVE FAMILY MEMBER
   * Remove a member from the family (admin only)
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
   * UPDATE MEMBER ROLE
   * Update a family member's role (admin only)
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
   * GET FAMILY LOCATIONS
   * Get current locations of family members
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
   * UPDATE LOCATION
   * Update user's current location
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
   * GET FAMILY SHOPPING SUGGESTIONS
   * Get shopping suggestions based on family member locations
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
   * SEND FAMILY NOTIFICATION
   * Send a notification to family members
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
   * GET FAMILY MEAL PLANS
   * Get shared family meal plans
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
   * UPDATE FAMILY SETTINGS
   * Update family coordination settings
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
   * GET FAMILY ACTIVITY FEED
   * Get recent family activity and coordination events
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
   * ENABLE LOCATION SHARING
   * Enable location sharing for family coordination
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