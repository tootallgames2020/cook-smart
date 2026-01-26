import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { aiPreferencesService } from '../services/aiPreferencesService';

interface AIPreference {
  feature_name: string;
  display_name: string;
  description: string;
  enabled: boolean;
  intelligence_level: 'minimal' | 'helpful' | 'genius';
  category: 'voice' | 'photo' | 'nutrition' | 'planning' | 'family';
}

export const AISettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AIPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAIPreferences();
  }, []);

  const loadAIPreferences = async () => {
    try {
      setLoading(true);
      const userPrefs = await aiPreferencesService.getUserPreferences();
      
      // Define all available AI features
      const allFeatures: AIPreference[] = [
        // Voice Features
        {
          feature_name: 'voice_commands',
          display_name: 'Voice Commands',
          description: 'Basic voice commands for hands-free cooking',
          enabled: userPrefs?.voice_commands || false,
          intelligence_level: userPrefs?.voice_intelligence_level || 'helpful',
          category: 'voice',
        },
        {
          feature_name: 'apex_voice_intelligence',
          display_name: 'Apex Voice Intelligence',
          description: 'Advanced AI voice processing with contextual understanding',
          enabled: userPrefs?.apex_voice_intelligence || false,
          intelligence_level: userPrefs?.voice_intelligence_level || 'helpful',
          category: 'voice',
        },
        
        // Photo Features
        {
          feature_name: 'photo_analysis',
          display_name: 'Photo Analysis',
          description: 'Analyze food photos for ingredients and nutrition',
          enabled: userPrefs?.photo_analysis || false,
          intelligence_level: userPrefs?.photo_intelligence_level || 'helpful',
          category: 'photo',
        },
        {
          feature_name: 'receipt_scanning',
          display_name: 'Receipt Scanning',
          description: 'Scan grocery receipts to update inventory',
          enabled: userPrefs?.receipt_scanning || false,
          intelligence_level: userPrefs?.photo_intelligence_level || 'helpful',
          category: 'photo',
        },
        
        // Nutrition Features
        {
          feature_name: 'nutrition_coaching',
          display_name: 'Nutrition Coaching',
          description: 'Personalized nutrition advice and tracking',
          enabled: userPrefs?.nutrition_coaching || false,
          intelligence_level: userPrefs?.nutrition_intelligence_level || 'helpful',
          category: 'nutrition',
        },
        {
          feature_name: 'meal_optimization',
          display_name: 'Meal Optimization',
          description: 'AI-powered meal planning and optimization',
          enabled: userPrefs?.meal_optimization || false,
          intelligence_level: userPrefs?.nutrition_intelligence_level || 'helpful',
          category: 'nutrition',
        },
        
        // Planning Features
        {
          feature_name: 'auto_meal_planning',
          display_name: 'Auto Meal Planning',
          description: 'Automatic weekly meal plan generation',
          enabled: userPrefs?.auto_meal_planning || false,
          intelligence_level: userPrefs?.planning_intelligence_level || 'helpful',
          category: 'planning',
        },
        {
          feature_name: 'predictive_analytics',
          display_name: 'Predictive Analytics',
          description: 'Predict consumption patterns and optimize shopping',
          enabled: userPrefs?.predictive_analytics || false,
          intelligence_level: userPrefs?.planning_intelligence_level || 'helpful',
          category: 'planning',
        },
        
        // Family Features
        {
          feature_name: 'family_coordination',
          display_name: 'Family Coordination',
          description: 'Smart family meal coordination and notifications',
          enabled: userPrefs?.family_coordination || false,
          intelligence_level: userPrefs?.family_intelligence_level || 'helpful',
          category: 'family',
        },
      ];

      setPreferences(allFeatures);
    } catch (error) {
      console.error('Error loading AI preferences:', error);
      Alert.alert('Error', 'Could not load AI settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (featureName: string, enabled: boolean) => {
    try {
      setSaving(true);
      await aiPreferencesService.updatePreference(featureName, enabled);
      
      setPreferences(prev => 
        prev.map(pref => 
          pref.feature_name === featureName 
            ? { ...pref, enabled }
            : pref
        )
      );
    } catch (error) {
      console.error('Error updating preference:', error);
      Alert.alert('Error', 'Could not update setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateIntelligenceLevel = async (category: string, level: 'minimal' | 'helpful' | 'genius') => {
    try {
      setSaving(true);
      await aiPreferencesService.updateIntelligenceLevel(category, level);
      
      setPreferences(prev => 
        prev.map(pref => 
          pref.category === category 
            ? { ...pref, intelligence_level: level }
            : pref
        )
      );
    } catch (error) {
      console.error('Error updating intelligence level:', error);
      Alert.alert('Error', 'Could not update intelligence level. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderIntelligenceLevelSelector = (category: string, currentLevel: string) => {
    const levels = [
      { key: 'minimal', label: 'Minimal', description: 'Basic features only' },
      { key: 'helpful', label: 'Helpful', description: 'Balanced AI assistance' },
      { key: 'genius', label: 'Genius', description: 'Maximum AI intelligence' },
    ];

    return (
      <View style={styles.intelligenceLevelContainer}>
        <Text style={styles.intelligenceLevelTitle}>Intelligence Level</Text>
        <View style={styles.levelButtons}>
          {levels.map((level) => (
            <TouchableOpacity
              key={level.key}
              style={[
                styles.levelButton,
                currentLevel === level.key && styles.levelButtonActive,
              ]}
              onPress={() => updateIntelligenceLevel(category, level.key as any)}
            >
              <Text style={[
                styles.levelButtonText,
                currentLevel === level.key && styles.levelButtonTextActive,
              ]}>
                {level.label}
              </Text>
              <Text style={[
                styles.levelButtonDescription,
                currentLevel === level.key && styles.levelButtonDescriptionActive,
              ]}>
                {level.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderFeatureCategory = (category: string, categoryPrefs: AIPreference[]) => {
    const categoryIcons = {
      voice: 'mic-outline',
      photo: 'camera-outline',
      nutrition: 'nutrition-outline',
      planning: 'calendar-outline',
      family: 'people-outline',
    };

    const categoryTitles = {
      voice: 'Voice Features',
      photo: 'Photo Analysis',
      nutrition: 'Nutrition Intelligence',
      planning: 'Meal Planning',
      family: 'Family Coordination',
    };

    return (
      <View key={category} style={styles.categoryContainer}>
        <View style={styles.categoryHeader}>
          <Ionicons 
            name={categoryIcons[category as keyof typeof categoryIcons] as any} 
            size={24} 
            color="#4ECDC4" 
          />
          <Text style={styles.categoryTitle}>
            {categoryTitles[category as keyof typeof categoryTitles]}
          </Text>
        </View>

        {categoryPrefs.map((pref) => (
          <View key={pref.feature_name} style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Text style={styles.preferenceName}>{pref.display_name}</Text>
              <Text style={styles.preferenceDescription}>{pref.description}</Text>
            </View>
            <Switch
              value={pref.enabled}
              onValueChange={(enabled) => updatePreference(pref.feature_name, enabled)}
              trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
              thumbColor={pref.enabled ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        ))}

        {categoryPrefs.some(p => p.enabled) && 
          renderIntelligenceLevelSelector(category, categoryPrefs[0]?.intelligence_level || 'helpful')
        }
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading AI Settings...</Text>
      </View>
    );
  }

  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) {
      acc[pref.category] = [];
    }
    acc[pref.category].push(pref);
    return acc;
  }, {} as Record<string, AIPreference[]>);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Features</Text>
        <Text style={styles.subtitle}>
          Customize your AI experience. All features are included FREE in your subscription.
        </Text>
      </View>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color="#4ECDC4" />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      {Object.entries(groupedPreferences).map(([category, categoryPrefs]) =>
        renderFeatureCategory(category, categoryPrefs)
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🎉 All AI features are included FREE in your Cook Smart subscription!
        </Text>
        <Text style={styles.footerSubtext}>
          Enable the features you want and set your preferred intelligence level.
        </Text>
      </View>
    </ScrollView>
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  categoryContainer: {
    backgroundColor: 'white',
    marginTop: 15,
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 10,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 15,
  },
  preferenceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  intelligenceLevelContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  intelligenceLevelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  levelButtonActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#E8F8F5',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  levelButtonTextActive: {
    color: '#4ECDC4',
  },
  levelButtonDescription: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  levelButtonDescriptionActive: {
    color: '#4ECDC4',
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
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default AISettingsScreen;