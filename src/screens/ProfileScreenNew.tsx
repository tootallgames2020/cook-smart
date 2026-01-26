import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../contexts/AuthContext';
import {pointsService} from '../services/pointsService';

const ProfileScreenNew: React.FC = () => {
  const navigation = useNavigation();
  const {user, logout} = useAuth();
  const [points, setPoints] = useState(0);
  const [level, setLevel] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  // const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    try {
      const userPoints = await pointsService.getUserPoints();
      setPoints(userPoints.totalPoints);
      setLevel(userPoints.level);
    } catch (error) {
      console.error('Error loading points:', error);
      // Keep default 0 points on error
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPoints();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const menuItems = [
    {
      id: 'subscription',
      title: 'Subscription',
      subtitle: user?.subscription_status || 'Free',
      icon: 'card-membership',
      color: '#10B981',
      onPress: () => navigation.navigate('SubscriptionDetails' as never),
    },
    {
      id: 'myrecipes',
      title: 'My Recipes',
      subtitle: 'Create & manage your recipes',
      icon: 'menu-book',
      color: '#FF6B6B',
      onPress: () =>
        (navigation as any).navigate('Recipes', {screen: 'MyRecipes'}),
    },
    {
      id: 'mealplanning',
      title: 'Meal Planning',
      subtitle: 'Plan your weekly meals',
      icon: 'calendar-today',
      color: '#8B5CF6',
      onPress: () =>
        (navigation as any).navigate('SavedRecipes', {screen: 'MealPlanning'}),
    },
    {
      id: 'collections',
      title: 'Recipe Collections',
      subtitle: 'Organize your recipes',
      icon: 'collections-bookmark',
      color: '#F59E0B',
      onPress: () =>
        (navigation as any).navigate('SavedRecipes', {screen: 'Collections'}),
    },
    {
      id: 'dietary',
      title: 'Dietary Preferences',
      subtitle: 'Manage restrictions & allergies',
      icon: 'restaurant-menu',
      color: '#3B82F6',
      onPress: () => navigation.navigate('DietaryPreferences' as never),
    },
    {
      id: 'ai-settings',
      title: 'AI Features',
      subtitle: 'Voice, photo & smart features',
      icon: 'psychology',
      color: '#9333EA',
      onPress: () => navigation.navigate('AISettings' as never),
    },
    {
      id: 'achievements',
      title: 'Achievements',
      subtitle: 'View your badges',
      icon: 'emoji-events',
      color: '#FFD93D',
      onPress: () => navigation.navigate('Achievements' as never),
    },
    {
      id: 'referral',
      title: 'Refer & Earn',
      subtitle: 'Share and get free months',
      icon: 'card-giftcard',
      color: '#10B981',
      onPress: () => navigation.navigate('ReferralScreen' as never),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage your alerts',
      icon: 'notifications',
      color: '#F59E0B',
      onPress: () => navigation.navigate('NotificationSettings' as never),
    },
    {
      id: 'holidays',
      title: 'Holiday Preferences',
      subtitle: 'Choose which holidays to see',
      icon: 'celebration',
      color: '#EC4899',
      onPress: () => navigation.navigate('HolidayPreferences' as never),
    },
    {
      id: 'password',
      title: 'Change Password',
      subtitle: 'Update your password',
      icon: 'lock',
      color: '#EF4444',
      onPress: () => navigation.navigate('ChangePassword' as never),
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      subtitle: 'Manage your data',
      icon: 'security',
      color: '#8B5CF6',
      onPress: () => navigation.navigate('PrivacySecurity' as never),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          <Icon name="person" size={48} color="#10B981" />
        </View>
        <Text style={styles.userName}>
          {user?.first_name || 'User'} {user?.last_name || ''}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        {/* Badges */}
        <View style={styles.badgesContainer}>
          {user?.is_co_founder && (
            <View style={styles.badge}>
              <Text style={styles.badgeEmoji}>👑</Text>
              <Text style={styles.badgeText}>Co-Founder</Text>
            </View>
          )}
          {user?.is_special_user && (
            <View style={[styles.badge, styles.specialBadge]}>
              <Text style={styles.badgeEmoji}>💐</Text>
              <Text style={styles.badgeText}>Special User</Text>
            </View>
          )}
          {user?.has_lifetime_subscription && (
            <View style={[styles.badge, styles.lifetimeBadge]}>
              <Icon name="all-inclusive" size={16} color="#10B981" />
              <Text style={styles.badgeText}>Lifetime Access</Text>
            </View>
          )}
        </View>
      </View>

      {/* Points Display */}
      <View style={styles.pointsCard}>
        <View style={styles.pointsHeader}>
          <Icon name="stars" size={32} color="#F59E0B" />
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsValue}>{points}</Text>
            <Text style={styles.pointsLabel}>Points • Level {level}</Text>
          </View>
        </View>
        <Text style={styles.pointsSubtext}>
          Earn points by using Cook Smart features!
        </Text>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}>
            <View
              style={[styles.menuIcon, {backgroundColor: `${item.color}15`}]}>
              <Icon name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="logout" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Beta Info */}
      <View style={styles.betaInfo}>
        <Icon name="science" size={16} color="#8B5CF6" />
        <Text style={styles.betaText}>Cook Smart Beta v1.0</Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  specialBadge: {
    backgroundColor: '#FCE7F3',
    borderColor: '#EC4899',
  },
  lifetimeBadge: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  pointsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  pointsSubtext: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  betaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingVertical: 12,
  },
  betaText: {
    fontSize: 12,
    color: '#8B5CF6',
  },
  bottomPadding: {
    height: 32,
  },
});

export default ProfileScreenNew;
