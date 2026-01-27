/**
 * Recipe Match Feedback Component
 * 
 * Collects user feedback on recipe matching accuracy
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { feedbackService } from '../../services/feedbackService';

interface Props {
  visible: boolean;
  onClose: () => void;
  recipeId: string;
  recipeName: string;
  userIngredients: string[];
  systemMatchScore: number; // 0-100
  onFeedbackSubmitted: () => void;
}

export const RecipeMatchFeedback: React.FC<Props> = ({
  visible,
  onClose,
  recipeId,
  recipeName,
  userIngredients,
  systemMatchScore,
  onFeedbackSubmitted,
}) => {
  const [actualSuccess, setActualSuccess] = useState<boolean | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [cookingOutcome, setCookingOutcome] = useState<string>('');
  const [_missingIngredients, _setMissingIngredients] = useState<string[]>([]);
  const [_substitutionsMade, _setSubstitutionsMade] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(5);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const cookingOutcomes = [
    'Perfect - turned out exactly as expected',
    'Good - minor adjustments needed',
    'Okay - significant modifications required',
    'Poor - didn\'t work well with my ingredients',
    'Failed - couldn\'t complete the recipe',
  ];

  const handleSubmit = async () => {
    if (actualSuccess === null || userRating === 0) {
      Alert.alert('Missing Information', 'Please rate the recipe match and indicate if it was successful.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await feedbackService.submitRecipeMatchFeedback(
        recipeId,
        userIngredients,
        userRating,
        actualSuccess,
        confidence / 5
      );

      if (result.success) {
        onFeedbackSubmitted();
        onClose();
        
        let message = 'Thank you for your feedback! This helps improve recipe recommendations.';
        if (result.pointsAwarded) {
          message += ` You earned ${result.pointsAwarded} points!`;
        }
        
        Alert.alert('Feedback Submitted', message);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error submitting recipe match feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingStars = () => (
    <View style={styles.ratingContainer}>
      <Text style={styles.ratingLabel}>How well did this recipe work with your ingredients?</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={styles.starButton}
            onPress={() => setUserRating(rating)}
          >
            <Icon
              name="star"
              size={36}
              color={userRating >= rating ? '#F59E0B' : '#D1D5DB'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.ratingLabels}>
        <Text style={styles.ratingEndLabel}>Poor match</Text>
        <Text style={styles.ratingEndLabel}>Perfect match</Text>
      </View>
    </View>
  );

  const renderSuccessButtons = () => (
    <View style={styles.successContainer}>
      <Text style={styles.successLabel}>Did you successfully cook this recipe?</Text>
      <View style={styles.successButtons}>
        <TouchableOpacity
          style={[
            styles.successButton,
            actualSuccess === true && styles.selectedSuccess,
          ]}
          onPress={() => setActualSuccess(true)}
        >
          <Icon 
            name="check-circle" 
            size={24} 
            color={actualSuccess === true ? '#10B981' : '#6B7280'} 
          />
          <Text style={[
            styles.successButtonText,
            actualSuccess === true && styles.selectedSuccessText,
          ]}>
            Yes, successfully cooked it
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.successButton,
            actualSuccess === false && styles.selectedSuccess,
          ]}
          onPress={() => setActualSuccess(false)}
        >
          <Icon 
            name="cancel" 
            size={24} 
            color={actualSuccess === false ? '#EF4444' : '#6B7280'} 
          />
          <Text style={[
            styles.successButtonText,
            actualSuccess === false && styles.selectedSuccessText,
          ]}>
            No, couldn't complete it
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCookingOutcome = () => (
    <View style={styles.outcomeContainer}>
      <Text style={styles.outcomeLabel}>How did the cooking go?</Text>
      {cookingOutcomes.map((outcome) => (
        <TouchableOpacity
          key={outcome}
          style={[
            styles.outcomeOption,
            cookingOutcome === outcome && styles.selectedOutcome,
          ]}
          onPress={() => setCookingOutcome(outcome)}
        >
          <Text style={[
            styles.outcomeText,
            cookingOutcome === outcome && styles.selectedOutcomeText,
          ]}>
            {outcome}
          </Text>
          {cookingOutcome === outcome && (
            <Icon name="check" size={20} color="#10B981" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderConfidenceSlider = () => (
    <View style={styles.confidenceContainer}>
      <Text style={styles.confidenceLabel}>
        How confident are you in this feedback? ({confidence}/5)
      </Text>
      <View style={styles.confidenceSlider}>
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.confidenceButton,
              confidence >= level && styles.activeConfidence,
            ]}
            onPress={() => setConfidence(level)}
          >
            <Text style={[
              styles.confidenceButtonText,
              confidence >= level && styles.activeConfidenceText,
            ]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.confidenceLabels}>
        <Text style={styles.confidenceEndLabel}>Not sure</Text>
        <Text style={styles.confidenceEndLabel}>Very sure</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Recipe Feedback</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.recipeInfo}>
            <Text style={styles.recipeName}>{recipeName}</Text>
            <Text style={styles.systemScore}>
              System predicted: {systemMatchScore}% match with your ingredients
            </Text>
          </View>

          {renderRatingStars()}
          {renderSuccessButtons()}
          {renderCookingOutcome()}
          {renderConfidenceSlider()}

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Why is this important?</Text>
            <Text style={styles.helpText}>
              Your feedback helps us improve recipe recommendations for all users. 
              We learn which ingredients work well together and how to better predict recipe success.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || actualSuccess === null || userRating === 0) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting || actualSuccess === null || userRating === 0}
          >
            <Text style={[
              styles.submitButtonText,
              (submitting || actualSuccess === null || userRating === 0) && styles.submitButtonTextDisabled
            ]}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  recipeInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  systemScore: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingEndLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  successContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  successLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  successButtons: {
    gap: 12,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  successButtonText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  selectedSuccessText: {
    color: '#10B981',
    fontWeight: '600',
  },
  outcomeContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  outcomeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  outcomeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  selectedOutcome: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  outcomeText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  selectedOutcomeText: {
    color: '#10B981',
    fontWeight: '600',
  },
  confidenceContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  confidenceSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confidenceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeConfidence: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  confidenceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeConfidenceText: {
    color: '#FFFFFF',
  },
  confidenceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confidenceEndLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  helpSection: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#9CA3AF',
  },
});