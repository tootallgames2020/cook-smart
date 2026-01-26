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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice from '@react-native-voice/voice';

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
      Voice.destroy().then(Voice.removeAllListeners);
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
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      // iOS permission handling would go here
      setHasPermission(true);
    }
  };

  const setupVoiceRecognition = () => {
    Voice.onSpeechStart = () => {
      setIsListening(true);
      startPulseAnimation();
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      stopPulseAnimation();
    };

    Voice.onSpeechResults = (event) => {
      if (event.value && event.value[0]) {
        const command = event.value[0];
        setVoiceText(command);
        onVoiceCommand?.(command);
      }
    };

    Voice.onSpeechError = (error) => {
      console.error('Voice recognition error:', error);
      setIsListening(false);
      stopPulseAnimation();
      Alert.alert('Voice Error', 'Could not recognize speech. Please try again.');
    };
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

  const handleVoicePress = async () => {
    if (!hasPermission) {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone access in settings to use voice commands.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {/* Open settings */} },
        ]
      );
      return;
    }

    try {
      if (isListening) {
        await Voice.stop();
      } else {
        setVoiceText('');
        await Voice.start('en-US');
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
          <Ionicons
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
    animationDelay: '0s',
  },
  wave2: {
    height: 15,
    animationDelay: '0.1s',
  },
  wave3: {
    height: 8,
    animationDelay: '0.2s',
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