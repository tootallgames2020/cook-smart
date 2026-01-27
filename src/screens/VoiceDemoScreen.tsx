import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import VoiceCommandButton from '../components/VoiceCommandButton';
import voiceService from '../services/voiceService';

export const VoiceDemoScreen: React.FC = () => {
  const [lastCommand, setLastCommand] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');

  const handleVoiceCommand = async (command: string) => {
    try {
      setLastCommand(command);
      setLastResponse('Processing...');
      
      const response = await voiceService.processTextAsVoice(command, false);
      
      if (response.success) {
        setLastResponse(response.response_text);
      } else {
        setLastResponse(`Error: ${response.response_text}`);
      }
    } catch (error) {
      console.error('Voice command error:', error);
      setLastResponse('Failed to process command');
    }
  };

  const tryQuickCommand = async (command: string) => {
    await handleVoiceCommand(command);
  };

  const quickCommands = voiceService.getQuickCommands();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="mic" size={48} color="#4ECDC4" />
        <Text style={styles.title}>Voice Commands Demo</Text>
        <Text style={styles.subtitle}>
          Try speaking or tap the quick commands below
        </Text>
      </View>

      {/* Voice Button */}
      <View style={styles.voiceSection}>
        <VoiceCommandButton
          onVoiceCommand={handleVoiceCommand}
          size="large"
          position="inline"
        />
        <Text style={styles.voiceInstructions}>
          Tap the microphone and speak your command
        </Text>
      </View>

      {/* Last Command & Response */}
      {lastCommand && (
        <View style={styles.responseSection}>
          <View style={styles.commandCard}>
            <Text style={styles.commandLabel}>You said:</Text>
            <Text style={styles.commandText}>"{lastCommand}"</Text>
          </View>
          
          {lastResponse && (
            <View style={styles.responseCard}>
              <Text style={styles.responseLabel}>Cook Smart responded:</Text>
              <Text style={styles.responseText}>{lastResponse}</Text>
            </View>
          )}
        </View>
      )}

      {/* Quick Commands */}
      <View style={styles.quickCommandsSection}>
        <Text style={styles.sectionTitle}>Quick Commands to Try</Text>
        <Text style={styles.sectionSubtitle}>
          Tap any command below to test it
        </Text>
        
        {quickCommands.map((cmd, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickCommandCard}
            onPress={() => tryQuickCommand(cmd.command)}
          >
            <View style={styles.quickCommandContent}>
              <Text style={styles.quickCommandLabel}>{cmd.label}</Text>
              <Text style={styles.quickCommandText}>"{cmd.command}"</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Voice Tips */}
      <View style={styles.tipsSection}>
        <Text style={styles.sectionTitle}>Voice Command Tips</Text>
        
        <View style={styles.tipCard}>
          <Icon name="bulb-outline" size={24} color="#F59E0B" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Speak Naturally</Text>
            <Text style={styles.tipText}>
              Use natural language like "Add milk to shopping list" or "How much chicken do we have?"
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Icon name="shield-checkmark-outline" size={24} color="#10B981" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Privacy First</Text>
            <Text style={styles.tipText}>
              Voice commands are processed locally for privacy. No audio is stored or sent to servers.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Icon name="settings-outline" size={24} color="#6366F1" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Customize Settings</Text>
            <Text style={styles.tipText}>
              Go to Profile → AI Features to enable advanced voice intelligence and other AI features.
            </Text>
          </View>
        </View>

        <View style={styles.tipCard}>
          <Icon name="hand-left-outline" size={24} color="#EC4899" />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Hands-Free Cooking</Text>
            <Text style={styles.tipText}>
              Perfect for when your hands are busy cooking. Just say "Hey Cook Smart" and your command.
            </Text>
          </View>
        </View>
      </View>

      {/* Feature Showcase */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>What Voice Commands Can Do</Text>
        
        <View style={styles.featureGrid}>
          <View style={styles.featureCard}>
            <Icon name="restaurant-outline" size={32} color="#FF6B6B" />
            <Text style={styles.featureTitle}>Ingredient Management</Text>
            <Text style={styles.featureText}>
              "I used 2 cups flour" updates your inventory
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="list-outline" size={32} color="#4ECDC4" />
            <Text style={styles.featureTitle}>Shopping Lists</Text>
            <Text style={styles.featureText}>
              "Add milk to shopping list" instantly adds items
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="search-outline" size={32} color="#45B7D1" />
            <Text style={styles.featureTitle}>Recipe Search</Text>
            <Text style={styles.featureText}>
              "Find chicken recipes" searches your preferences
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="timer-outline" size={32} color="#F59E0B" />
            <Text style={styles.featureTitle}>Kitchen Timers</Text>
            <Text style={styles.featureText}>
              "Set timer for 15 minutes" manages cooking times
            </Text>
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
  voiceSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    marginTop: 10,
  },
  voiceInstructions: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  responseSection: {
    margin: 15,
  },
  commandCard: {
    backgroundColor: '#E8F8F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  commandLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4ECDC4',
    marginBottom: 5,
  },
  commandText: {
    fontSize: 16,
    color: '#2C3E50',
    fontStyle: 'italic',
  },
  responseCard: {
    backgroundColor: '#F0F9FF',
    padding: 15,
    borderRadius: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#45B7D1',
    marginBottom: 5,
  },
  responseText: {
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 22,
  },
  quickCommandsSection: {
    margin: 15,
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
    marginBottom: 15,
  },
  quickCommandCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickCommandContent: {
    flex: 1,
  },
  quickCommandLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  quickCommandText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  tipsSection: {
    margin: 15,
  },
  tipCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipContent: {
    flex: 1,
    marginLeft: 15,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  featuresSection: {
    margin: 15,
    marginBottom: 30,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default VoiceDemoScreen;