import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { maintenanceBotService } from '../services/maintenanceBotService';

interface SystemHealthMetrics {
  overall_health_score: number;
  api_response_times: { [endpoint: string]: number };
  database_performance: any;
  ai_model_accuracy: { [model: string]: number };
  error_rates: { [service: string]: number };
  resource_usage: any;
  user_satisfaction_score: number;
  last_updated: string;
}

interface SystemIssue {
  issue_id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: string;
  description: string;
  detected_at: string;
  auto_fixable: boolean;
  impact_assessment: string;
}

export const MaintenanceBotScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [botStatus, setBotStatus] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [currentIssues, setCurrentIssues] = useState<SystemIssue[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    loadBotData();
  }, []);

  const loadBotData = async () => {
    try {
      setLoading(true);
      
      // Load all bot data in parallel
      const [status, health, issues, performance] = await Promise.all([
        maintenanceBotService.getBotStatus(),
        maintenanceBotService.getSystemHealth(),
        maintenanceBotService.getCurrentIssues(),
        maintenanceBotService.getPerformanceMetrics(),
      ]);

      setBotStatus(status);
      setSystemHealth(health);
      setCurrentIssues(issues);
      setPerformanceData(performance);
    } catch (error) {
      console.error('Error loading bot data:', error);
      Alert.alert('Error', 'Could not load maintenance bot data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBotData();
    setRefreshing(false);
  };

  const startBot = async () => {
    try {
      await maintenanceBotService.startBot();
      Alert.alert('Success', 'Maintenance bot started successfully.');
      await loadBotData();
    } catch (error) {
      Alert.alert('Error', 'Could not start maintenance bot.');
    }
  };

  const runManualCheck = async () => {
    try {
      setLoading(true);
      await maintenanceBotService.runManualCheck();
      Alert.alert('Success', 'Manual system check completed.');
      await loadBotData();
    } catch (error) {
      Alert.alert('Error', 'Could not run manual check.');
    } finally {
      setLoading(false);
    }
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 0.9) return '#10B981'; // Green
    if (score >= 0.7) return '#F59E0B'; // Yellow
    if (score >= 0.5) return '#EF4444'; // Red
    return '#DC2626'; // Dark red
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'error';
      case 'error': return 'warning';
      case 'warning': return 'info';
      case 'info': return 'info-outline';
      default: return 'help-outline';
    }
  };

  const renderSystemHealthCard = () => {
    if (!systemHealth) return null;

    const healthScore = systemHealth.overall_health_score;
    const healthColor = getHealthScoreColor(healthScore);

    return (
      <View style={styles.healthCard}>
        <View style={styles.healthHeader}>
          <Text style={styles.cardTitle}>System Health</Text>
          <View style={[styles.healthBadge, { backgroundColor: healthColor }]}>
            <Text style={styles.healthScore}>{(healthScore * 100).toFixed(0)}%</Text>
          </View>
        </View>

        <View style={styles.healthMetrics}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{systemHealth.user_satisfaction_score.toFixed(1)}</Text>
            <Text style={styles.metricLabel}>User Satisfaction</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {Object.values(systemHealth.api_response_times).reduce((a, b) => a + b, 0) / Object.values(systemHealth.api_response_times).length}ms
            </Text>
            <Text style={styles.metricLabel}>Avg API Response</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {(Object.values(systemHealth.ai_model_accuracy).reduce((a, b) => a + b, 0) / Object.values(systemHealth.ai_model_accuracy).length * 100).toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>AI Accuracy</Text>
          </View>
        </View>

        <Text style={styles.lastUpdated}>
          Last updated: {new Date(systemHealth.last_updated).toLocaleString()}
        </Text>
      </View>
    );
  };

  const renderBotStatusCard = () => {
    if (!botStatus) return null;

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.cardTitle}>Bot Status</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: botStatus.is_running ? '#10B981' : '#EF4444' }
          ]}>
            <Text style={styles.statusText}>
              {botStatus.is_running ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.statusDetails}>
          <View style={styles.statusItem}>
            <Icon name="time-outline" size={16} color="#666" />
            <Text style={styles.statusItemText}>
              Uptime: {botStatus.uptime_hours || 0}h
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Icon name="construct-outline" size={16} color="#666" />
            <Text style={styles.statusItemText}>
              Actions: {botStatus.actions_performed || 0}
            </Text>
          </View>
          <View style={styles.statusItem}>
            <Icon name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.statusItemText}>
              Success Rate: {botStatus.success_rate || 0}%
            </Text>
          </View>
        </View>

        {!botStatus.is_running && (
          <TouchableOpacity style={styles.startButton} onPress={startBot}>
            <Icon name="play-outline" size={20} color="white" />
            <Text style={styles.startButtonText}>Start Bot</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCurrentIssues = () => {
    if (currentIssues.length === 0) {
      return (
        <View style={styles.noIssuesCard}>
            <Icon name="checkmark-circle-outline" size={48} color="#10B981" />
          <Text style={styles.noIssuesTitle}>All Systems Healthy</Text>
          <Text style={styles.noIssuesSubtitle}>No issues detected</Text>
        </View>
      );
    }

    return (
      <View style={styles.issuesSection}>
        <Text style={styles.sectionTitle}>Current Issues ({currentIssues.length})</Text>
        {currentIssues.map((issue) => (
          <View key={issue.issue_id} style={styles.issueCard}>
            <View style={styles.issueHeader}>
              <Icon 
                name={getSeverityIcon(issue.severity)} 
                size={20} 
                color={getSeverityColor(issue.severity)} 
              />
              <Text style={styles.issueComponent}>{issue.component}</Text>
              <View style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(issue.severity) }
              ]}>
                <Text style={styles.severityText}>{issue.severity.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.issueDescription}>{issue.description}</Text>
            <Text style={styles.issueImpact}>{issue.impact_assessment}</Text>
            <View style={styles.issueFooter}>
              <Text style={styles.issueTime}>
                {new Date(issue.detected_at).toLocaleString()}
              </Text>
              {issue.auto_fixable && (
                <View style={styles.autoFixBadge}>
                  <Text style={styles.autoFixText}>AUTO-FIXABLE</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPerformanceOverview = () => {
    if (!performanceData) return null;

    return (
      <View style={styles.performanceCard}>
        <Text style={styles.cardTitle}>Performance Overview</Text>
        
        <View style={styles.performanceGrid}>
          <View style={styles.performanceItem}>
            <Icon name="flash-outline" size={24} color="#4ECDC4" />
            <Text style={styles.performanceValue}>
              {performanceData.avg_response_time || 0}ms
            </Text>
            <Text style={styles.performanceLabel}>Avg Response</Text>
          </View>
          <View style={styles.performanceItem}>
            <Icon name="server-outline" size={24} color="#4ECDC4" />
            <Text style={styles.performanceValue}>
              {performanceData.memory_usage || 0}%
            </Text>
            <Text style={styles.performanceLabel}>Memory Usage</Text>
          </View>
          <View style={styles.performanceItem}>
            <Icon name="server-outline" size={24} color="#4ECDC4" />
            <Text style={styles.performanceValue}>
              {performanceData.cpu_usage || 0}%
            </Text>
            <Text style={styles.performanceLabel}>CPU Usage</Text>
          </View>
          <View style={styles.performanceItem}>
            <Icon name="cloud-outline" size={24} color="#4ECDC4" />
            <Text style={styles.performanceValue}>
              {performanceData.uptime || 0}%
            </Text>
            <Text style={styles.performanceLabel}>Uptime</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !systemHealth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading maintenance bot data...</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🤖 Maintenance Bot</Text>
        <Text style={styles.subtitle}>
          Autonomous system monitoring and self-healing capabilities
        </Text>
      </View>

      {/* System Health */}
      {renderSystemHealthCard()}

      {/* Bot Status */}
      {renderBotStatusCard()}

      {/* Current Issues */}
      {renderCurrentIssues()}

      {/* Performance Overview */}
      {renderPerformanceOverview()}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={runManualCheck}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Icon name="refresh-outline" size={20} color="white" />
          )}
          <Text style={styles.actionButtonText}>Run Manual Check</Text>
        </TouchableOpacity>
      </View>

      {/* Bot Capabilities */}
      <View style={styles.capabilitiesSection}>
        <Text style={styles.sectionTitle}>Bot Capabilities</Text>
        
        <View style={styles.capabilityList}>
          <View style={styles.capabilityItem}>
            <Icon name="heart-outline" size={20} color="#4ECDC4" />
            <Text style={styles.capabilityText}>Real-time system monitoring</Text>
          </View>
          <View style={styles.capabilityItem}>
            <Icon name="build-outline" size={20} color="#4ECDC4" />
            <Text style={styles.capabilityText}>Automatic error detection and repair</Text>
          </View>
          <View style={styles.capabilityItem}>
            <Icon name="settings-outline" size={20} color="#4ECDC4" />
            <Text style={styles.capabilityText}>Performance optimization</Text>
          </View>
          <View style={styles.capabilityItem}>
            <Icon name="bulb-outline" size={20} color="#4ECDC4" />
            <Text style={styles.capabilityText}>AI model updates and improvements</Text>
          </View>
          <View style={styles.capabilityItem}>
            <Icon name="shield-outline" size={20} color="#4ECDC4" />
            <Text style={styles.capabilityText}>Predictive maintenance</Text>
          </View>
          <View style={styles.capabilityItem}>
            <Icon name="book-outline" size={20} color="#4ECDC4" />
            <Text style={styles.capabilityText}>Self-learning from patterns</Text>
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
  healthCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  healthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  healthScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  statusDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItemText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  noIssuesCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noIssuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 12,
  },
  noIssuesSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  issuesSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  issueCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  issueComponent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  issueDescription: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 4,
  },
  issueImpact: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueTime: {
    fontSize: 10,
    color: '#666',
  },
  autoFixBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  autoFixText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  performanceCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  performanceItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 8,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 10,
  },
  capabilitiesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  capabilityList: {
    gap: 12,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  capabilityText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 12,
    flex: 1,
  },
});

export default MaintenanceBotScreen;