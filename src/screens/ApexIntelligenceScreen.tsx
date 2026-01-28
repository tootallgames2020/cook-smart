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

    Alert.alert(
      capability.name,
      capability.description,
      [{ text: 'OK' }]
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
                    {capability.status === 'coming_soon' ? 'Coming Soon' : 'Tap to explore'}
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