import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Alert,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface VoiceCommandButtonProps {
  onVoiceCommand?: (command: string) => void;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  position?: 'floating' | 'inline';
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  onVoiceCommand,
  style,
  size = 'medium',
  position = 'floating',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    checkMicrophonePermission();
    setupVoiceRecognition();
    
    return () => {
      // Cleanup would go here
    };
  }, []);

  const checkMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Cook Smart Voice Commands',
            message: 'Cook Smart needs access to your microphone for voice commands',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(hasPermission);
        return hasPermission;
      } catch (err) {
        console.warn('Permission request error:', err);
        setHasPermission(false);
        return false;
      }
    } else {
      // iOS permission handling would go here
      // For now, assume permission is granted on iOS
      setHasPermission(true);
      return true;
    }
  };

  const setupVoiceRecognition = () => {
    // Voice recognition setup would go here
    // For now, we'll just set up basic functionality
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const openAppSettings = () => {
    if (Platform.OS === 'android') {
      // Try to open app-specific settings page where user can manage permissions
      const packageName = 'com.cooksmartfresh';
      Linking.openURL(`android-app://com.android.settings/apps/detail/${packageName}`)
        .catch(() => {
          // Fallback to general app settings
          Linking.openSettings();
        });
    } else {
      // iOS - open app-specific settings
      Linking.openURL('app-settings:');
    }
  };

  const handleVoicePress = async () => {
    // First, try to get permission if we don't have it
    if (!hasPermission) {
      const permissionGranted = await checkMicrophonePermission();
      if (!permissionGranted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in settings to use voice commands.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: openAppSettings },
          ]
        );
        return;
      }
    }

    try {
      if (isListening) {
        setIsListening(false);
        stopPulseAnimation();
      } else {
        setVoiceText('');
        setIsListening(true);
        startPulseAnimation();
        // Simulate voice recognition for demo
        setTimeout(() => {
          setIsListening(false);
          stopPulseAnimation();
          setVoiceText('Voice command recognized');
          onVoiceCommand?.('Voice command recognized');
        }, 3000);
      }
    } catch (error) {
      console.error('Voice start error:', error);
      Alert.alert('Voice Error', 'Could not start voice recognition.');
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small': return 40;
      case 'large': return 80;
      default: return 60;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 40;
      default: return 30;
    }
  };

  const buttonSize = getButtonSize();
  const iconSize = getIconSize();

  return (
    <View style={[
      position === 'floating' ? styles.floatingContainer : styles.inlineContainer,
      style
    ]}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.voiceButton,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              backgroundColor: isListening ? '#FF6B6B' : '#4ECDC4',
            }
          ]}
          onPress={handleVoicePress}
          activeOpacity={0.8}
        >
          <Icon
            name={isListening ? 'mic' : 'mic-outline'}
            size={iconSize}
            color="white"
          />
        </TouchableOpacity>
      </Animated.View>
      
      {isListening && (
        <View style={styles.listeningIndicator}>
          <Text style={styles.listeningText}>Listening...</Text>
          <View style={styles.waveform}>
            <View style={[styles.wave, styles.wave1]} />
            <View style={[styles.wave, styles.wave2]} />
            <View style={[styles.wave, styles.wave3]} />
          </View>
        </View>
      )}

      {voiceText && !isListening && (
        <View style={styles.voiceTextContainer}>
          <Text style={styles.voiceText}>"{voiceText}"</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  inlineContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  voiceButton: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  listeningIndicator: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  listeningText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    width: 3,
    backgroundColor: '#4ECDC4',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  wave1: {
    height: 10,
  },
  wave2: {
    height: 15,
  },
  wave3: {
    height: 8,
  },
  voiceTextContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    maxWidth: 200,
  },
  voiceText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VoiceCommandButton;