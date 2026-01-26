import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { PaymentMethodCard } from '../components/PaymentMethodCard';
import { paymentService } from '../services/paymentService';

interface PaymentMethod {
  id: string;
  type: 'card';
  last4: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover';
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export const PaymentMethodsScreen: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPaymentMethods = async (): Promise<void> => {
    try {
      setLoading(true);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string): Promise<void> => {
    try {
      await paymentService.setDefaultPaymentMethod(paymentMethodId);
      
      setPaymentMethods(prev => 
        prev.map(method => ({
          ...method,
          isDefault: method.id === paymentMethodId
        }))
      );
      
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string): Promise<void> => {
    const method = paymentMethods.find(m => m.id === paymentMethodId);
    
    if (method?.isDefault && paymentMethods.length > 1) {
      Alert.alert(
        'Cannot Delete',
        'You cannot delete your default payment method. Please set another card as default first.'
      );
      return;
    }

    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentService.deletePaymentMethod(paymentMethodId);
              setPaymentMethods(prev => prev.filter(m => m.id !== paymentMethodId));
              Alert.alert('Success', 'Payment method removed');
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to remove payment method');
            }
          }
        }
      ]
    );
  };

  const handleAddPaymentMethod = (): void => {
    Alert.alert(
      'Add Payment Method', 
      'To add a new payment method, please make a new subscription or update your subscription. This will allow you to add and save a new card.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading payment methods...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Methods</Text>
        <Text style={styles.subtitle}>Manage your saved payment methods</Text>
      </View>

      <View style={styles.content}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyText}>
              Add a payment method by subscribing to a plan. Your payment method will be saved for future use.
            </Text>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map(method => (
              <PaymentMethodCard
                key={method.id}
                paymentMethod={method}
                onSetDefault={handleSetDefault}
                onDelete={handleDeletePaymentMethod}
              />
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddPaymentMethod}
        >
          <Text style={styles.addButtonText}>+ Add Payment Method</Text>
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Payment Method Info</Text>
          <Text style={styles.infoText}>
            Your default payment method is used for subscription renewals.{'\n'}
            All payment information is securely encrypted by Stripe.{'\n'}
            You can update or remove methods anytime.{'\n'}
            During BETA, no charges will be made to saved cards.
          </Text>
        </View>
      </View>
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
  content: {
    padding: 16,
  },
  methodsList: {
    marginBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  addButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});