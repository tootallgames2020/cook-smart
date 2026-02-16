import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import notificationService, {
  NotificationPreferences,
} from '../services/notificationService';

export default function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    expiry_alerts: true,
    recipe_suggestions: true,
    achievement_notifications: true,
    daily_reminders: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  // Re-check permissions when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, []),
  );

  const loadSettings = async () => {
    try {
      setLoading(true);
      const isEnabled = await notificationService.areNotificationsEnabled();
      setEnabled(isEnabled);

      if (isEnabled) {
        const prefs = await notificationService.getPreferences();
        if (prefs) {
          setPreferences(prefs);
        }
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        setEnabled(true);
        Alert.alert('Success', 'Notifications enabled!');
        await loadSettings(); // Reload to confirm
      } else {
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings to receive alerts.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
      }
    } catch (error) {
      console.error('Enable notifications error:', error);
      Alert.alert('Error', 'Failed to enable notifications');
    }
  };

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    const newPrefs = {...preferences, [key]: value};
    setPreferences(newPrefs);

    const success = await notificationService.updatePreferences({[key]: value});
    if (!success) {
      // Revert on failure
      setPreferences(preferences);
      Alert.alert('Error', 'Failed to update preference');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="notifications" size={48} color="#FF6B6B" />
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          Stay updated with ingredient expiry alerts, recipe suggestions, and
          achievements
        </Text>
      </View>

      {!enabled ? (
        <View style={styles.enableSection}>
          <Icon name="notifications-off" size={64} color="#ccc" />
          <Text style={styles.disabledText}>Notifications are disabled</Text>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableNotifications}>
            <Text style={styles.enableButtonText}>Enable Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Linking.openSettings()}>
            <Icon name="settings" size={20} color="#666" />
            <Text style={styles.settingsButtonText}>Open Phone Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={loadSettings}>
            <Icon name="refresh" size={20} color="#FF6B6B" />
            <Text style={styles.refreshButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Notification Types</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="schedule" size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Expiry Alerts</Text>
                <Text style={styles.settingDescription}>
                  Get notified when ingredients are about to expire
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.expiry_alerts}
              onValueChange={value => updatePreference('expiry_alerts', value)}
              trackColor={{false: '#ccc', true: '#FF6B6B'}}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="restaurant" size={24} color="#4ECDC4" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Recipe Suggestions</Text>
                <Text style={styles.settingDescription}>
                  Discover new recipes based on your ingredients
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.recipe_suggestions}
              onValueChange={value =>
                updatePreference('recipe_suggestions', value)
              }
              trackColor={{false: '#ccc', true: '#4ECDC4'}}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="emoji-events" size={24} color="#FFD93D" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>
                  Achievement Notifications
                </Text>
                <Text style={styles.settingDescription}>
                  Celebrate when you unlock new badges
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.achievement_notifications}
              onValueChange={value =>
                updatePreference('achievement_notifications', value)
              }
              trackColor={{false: '#ccc', true: '#FFD93D'}}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Icon name="calendar-today" size={24} color="#A8E6CF" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Daily Reminders</Text>
                <Text style={styles.settingDescription}>
                  Gentle reminders to check your kitchen
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.daily_reminders}
              onValueChange={value =>
                updatePreference('daily_reminders', value)
              }
              trackColor={{false: '#ccc', true: '#A8E6CF'}}
            />
          </View>
        </View>
      )}

      <View style={styles.infoBox}>
        <Icon name="info" size={20} color="#666" />
        <Text style={styles.infoText}>
          Notifications help you reduce food waste and discover new recipes. You
          can change these settings anytime.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  enableSection: {
    alignItems: 'center',
    padding: 40,
  },
  disabledText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  enableButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 12,
  },
  settingsButtonText: {
    color: '#666',
    fontSize: 14,
    marginLeft: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 12,
  },
  refreshButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '600',
  },
  settingsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
});
