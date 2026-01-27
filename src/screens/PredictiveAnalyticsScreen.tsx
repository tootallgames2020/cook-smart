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
import { predictiveAnalyticsService } from '../services/predictiveAnalyticsService';

interface PredictiveAnalysisResult {
  success: boolean;
  analysis_type: string;
  time_horizon_days: number;
  generated_at: string;
  confidence: number;
  predictions: any;
  recommendations: string[];
  data_quality_score: number;
  model_accuracy: number;
}

export const PredictiveAnalyticsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<PredictiveAnalysisResult[]>([]);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('consumption');

  const analysisTypes = [
    { key: 'consumption', title: 'Consumption Patterns', icon: 'trending-up', description: 'Predict when ingredients will run out' },
    { key: 'shopping', title: 'Shopping Optimization', icon: 'shopping-cart', description: 'Optimize shopping schedules and bulk purchases' },
    { key: 'waste', title: 'Waste Prevention', icon: 'delete-sweep', description: 'Prevent food waste with smart predictions' },
    { key: 'budget', title: 'Budget Forecasting', icon: 'account-balance-wallet', description: 'Predict spending and optimize costs' },
    { key: 'seasonal', title: 'Seasonal Trends', icon: 'wb-sunny', description: 'Seasonal ingredient and price patterns' },
    { key: 'family_insights', title: 'Family Insights', icon: 'family-restroom', description: 'Family consumption and coordination patterns' },
  ];

  useEffect(() => {
    loadAnalysisResults();
  }, []);

  const loadAnalysisResults = async () => {
    try {
      setLoading(true);
      const results = await predictiveAnalyticsService.getAnalysisHistory();
      setAnalysisResults(results);
    } catch (error) {
      console.error('Error loading analysis results:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (analysisType: string) => {
    try {
      setLoading(true);
      
      const request = {
        analysis_type: analysisType as any,
        time_horizon_days: 30,
        include_confidence_intervals: true,
      };

      const result = await predictiveAnalyticsService.generatePredictiveAnalysis(request);
      
      Alert.alert(
        'Analysis Complete!',
        `${analysisType} analysis completed with ${(result.confidence * 100).toFixed(1)}% confidence.`,
        [{ text: 'View Results', onPress: () => showAnalysisResults(result) }]
      );

      await loadAnalysisResults();
    } catch (error) {
      console.error('Error running analysis:', error);
      Alert.alert('Error', 'Could not run analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showAnalysisResults = (result: PredictiveAnalysisResult) => {
    const recommendations = result.recommendations.slice(0, 3).join('\n\n');
    Alert.alert(
      `${result.analysis_type} Analysis`,
      `Confidence: ${(result.confidence * 100).toFixed(1)}%\nData Quality: ${(result.data_quality_score * 100).toFixed(1)}%\n\nTop Recommendations:\n\n${recommendations}`,
      [{ text: 'OK' }]
    );
  };

  const renderAnalysisTypeCard = (analysisType: any) => (
    <TouchableOpacity
      key={analysisType.key}
      style={[
        styles.analysisCard,
        selectedAnalysisType === analysisType.key && styles.selectedCard
      ]}
      onPress={() => setSelectedAnalysisType(analysisType.key)}
    >
      <View style={styles.cardHeader}>
        <Icon 
          name={analysisType.icon} 
          size={24} 
          color={selectedAnalysisType === analysisType.key ? '#4ECDC4' : '#666'} 
        />
        <Text style={[
          styles.cardTitle,
          selectedAnalysisType === analysisType.key && styles.selectedCardTitle
        ]}>
          {analysisType.title}
        </Text>
      </View>
      <Text style={styles.cardDescription}>{analysisType.description}</Text>
    </TouchableOpacity>
  );

  const renderRecentAnalysis = (result: PredictiveAnalysisResult, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.resultCard}
      onPress={() => showAnalysisResults(result)}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>
          {result.analysis_type.replace('_', ' ').toUpperCase()}
        </Text>
        <Text style={styles.resultDate}>
          {new Date(result.generated_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.resultMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{(result.confidence * 100).toFixed(0)}%</Text>
          <Text style={styles.metricLabel}>Confidence</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{(result.data_quality_score * 100).toFixed(0)}%</Text>
          <Text style={styles.metricLabel}>Data Quality</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{result.recommendations.length}</Text>
          <Text style={styles.metricLabel}>Recommendations</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && analysisResults.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading predictive analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Predictive Analytics</Text>
        <Text style={styles.subtitle}>
          AI-powered insights to optimize your cooking, shopping, and meal planning
        </Text>
      </View>

      {/* Analysis Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose Analysis Type</Text>
        <View style={styles.analysisGrid}>
          {analysisTypes.map(renderAnalysisTypeCard)}
        </View>
      </View>

      {/* Run Analysis Button */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.runButton, loading && styles.disabledButton]}
          onPress={() => runAnalysis(selectedAnalysisType)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Icon name="analytics" size={24} color="white" />
          )}
          <Text style={styles.runButtonText}>
            {loading ? 'Running Analysis...' : 'Run Analysis'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Analysis Results */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Analysis</Text>
        
        {analysisResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="analytics" size={60} color="#E0E0E0" />
            <Text style={styles.emptyTitle}>No Analysis Yet</Text>
            <Text style={styles.emptySubtitle}>
              Run your first predictive analysis to get AI-powered insights
            </Text>
          </View>
        ) : (
          analysisResults.slice(0, 5).map(renderRecentAnalysis)
        )}
      </View>

      {/* Features Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What You'll Get</Text>
        
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Icon name="schedule" size={20} color="#4ECDC4" />
            <Text style={styles.featureText}>Consumption forecasting and depletion alerts</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="shopping-basket" size={20} color="#4ECDC4" />
            <Text style={styles.featureText}>Optimal shopping schedules and bulk discounts</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="eco" size={20} color="#4ECDC4" />
            <Text style={styles.featureText}>Waste prevention strategies and cost savings</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="trending-up" size={20} color="#4ECDC4" />
            <Text style={styles.featureText}>Budget optimization and spending forecasts</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="wb-sunny" size={20} color="#4ECDC4" />
            <Text style={styles.featureText}>Seasonal trends and price predictions</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="people" size={20} color="#4ECDC4" />
            <Text style={styles.featureText}>Family coordination and efficiency insights</Text>
          </View>
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
  analysisGrid: {
    gap: 12,
  },
  analysisCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  selectedCard: {
    borderColor: '#4ECDC4',
    backgroundColor: '#E8F8F5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 12,
  },
  selectedCardTitle: {
    color: '#4ECDC4',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#B0B0B0',
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 10,
  },
  resultCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  resultDate: {
    fontSize: 12,
    color: '#666',
  },
  resultMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 15,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  featureList: {
    gap: 12,
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
  },
});

export default PredictiveAnalyticsScreen;