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

interface CategorizationAnalysis {
  originalName: string;
  cleanedName: string;
  primaryCategory: {
    category: string;
    confidence: number;
    reason: string;
  };
  alternativeCategories: Array<{
    category: string;
    confidence: number;
    reason: string;
  }>;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  ingredientName: string;
  currentCategory: string;
  onFeedbackSubmitted: (correctCategory: string) => void;
}

const CATEGORIES = [
  { id: 'Proteins', name: 'Proteins', icon: '🍗', color: '#EF4444' },
  { id: 'Vegetables', name: 'Vegetables', icon: '🥕', color: '#10B981' },
  { id: 'Fruits', name: 'Fruits', icon: '🍓', color: '#F59E0B' },
  { id: 'Grains & Starches', name: 'Grains & Starches', icon: '🍞', color: '#8B5CF6' },
  { id: 'Dairy & Eggs', name: 'Dairy & Eggs', icon: '🧀', color: '#3B82F6' },
  { id: 'Spices & Herbs', name: 'Spices & Herbs', icon: '🧂', color: '#84CC16' },
  { id: 'Oils & Fats', name: 'Oils & Fats', icon: '🫒', color: '#F97316' },
  { id: 'Condiments & Sauces', name: 'Condiments & Sauces', icon: '🍯', color: '#06B6D4' },
  { id: 'Nuts & Seeds', name: 'Nuts & Seeds', icon: '🌰', color: '#A855F7' },
  { id: 'Legumes & Beans', name: 'Legumes & Beans', icon: '🫘', color: '#DC2626' },
  { id: 'Canned & Packaged', name: 'Canned & Packaged', icon: '🥫', color: '#6B7280' },
  { id: 'Beverages', name: 'Beverages', icon: '☕', color: '#059669' },
  { id: 'Other', name: 'Other', icon: '📦', color: '#6B7280' },
];

export const IngredientCategorizationFeedback: React.FC<Props> = ({
  visible,
  onClose,
  ingredientName,
  currentCategory,
  onFeedbackSubmitted,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);
  const [analysis, setAnalysis] = useState<CategorizationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeIngredient = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ingredients/analyze-categorization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${/* get token */}`,
        },
        body: JSON.stringify({ ingredient_name: ingredientName }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error analyzing ingredient:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      const response = await fetch('/api/ingredients/categorization-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${/* get token */}`,
        },
        body: JSON.stringify({
          ingredient_name: ingredientName,
          correct_category: selectedCategory,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onFeedbackSubmitted(selectedCategory);
        onClose();
        Alert.alert('Success', 'Thank you for your feedback! This helps improve our categorization.');
      } else {
        Alert.alert('Error', data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback');
    }
  };

  React.useEffect(() => {
    if (visible && ingredientName) {
      analyzeIngredient();
      setSelectedCategory(currentCategory);
    }
  }, [visible, ingredientName]);

  const renderCategoryOption = (category: typeof CATEGORIES[0]) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryOption,
        selectedCategory === category.id && styles.selectedCategory,
        { borderColor: category.color },
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Text style={styles.categoryEmoji}>{category.icon}</Text>
      <Text style={[
        styles.categoryName,
        selectedCategory === category.id && styles.selectedCategoryText
      ]}>
        {category.name}
      </Text>
      {selectedCategory === category.id && (
        <Icon name="check-circle" size={20} color={category.color} />
      )}
    </TouchableOpacity>
  );

  const renderAnalysis = () => {
    if (!analysis) return null;

    return (
      <View style={styles.analysisSection}>
        <Text style={styles.analysisTitle}>AI Analysis</Text>
        
        <View style={styles.analysisCard}>
          <Text style={styles.analysisLabel}>Primary Suggestion:</Text>
          <Text style={styles.primaryCategory}>
            {analysis.primaryCategory.category}
          </Text>
          <Text style={styles.confidence}>
            Confidence: {Math.round(analysis.primaryCategory.confidence * 100)}%
          </Text>
          <Text style={styles.reason}>
            {analysis.primaryCategory.reason}
          </Text>
        </View>

        {analysis.alternativeCategories.length > 0 && (
          <View style={styles.alternativesSection}>
            <Text style={styles.alternativesTitle}>Alternative Suggestions:</Text>
            {analysis.alternativeCategories.map((alt, index) => (
              <View key={index} style={styles.alternativeCard}>
                <Text style={styles.alternativeCategory}>{alt.category}</Text>
                <Text style={styles.alternativeConfidence}>
                  {Math.round(alt.confidence * 100)}%
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Categorize Ingredient</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.ingredientInfo}>
            <Text style={styles.ingredientName}>{ingredientName}</Text>
            <Text style={styles.currentCategoryLabel}>
              Current category: <Text style={styles.currentCategory}>{currentCategory}</Text>
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Analyzing ingredient...</Text>
            </View>
          ) : (
            renderAnalysis()
          )}

          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Select Correct Category:</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map(renderCategoryOption)}
            </View>
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Help us improve!</Text>
            <Text style={styles.helpText}>
              Your feedback helps train our AI to better categorize ingredients for all users.
              Select the most appropriate category for "{ingredientName}".
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              !selectedCategory && styles.submitButtonDisabled
            ]}
            onPress={submitFeedback}
            disabled={!selectedCategory}
          >
            <Text style={[
              styles.submitButtonText,
              !selectedCategory && styles.submitButtonTextDisabled
            ]}>
              Submit Feedback
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
  ingredientInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  ingredientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  currentCategoryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  currentCategory: {
    fontWeight: '600',
    color: '#10B981',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  analysisSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  analysisCard: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  analysisLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  primaryCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  reason: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  alternativesSection: {
    marginTop: 8,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  alternativeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  alternativeCategory: {
    fontSize: 14,
    color: '#374151',
  },
  alternativeConfidence: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoriesSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  categoriesGrid: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  selectedCategory: {
    backgroundColor: '#F0FDF4',
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  selectedCategoryText: {
    fontWeight: '600',
    color: '#10B981',
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