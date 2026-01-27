/**
 * Universal Feedback Modal
 * 
 * A reusable component for collecting user feedback across all app features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { feedbackService } from '../../services/feedbackService';

interface _FeedbackSubmission {
  feedbackType: string;
  featureArea: string;
  originalData: any;
  correctedData: any;
  contextData?: any;
  confidenceScore?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  feedbackType: string;
  featureArea: string;
  title: string;
  description: string;
  originalData: any;
  onFeedbackSubmitted: (correctedData: any) => void;
  customFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean' | 'rating';
    options?: string[];
    required?: boolean;
  }>;
}

export const UniversalFeedbackModal: React.FC<Props> = ({
  visible,
  onClose,
  feedbackType,
  featureArea,
  title,
  description,
  originalData,
  onFeedbackSubmitted,
  customFields = [],
}) => {
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [confidence, setConfidence] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = customFields
      .filter(field => field.required && !formData[field.key])
      .map(field => field.label);

    if (missingFields.length > 0) {
      Alert.alert('Missing Information', `Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    setSubmitting(true);

    try {
      const correctedData = {
        ...formData,
        notes: notes.trim() || undefined,
        user_confidence: confidence,
      };

      const result = await feedbackService.submitFeedback({
        feedbackType,
        featureArea,
        originalData,
        correctedData,
        confidenceScore: confidence / 5, // Convert 1-5 to 0-1
      });

      if (result.success) {
        onFeedbackSubmitted(correctedData);
        onClose();
        
        let message = 'Thank you for your feedback! This helps improve the app for everyone.';
        if (result.pointsAwarded) {
          message += ` You earned ${result.pointsAwarded} points!`;
        }
        
        Alert.alert('Feedback Submitted', message);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: typeof customFields[0]) => {
    const value = formData[field.key];

    switch (field.type) {
      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={(text) => handleFieldChange(field.key, text)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            multiline={field.key.includes('note') || field.key.includes('comment')}
            numberOfLines={field.key.includes('note') || field.key.includes('comment') ? 3 : 1}
          />
        );

      case 'number':
        return (
          <TextInput
            style={styles.textInput}
            value={value?.toString() || ''}
            onChangeText={(text) => handleFieldChange(field.key, parseFloat(text) || 0)}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            keyboardType="numeric"
          />
        );

      case 'select':
        return (
          <View style={styles.selectContainer}>
            {field.options?.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.selectOption,
                  value === option && styles.selectedOption,
                ]}
                onPress={() => handleFieldChange(field.key, option)}
              >
                <Text style={[
                  styles.selectOptionText,
                  value === option && styles.selectedOptionText,
                ]}>
                  {option}
                </Text>
                {value === option && (
                  <Icon name="check" size={16} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'boolean':
        return (
          <View style={styles.booleanContainer}>
            <TouchableOpacity
              style={[
                styles.booleanOption,
                value === true && styles.selectedBoolean,
              ]}
              onPress={() => handleFieldChange(field.key, true)}
            >
              <Text style={[
                styles.booleanText,
                value === true && styles.selectedBooleanText,
              ]}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.booleanOption,
                value === false && styles.selectedBoolean,
              ]}
              onPress={() => handleFieldChange(field.key, false)}
            >
              <Text style={[
                styles.booleanText,
                value === false && styles.selectedBooleanText,
              ]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'rating':
        return (
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={styles.ratingButton}
                onPress={() => handleFieldChange(field.key, rating)}
              >
                <Icon
                  name="star"
                  size={32}
                  color={value >= rating ? '#F59E0B' : '#D1D5DB'}
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

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
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.descriptionContainer}>
            <Text style={styles.description}>{description}</Text>
          </View>

          {customFields.map((field) => (
            <View key={field.key} style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                {field.label}
                {field.required && <Text style={styles.required}> *</Text>}
              </Text>
              {renderField(field)}
            </View>
          ))}

          {renderConfidenceSlider()}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional details or context..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Why is this important?</Text>
            <Text style={styles.helpText}>
              Your feedback helps train our AI to make better decisions for all users. 
              The more accurate feedback we receive, the smarter the app becomes!
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={[
              styles.submitButtonText,
              submitting && styles.submitButtonTextDisabled
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
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  fieldContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#F9FAFB',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedOption: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedOptionText: {
    color: '#10B981',
    fontWeight: '600',
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  selectedBoolean: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  booleanText: {
    fontSize: 16,
    color: '#374151',
  },
  selectedBooleanText: {
    color: '#10B981',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ratingButton: {
    padding: 4,
  },
  confidenceContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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