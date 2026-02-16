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

/**
 * Service for managing payments, subscriptions, and billing
 * Handles Stripe integration for Cook Smart premium features
 */
class PaymentService {
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && {Authorization: `Bearer ${token}`}),
    };
  }

  /**
   * Get available pricing plans
   * Returns all subscription plans with pricing and features
   * 
   * @returns Promise<PricingPlan[]> - Array of available pricing plans
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const plans = await paymentService.getPricingPlans();
   * plans.forEach(plan => {
   *   console.log(`${plan.name}: ${paymentService.formatPrice(plan.price)}/${plan.interval}`);
   *   console.log('Features:', plan.features.join(', '));
   * });
   * ```
   */
  async getPricingPlans(): Promise<PricingPlan[]> {
    const response = await fetch(`${API_BASE}/payments/plans`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to get pricing plans');
    }

    return data.plans;
  }

  /**
   * Create a payment intent for one-time payment
   * Generates Stripe payment intent with client secret for payment processing
   * 
   * @param planId - ID of the plan to purchase
   * @returns Promise<PaymentIntent> - Payment intent with client secret
   * @throws PaymentError if creation fails
   * 
   * @example
   * ```typescript
   * try {
   *   const intent = await paymentService.createPaymentIntent('beta-presale');
   *   // Use intent.clientSecret with Stripe payment sheet
   * } catch (error) {
   *   console.error('Payment intent failed:', error.message);
   * }
   * ```
   */
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

  /**
   * Create a new subscription
   * Subscribes user to a recurring payment plan
   * 
   * @param planId - ID of the subscription plan
   * @param _paymentData - Payment method data (currently mocked)
   * @returns Promise<Subscription> - Created subscription details
   * @throws PaymentError if subscription creation fails
   * 
   * @example
   * ```typescript
   * try {
   *   const subscription = await paymentService.createSubscription('monthly', paymentData);
   *   console.log('Subscription active until:', subscription.currentPeriodEnd);
   * } catch (error) {
   *   console.error('Subscription failed:', error.message);
   * }
   * ```
   */
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

  /**
   * Get user's active subscriptions
   * Returns all subscriptions for the authenticated user
   * 
   * @returns Promise<Subscription[]> - Array of user's subscriptions
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const subscriptions = await paymentService.getUserSubscriptions();
   * subscriptions.forEach(sub => {
   *   console.log(`${sub.planId}: ${sub.status}`);
   *   if (paymentService.isSubscriptionActive(sub)) {
   *     console.log('Active until:', sub.currentPeriodEnd);
   *   }
   * });
   * ```
   */
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

  /**
   * Cancel a subscription
   * Cancels subscription either immediately or at period end
   * 
   * @param subscriptionId - ID of the subscription to cancel
   * @param cancelAtPeriodEnd - If true, subscription remains active until period ends (default: true)
   * @returns Promise<void>
   * @throws Error if cancellation fails
   * 
   * @example
   * ```typescript
   * // Cancel at end of billing period
   * await paymentService.cancelSubscription('sub_123', true);
   * 
   * // Cancel immediately
   * await paymentService.cancelSubscription('sub_123', false);
   * ```
   */
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

  /**
   * Reactivate a cancelled subscription
   * Resumes a subscription that was set to cancel at period end
   * 
   * @param subscriptionId - ID of the subscription to reactivate
   * @returns Promise<void>
   * @throws Error if reactivation fails
   * 
   * @example
   * ```typescript
   * await paymentService.reactivateSubscription('sub_123');
   * console.log('Subscription reactivated');
   * ```
   */
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

  /**
   * Validate payment data before submission
   * Checks card number, expiry date, CVV, and cardholder name
   * 
   * @param paymentData - Payment data to validate
   * @returns string[] - Array of validation error messages (empty if valid)
   * 
   * @example
   * ```typescript
   * const errors = paymentService.validatePaymentData(paymentData);
   * if (errors.length > 0) {
   *   console.error('Validation errors:', errors.join(', '));
   * } else {
   *   // Proceed with payment
   * }
   * ```
   */
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

  /**
   * Format price from cents to dollar string
   * Converts Stripe's cent-based pricing to readable format
   * 
   * @param cents - Price in cents
   * @returns Formatted price string (e.g., "$9.99")
   * 
   * @example
   * ```typescript
   * console.log(paymentService.formatPrice(999));  // "$9.99"
   * console.log(paymentService.formatPrice(1500)); // "$15.00"
   * ```
   */
  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Get display name for a plan ID
   * Converts plan IDs to user-friendly names
   * 
   * @param planId - Plan identifier
   * @returns User-friendly plan name
   * 
   * @example
   * ```typescript
   * console.log(paymentService.getPlanDisplayName('monthly')); // "Monthly Plan"
   * console.log(paymentService.getPlanDisplayName('beta-presale')); // "BETA Pre-Purchase"
   * ```
   */
  getPlanDisplayName(planId: string): string {
    const names: Record<string, string> = {
      weekly: 'Weekly Plan',
      monthly: 'Monthly Plan',
      yearly: 'Yearly Plan',
      'beta-presale': 'BETA Pre-Purchase',
    };
    return names[planId] || planId;
  }

  /**
   * Check if a subscription is currently active
   * Returns true only if status is active and not set to cancel
   * 
   * @param subscription - Subscription to check
   * @returns True if subscription is active and not ending
   * 
   * @example
   * ```typescript
   * const subscriptions = await paymentService.getUserSubscriptions();
   * const activeCount = subscriptions.filter(sub => 
   *   paymentService.isSubscriptionActive(sub)
   * ).length;
   * console.log(`${activeCount} active subscriptions`);
   * ```
   */
  isSubscriptionActive(subscription: Subscription): boolean {
    return subscription.status === 'active' && !subscription.cancelAtPeriodEnd;
  }

  /**
   * Get user-friendly status text for a subscription
   * Converts subscription status to display text
   * 
   * @param subscription - Subscription to get status for
   * @returns Status text (e.g., "Active", "Ending Soon", "Canceled")
   * 
   * @example
   * ```typescript
   * const subscriptions = await paymentService.getUserSubscriptions();
   * subscriptions.forEach(sub => {
   *   console.log(`Status: ${paymentService.getSubscriptionStatusText(sub)}`);
   * });
   * ```
   */
  getSubscriptionStatusText(subscription: Subscription): string {
    if (subscription.status === 'active' && subscription.cancelAtPeriodEnd) {
      return 'Ending Soon';
    }
    return (
      subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
    );
  }

  /**
   * Check if user is a BETA user
   * During BETA phase, all users are considered BETA users
   * 
   * @returns True if user is in BETA program
   * 
   * @example
   * ```typescript
   * if (paymentService.isBetaUser()) {
   *   console.log('BETA user - special pricing available');
   * }
   * ```
   */
  isBetaUser(): boolean {
    // During BETA phase, everyone is considered a BETA user
    return true;
  }

  /**
   * Get user's saved payment methods
   * Returns all payment methods on file for the user
   * 
   * @returns Promise<PaymentMethod[]> - Array of saved payment methods
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const methods = await paymentService.getPaymentMethods();
   * methods.forEach(method => {
   *   console.log(`${method.brand} ending in ${method.last4}`);
   *   if (method.isDefault) console.log('(Default)');
   * });
   * ```
   */
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

  /**
   * Add a new payment method
   * Saves a payment method to user's account
   * 
   * @param paymentMethodId - Stripe payment method ID
   * @returns Promise<PaymentMethod> - Added payment method details
   * @throws Error if addition fails
   * 
   * @example
   * ```typescript
   * const method = await paymentService.addPaymentMethod('pm_123456');
   * console.log(`Added ${method.brand} card ending in ${method.last4}`);
   * ```
   */
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

  /**
   * Set a payment method as default
   * Makes a payment method the default for future charges
   * 
   * @param paymentMethodId - ID of payment method to set as default
   * @returns Promise<void>
   * @throws Error if update fails
   * 
   * @example
   * ```typescript
   * await paymentService.setDefaultPaymentMethod('pm_123456');
   * console.log('Default payment method updated');
   * ```
   */
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

  /**
   * Delete a saved payment method
   * Removes a payment method from user's account
   * 
   * @param paymentMethodId - ID of payment method to delete
   * @returns Promise<void>
   * @throws Error if deletion fails
   * 
   * @example
   * ```typescript
   * await paymentService.deletePaymentMethod('pm_123456');
   * console.log('Payment method removed');
   * ```
   */
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

  /**
   * Get user's billing history
   * Returns all past charges and invoices
   * 
   * @returns Promise<BillingItem[]> - Array of billing history items
   * @throws Error if request fails
   * 
   * @example
   * ```typescript
   * const history = await paymentService.getBillingHistory();
   * history.forEach(item => {
   *   console.log(`${item.date}: ${paymentService.formatPrice(item.amount)} - ${item.status}`);
   * });
   * const total = paymentService.getTotalSpent(history);
   * console.log(`Total spent: ${paymentService.formatPrice(total)}`);
   * ```
   */
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

  /**
   * Download a receipt
   * Opens receipt URL for viewing or downloading
   * 
   * @param receiptUrl - URL of the receipt to download
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * const history = await paymentService.getBillingHistory();
   * if (history[0].receiptUrl) {
   *   await paymentService.downloadReceipt(history[0].receiptUrl);
   * }
   * ```
   */
  async downloadReceipt(receiptUrl: string): Promise<void> {
    // In a real app, this would handle receipt download
    // For React Native, this would use Linking.openURL or similar
  }

  /**
   * Format billing status for display
   * Capitalizes status text for UI display
   * 
   * @param status - Billing status string
   * @returns Formatted status text
   * 
   * @example
   * ```typescript
   * console.log(paymentService.formatBillingStatus('paid'));    // "Paid"
   * console.log(paymentService.formatBillingStatus('pending')); // "Pending"
   * ```
   */
  formatBillingStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  /**
   * Calculate total amount spent from billing history
   * Sums all paid charges
   * 
   * @param billingHistory - Array of billing items
   * @returns Total amount in cents
   * 
   * @example
   * ```typescript
   * const history = await paymentService.getBillingHistory();
   * const total = paymentService.getTotalSpent(history);
   * console.log(`Total spent: ${paymentService.formatPrice(total)}`);
   * ```
   */
  getTotalSpent(billingHistory: BillingItem[]): number {
    return billingHistory
      .filter(item => item.status === 'paid')
      .reduce((total, item) => total + item.amount, 0);
  }
}

export const paymentService = new PaymentService();
