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
        // First check if we already have permission
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        
        if (hasPermission) {
          setHasPermission(true);
          return true;
        }

        // If we don't have permission, request it
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
        
        const permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasPermission(permissionGranted);
        return permissionGranted;
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
    Voice.onSpeechStart = () => {
      console.log('Speech started');
    };

    Voice.onSpeechEnd = () => {
      console.log('Speech ended');
      setIsListening(false);
      stopPulseAnimation();
    };

    Voice.onSpeechResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        const recognizedText = e.value[0];
        setVoiceText(recognizedText);
        onVoiceCommand?.(recognizedText);
      }
    };

    Voice.onSpeechError = (e: any) => {
      console.error('Speech error:', e);
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

  const openAppSettings = () => {
    if (Platform.OS === 'android') {
      // Use the most reliable method for Android
      Linking.openSettings()
        .catch(() => {
          // If that fails, show manual instructions
          Alert.alert(
            'Open Settings',
            'To enable microphone for voice commands:\n\n1. Go to Settings > Apps > Cook Smart > Permissions\n2. Enable Microphone permission\n\nNote: Microphone will only appear after the app requests it. Try using the voice feature first.',
            [{ text: 'OK' }]
          );
        });
    } else {
      // iOS - open app-specific settings
      Linking.openURL('app-settings:');
    }
  };

  const handleVoicePress = async () => {
    // Always check/request permission when user taps the button
    const permissionGranted = await checkMicrophonePermission();
    if (!permissionGranted) {
      Alert.alert(
        'Microphone Permission Required',
        'To enable voice commands:\n\n1. Tap "Allow" when the app asks for microphone access\n2. If you previously denied it, go to Settings > Apps > Cook Smart > Permissions and enable Microphone\n\nNote: The microphone permission will only appear in settings after the app requests it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: openAppSettings },
        ]
      );
      return;
    }

    try {
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
        stopPulseAnimation();
      } else {
        setVoiceText('');
        setIsListening(true);
        startPulseAnimation();
        await Voice.start('en-US');
      }
    } catch (error) {
      console.error('Voice start error:', error);
      setIsListening(false);
      stopPulseAnimation();
      Alert.alert('Voice Error', 'Could not start voice recognition. Please try again.');
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

  return React.createElement(
    View,
    {
      style: [
        position === 'floating' ? styles.floatingContainer : styles.inlineContainer,
        style
      ]
    },
    React.createElement(
      Animated.View,
      { style: { transform: [{ scale: pulseAnim }] } },
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.voiceButton,
            {
              width: buttonSize,
              height: buttonSize,
              borderRadius: buttonSize / 2,
              backgroundColor: isListening ? '#FF6B6B' : '#4ECDC4',
            }
          ],
          onPress: handleVoicePress,
          activeOpacity: 0.8
        },
        React.createElement(Icon, {
          name: 'mic',
          size: iconSize,
          color: 'white'
        })
      )
    ),
    
    isListening && React.createElement(
      View,
      { style: styles.listeningIndicator },
      React.createElement(Text, { style: styles.listeningText }, 'Listening...'),
      React.createElement(
        View,
        { style: styles.waveform },
        React.createElement(View, { style: [styles.wave, styles.wave1] }),
        React.createElement(View, { style: [styles.wave, styles.wave2] }),
        React.createElement(View, { style: [styles.wave, styles.wave3] })
      )
    ),

    voiceText && !isListening && React.createElement(
      View,
      { style: styles.voiceTextContainer },
      React.createElement(Text, { style: styles.voiceText }, `"${voiceText}"`)
    )
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