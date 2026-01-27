import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import {FeedbackModal} from '../components/FeedbackModal';
import { feedbackService } from '../services/feedbackService';

interface FeedbackData {
  message: string;
  rating?: number;
  category?: string;
}

interface FeedbackItem {
  id: string;
  message: string;
  rating?: number;
  category?: string;
  status: string;
  createdAt: string;
}

export const BetaFeedbackScreen: React.FC = () => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [userFeedback, setUserFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserFeedback = async () => {
    try {
      const feedback = await feedbackService.getMyFeedback();
      setUserFeedback(feedback);
    } catch {
      console.error('Failed to load user feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (feedback: FeedbackData) => {
    try {
      await feedbackService.submitGeneralFeedback(feedback);
      Alert.alert(
        'Thank You! 🎉',
        'Your feedback helps us improve Cook Smart. We appreciate your input during the BETA phase!',
      );
      loadUserFeedback(); // Refresh the list
    } catch {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return '☆☆☆☆☆';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FFA500';
      case 'reviewed':
        return '#4CAF50';
      case 'resolved':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getCategoryLabel = (category?: string) => {
    return category || 'General';
  };

  const FeedbackCard = ({item}: {item: FeedbackItem}) => (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackRating}>{getRatingStars(item.rating)}</Text>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: getStatusColor(item.status)},
          ]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.feedbackCategory}>
        {getCategoryLabel(item.category)}
      </Text>

      <Text style={styles.feedbackMessage}>{item.message}</Text>

      <Text style={styles.feedbackDate}>
        Submitted: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  useEffect(() => {
    loadUserFeedback();
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>🚧 BETA Feedback</Text>
        <Text style={styles.subtitle}>Help us improve Cook Smart</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📧 Need Direct Support?</Text>
        <View style={styles.supportCard}>
          <Text style={styles.supportText}>
            For urgent issues or direct assistance, reach our support team:
          </Text>
          <TouchableOpacity
            style={styles.emailButton}
            onPress={() =>
              Linking.openURL(
                'mailto:services.cooksmart@gmail.com?subject=Cook Smart Support',
              )
            }>
            <Text style={styles.emailButtonText}>
              📧 services.cooksmart@gmail.com
            </Text>
          </TouchableOpacity>
          <Text style={styles.supportNote}>
            We typically respond within 24-48 hours during BETA.
          </Text>
        </View>
      </View>

      <View style={styles.betaInfo}>
        <Text style={styles.betaTitle}>Your Voice Matters!</Text>
        <Text style={styles.betaText}>
          As a BETA tester, your feedback is crucial for making Cook Smart the
          best recipe app possible. Share your thoughts, report bugs, and
          suggest new features.
        </Text>

        <TouchableOpacity
          style={styles.feedbackButton}
          onPress={() => setShowFeedbackModal(true)}>
          <Text style={styles.feedbackButtonText}>💬 Give Feedback</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Previous Feedback</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text>Loading your feedback...</Text>
          </View>
        ) : userFeedback.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Feedback Yet</Text>
            <Text style={styles.emptyText}>
              Be the first to share your thoughts about Cook Smart!
            </Text>
          </View>
        ) : (
          <View style={styles.feedbackList}>
            {userFeedback.map(item => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feedback Guidelines</Text>
        <View style={styles.guidelinesList}>
          <Text style={styles.guideline}>
            🐛 <Text style={styles.bold}>Bug Reports:</Text> Describe what
            happened and steps to reproduce
          </Text>
          <Text style={styles.guideline}>
            💡 <Text style={styles.bold}>Feature Requests:</Text> Tell us what
            you'd like to see added
          </Text>
          <Text style={styles.guideline}>
            🎨 <Text style={styles.bold}>UI/UX:</Text> Share thoughts on design
            and user experience
          </Text>
          <Text style={styles.guideline}>
            ⚡ <Text style={styles.bold}>Performance:</Text> Report slow loading
            or crashes
          </Text>
          <Text style={styles.guideline}>
            💬 <Text style={styles.bold}>General:</Text> Any other thoughts or
            suggestions
          </Text>
        </View>
      </View>

      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleSubmitFeedback}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  betaInfo: {
    backgroundColor: '#FFF3E0',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  betaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  betaText: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
    marginBottom: 16,
  },
  feedbackButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackList: {
    gap: 12,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackRating: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  feedbackCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  feedbackMessage: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
  },
  guidelinesList: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  guideline: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
    color: '#333',
  },
  supportCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  supportText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
    marginBottom: 16,
  },
  emailButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  supportNote: {
    fontSize: 12,
    color: '#1565C0',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
