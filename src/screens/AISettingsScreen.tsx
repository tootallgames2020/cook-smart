import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { aiPreferencesService } from '../services/aiPreferencesService';

interface AIFeature {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'voice' | 'photo' | 'planning' | 'family';
}

const AISettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<any>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const features: AIFeature[] = [
    {
      key: 'voice_commands',
      name: 'Voice Commands',
      description: 'Control the app with voice commands',
      icon: 'mic',
      category: 'voice'
    },
    {
      key: 'apex_voice_intelligence',
      name: 'Advanced Voice AI',
      description: 'Enhanced voice understanding and responses',
      icon: 'chat',
      category: 'voice'
    },
    {
      key: 'photo_analysis',
      name: 'Photo Analysis',
      description: 'Analyze food photos for ingredients',
      icon: 'camera-alt',
      category: 'photo'
    },
    {
      key: 'receipt_scanning',
      name: 'Receipt Scanning',
      description: 'Scan receipts to update inventory',
      icon: 'receipt',
      category: 'photo'
    },
    {
      key: 'auto_meal_planning',
      name: 'Auto Meal Planning',
      description: 'Generate meal plans automatically',
      icon: 'calendar-today',
      category: 'planning'
    },
    {
      key: 'predictive_analytics',
      name: 'Predictive Analytics',
      description: 'Predict ingredient needs and usage',
      icon: 'analytics',
      category: 'planning'
    },
    {
      key: 'family_coordination',
      name: 'Family Coordination',
      description: 'Coordinate meals with family members',
      icon: 'people',
      category: 'family'
    },
  ];

  const categories = [
    { key: 'voice', name: 'Voice Features', icon: 'mic', color: '#4ECDC4' },
    { key: 'photo', name: 'Photo Features', icon: 'camera-alt', color: '#45B7D1' },
    { key: 'planning', name: 'Planning Features', icon: 'calendar-today', color: '#F59E0B' },
    { key: 'family', name: 'Family Features', icon: 'people', color: '#10B981' },
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await aiPreferencesService.getUserPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Could not load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (featureName: string, enabled: boolean) => {
    try {
      setSaving(true);
      await aiPreferencesService.updatePreference(featureName, enabled);
      setPreferences((prev: any) => ({ ...prev, [featureName]: enabled }));
      
      // Show success feedback
      if (enabled) {
        Alert.alert('Feature Enabled', `${features.find(f => f.key === featureName)?.name} is now active!`);
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      Alert.alert('Error', 'Could not update setting');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategory(expandedCategory === categoryKey ? null : categoryKey);
  };

  const getCategoryFeatures = (categoryKey: string) => {
    return features.filter(feature => feature.category === categoryKey);
  };

  const getCategoryEnabledCount = (categoryKey: string) => {
    const categoryFeatures = getCategoryFeatures(categoryKey);
    return categoryFeatures.filter(feature => preferences[feature.key]).length;
  };

  if (loading) {
    return React.createElement(View, { style: styles.loadingContainer },
      React.createElement(ActivityIndicator, { size: "large", color: "#4ECDC4" }),
      React.createElement(Text, { style: styles.loadingText }, "Loading AI Settings...")
    );
  }

  return React.createElement(ScrollView, { style: styles.container },
    React.createElement(View, { style: styles.header },
      React.createElement(Icon, { name: "settings", size: 48, color: "#4ECDC4" }),
      React.createElement(Text, { style: styles.title }, "AI Features"),
      React.createElement(Text, { style: styles.subtitle }, "Customize your AI experience. All features are included FREE.")
    ),

    saving && React.createElement(View, { style: styles.savingIndicator },
      React.createElement(ActivityIndicator, { size: "small", color: "#4ECDC4" }),
      React.createElement(Text, { style: styles.savingText }, "Saving...")
    ),

    React.createElement(View, { style: styles.categoriesContainer },
      categories.map((category) => {
        const categoryFeatures = getCategoryFeatures(category.key);
        const enabledCount = getCategoryEnabledCount(category.key);
        const isExpanded = expandedCategory === category.key;

        return React.createElement(View, { key: category.key, style: styles.categorySection },
          React.createElement(TouchableOpacity, {
            style: styles.categoryHeader,
            onPress: () => toggleCategory(category.key)
          },
            React.createElement(View, { style: styles.categoryInfo },
              React.createElement(Icon, { name: category.icon, size: 24, color: category.color }),
              React.createElement(View, { style: styles.categoryText },
                React.createElement(Text, { style: styles.categoryName }, category.name),
                React.createElement(Text, { style: styles.categoryStatus }, `${enabledCount} of ${categoryFeatures.length} enabled`)
              )
            ),
            React.createElement(Icon, {
              name: isExpanded ? 'chevron-up-outline' : 'chevron-down-outline',
              size: 20,
              color: "#666"
            })
          ),

          isExpanded && React.createElement(View, { style: styles.featuresContainer },
            categoryFeatures.map((feature) =>
              React.createElement(View, { key: feature.key, style: styles.featureItem },
                React.createElement(View, { style: styles.featureInfo },
                  React.createElement(Icon, { name: feature.icon, size: 20, color: category.color }),
                  React.createElement(View, { style: styles.featureText },
                    React.createElement(Text, { style: styles.featureName }, feature.name),
                    React.createElement(Text, { style: styles.featureDescription }, feature.description)
                  )
                ),
                React.createElement(Switch, {
                  value: preferences[feature.key] || false,
                  onValueChange: (enabled) => updatePreference(feature.key, enabled),
                  trackColor: { false: '#E0E0E0', true: category.color },
                  thumbColor: preferences[feature.key] ? '#FFFFFF' : '#F4F3F4'
                })
              )
            )
          )
        );
      })
    ),

    // Family Management Section - only show if family coordination is enabled
    preferences['family_coordination'] && React.createElement(View, { style: styles.familyManagementSection },
      React.createElement(Text, { style: styles.sectionTitle }, "Family Management"),
      React.createElement(Text, { style: styles.sectionSubtitle }, "Manage your family coordination settings"),
      
      React.createElement(TouchableOpacity, {
        style: styles.familyManagementCard,
        onPress: () => (navigation as any).navigate('FamilyManagement')
      },
        React.createElement(Icon, { name: "people", size: 32, color: "#8B5CF6" }),
        React.createElement(View, { style: styles.familyManagementInfo },
          React.createElement(Text, { style: styles.familyManagementTitle }, "Manage Family"),
          React.createElement(Text, { style: styles.familyManagementDescription }, "Create or join a family, invite members, and coordinate shopping")
        ),
        React.createElement(Icon, { name: "chevron-forward", size: 20, color: "#666" })
      )
    ),

    React.createElement(View, { style: styles.aiScreensSection },
      React.createElement(Text, { style: styles.sectionTitle }, "Explore AI Features"),
      React.createElement(Text, { style: styles.sectionSubtitle }, "Test and explore individual AI capabilities"),
      
      React.createElement(View, { style: styles.aiScreensGrid },
        React.createElement(TouchableOpacity, {
          style: styles.aiScreenCard,
          onPress: () => (navigation as any).navigate('ApexIntelligence')
        },
          React.createElement(Icon, { name: "lightbulb", size: 32, color: "#9333EA" }),
          React.createElement(Text, { style: styles.aiScreenTitle }, "Apex Intelligence"),
          React.createElement(Text, { style: styles.aiScreenDescription }, "Advanced AI capabilities")
        ),

        React.createElement(TouchableOpacity, {
          style: styles.aiScreenCard,
          onPress: () => (navigation as any).navigate('MaintenanceBot')
        },
          React.createElement(Icon, { name: "build", size: 32, color: "#10B981" }),
          React.createElement(Text, { style: styles.aiScreenTitle }, "Maintenance Bot"),
          React.createElement(Text, { style: styles.aiScreenDescription }, "System monitoring & health")
        ),

        React.createElement(TouchableOpacity, {
          style: styles.aiScreenCard,
          onPress: () => (navigation as any).navigate('PredictiveAnalytics')
        },
          React.createElement(Icon, { name: "analytics", size: 32, color: "#F59E0B" }),
          React.createElement(Text, { style: styles.aiScreenTitle }, "Predictive Analytics"),
          React.createElement(Text, { style: styles.aiScreenDescription }, "Smart predictions & insights")
        ),

        React.createElement(TouchableOpacity, {
          style: styles.aiScreenCard,
          onPress: () => (navigation as any).navigate('AIMealPlanning')
        },
          React.createElement(Icon, { name: "restaurant", size: 32, color: "#3B82F6" }),
          React.createElement(Text, { style: styles.aiScreenTitle }, "AI Meal Planning"),
          React.createElement(Text, { style: styles.aiScreenDescription }, "Automated meal plans")
        ),

        React.createElement(TouchableOpacity, {
          style: styles.aiScreenCard,
          onPress: () => (navigation as any).navigate('VoiceDemo')
        },
          React.createElement(Icon, { name: "mic", size: 32, color: "#EC4899" }),
          React.createElement(Text, { style: styles.aiScreenTitle }, "Voice Demo"),
          React.createElement(Text, { style: styles.aiScreenDescription }, "Test voice commands")
        ),

        React.createElement(TouchableOpacity, {
          style: styles.aiScreenCard,
          onPress: () => (navigation as any).navigate('FamilyManagement')
        },
          React.createElement(Icon, { name: "people", size: 32, color: "#8B5CF6" }),
          React.createElement(Text, { style: styles.aiScreenTitle }, "Family Management"),
          React.createElement(Text, { style: styles.aiScreenDescription }, "Coordinate with family")
        )
      )
    ),

    React.createElement(View, { style: styles.footer },
      React.createElement(Text, { style: styles.footerText }, "🎉 All AI features are included FREE in your Cook Smart subscription!"),
      React.createElement(TouchableOpacity, {
        style: styles.resetButton,
        onPress: () => {
          Alert.alert(
            'Reset AI Settings',
            'This will disable all AI features. Are you sure?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Reset', 
                style: 'destructive',
                onPress: async () => {
                  try {
                    await aiPreferencesService.resetPreferences();
                    await loadPreferences();
                    Alert.alert('Success', 'AI settings have been reset');
                  } catch (error) {
                    Alert.alert('Error', 'Could not reset settings');
                  }
                }
              }
            ]
          );
        }
      },
        React.createElement(Text, { style: styles.resetButtonText }, "Reset All Settings")
      )
    )
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 15,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#E8F8F5',
  },
  savingText: {
    marginLeft: 8,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  categoriesContainer: {
    margin: 15,
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    flex: 1,
    marginLeft: 15,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  categoryStatus: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  featureInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    marginLeft: 12,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  aiScreensSection: {
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  aiScreensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aiScreenCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 100,
  },
  aiScreenTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  aiScreenDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  familyManagementSection: {
    margin: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  familyManagementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  familyManagementInfo: {
    flex: 1,
    marginLeft: 15,
  },
  familyManagementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  familyManagementDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

export default AISettingsScreen;