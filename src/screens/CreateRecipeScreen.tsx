import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import PhotoPicker from '../components/PhotoPicker';
import {createUserRecipe, uploadPhoto} from '../services/userRecipeService';

export default function CreateRecipeScreen({navigation}: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    'medium',
  );
  const [isPublic, setIsPublic] = useState(false);
  const [photo, setPhoto] = useState('');
  const [ingredients, setIngredients] = useState([
    {name: '', quantity: '', unit: ''},
  ]);
  const [instructions, setInstructions] = useState([
    {step_number: 1, instruction: ''},
  ]);
  const [loading, setLoading] = useState(false);

  const addIngredient = () => {
    setIngredients([...ingredients, {name: '', quantity: '', unit: ''}]);
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index] = {...updated[index], [field]: value};
    setIngredients(updated);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setInstructions([
      ...instructions,
      {step_number: instructions.length + 1, instruction: ''},
    ]);
  };

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions];
    updated[index].instruction = value;
    setInstructions(updated);
  };

  const removeInstruction = (index: number) => {
    const updated = instructions.filter((_, i) => i !== index);
    updated.forEach((inst, i) => (inst.step_number = i + 1));
    setInstructions(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a recipe title');
      return;
    }

    const validIngredients = ingredients.filter(i => i.name.trim());
    if (validIngredients.length === 0) {
      Alert.alert('Error', 'Please add at least one ingredient');
      return;
    }

    const validInstructions = instructions.filter(i => i.instruction.trim());
    if (validInstructions.length === 0) {
      Alert.alert('Error', 'Please add at least one instruction');
      return;
    }

    setLoading(true);
    try {
      // Upload photo first if provided
      let photoUrl = '';
      if (photo) {
        photoUrl = await uploadPhoto(photo, 'recipe');
      }

      await createUserRecipe({
        title,
        description,
        prepTime: parseInt(prepTime) || 0,
        cookTime: parseInt(cookTime) || 0,
        servings: parseInt(servings) || 4,
        difficulty,
        isPublic,
        ingredients: validIngredients.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit
        })),
        instructions: validInstructions.map(inst => inst.instruction),
        imageUrl: photoUrl || undefined,
      });

      Alert.alert('Success', 'Recipe created successfully!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (_error) {
      Alert.alert('Error', 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Icon name="restaurant-menu" size={48} color="#FF6B6B" />
        <Text style={styles.title}>Create Your Recipe</Text>
      </View>

      <PhotoPicker onPhotoSelected={setPhoto} currentPhoto={photo} />

      <View style={styles.section}>
        <Text style={styles.label}>Recipe Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Mom's Spaghetti"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Brief description of your recipe"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfSection}>
          <Text style={styles.label}>Prep Time (min)</Text>
          <TextInput
            style={styles.input}
            value={prepTime}
            onChangeText={setPrepTime}
            keyboardType="numeric"
            placeholder="15"
          />
        </View>
        <View style={styles.halfSection}>
          <Text style={styles.label}>Cook Time (min)</Text>
          <TextInput
            style={styles.input}
            value={cookTime}
            onChangeText={setCookTime}
            keyboardType="numeric"
            placeholder="30"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfSection}>
          <Text style={styles.label}>Servings</Text>
          <TextInput
            style={styles.input}
            value={servings}
            onChangeText={setServings}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfSection}>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.difficultyRow}>
            {(['easy', 'medium', 'hard'] as const).map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.difficultyButton,
                  difficulty === level && styles.difficultyButtonActive,
                ]}
                onPress={() => setDifficulty(level)}>
                <Text
                  style={[
                    styles.difficultyText,
                    difficulty === level && styles.difficultyTextActive,
                  ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.shareSection}>
          <View style={styles.shareInfo}>
            <Icon name="public" size={24} color="#3B82F6" />
            <View style={styles.shareText}>
              <Text style={styles.shareTitle}>Share with Community</Text>
              <Text style={styles.shareSubtitle}>
                Let other users discover your recipe
              </Text>
            </View>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{false: '#ccc', true: '#3B82F6'}}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ingredients *</Text>
          <TouchableOpacity onPress={addIngredient} style={styles.addButton}>
            <Icon name="add" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
        {ingredients.map((ing, index) => (
          <View key={index} style={styles.ingredientRow}>
            <TextInput
              style={[styles.input, styles.ingredientName]}
              value={ing.name}
              onChangeText={v => updateIngredient(index, 'name', v)}
              placeholder="Ingredient"
            />
            <TextInput
              style={[styles.input, styles.ingredientQty]}
              value={ing.quantity}
              onChangeText={v => updateIngredient(index, 'quantity', v)}
              placeholder="Qty"
            />
            <TextInput
              style={[styles.input, styles.ingredientUnit]}
              value={ing.unit}
              onChangeText={v => updateIngredient(index, 'unit', v)}
              placeholder="Unit"
            />
            <TouchableOpacity onPress={() => removeIngredient(index)}>
              <Icon name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Instructions *</Text>
          <TouchableOpacity onPress={addInstruction} style={styles.addButton}>
            <Icon name="add" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
        {instructions.map((inst, index) => (
          <View key={index} style={styles.instructionRow}>
            <Text style={styles.stepNumber}>{inst.step_number}</Text>
            <TextInput
              style={[styles.input, styles.instructionInput]}
              value={inst.instruction}
              onChangeText={v => updateInstruction(index, v)}
              placeholder="Describe this step"
              multiline
            />
            <TouchableOpacity onPress={() => removeInstruction(index)}>
              <Icon name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}>
        <Text style={styles.submitButtonText}>
          {loading ? 'Creating...' : 'Create Recipe'}
        </Text>
      </TouchableOpacity>

      <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  halfSection: {
    flex: 1,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  difficultyText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  difficultyTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    padding: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ingredientName: {
    flex: 2,
  },
  ingredientQty: {
    flex: 1,
  },
  ingredientUnit: {
    flex: 1,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  instructionInput: {
    flex: 1,
    minHeight: 60,
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  shareSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  shareInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  shareText: {
    flex: 1,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  shareSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
