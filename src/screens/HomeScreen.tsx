import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../contexts/AuthContext';
import {FeedbackModal} from '../components/FeedbackModal';
import feedbackService from '../services/feedbackService';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuth();
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  const handleSubmitFeedback = async (feedback: {
    message: string;
    rating?: number;
    category?: string;
  }) => {
    await feedbackService.submitFeedback(feedback);
  };

  const quickActions = [
    {
      id: 'ingredients',
      title: 'My Ingredients',
      subtitle: 'Manage your pantry',
      icon: 'kitchen',
      color: '#10B981',
      onPress: () => navigation.navigate('Ingredients' as never),
    },
    {
      id: 'recipes',
      title: 'Find Recipes',
      subtitle: 'Discover what to cook',
      icon: 'restaurant',
      color: '#3B82F6',
      onPress: () => navigation.navigate('Recipes' as never),
    },
    {
      id: 'trending',
      title: 'Trending',
      subtitle: 'Popular recipes',
      icon: 'trending-up',
      color: '#F59E0B',
      onPress: () =>
        (navigation as any).navigate('Recipes', {screen: 'TrendingRecipes'}),
    },
    {
      id: 'seasonal',
      title: 'Seasonal',
      subtitle: 'Perfect for now',
      icon: 'wb-sunny',
      color: '#EC4899',
      onPress: () =>
        (navigation as any).navigate('Recipes', {screen: 'SeasonalRecipes'}),
    },
    {
      id: 'community',
      title: 'Community',
      subtitle: 'See what others cook',
      icon: 'people',
      color: '#8B5CF6',
      onPress: () =>
        (navigation as any).navigate('Recipes', {screen: 'CommunityFeed'}),
    },
    {
      id: 'community',
      title: 'Join Community',
      subtitle: 'Chat on Discord',
      icon: 'forum',
      color: '#5865F2',
      onPress: () => Linking.openURL('https://discord.gg/btemMmWy2e'),
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      subtitle: 'Help us improve',
      icon: 'feedback',
      color: '#6B7280',
      onPress: () => setFeedbackModalVisible(true),
    },
  ];

  // Special button for Briana ❤️
  const brianaAction = {
    id: 'briana-love',
    title: '💕 Love Note',
    subtitle: 'From your partner',
    icon: 'favorite',
    color: '#EC4899',
    onPress: () => {
      // Navigate to root stack screen
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('CoFounderWelcome' as never);
      }
    },
  };

  // Special button for Mom 💐
  const momAction = {
    id: 'mom-letter',
    title: '💐 Thank You, Mom',
    subtitle: 'From Brad',
    icon: 'favorite',
    color: '#DB2777',
    onPress: () => {
      // Navigate to root stack screen
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('SpecialUserWelcome' as never);
      }
    },
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Welcome back{user?.first_name ? `, ${user.first_name}` : ''}! 👋
          </Text>
          <Text style={styles.subtitle}>
            What would you like to cook today?
          </Text>
        </View>
        {user?.is_co_founder && (
          <View style={styles.coFounderBadge}>
            <Text style={styles.coFounderEmoji}>👑</Text>
            <Text style={styles.coFounderText}>Co-Founder</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={action.onPress}>
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: `${action.color}15`},
                ]}>
                <Icon name={action.icon} size={32} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
          {/* Special button for Briana ❤️ */}
          {user?.is_co_founder && (
            <TouchableOpacity
              key={brianaAction.id}
              style={[styles.actionCard, styles.specialCard]}
              onPress={brianaAction.onPress}>
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: `${brianaAction.color}15`},
                ]}>
                <Icon
                  name={brianaAction.icon}
                  size={32}
                  color={brianaAction.color}
                />
              </View>
              <Text style={styles.actionTitle}>{brianaAction.title}</Text>
              <Text style={styles.actionSubtitle}>{brianaAction.subtitle}</Text>
            </TouchableOpacity>
          )}
          {/* Special button for Mom 💐 */}
          {user?.is_special_user && (
            <TouchableOpacity
              key={momAction.id}
              style={[styles.actionCard, styles.specialCard]}
              onPress={momAction.onPress}>
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: `${momAction.color}15`},
                ]}>
                <Icon name={momAction.icon} size={32} color={momAction.color} />
              </View>
              <Text style={styles.actionTitle}>{momAction.title}</Text>
              <Text style={styles.actionSubtitle}>{momAction.subtitle}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Holiday Recipe Section - Disabled due to FatSecret API limitations */}
      {/* FatSecret returns recipe IDs in search that don't have full details available */}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming Soon</Text>
        <View style={styles.featureCard}>
          <Icon name="auto-awesome" size={24} color="#10B981" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Recipe Suggestions</Text>
            <Text style={styles.featureSubtitle}>
              Get personalized recipe recommendations based on your ingredients
            </Text>
          </View>
        </View>
        <View style={styles.featureCard}>
          <Icon name="shopping-cart" size={24} color="#10B981" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Smart Shopping Lists</Text>
            <Text style={styles.featureSubtitle}>
              Automatically generate shopping lists from recipes
            </Text>
          </View>
        </View>
        <View style={styles.featureCard}>
          <Icon name="calendar-today" size={24} color="#10B981" />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Meal Planning</Text>
            <Text style={styles.featureSubtitle}>
              Plan your weekly meals and track nutrition
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.betaNotice}>
        <Icon name="info" size={20} color="#10B981" />
        <Text style={styles.betaText}>
          Cook Smart is in BETA. Features are being actively developed!
        </Text>
      </View>

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onSubmit={handleSubmitFeedback}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  coFounderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  coFounderEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  coFounderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  featureContent: {
    flex: 1,
    marginLeft: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  betaNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  betaText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  specialCard: {
    borderColor: '#EC4899',
    borderWidth: 2,
    shadowColor: '#EC4899',
    shadowOpacity: 0.2,
  },
});

export default HomeScreen;
