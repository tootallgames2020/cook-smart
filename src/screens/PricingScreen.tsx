import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { BetaBanner } from '../components/BetaBanner';
import { BetaPricingCard } from '../components/BetaPricingCard';
import { paymentService, PricingPlan } from '../services/paymentService';

interface Props {
  navigation: any;
}

export const PricingScreen: React.FC<Props> = ({ navigation }) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const fetchedPlans = await paymentService.getPricingPlans();
        setPlans(fetchedPlans);
      } catch (error) {
        console.error('Failed to load plans:', error);
      }
    };
    loadPlans();
  }, []);

  const handlePlanSelection = async (plan: PricingPlan) => {
    try {
      // For BETA: Show information about the plan
      Alert.alert(
        'BETA Pre-Purchase',
        `You selected the ${plan.name} plan ($${plan.price}/${plan.interval}).\n\nDuring BETA, all features are free! This pre-purchase will give you a 30% discount when we launch.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue to Payment', 
            onPress: () => {
              // Navigate to payment screen with selected plan
              navigation.navigate('PaymentMethods', { selectedPlan: plan });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error selecting plan:', error);
      Alert.alert('Error', 'Failed to process plan selection. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BetaBanner />
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.description}>
            Pre-purchase now and save 30% on the yearly plan when we launch.
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {plans.map((plan) => (
            <BetaPricingCard
              key={plan.id}
              planId={plan.id}
              name={plan.name}
              price={plan.price}
              interval={plan.interval}
              features={plan.features}
              isPopular={plan.id === 'monthly'}
              onSelect={() => handlePlanSelection(plan)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>What's included in BETA:</Text>
          <View style={styles.betaFeatures}>
            <Text style={styles.betaFeature}>✅ All premium features unlocked</Text>
            <Text style={styles.betaFeature}>✅ No payment required during BETA</Text>
            <Text style={styles.betaFeature}>✅ Feedback directly shapes the app</Text>
            <Text style={styles.betaFeature}>✅ Early access to new features</Text>
            <Text style={styles.betaFeature}>✅ Pre-purchase discount available</Text>
          </View>
          
          <Text style={styles.disclaimer}>
            * BETA access is completely free. Pre-purchase is optional and provides a 30% discount for when the app launches.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  plansContainer: {
    padding: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  betaFeatures: {
    marginBottom: 16,
  },
  betaFeature: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 6,
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
