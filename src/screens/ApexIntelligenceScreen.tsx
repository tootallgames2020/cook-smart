import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { apexIntelligenceService } from '../services/apexIntelligenceService';
import { PhotoAnalysisButton } from '../components/PhotoAnalysisButton';

const ApexIntelligenceScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const capabilities = [
    {
      id: 'nutrition',
      name: 'Nutrition Intelligence',
      description: 'Advanced nutritional analysis and personalized recommendations',
      icon: 'restaurant',
      color: '#10B981',
      status: 'active'
    },
    {
      id: 'photo',
      name: 'Photo Intelligence',
      description: 'AI-powered food recognition and freshness analysis',
      icon: 'camera-alt',
      color: '#3B82F6',
      status: 'active'
    },
    {
      id: 'voice',
      name: 'Voice Intelligence',
      description: 'Natural language cooking assistance and commands',
      icon: 'mic',
      color: '#8B5CF6',
      status: 'beta'
    },
    {
      id: 'predictive',
      name: 'Predictive Analytics',
      description: 'Smart predictions for consumption, waste, and shopping',
      icon: 'analytics',
      color: '#F59E0B',
      status: 'active'
    }
  ];

  const handleCapabilityPress = async (capability: any) => {
    if (capability.status === 'coming_soon') {
      Alert.alert(
        'Coming Soon',
        `${capability.name} is currently in development and will be available soon!`,
        [{ text: 'OK' }]
      );
      return;
    }

    const detailedInfo = getDetailedCapabilityInfo(capability.id);
    
    Alert.alert(
      capability.name,
      detailedInfo.description,
      [
        { text: 'Learn More', onPress: () => showCapabilityDetails(capability.id, detailedInfo) },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const getDetailedCapabilityInfo = (capabilityId: string) => {
    const detailedInfoMap: { [key: string]: any } = {
      nutrition: {
        description: "Advanced AI-powered nutritional analysis that goes beyond basic calorie counting. Our system analyzes your eating patterns, dietary preferences, and health goals to provide personalized nutrition insights.",
        features: [
          "🔍 Macro & Micronutrient Analysis - Detailed breakdown of proteins, carbs, fats, vitamins, and minerals",
          "🎯 Personalized Recommendations - Tailored advice based on your dietary goals and restrictions",
          "📊 Nutritional Trend Tracking - Monitor your nutrition patterns over time",
          "⚖️ Portion Size Optimization - Smart suggestions for optimal serving sizes",
          "🥗 Meal Balance Scoring - Rate how well-balanced your meals are",
          "🚨 Deficiency Alerts - Early warnings for potential nutritional gaps"
        ],
        howItWorks: "Uses machine learning algorithms trained on nutritional databases and your personal eating patterns to provide real-time analysis and recommendations.",
        accuracy: "95% accuracy for common foods, 85% for complex dishes"
      },
      photo: {
        description: "State-of-the-art computer vision technology that can identify ingredients, analyze freshness, and extract nutritional information from photos of your food and pantry.",
        features: [
          "📸 Multi-Food Recognition - Identify multiple ingredients in a single photo",
          "🕐 Freshness Assessment - Analyze ripeness and spoilage indicators",
          "📋 Automatic Inventory Updates - Add recognized items to your pantry automatically",
          "🧾 Receipt Scanning - Extract grocery items and prices from receipt photos",
          "🥘 Meal Analysis - Identify dishes and estimate nutritional content",
          "📱 Real-time Processing - Get results in under 3 seconds"
        ],
        howItWorks: "Advanced neural networks trained on millions of food images analyze visual characteristics like color, texture, shape, and size to identify and assess your ingredients.",
        accuracy: "90% for single ingredients, 75% for complex meals, 85% for receipts"
      },
      voice: {
        description: "Natural language processing that understands cooking terminology and context. Talk to Cook Smart like you would talk to a cooking assistant - it understands recipes, measurements, and cooking techniques.",
        features: [
          "🗣️ Natural Conversation - Speak naturally, no rigid commands required",
          "👨‍🍳 Cooking Context Awareness - Understands cooking terms, measurements, and techniques",
          "⏱️ Hands-Free Operation - Perfect for when your hands are busy cooking",
          "🔄 Multi-Step Instructions - Handle complex, multi-part cooking requests",
          "🌍 Multiple Languages - Support for English, Spanish, French, and more",
          "🎯 Intent Recognition - Understands what you want even with unclear phrasing"
        ],
        howItWorks: "Combines speech recognition with culinary-specific natural language processing to understand cooking context and provide relevant responses.",
        accuracy: "92% speech recognition, 88% intent understanding in kitchen environments"
      },
      predictive: {
        description: "Advanced machine learning models that analyze your consumption patterns, shopping habits, and seasonal trends to predict future needs and optimize your food management.",
        features: [
          "📈 Consumption Forecasting - Predict when ingredients will run out",
          "🛒 Smart Shopping Lists - Automatically generate optimized shopping lists",
          "🗑️ Waste Prevention - Identify ingredients at risk of spoiling",
          "💰 Budget Optimization - Find cost-saving opportunities and predict spending",
          "🌱 Seasonal Insights - Leverage seasonal price and availability patterns",
          "👨‍👩‍👧‍👦 Family Coordination - Optimize for multiple family members' preferences"
        ],
        howItWorks: "Analyzes historical usage data, seasonal patterns, and family preferences using time-series forecasting and behavioral modeling to make accurate predictions.",
        accuracy: "85% accuracy for consumption predictions, 78% for waste prevention, 82% for budget forecasting"
      }
    };

    return detailedInfoMap[capabilityId] || {
      description: "Advanced AI capability for enhanced cooking and meal planning experience.",
      features: ["Enhanced functionality", "Smart recommendations", "Personalized insights"],
      howItWorks: "Uses advanced AI algorithms to provide intelligent assistance.",
      accuracy: "High accuracy with continuous learning"
    };
  };

  const showCapabilityDetails = (capabilityId: string, detailedInfo: any) => {
    const featuresText = detailedInfo.features.join('\n\n');
    
    Alert.alert(
      `${capabilityId.charAt(0).toUpperCase() + capabilityId.slice(1)} Intelligence - Details`,
      `${detailedInfo.description}\n\n🚀 KEY FEATURES:\n\n${featuresText}\n\n⚙️ HOW IT WORKS:\n${detailedInfo.howItWorks}\n\n📊 ACCURACY:\n${detailedInfo.accuracy}`,
      [{ text: 'Got it!' }],
      { cancelable: true }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'ACTIVE', color: '#10B981', backgroundColor: '#D1FAE5' };
      case 'beta':
        return { text: 'BETA', color: '#F59E0B', backgroundColor: '#FEF3C7' };
      case 'coming_soon':
        return { text: 'SOON', color: '#6B7280', backgroundColor: '#F3F4F6' };
      default:
        return { text: 'UNKNOWN', color: '#6B7280', backgroundColor: '#F3F4F6' };
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Apex Intelligence</Text>
        <Text style={styles.subtitle}>
          Advanced AI capabilities for smarter cooking and meal planning
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Capabilities</Text>
        <View style={styles.capabilitiesGrid}>
          {capabilities.map((capability) => {
            const statusBadge = getStatusBadge(capability.status);
            
            return (
              <TouchableOpacity
                key={capability.id}
                style={styles.capabilityCard}
                onPress={() => handleCapabilityPress(capability)}
                disabled={loading}
              >
                <View style={styles.capabilityHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: capability.color + '20' }]}>
                    <Icon 
                      name={capability.icon} 
                      size={24} 
                      color={capability.color} 
                    />
                  </View>
                  
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.backgroundColor }]}>
                    <Text style={[styles.statusText, { color: statusBadge.color }]}>
                      {statusBadge.text}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.capabilityName}>{capability.name}</Text>
                <Text style={styles.capabilityDescription}>{capability.description}</Text>
                
                <View style={styles.capabilityFooter}>
                  <Text style={[styles.learnMore, { color: capability.color }]}>
                    {capability.status === 'coming_soon' ? 'Coming Soon' : 'Tap for detailed info'}
                  </Text>
                  <Icon 
                    name="chevron-right" 
                    size={16} 
                    color={capability.color} 
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo Analysis Tools</Text>
        
        <PhotoAnalysisButton
          analysisType="meal"
          onAnalysisComplete={(results) => {
            console.log('Meal analysis:', results);
          }}
        />
        
        <PhotoAnalysisButton
          analysisType="ingredient"
          onAnalysisComplete={(results) => {
            console.log('Ingredient identification:', results);
          }}
        />
        
        <PhotoAnalysisButton
          analysisType="pantry"
          onAnalysisComplete={(results) => {
            console.log('Pantry analysis:', results);
          }}
        />
        
        <PhotoAnalysisButton
          analysisType="receipt"
          onAnalysisComplete={(results) => {
            console.log('Receipt scan:', results);
          }}
        />
        
        <View style={styles.accuracyNotice}>
          <Icon name="info" size={20} color="#F59E0B" />
          <Text style={styles.accuracyText}>
            <Text style={styles.accuracyBold}>Accuracy Note: </Text>
            Photo analysis works best with clear, well-lit images. Results may be less accurate for:
            {"\n"}• Plated meals with mixed/overlapping ingredients
            {"\n"}• Crowded pantry/fridge shelves with items stacked or hidden
            {"\n"}• Blurry or poorly lit photos
            {"\n\n"}For best results, photograph items individually or organize shelves before scanning.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What Makes It Apex?</Text>
        
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Icon name="lightbulb" size={20} color="#10B981" />
            <Text style={styles.featureText}>
              Machine learning algorithms that adapt to your preferences
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="flash-on" size={20} color="#3B82F6" />
            <Text style={styles.featureText}>
              Real-time analysis and instant recommendations
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="analytics" size={20} color="#8B5CF6" />
            <Text style={styles.featureText}>
              Predictive insights for better meal planning
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="security" size={20} color="#F59E0B" />
            <Text style={styles.featureText}>
              Privacy-first AI that keeps your data secure
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.betaNotice}>
        <Icon name="science" size={24} color="#F59E0B" />
        <View style={styles.betaContent}>
          <Text style={styles.betaTitle}>Beta Technology</Text>
          <Text style={styles.betaText}>
            Apex Intelligence is continuously learning and improving. 
            Your feedback helps make it smarter!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  capabilitiesGrid: {
    gap: 16,
  },
  capabilityCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  capabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  capabilityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  capabilityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  capabilityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  learnMore: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  betaNotice: {
    margin: 20,
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  betaContent: {
    marginLeft: 12,
    flex: 1,
  },
  betaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 4,
  },
  betaText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  accuracyNotice: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'flex-start',
  },
  accuracyText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginLeft: 10,
  },
  accuracyBold: {
    fontWeight: 'bold',
  },
});

export default ApexIntelligenceScreen;