import AsyncStorage from '@react-native-async-storage/async-storage';
import {PaymentErrorHandler} from '../utils/paymentErrorHandler';

const API_BASE = 'https://api.cooksmartapp.com/api/v1';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'week' | 'month' | 'year';
  features: string[];
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface Subscription {
  id: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface PaymentData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  last4: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover';
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface BillingItem {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending' | 'refunded';
  description: string;
  planName: string;
  receiptUrl?: string;
}

class PaymentService {
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && {Authorization: `Bearer ${token}`}),
    };
  }

  async getPricingPlans(): Promise<PricingPlan[]> {
    const response = await fetch(`${API_BASE}/payments/plans`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get pricing plans');
    }

    return data.plans;
  }

  async createPaymentIntent(planId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(
        `${API_BASE}/payments/create-payment-intent`,
        {
          method: 'POST',
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({planId}),
        },
      );

      const data = await response.json();

      if (!data.success) {
        const error = PaymentErrorHandler.parseError({response: {data}});
        PaymentErrorHandler.logError(error, 'createPaymentIntent');
        throw error;
      }

      return data.paymentIntent;
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) throw error; // Already a PaymentError
      const paymentError = PaymentErrorHandler.parseError(error);
      PaymentErrorHandler.logError(paymentError, 'createPaymentIntent');
      throw paymentError;
    }
  }

  async createSubscription(
    planId: string,
    _paymentData: PaymentData,
  ): Promise<Subscription> {
    try {
      // Mock payment method creation
      const paymentMethodId = `pm_${Date.now()}`;

      const response = await fetch(`${API_BASE}/payments/subscribe`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({planId, paymentMethodId}),
      });

      const data = await response.json();

      if (!data.success) {
        const error = PaymentErrorHandler.parseError({response: {data}});
        PaymentErrorHandler.logError(error, 'createSubscription');
        throw error;
      }

      return data.subscription;
    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) throw error; // Already a PaymentError
      const paymentError = PaymentErrorHandler.parseError(error);
      PaymentErrorHandler.logError(paymentError, 'createSubscription');
      throw paymentError;
    }
  }

  async getUserSubscriptions(): Promise<Subscription[]> {
    const response = await fetch(`${API_BASE}/payments/subscriptions`, {
      headers: await this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get subscriptions');
    }

    return data.subscriptions;
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/payments/cancel-subscription`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({subscriptionId, cancelAtPeriodEnd}),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to cancel subscription');
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    // Mock reactivation - in real implementation, this would call Stripe API
    const response = await fetch(`${API_BASE}/payments/cancel-subscription`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({subscriptionId, cancelAtPeriodEnd: false}),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to reactivate subscription');
    }
  }

  validatePaymentData(paymentData: PaymentData): string[] {
    const errors: string[] = [];

    if (!paymentData.cardholderName.trim()) {
      errors.push('Cardholder name is required');
    }

    const cardNumber = paymentData.cardNumber.replace(/\s/g, '');
    if (cardNumber.length < 16) {
      errors.push('Invalid card number');
    }

    const expiryParts = paymentData.expiryDate.split('/');
    if (
      expiryParts.length !== 2 ||
      expiryParts[0].length !== 2 ||
      expiryParts[1].length !== 2
    ) {
      errors.push('Invalid expiry date');
    }

    if (paymentData.cvv.length < 3) {
      errors.push('Invalid CVV');
    }

    return errors;
  }

  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  getPlanDisplayName(planId: string): string {
    const names: Record<string, string> = {
      weekly: 'Weekly Plan',
      monthly: 'Monthly Plan',
      yearly: 'Yearly Plan',
      'beta-presale': 'BETA Pre-Purchase',
    };
    return names[planId] || planId;
  }

  isSubscriptionActive(subscription: Subscription): boolean {
    return subscription.status === 'active' && !subscription.cancelAtPeriodEnd;
  }

  getSubscriptionStatusText(subscription: Subscription): string {
    if (subscription.status === 'active' && subscription.cancelAtPeriodEnd) {
      return 'Ending Soon';
    }
    return (
      subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
    );
  }

  isBetaUser(): boolean {
    // During BETA phase, everyone is considered a BETA user
    return true;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await fetch(`${API_BASE}/payments/payment-methods`, {
      headers: await this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to get payment methods');
    }

    return data.paymentMethods;
  }

  async addPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const response = await fetch(`${API_BASE}/payments/payment-methods`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ paymentMethodId }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to add payment method');
    }

    return data.paymentMethod;
  }

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/payments/payment-methods/${paymentMethodId}/default`,
      {
        method: 'POST',
        headers: await this.getAuthHeaders(),
      },
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to set default payment method');
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/payments/payment-methods/${paymentMethodId}`,
      {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      },
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to delete payment method');
    }
  }

  async getBillingHistory(): Promise<BillingItem[]> {
    const response = await fetch(`${API_BASE}/payments/billing-history`, {
      headers: await this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to get billing history');
    }

    return data.billingHistory;
  }

  async downloadReceipt(receiptUrl: string): Promise<void> {
    // In a real app, this would handle receipt download
    // For React Native, this would use Linking.openURL or similar
    console.log('Download receipt:', receiptUrl);
  }

  formatBillingStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getTotalSpent(billingHistory: BillingItem[]): number {
    return billingHistory
      .filter(item => item.status === 'paid')
      .reduce((total, item) => total + item.amount, 0);
  }
}

export const paymentService = new PaymentService();
