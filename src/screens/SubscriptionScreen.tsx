import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { paymentService, Subscription } from '../services/paymentService';

export const SubscriptionScreen: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const userSubscriptions = await paymentService.getUserSubscriptions();
      setSubscriptions(userSubscriptions);
    } catch {
      Alert.alert('Error', 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentService.cancelSubscription(subscriptionId, true);
              
              setSubscriptions(prev => 
                prev.map(sub => 
                  sub.id === subscriptionId 
                    ? { ...sub, cancelAtPeriodEnd: true }
                    : sub
                )
              );
              
              Alert.alert('Success', 'Subscription will be canceled at the end of your billing period');
            } catch {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          }
        }
      ]
    );
  };

  const handleReactivateSubscription = async (subscriptionId: string) => {
    try {
      await paymentService.reactivateSubscription(subscriptionId);
      
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, cancelAtPeriodEnd: false }
            : sub
        )
      );
      
      Alert.alert('Success', 'Subscription reactivated successfully');
    } catch {
      Alert.alert('Error', 'Failed to reactivate subscription');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions();
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading subscriptions...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Subscriptions</Text>
        <Text style={styles.subtitle}>Manage your Cook Smart subscriptions</Text>
      </View>

      {subscriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
          <Text style={styles.emptyText}>
            You don't have any active subscriptions. Visit the pricing page to subscribe.
          </Text>
        </View>
      ) : (
        <View style={styles.subscriptionsList}>
          {subscriptions.map(subscription => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onCancel={handleCancelSubscription}
              onReactivate={handleReactivateSubscription}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  subscriptionsList: {
    padding: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});