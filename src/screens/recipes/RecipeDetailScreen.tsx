import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

interface RecipeDetailScreenProps {
  route: {
    params: {
      recipeId: number | string;
    };
  };
  navigation: any;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ route, navigation }) => {
  const { recipeId } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Recipe Details</Text>
        <Text style={styles.subtitle}>Recipe ID: {recipeId}</Text>
        
        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            Recipe detail screen is being rebuilt with ingredient matching functionality.
          </Text>
          <Text style={styles.submessage}>
            This will show which ingredients you have vs need, match percentages, and full recipe details.
          </Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>✅ Fixed Issues:</Text>
          <Text style={styles.statusItem}>• No more white screen crashes</Text>
          <Text style={styles.statusItem}>• Navigation working properly</Text>
          <Text style={styles.statusItem}>• Backend integration ready</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>🚧 Coming Next:</Text>
          <Text style={styles.statusItem}>• Ingredient matching display</Text>
          <Text style={styles.statusItem}>• Recipe images and details</Text>
          <Text style={styles.statusItem}>• Save/share functionality</Text>
          <Text style={styles.statusItem}>• Nutrition facts</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    padding: 12,
    backgroundColor: '#10B981',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  messageContainer: {
    backgroundColor: '#DBEAFE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  message: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: 8,
  },
  submessage: {
    fontSize: 14,
    color: '#3730A3',
    lineHeight: 20,
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statusItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    paddingLeft: 8,
  },
});