import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Props {
  instructions: string[];
  estimatedTime?: number;
}

export const CookingInstructions: React.FC<Props> = ({
  instructions,
  estimatedTime
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);

  const toggleStep = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
    }
    setCompletedSteps(newCompleted);
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const nextStep = () => {
    if (currentStep < instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Instructions</Text>
        {estimatedTime && (
          <Text style={styles.timeEstimate}>⏱️ ~{estimatedTime} min</Text>
        )}
      </View>

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progress, 
            { width: `${((completedSteps.size) / instructions.length) * 100}%` }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>
        {completedSteps.size} of {instructions.length} steps completed
      </Text>

      <ScrollView style={styles.instructionsList}>
        {instructions.map((instruction, index) => {
          const isCompleted = completedSteps.has(index);
          const isCurrent = index === currentStep;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.instructionItem,
                isCurrent && styles.currentStep,
                isCompleted && styles.completedStep
              ]}
              onPress={() => goToStep(index)}
            >
              <View style={styles.stepHeader}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleStep(index)}
                >
                  <Text style={styles.checkboxText}>
                    {isCompleted ? '✅' : '⬜'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.stepNumber}>Step {index + 1}</Text>
              </View>
              
              <Text style={[
                styles.instructionText,
                isCompleted && styles.completedText,
                isCurrent && styles.currentText
              ]}>
                {instruction}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 0 && styles.disabledButton]}
          onPress={prevStep}
          disabled={currentStep === 0}
        >
          <Text style={[styles.navButtonText, currentStep === 0 && styles.disabledText]}>
            ← Previous
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.stepIndicator}>
          {currentStep + 1} / {instructions.length}
        </Text>
        
        <TouchableOpacity
          style={[styles.navButton, currentStep === instructions.length - 1 && styles.disabledButton]}
          onPress={nextStep}
          disabled={currentStep === instructions.length - 1}
        >
          <Text style={[styles.navButtonText, currentStep === instructions.length - 1 && styles.disabledText]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeEstimate: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progress: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionsList: {
    marginBottom: 16,
  },
  instructionItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  currentStep: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8f0',
  },
  completedStep: {
    backgroundColor: '#e8f5e8',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxText: {
    fontSize: 18,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  completedText: {
    color: '#999',
  },
  currentText: {
    fontWeight: '500',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledText: {
    color: '#999',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
  },
});