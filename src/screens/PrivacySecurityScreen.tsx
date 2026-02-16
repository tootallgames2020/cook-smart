import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getAuthToken} from '../utils/auth';
import {API_ENDPOINTS} from '../config/api';
import {useAuth} from '../contexts/AuthContext';

interface Props {
  navigation: any;
}

export const PrivacySecurityScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const [dataSharing, setDataSharing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load privacy settings on mount
  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(API_ENDPOINTS.settings.privacy, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDataSharing(data.data_sharing || false);
        setAnalytics(data.analytics_enabled !== false);
        setNotifications(data.push_notifications !== false);
        setLocationServices(data.location_services || false);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load settings:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacySetting = async (setting: string, value: boolean) => {
    setUpdating(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(API_ENDPOINTS.settings.privacy, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({[setting]: value}),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update failed:', response.status, errorText);
        throw new Error('Failed to update setting');
      }
    } catch (error) {
      console.error('❌ Error updating privacy setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
      // Revert the change
      switch (setting) {
        case 'data_sharing':
          setDataSharing(!value);
          break;
        case 'analytics_enabled':
          setAnalytics(!value);
          break;
        case 'push_notifications':
          setNotifications(!value);
          break;
        case 'location_services':
          setLocationServices(!value);
          break;
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'I Understand, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              const token = await getAuthToken();
              const response = await fetch(
                API_ENDPOINTS.settings.deleteAccount,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({confirmation: 'DELETE'}),
                },
              );
              if (response.ok) {
                // Clear auth state
                await logout();
                
                Alert.alert(
                  'Account Deleted',
                  'Your account has been permanently deleted.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigation will happen automatically after logout
                      },
                    },
                  ],
                );
              } else {
                const errorText = await response.text();
                console.error('❌ Delete failed:', response.status, errorText);
                throw new Error('Failed to delete account');
              }
            } catch (error) {
              console.error('❌ Error deleting account:', error);
              Alert.alert(
                'Error',
                'Failed to delete account. Please try again or contact support.',
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleExportData = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(API_ENDPOINTS.settings.exportData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert(
          'Export Complete',
          'Your data has been exported. In production, this would be sent to your email.',
          [{text: 'OK'}],
        );
      } else {
        throw new Error('Failed to export data');
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Data Sharing</Text>
              <Text style={styles.settingDescription}>
                Share anonymized usage data to help improve the app
              </Text>
            </View>
            <Switch
              value={dataSharing}
              onValueChange={(value) => {
                setDataSharing(value);
                updatePrivacySetting('data_sharing', value);
              }}
              disabled={updating}
              trackColor={{false: '#D1D5DB', true: '#4CAF50'}}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Analytics</Text>
              <Text style={styles.settingDescription}>
                Help us understand how you use Cook Smart
              </Text>
            </View>
            <Switch
              value={analytics}
              onValueChange={(value) => {
                setAnalytics(value);
                updatePrivacySetting('analytics_enabled', value);
              }}
              disabled={updating}
              trackColor={{false: '#D1D5DB', true: '#4CAF50'}}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive updates about recipes, tips, and more
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={(value) => {
                setNotifications(value);
                updatePrivacySetting('push_notifications', value);
              }}
              disabled={updating}
              trackColor={{false: '#D1D5DB', true: '#4CAF50'}}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Location Services</Text>
              <Text style={styles.settingDescription}>
                Find nearby stores and local ingredients
              </Text>
            </View>
            <Switch
              value={locationServices}
              onValueChange={(value) => {
                setLocationServices(value);
                updatePrivacySetting('location_services', value);
              }}
              disabled={updating}
              trackColor={{false: '#D1D5DB', true: '#4CAF50'}}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleExportData}>
            <Icon name="download" size={24} color="#4CAF50" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Export My Data</Text>
              <Text style={styles.actionDescription}>
                Download a copy of your data
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('DataPolicy')}>
            <Icon name="policy" size={24} color="#3B82F6" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Data Usage Policy</Text>
              <Text style={styles.actionDescription}>
                How we use your information
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('ChangePassword')}>
            <Icon name="lock" size={24} color="#F59E0B" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Change Password</Text>
              <Text style={styles.actionDescription}>
                Update your account password
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('TwoFactor')}>
            <Icon name="security" size={24} color="#8B5CF6" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Two-Factor Authentication</Text>
              <Text style={styles.actionDescription}>
                Add an extra layer of security
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('PrivacyPolicyView')}>
            <Icon name="description" size={24} color="#6B7280" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Privacy Policy</Text>
              <Text style={styles.actionDescription}>
                Read our privacy policy
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('TermsOfServiceView')}>
            <Icon name="gavel" size={24} color="#6B7280" />
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Terms of Service</Text>
              <Text style={styles.actionDescription}>
                View terms and conditions
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>
            Danger Zone
          </Text>

          <TouchableOpacity
            style={[styles.actionItem, styles.dangerItem]}
            onPress={handleDeleteAccount}
            disabled={updating}>
            <Icon name="delete-forever" size={24} color="#EF4444" />
            <View style={styles.actionInfo}>
              <Text style={[styles.actionLabel, styles.dangerLabel]}>
                Delete Account
              </Text>
              <Text style={styles.actionDescription}>
                Permanently delete your account and data
              </Text>
            </View>
            {updating ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Icon name="chevron-right" size={24} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Icon name="info-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            We take your privacy seriously. Your data is encrypted and stored
            securely. We never sell your personal information to third parties.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerTitle: {
    color: '#EF4444',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dangerItem: {
    backgroundColor: '#FEF2F2',
  },
  actionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  dangerLabel: {
    color: '#EF4444',
  },
  actionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginVertical: 24,
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 20,
    marginLeft: 12,
  },
});
