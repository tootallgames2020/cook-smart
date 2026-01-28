import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { photoAnalysisService } from '../services/photoAnalysisService';

interface PhotoAnalysisButtonProps {
  onAnalysisComplete?: (results: any) => void;
  analysisType?: 'meal' | 'receipt' | 'pantry' | 'ingredient';
  style?: any;
}

export const PhotoAnalysisButton: React.FC<PhotoAnalysisButtonProps> = ({
  onAnalysisComplete,
  analysisType = 'meal',
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const getButtonConfig = () => {
    switch (analysisType) {
      case 'meal':
        return {
          icon: 'camera-alt',
          title: 'Analyze Meal',
          subtitle: 'Get nutrition info from photo',
          color: '#FF6B6B',
        };
      case 'receipt':
        return {
          icon: 'receipt',
          title: 'Scan Receipt',
          subtitle: 'Update inventory from receipt',
          color: '#4ECDC4',
        };
      case 'pantry':
        return {
          icon: 'kitchen',
          title: 'Scan Pantry',
          subtitle: 'Inventory from pantry photo',
          color: '#45B7D1',
        };
      case 'ingredient':
        return {
          icon: 'search',
          title: 'Identify Food',
          subtitle: 'What food is this?',
          color: '#F59E0B',
        };
      default:
        return {
          icon: 'camera-alt',
          title: 'Analyze Photo',
          subtitle: 'AI photo analysis',
          color: '#6366F1',
        };
    }
  };

  const config = getButtonConfig();

  const showImagePicker = () => {
    Alert.alert(
      'Select Photo',
      'Choose how to get your photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openLibrary },
      ]
    );
  };

  const openCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.6, // Reduced quality to decrease file size
        maxWidth: 1024, // Limit image width
        maxHeight: 1024, // Limit image height
        includeBase64: true,
      },
      handleImageResponse
    );
  };

  const openLibrary = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.6, // Reduced quality to decrease file size
        maxWidth: 1024, // Limit image width
        maxHeight: 1024, // Limit image height
        includeBase64: true,
      },
      handleImageResponse
    );
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      setSelectedImage(asset.uri || null);
      setModalVisible(true);
      
      if (asset.base64) {
        analyzePhoto(asset.base64);
      }
    }
  };

  const analyzePhoto = async (base64Image: string) => {
    try {
      setAnalyzing(true);
      setAnalysisResults(null);

      let results;
      switch (analysisType) {
        case 'meal':
          results = await photoAnalysisService.analyzeMealPhoto(base64Image);
          break;
        case 'receipt':
          results = await photoAnalysisService.scanReceipt(base64Image);
          break;
        case 'pantry':
          results = await photoAnalysisService.analyzePantryPhoto(base64Image);
          break;
        case 'ingredient':
          results = await photoAnalysisService.identifyIngredient(base64Image);
          break;
        default:
          results = await photoAnalysisService.analyzeMealPhoto(base64Image);
      }

      setAnalysisResults(results);
      onAnalysisComplete?.(results);
    } catch (error) {
      console.error('Photo analysis error:', error);
      
      // Show more detailed error information
      let errorMessage = 'Could not analyze photo. Please try again.';
      if (error instanceof Error) {
        errorMessage = `Analysis failed: ${error.message}`;
      }
      
      Alert.alert('Analysis Failed', errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
    setAnalysisResults(null);
    setAnalyzing(false);
  };

  const renderAnalysisResults = () => {
    if (!analysisResults) return null;

    switch (analysisType) {
      case 'meal':
        return (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Nutrition Analysis</Text>
            {analysisResults.nutrition_summary && (
              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {analysisResults.nutrition_summary.calories || 0}
                  </Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {analysisResults.nutrition_summary.protein || 0}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {analysisResults.nutrition_summary.carbs || 0}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>
                    {analysisResults.nutrition_summary.fat || 0}g
                  </Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>
            )}
            {analysisResults.detected_foods && (
              <View style={styles.foodsList}>
                <Text style={styles.foodsTitle}>Detected Foods:</Text>
                {analysisResults.detected_foods.map((food: any, index: number) => (
                  <Text key={index} style={styles.foodItem}>
                    • {food.name} ({food.confidence}% confidence)
                  </Text>
                ))}
              </View>
            )}
          </View>
        );

      case 'receipt':
        return (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Receipt Scanned</Text>
            {analysisResults.items_added && (
              <Text style={styles.successText}>
                Added {analysisResults.items_added} items to inventory
              </Text>
            )}
            {analysisResults.detected_items && (
              <View style={styles.itemsList}>
                {analysisResults.detected_items.map((item: any, index: number) => (
                  <Text key={index} style={styles.itemText}>
                    • {item.name} - ${item.price}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );

      case 'pantry':
        return (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Pantry Analysis</Text>
            {analysisResults.detected_ingredients && (
              <View style={styles.ingredientsList}>
                {analysisResults.detected_ingredients.map((ingredient: any, index: number) => (
                  <Text key={index} style={styles.ingredientText}>
                    • {ingredient.name} ({ingredient.estimated_quantity})
                  </Text>
                ))}
              </View>
            )}
          </View>
        );

      case 'ingredient':
        return (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Food Identification</Text>
            {analysisResults.identified_food && (
              <View style={styles.identificationResult}>
                <Text style={styles.foodName}>{analysisResults.identified_food.name}</Text>
                <Text style={styles.confidence}>
                  {analysisResults.identified_food.confidence}% confidence
                </Text>
                {analysisResults.identified_food.nutrition && (
                  <Text style={styles.nutritionInfo}>
                    {analysisResults.identified_food.nutrition.calories} calories per serving
                  </Text>
                )}
              </View>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Analysis Complete</Text>
            <Text style={styles.genericResult}>
              {JSON.stringify(analysisResults, null, 2)}
            </Text>
          </View>
        );
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: config.color }, style]}
        onPress={showImagePicker}
      >
        <Icon name={config.icon as any} size={24} color="white" />
        <View style={styles.buttonText}>
          <Text style={styles.buttonTitle}>{config.title}</Text>
          <Text style={styles.buttonSubtitle}>{config.subtitle}</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{config.title}</Text>
            <TouchableOpacity onPress={closeModal}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
          )}

          {analyzing && (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color={config.color} />
              <Text style={styles.analyzingText}>Analyzing photo...</Text>
            </View>
          )}

          {renderAnalysisResults()}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginVertical: 5,
  },
  buttonText: {
    marginLeft: 12,
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  selectedImage: {
    width: '100%',
    height: 250,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  analyzingContainer: {
    alignItems: 'center',
    padding: 30,
  },
  analyzingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  resultsContainer: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  foodsList: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  foodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  foodItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  successText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  itemsList: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ingredientsList: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
  },
  ingredientText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  identificationResult: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  confidence: {
    fontSize: 16,
    color: '#10B981',
    marginBottom: 10,
  },
  nutritionInfo: {
    fontSize: 14,
    color: '#666',
  },
  genericResult: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default PhotoAnalysisButton;