import React, {useState, useEffect} from 'react';
import {
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import {UserProfileCard} from '../components/UserProfileCard';
import {PointsDisplay} from '../components/PointsDisplay';
import {PointsHistory} from '../components/PointsHistory';
import {Leaderboard} from '../components/Leaderboard';
import {ReferFriendCard} from '../components/ReferFriendCard';
import {SubscriptionBadge} from '../components/SubscriptionBadge';
import {pointsService} from '../services/pointsService';
import {userService} from '../services/userService';

interface UserProfile {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  hasLifetimeSubscription?: boolean;
  subscriptionStatus?: string;
  isCoFounder?: boolean;
  isSpecialUser?: boolean;
  isCreator?: boolean;
}

interface UserStats {
  totalRecipes: number;
  totalFavorites: number;
  totalRatings: number;
  averageRating: number;
}

interface UserPoints {
  totalPoints: number;
  level: number;
}

interface PointsTransaction {
  id: string;
  points: number;
  action: string;
  description: string;
  dateCreated: Date;
}

interface Props {
  userId: string;
}

export const ProfileScreen: React.FC<Props> = ({userId}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data
  const mockProfile: UserProfile = {
    id: userId,
    username: 'cookmaster',
    firstName: 'John',
    lastName: 'Doe',
    bio: 'Passionate home cook who loves experimenting with new recipes and sharing culinary adventures!',
    location: 'San Francisco, CA',
  };

  const mockStats: UserStats = {
    totalRecipes: 12,
    totalFavorites: 45,
    totalRatings: 23,
    averageRating: 4.2,
  };

  const mockUserPoints: UserPoints = {
    totalPoints: 1250,
    level: 3,
  };

  const mockTransactions: PointsTransaction[] = [
    {
      id: '1',
      points: 15,
      action: 'recipe_review',
      description: 'Reviewed "Chicken Parmesan"',
      dateCreated: new Date(Date.now() - 86400000), // 1 day ago
    },
    {
      id: '2',
      points: 5,
      action: 'recipe_favorite',
      description: 'Favorited "Pasta Primavera"',
      dateCreated: new Date(Date.now() - 172800000), // 2 days ago
    },
    {
      id: '3',
      points: 10,
      action: 'recipe_rating',
      description: 'Rated "Beef Stir Fry"',
      dateCreated: new Date(Date.now() - 259200000), // 3 days ago
    },
  ];

  const mockLeaderboard = [
    {userId: 'user1', username: 'chefmaster', totalPoints: 2500, level: 4},
    {userId: 'user2', username: 'foodlover', totalPoints: 1800, level: 3},
    {userId: userId, username: 'cookmaster', totalPoints: 1250, level: 3},
    {userId: 'user3', username: 'kitchenpro', totalPoints: 950, level: 2},
    {userId: 'user4', username: 'recipehunter', totalPoints: 720, level: 2},
  ];

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setPointsLoading(true);
    try {
      // Load real user profile
      const userProfile = await userService.getCurrentUser();
      setProfile({
        id: userProfile.id,
        username: userProfile.username || 'user',
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        bio: userProfile.bio,
        location: userProfile.location,
        hasLifetimeSubscription: userProfile.hasLifetimeSubscription,
        subscriptionStatus: userProfile.subscriptionStatus,
        isCoFounder: userProfile.isCoFounder,
        isSpecialUser: userProfile.isSpecialUser,
        isCreator: userProfile.isCreator,
      });

      // Load real points data
      try {
        const points = await pointsService.getUserPoints();
        setUserPoints({
          totalPoints: points.totalPoints,
          level: points.level,
        });
      } catch (pointsError) {
        console.error('Error loading points:', pointsError);
        // Set default points if API fails
        setUserPoints({
          totalPoints: 0,
          level: 0,
        });
      } finally {
        setPointsLoading(false);
      }

      // Load points history
      const history = await pointsService.getPointsHistory(20, 0);
      setTransactions(history);

      // Load real leaderboard
      const leaderboardData = await userService.getLeaderboard(10);
      setLeaderboard(leaderboardData);

      // Load stats (currently returns zeros until backend endpoint exists)
      const statsData = await userService.getUserStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Fall back to mock data on error
      setProfile(mockProfile);
      setStats(mockStats);
      setUserPoints(mockUserPoints);
      setTransactions(mockTransactions);
      setLeaderboard(mockLeaderboard);
      setPointsLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    // Navigate to edit profile screen
  };

  const handlePointsPress = () => {
    // Navigate to detailed points screen
  };

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loadingContainer}>
          {/* Loading state could be added here */}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        {profile && stats && (
          <UserProfileCard
            profile={profile}
            stats={stats}
            userPoints={userPoints || undefined}
            onEditPress={handleEditProfile}
            isOwnProfile={true}
          />
        )}

        {profile && (
          <SubscriptionBadge
            hasLifetimeSubscription={profile.hasLifetimeSubscription}
            subscriptionStatus={profile.subscriptionStatus}
            isCoFounder={profile.isCoFounder}
            isSpecialUser={profile.isSpecialUser}
            isCreator={profile.isCreator}
          />
        )}

        {!pointsLoading && userPoints && (
          <PointsDisplay userPoints={userPoints} onPress={handlePointsPress} />
        )}

        <ReferFriendCard />

        <PointsHistory transactions={transactions} loading={loading} />

        <Leaderboard
          entries={leaderboard}
          currentUserId={userId}
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
