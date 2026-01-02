import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useIngredients} from '../../contexts/IngredientContext';
import PhotoPicker from '../../components/PhotoPicker';
import {uploadPhoto} from '../../services/userRecipeService';
import {BarcodeScannerModal} from '../../components/barcode/BarcodeScannerModal';
import {ManualBarcodeEntryModal} from '../../components/barcode/ManualBarcodeEntryModal';
import {ScannedProduct} from '../../services/productLookupService';
import {barcodeService} from '../../services/barcodeService';

export const AddIngredientScreen: React.FC = () => {
  const navigation = useNavigation();
  const {addIngredient} = useIngredients();

  const [showCustomModal, setShowCustomModal] = useState(false);

  // Barcode scanner state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null,
  );
  const [_hasCameraAvailable, setHasCameraAvailable] = useState(true);
  const [_isLoading, setIsLoading] = useState(false);

  // Custom ingredient form state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Other');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('unit');
  const [photo, setPhoto] = useState('');

  // Check camera availability on mount
  useEffect(() => {
    checkCameraAvailability();
  }, []);

  // Auto-add scanned product to inventory with confirmation
  useEffect(() => {
    if (scannedProduct) {
      handleAutoAddScannedProduct(scannedProduct);
    }
  }, [scannedProduct]);

  const checkCameraAvailability = async () => {
    try {
      const status = await barcodeService.checkCameraPermission();
      setHasCameraAvailable(status !== 'unavailable');
    } catch (error) {
      console.error('Error checking camera availability:', error);
      setHasCameraAvailable(false);
    }
  };

  const handleScanBarcode = () => {
    // Check if form has data
    if (customName.trim()) {
      Alert.alert(
        'Discard Changes?',
        'Scanning a barcode will replace the current form data. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: () => {
              setCustomName('');
              setCustomCategory('Other');
              setQuantity('1');
              setUnit('unit');
              setShowScannerModal(true);
            },
          },
        ],
      );
    } else {
      setShowScannerModal(true);
    }
  };

  const handleBarcodeScanned = (productData: ScannedProduct) => {
    setScannedProduct(productData);
  };

  const handleAutoAddScannedProduct = async (productData: ScannedProduct) => {
    try {
      // Smart unit detection based on product type
      const smartUnit = getSmartUnit(
        productData.category || 'other',
        productData.name,
      );
      const defaultQuantity = getDefaultQuantity(
        productData.category || 'other',
      );

      // Show confirmation dialog with auto-populated data
      Alert.alert(
        'Add to Inventory',
        `Found: ${productData.name}\nCategory: ${productData.category || 'Other'}\nQuantity: ${defaultQuantity} ${smartUnit}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setScannedProduct(null),
          },
          {
            text: 'Edit Details',
            onPress: () => {
              // Pre-populate and show custom modal for editing
              setCustomName(productData.name);
              setCustomCategory(productData.category || 'Other');
              setQuantity(defaultQuantity);
              setUnit(smartUnit);
              setShowCustomModal(true);
              setScannedProduct(null);
            },
          },
          {
            text: 'Add Now',
            style: 'default',
            onPress: () =>
              addScannedProductDirectly(
                productData,
                defaultQuantity,
                smartUnit,
              ),
          },
        ],
      );
    } catch (error) {
      console.error('Error handling scanned product:', error);
      Alert.alert('Error', 'Failed to process scanned product');
      setScannedProduct(null);
    }
  };

  const getSmartUnit = (category: string, name: string): string => {
    const categoryLower = (category || '').toLowerCase();
    const nameLower = name.toLowerCase();

    // Liquid products
    if (
      categoryLower.includes('beverage') ||
      categoryLower.includes('drink') ||
      nameLower.includes('milk') ||
      nameLower.includes('juice') ||
      nameLower.includes('water') ||
      nameLower.includes('soda')
    ) {
      return 'fl oz';
    }

    // Canned goods
    if (categoryLower.includes('canned') || nameLower.includes('can')) {
      return 'can';
    }

    // Packaged items
    if (
      categoryLower.includes('snack') ||
      categoryLower.includes('cereal') ||
      categoryLower.includes('pasta') ||
      categoryLower.includes('rice')
    ) {
      return 'box';
    }

    // Fresh produce
    if (
      categoryLower.includes('fruit') ||
      categoryLower.includes('vegetable') ||
      categoryLower.includes('produce')
    ) {
      return 'lb';
    }

    // Default to items for most products
    return 'item';
  };

  const getDefaultQuantity = (category: string): string => {
    const categoryLower = (category || '').toLowerCase();

    // Bulk items get higher default quantities
    if (
      categoryLower.includes('produce') ||
      categoryLower.includes('fruit') ||
      categoryLower.includes('vegetable')
    ) {
      return '2'; // 2 lbs of produce
    }

    if (categoryLower.includes('beverage') || categoryLower.includes('drink')) {
      return '16'; // 16 fl oz
    }

    // Most packaged items default to 1
    return '1';
  };

  const addScannedProductDirectly = async (
    productData: ScannedProduct,
    productQuantity: string,
    productUnit: string,
  ) => {
    try {
      setIsLoading(true);

      const ingredientData = {
        name: productData.name,
        category: productData.category || 'Other',
        quantity: parseFloat(productQuantity),
        unit: productUnit,
        expiration_date: null,
        notes: `Added via barcode scan${productData.barcode ? ` (${productData.barcode})` : ''}`,
      };

      await addIngredient(ingredientData);

      Alert.alert(
        'Success! 🎉',
        `${productData.name} has been added to your inventory`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );

      setScannedProduct(null);
    } catch (error) {
      console.error('Error adding scanned ingredient:', error);
      Alert.alert('Error', 'Failed to add ingredient to inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = () => {
    setShowManualEntryModal(true);
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) {
      Alert.alert('Error', 'Please enter an ingredient name');
      return;
    }

    try {
      if (photo) {
        await uploadPhoto(photo, 'ingredient');
      }

      await addIngredient({
        customName: customName.trim(),
        category: customCategory,
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || 'unit',
      });

      // Close modal first
      setShowCustomModal(false);

      // Reset form
      setCustomName('');
      setCustomCategory('Other');
      setQuantity('1');
      setUnit('unit');
      setPhoto('');

      // Show success and navigate back
      Alert.alert(
        'Success',
        'Custom ingredient added! Pull down to refresh the list.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to ingredients list
              navigation.goBack();
            },
          },
        ],
      );
    } catch (_error) {
      Alert.alert('Error', 'Failed to add custom ingredient');
    }
  };

  const categories = [
    'Proteins',
    'Vegetables',
    'Fruits',
    'Grains',
    'Dairy',
    'Spices',
    'Other',
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Ingredient</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Scan Barcode Button - Always show */}
      <TouchableOpacity style={styles.scanButton} onPress={handleScanBarcode}>
        <Icon name="qr-code-scanner" size={24} color="#10B981" />
        <Text style={styles.scanButtonText}>Scan Barcode</Text>
      </TouchableOpacity>

      <View style={styles.centerContainer}>
        <Icon name="kitchen" size={64} color="#10B981" />
        <Text style={styles.emptyTitle}>Add Ingredients</Text>
        <Text style={styles.emptySubtext}>
          Scan a barcode or add a custom ingredient below
        </Text>
      </View>

      <TouchableOpacity
        style={styles.customButton}
        onPress={() => setShowCustomModal(true)}>
        <Icon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.customButtonText}>Add Custom Ingredient</Text>
      </TouchableOpacity>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onBarcodeScanned={handleBarcodeScanned}
        onManualEntry={handleManualEntry}
      />

      {/* Manual Barcode Entry Modal */}
      <ManualBarcodeEntryModal
        visible={showManualEntryModal}
        onClose={() => setShowManualEntryModal(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />

      {/* Custom Ingredient Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomModal(false)}>
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Ingredient</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              <PhotoPicker onPhotoSelected={setPhoto} currentPhoto={photo} />

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ingredient Name *</Text>
                <TextInput
                  style={styles.input}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="e.g., Organic Honey"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        customCategory === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => setCustomCategory(cat)}>
                      <Text
                        style={[
                          styles.categoryChipText,
                          customCategory === cat &&
                            styles.categoryChipTextActive,
                        ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, styles.flex1]}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View
                  style={[styles.formGroup, styles.flex1, styles.marginLeft]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="unit"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              {/* Save button inside ScrollView with extra padding */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCustom}>
                <Text style={styles.saveButtonText}>Add Ingredient</Text>
              </TouchableOpacity>

              {/* Extra padding at bottom to ensure button is always visible */}
              <View style={styles.bottomPadding} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  placeholder: {
    width: 32,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  scanButtonText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 0, // Remove bottom padding since ScrollView handles it
    maxHeight: '90%', // Increased from 85% to give more space
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 24, // Padding inside scroll content
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24, // Increased margin for better spacing
    marginHorizontal: 0, // Ensure full width within scroll content
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40, // Extra space at bottom to ensure save button is always accessible
  },
});
