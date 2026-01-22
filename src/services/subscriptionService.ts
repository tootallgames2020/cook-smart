import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';

const API_URL = `${API_BASE_URL}/api/v1`;

interface SubscriptionPlan {
  id: number;
  name: string;
  displayName: string;
  initialPrice: number;
  renewalPrice: number;
  billingInterval: string;
  trialDays: number;
  features: string[];
}

interface SubscriptionResult {
  subscriptionId: string;
  clientSecret: string;
  initialPrice: number;
  renewalPrice: number;
  trialEndDate?: string;
}

interface PhaseInfo {
  phase: string;
  isBeta: boolean;
  updatedAt: string;
}

class SubscriptionService {
  /**
   * Get available subscription plans
   */
  async getAvailablePlans(referralCode?: string): Promise<SubscriptionPlan[]> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const url = referralCode
        ? `${API_URL}/subscriptions/plans?referralCode=${referralCode}`
        : `${API_URL}/subscriptions/plans`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && {Authorization: `Bearer ${token}`}),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch subscription plans');
      }

      // Transform backend response to match mobile app interface
      const transformedPlans: SubscriptionPlan[] = data.plans.map((plan: any, index: number) => ({
        id: index + 1,
        name: plan.id || plan.name, // Backend uses 'id' for plan name
        displayName: plan.name || plan.displayName,
        initialPrice: plan.price || plan.initialPrice || 0,
        renewalPrice: plan.price || plan.renewalPrice || 0,
        billingInterval: plan.interval || plan.billingInterval || 'month',
        trialDays: plan.trialDays || 0,
        features: plan.features || []
      }));

      return transformedPlans;
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    planType: 'yearly' | 'monthly' | 'weekly',
    referralCode?: string,
  ): Promise<SubscriptionResult> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('User must be logged in to subscribe');
      }

      const response = await fetch(`${API_URL}/subscriptions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planType,
          referralCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create subscription');
      }

      return data.subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe Checkout Session (web-based payment)
   */
  async createCheckoutSession(
    planType: 'yearly' | 'monthly' | 'weekly',
    referralCode?: string,
  ): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('User must be logged in to subscribe');
      }

      const response = await fetch(
        `${API_URL}/subscriptions/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            planType,
            referralCode,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create checkout session');
      }

      return data.checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Get current phase (beta or post-beta)
   */
  async getPhase(): Promise<PhaseInfo> {
    try {
      const response = await fetch(`${API_URL}/subscriptions/phase`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch phase info');
      }

      return {
        phase: data.phase,
        isBeta: data.isBeta,
        updatedAt: data.updatedAt,
      };
    } catch (error) {
      console.error('Error fetching phase info:', error);
      throw error;
    }
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        return null;
      }

      const response = await fetch(`${API_URL}/subscriptions/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.subscription;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  /**
   * Sync subscription status with Stripe
   */
  async syncSubscriptionStatus(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        return;
      }

      await fetch(`${API_URL}/subscriptions/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Error syncing subscription:', error);
    }
  }

  /**
   * Check for pending checkout sessions
   */
  async checkPendingCheckouts(): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        return [];
      }

      const response = await fetch(`${API_URL}/subscriptions/check-pending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data.pending || [];
    } catch (error) {
      console.error('Error checking pending checkouts:', error);
      return [];
    }
  }

  /**
   * Get subscription access level
   */
  async getSubscriptionAccess(): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        return {accessLevel: 'none'};
      }

      const response = await fetch(`${API_URL}/subscriptions/access`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting subscription access:', error);
      return {accessLevel: 'none'};
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        throw new Error('User must be logged in');
      }

      const response = await fetch(
        `${API_URL}/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();
