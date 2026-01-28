import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PreservationSystemScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Preservation System</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default PreservationSystemScreen;