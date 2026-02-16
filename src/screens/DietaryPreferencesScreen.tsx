import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAuth} from '../contexts/AuthContext';
import {dietaryService} from '../services/dietaryService';

const DIETARY_RESTRICTIONS = [
  {id: 'vegetarian', label: 'Vegetarian', icon: 'eco'},
  {id: 'vegan', label: 'Vegan', icon: 'spa'},
  {id: 'gluten-free', label: 'Gluten-Free', icon: 'grain'},
  {id: 'dairy-free', label: 'Dairy-Free', icon: 'no-meals'},
  {id: 'keto', label: 'Keto', icon: 'fitness-center'},
  {id: 'paleo', label: 'Paleo', icon: 'restaurant'},
  {id: 'low-carb', label: 'Low Carb', icon: 'trending-down'},
  {id: 'halal', label: 'Halal', icon: 'mosque'},
  {id: 'kosher', label: 'Kosher', icon: 'star'},
];

const COMMON_ALLERGIES = [
  {id: 'peanuts', label: 'Peanuts', icon: 'warning'},
  {id: 'tree-nuts', label: 'Tree Nuts', icon: 'warning'},
  {id: 'milk', label: 'Milk/Dairy', icon: 'warning'},
  {id: 'eggs', label: 'Eggs', icon: 'warning'},
  {id: 'wheat', label: 'Wheat/Gluten', icon: 'warning'},
  {id: 'soy', label: 'Soy', icon: 'warning'},
  {id: 'fish', label: 'Fish', icon: 'warning'},
  {id: 'shellfish', label: 'Shellfish', icon: 'warning'},
  {id: 'sesame', label: 'Sesame', icon: 'warning'},
];

interface DietaryPreferencesScreenProps {
  navigation: any;
}

const DietaryPreferencesScreen: React.FC<DietaryPreferencesScreenProps> = ({
  navigation,
}) => {
  const {user} = useAuth();
  const [selectedDiets, setSelectedDiets] = useState<number[]>([]);
  const [selectedAllergies, setSelectedAllergies] = useState<number[]>([]);
  const [customDiets, setCustomDiets] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [showNutrition, setShowNutrition] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [availableRestrictions, setAvailableRestrictions] = useState<any[]>([]);
  const [availableAllergies, setAvailableAllergies] = useState<any[]>([]);

  // Map UI keys to database names for matching
  const dietKeyToName: Record<string, string> = {
    'vegetarian': 'Vegetarian',
    'vegan': 'Vegan',
    'gluten-free': 'Gluten-Free',
    'dairy-free': 'Dairy-Free',
    'keto': 'Keto',
    'paleo': 'Paleo',
    'low-carb': 'Low-Sodium', // Map low-carb to low-sodium
    'halal': 'Halal',
    'kosher': 'Kosher',
  };

  const allergyKeyToName: Record<string, string> = {
    'peanuts': 'Peanut Allergy',
    'tree-nuts': 'Tree Nut Allergy',
    'milk': 'Dairy Allergy',
    'eggs': 'Egg Allergy',
    'soy': 'Soy Allergy',
    'wheat': 'Wheat Allergy',
    'fish': 'Fish Allergy',
    'shellfish': 'Shellfish Allergy',
    'sesame': 'Sesame Allergy',
  };

  // Helper to get ID from key
  const getDietIdFromKey = (key: string): number | undefined => {
    const name = dietKeyToName[key];
    const found = availableRestrictions.find(r => r.name === name);
    if (!found) {
      
    }
    return found?.id;
  };

  const getAllergyIdFromKey = (key: string): number | undefined => {
    const name = allergyKeyToName[key];
    const found = availableAllergies.find(a => a.name === name);
    if (!found) {
      
    }
    return found?.id;
  };

  useEffect(() => {
    if (user?.id) {
      loadUserPreferences();
    }
  }, [user?.id]);

  const loadUserPreferences = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const [allRestrictions, allAllergies, userRestrictions, userAllergies] = await Promise.all([
        dietaryService.getAllRestrictions(),
        dietaryService.getAllAllergies(),
        dietaryService.getUserRestrictions(user.id),
        dietaryService.getUserAllergies(user.id),
      ]);

      setAvailableRestrictions(allRestrictions);
      setAvailableAllergies(allAllergies);
      setSelectedDiets(userRestrictions.map(r => r.id));
      setSelectedAllergies(userAllergies.map(a => a.id));

    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiet = (dietKey: string) => {
    const dietId = getDietIdFromKey(dietKey);
    if (!dietId) {
      return;
    }

    setSelectedDiets(prev =>
      prev.includes(dietId)
        ? prev.filter(id => id !== dietId)
        : [...prev, dietId],
    );
  };

  const toggleAllergy = (allergyKey: string) => {
    const allergyId = getAllergyIdFromKey(allergyKey);
    if (!allergyId) {
      return;
    }

    setSelectedAllergies(prev =>
      prev.includes(allergyId)
        ? prev.filter(id => id !== allergyId)
        : [...prev, allergyId],
    );
  };

  const addCustomDiet = () => {
    if (customInput.trim()) {
      setCustomDiets(prev => [...prev, customInput.trim()]);
      setCustomInput('');
      setShowDietModal(false);
    }
  };

  const addCustomAllergy = () => {
    if (customInput.trim()) {
      setCustomAllergies(prev => [...prev, customInput.trim()]);
      setCustomInput('');
      setShowAllergyModal(false);
    }
  };

  const removeCustomDiet = (diet: string) => {
    setCustomDiets(prev => prev.filter(d => d !== diet));
  };

  const removeCustomAllergy = (allergy: string) => {
    setCustomAllergies(prev => prev.filter(a => a !== allergy));
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setSaving(true);
    try {
      // Get current saved preferences to compare
      const [currentRestrictions, currentAllergies] = await Promise.all([
        dietaryService.getUserRestrictions(user.id),
        dietaryService.getUserAllergies(user.id),
      ]);

      const currentRestrictionIds = currentRestrictions.map(r => r.id);
      const currentAllergyIds = currentAllergies.map(a => a.id);

      // Add new restrictions
      const restrictionsToAdd = selectedDiets.filter(
        id => !currentRestrictionIds.includes(id),
      );
      for (const restrictionId of restrictionsToAdd) {
        await dietaryService.addUserRestriction(user.id, restrictionId);
      }

      // Remove unselected restrictions
      const restrictionsToRemove = currentRestrictionIds.filter(
        id => !selectedDiets.includes(id),
      );
      for (const restrictionId of restrictionsToRemove) {
        await dietaryService.removeUserRestriction(user.id, restrictionId);
      }

      // Add new allergies
      const allergiesToAdd = selectedAllergies.filter(
        id => !currentAllergyIds.includes(id),
      );
      for (const allergyId of allergiesToAdd) {
        await dietaryService.addUserAllergy(user.id, allergyId);
      }

      // Remove unselected allergies
      const allergiesToRemove = currentAllergyIds.filter(
        id => !selectedAllergies.includes(id),
      );
      for (const allergyId of allergiesToRemove) {
        await dietaryService.removeUserAllergy(user.id, allergyId);
      }

      Alert.alert('Success', 'Your dietary preferences have been saved!');
      navigation.goBack();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || availableRestrictions.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dietary Preferences</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Dietary Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <Text style={styles.sectionSubtitle}>
            Select any dietary preferences you follow
          </Text>
          <View style={styles.optionsGrid}>
            {DIETARY_RESTRICTIONS.map(diet => {
              const dietId = getDietIdFromKey(diet.id);
              const isSelected = dietId !== undefined && selectedDiets.includes(dietId);
              
              // Debug logging
              if (diet.id === 'dairy-free' || diet.id === 'vegetarian') {
              }
              
              return (
                <TouchableOpacity
                  key={diet.id}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => toggleDiet(diet.id)}>
                  <Icon
                    name={diet.icon}
                    size={24}
                    color={isSelected ? '#10B981' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}>
                    {diet.label}
                  </Text>
                  {isSelected && (
                    <Icon
                      name="check-circle"
                      size={20}
                      color="#10B981"
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
            {/* Add Other Button */}
            <TouchableOpacity
              style={[styles.optionCard, styles.otherCard]}
              onPress={() => setShowDietModal(true)}>
              <Icon name="add-circle-outline" size={24} color="#6B7280" />
              <Text style={styles.optionLabel}>Other</Text>
            </TouchableOpacity>
          </View>
          {/* Custom Diets */}
          {customDiets.length > 0 && (
            <View style={styles.customItemsContainer}>
              <Text style={styles.customItemsTitle}>Custom:</Text>
              {customDiets.map((diet, index) => (
                <View key={index} style={styles.customItem}>
                  <Text style={styles.customItemText}>{diet}</Text>
                  <TouchableOpacity onPress={() => removeCustomDiet(diet)}>
                    <Icon name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies & Intolerances</Text>
          <Text style={styles.sectionSubtitle}>
            Select any foods you're allergic to or intolerant of
          </Text>
          <View style={styles.optionsGrid}>
            {COMMON_ALLERGIES.map(allergy => {
              const allergyId = getAllergyIdFromKey(allergy.id);
              const isSelected = allergyId !== undefined && selectedAllergies.includes(allergyId);
              return (
                <TouchableOpacity
                  key={allergy.id}
                  style={[
                    styles.optionCard,
                    styles.allergyCard,
                    isSelected && styles.allergyCardSelected,
                  ]}
                  onPress={() => toggleAllergy(allergy.id)}>
                  <Icon
                    name={allergy.icon}
                    size={24}
                    color={isSelected ? '#EF4444' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.allergyLabelSelected,
                    ]}>
                    {allergy.label}
                  </Text>
                  {isSelected && (
                    <Icon
                      name="check-circle"
                      size={20}
                      color="#EF4444"
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
            {/* Add Other Button */}
            <TouchableOpacity
              style={[styles.optionCard, styles.allergyCard, styles.otherCard]}
              onPress={() => setShowAllergyModal(true)}>
              <Icon name="add-circle-outline" size={24} color="#6B7280" />
              <Text style={styles.optionLabel}>Other</Text>
            </TouchableOpacity>
          </View>
          {/* Custom Allergies */}
          {customAllergies.length > 0 && (
            <View style={styles.customItemsContainer}>
              <Text style={styles.customItemsTitle}>Custom:</Text>
              {customAllergies.map((allergy, index) => (
                <View
                  key={index}
                  style={[styles.customItem, styles.customAllergyItem]}>
                  <Text style={styles.customItemText}>{allergy}</Text>
                  <TouchableOpacity
                    onPress={() => removeCustomAllergy(allergy)}>
                    <Icon name="close" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Nutrition Display */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Nutrition Info</Text>
              <Text style={styles.settingSubtitle}>
                Display nutritional information in recipes
              </Text>
            </View>
            <Switch
              value={showNutrition}
              onValueChange={setShowNutrition}
              trackColor={{false: '#D1D5DB', true: '#86EFAC'}}
              thumbColor={showNutrition ? '#10B981' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="info-outline" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            Your preferences will be used to filter recipes and provide
            personalized recommendations.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Custom Diet Modal */}
      <Modal
        visible={showDietModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDietModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add Custom Dietary Restriction
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Low Sodium, Diabetic-Friendly"
              value={customInput}
              onChangeText={setCustomInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setCustomInput('');
                  setShowDietModal(false);
                }}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonAdd]}
                onPress={addCustomDiet}>
                <Text style={styles.modalButtonTextAdd}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Allergy Modal */}
      <Modal
        visible={showAllergyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAllergyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Allergy</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Sulfites, Nightshades"
              value={customInput}
              onChangeText={setCustomInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setCustomInput('');
                  setShowAllergyModal(false);
                }}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonAdd]}
                onPress={addCustomAllergy}>
                <Text style={styles.modalButtonTextAdd}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: '#111827',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    paddingHorizontal: 8,
  },
  saveTextDisabled: {
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    gap: 8,
  },
  optionCardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  allergyCard: {
    borderColor: '#FEE2E2',
  },
  allergyCardSelected: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  allergyLabelSelected: {
    color: '#EF4444',
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
  otherCard: {
    borderStyle: 'dashed',
  },
  customItemsContainer: {
    marginTop: 16,
    gap: 8,
  },
  customItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  customItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  customAllergyItem: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  customItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonAdd: {
    backgroundColor: '#10B981',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalButtonTextAdd: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DietaryPreferencesScreen;
