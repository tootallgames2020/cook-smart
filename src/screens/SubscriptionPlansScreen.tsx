import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
} from 'react-native';

import {subscriptionService} from '../services/subscriptionService';

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

export default function SubscriptionPlansScreen() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    loadPlans();
    checkExistingSubscription();
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const sub = await subscriptionService.getUserSubscription();
      if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
        setHasActiveSubscription(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const availablePlans =
        await subscriptionService.getAvailablePlans(referralCode);
      setPlans(availablePlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyReferralCode = () => {
    if (referralCode.trim()) {
      loadPlans();
    }
  };

  const handleSubscribe = async (planName: string) => {
    if (hasActiveSubscription) {
      Alert.alert(
        'Already Subscribed',
        'You already have an active subscription',
      );
      return;
    }

    try {
      setSubscribing(true);
      const checkoutUrl = await subscriptionService.createCheckoutSession(
        planName as 'yearly' | 'monthly' | 'weekly',
        referralCode || undefined,
      );
      // Open Stripe Checkout in browser
      // Note: Linking.canOpenURL may return false for HTTPS URLs on Android
      // but Linking.openURL will still work, so we try to open it directly
      try {
        await Linking.openURL(checkoutUrl);
      } catch (linkingError) {
        console.error('Error opening URL:', linkingError);
        Alert.alert(
          'Error',
          'Unable to open payment page. Please try again or contact support.',
        );
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to create checkout session',
      );
    } finally {
      setSubscribing(false);
    }
  };

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isSelected = selectedPlan === plan.name;
    const hasPromotion = plan.initialPrice !== plan.renewalPrice;
    const isBeta = plan.trialDays === 0 && plan.name === 'yearly';

    return (
      <TouchableOpacity
        key={plan.id}
        style={[styles.planCard, isSelected && styles.planCardSelected]}
        onPress={() => setSelectedPlan(plan.name)}>
        {hasPromotion && (
          <View style={styles.promotionBadge}>
            <Text style={styles.promotionText}>
              {isBeta ? '🎉 BETA SPECIAL' : '🎁 REFERRAL DISCOUNT'}
            </Text>
          </View>
        )}

        <Text style={styles.planName}>{plan.displayName}</Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>${plan.initialPrice.toFixed(2)}</Text>
          <Text style={styles.interval}>/{plan.billingInterval}</Text>
        </View>

        {hasPromotion && (
          <Text style={styles.renewalInfo}>
            Renews at ${plan.renewalPrice.toFixed(2)}/{plan.billingInterval}
          </Text>
        )}

        {plan.trialDays > 0 && (
          <View style={styles.trialBadge}>
            <Text style={styles.trialText}>
              {plan.trialDays}-day free trial
            </Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isSelected && (
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              (subscribing || hasActiveSubscription) &&
                styles.subscribeButtonDisabled,
            ]}
            onPress={() => handleSubscribe(plan.name)}
            disabled={subscribing || hasActiveSubscription}>
            {subscribing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading subscription plans...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Unlock all premium features and support Cook Smart
        </Text>
      </View>

      {!showReferralInput ? (
        <TouchableOpacity
          style={styles.referralButton}
          onPress={() => setShowReferralInput(true)}>
          <Text style={styles.referralButtonText}>Have a referral code?</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.referralInputContainer}>
          <TextInput
            style={styles.referralInput}
            placeholder="Enter referral code"
            value={referralCode}
            onChangeText={setReferralCode}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApplyReferralCode}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.plansContainer}>
        {plans.map(plan => renderPlanCard(plan))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All subscriptions auto-renew. Cancel anytime from your account
          settings.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  referralButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    alignItems: 'center',
  },
  referralButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  referralInputContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 8,
  },
  referralInput: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  applyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  plansContainer: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  promotionBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  promotionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  interval: {
    fontSize: 18,
    color: '#666',
    marginLeft: 4,
  },
  renewalInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  trialBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  trialText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    marginTop: 16,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  subscribeButton: {
    marginTop: 20,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subscribeButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
