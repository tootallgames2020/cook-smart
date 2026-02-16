import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';
import {API_BASE_URL} from '../config/api';
import authService from '../services/authService';

interface WelcomeContent {
  paragraphs: string[];
  boldParagraphs: string[];
  signature: string;
  postscript: string;
}

interface WelcomeData {
  hasWelcomeScreen: boolean;
  screenType: string;
  title: string;
  emoji: string;
  musicFile?: string;
  badgeText: string;
  content: WelcomeContent;
  storageKey: string;
}

const CoFounderWelcomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [sound, setSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicLoaded, setMusicLoaded] = useState(false);
  const [welcomeData, setWelcomeData] = useState<WelcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch welcome content from API
  useEffect(() => {
    const fetchWelcomeContent = async () => {
      try {
        const token = await authService.getStoredToken();
        if (!token) {
          navigation.navigate('Main' as never);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/welcome/my-welcome`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        
        if (data.success && data.hasWelcomeScreen) {
          setWelcomeData(data.welcomeContent);
        } else {
          // No welcome screen configured, go to main
          navigation.navigate('Main' as never);
          return;
        }
      } catch (error) {
        console.error('Failed to fetch welcome content:', error);
        Alert.alert('Error', 'Failed to load welcome content');
        navigation.navigate('Main' as never);
        return;
      } finally {
        setLoading(false);
      }
    };

    fetchWelcomeContent();
  }, [navigation]);

  useEffect(() => {
    if (!welcomeData?.musicFile) return;

    // Enable playback in silence mode
    Sound.setCategory('Playback');

    // Load the music file
    const music = new Sound(welcomeData.musicFile, Sound.MAIN_BUNDLE, error => {
      if (error) {
        setMusicLoaded(false);
        return;
      }
      setMusicLoaded(true);
      setSound(music);
      // Auto-play when loaded
      music.play(success => {
        if (success) {
        } else {
        }
      });
      setIsPlaying(true);
    });

    // Cleanup - stop and release the music when component unmounts
    return () => {
      music.stop();
      music.release();
    };
  }, [welcomeData?.musicFile]);

  const toggleMusic = () => {
    if (!sound) return;

    if (isPlaying) {
      sound.pause();
      setIsPlaying(false);
    } else {
      sound.play(success => {
        if (success) {
          setIsPlaying(false);
          sound.setCurrentTime(0);
        }
      });
      setIsPlaying(true);
    }
  };

  const handleContinue = async () => {
    // Stop music before leaving
    if (sound) {
      sound.stop();
      sound.release();
    }
    
    // Mark that we've shown the welcome screen (only on first visit)
    if (welcomeData?.storageKey) {
      const hasShown = await AsyncStorage.getItem(welcomeData.storageKey);
      if (!hasShown) {
        await AsyncStorage.setItem(welcomeData.storageKey, 'true');
      }
    }
    
    // Go back to previous screen (or navigate to Main if this is first visit)
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as never);
    }
  };

  // Show loading state
  if (loading || !welcomeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your welcome...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.heart}>{welcomeData.emoji}</Text>
            <Text style={styles.title}>{welcomeData.title}</Text>
          </View>

          <View style={styles.letterContainer}>
            {/* Render regular paragraphs */}
            {welcomeData.content.paragraphs.map((paragraph, index) => (
              <Text key={`paragraph-${index}`} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}

            {/* Render bold paragraphs */}
            {welcomeData.content.boldParagraphs.map((paragraph, index) => (
              <Text key={`bold-${index}`} style={styles.paragraphBold}>
                {paragraph}
              </Text>
            ))}

            {/* Render signature */}
            {welcomeData.content.signature && (
              <Text style={styles.signature}>
                {welcomeData.content.signature}
              </Text>
            )}

            {/* Render postscript */}
            {welcomeData.content.postscript && (
              <Text style={styles.postscript}>
                {welcomeData.content.postscript}
              </Text>
            )}
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{welcomeData.badgeText}</Text>
          </View>

          {musicLoaded && welcomeData.musicFile && (
            <TouchableOpacity style={styles.musicButton} onPress={toggleMusic}>
              <Text style={styles.musicButtonText}>
                {isPlaying ? '⏸️ Pause Music' : '▶️ Play Music'}
              </Text>
              <Text style={styles.songInfo}>
                A special song for you {welcomeData.emoji}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              Continue to Cook Smart 🍳
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  heart: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#BE123C',
    textAlign: 'center',
  },
  letterContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  paragraph: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    marginBottom: 20,
    textAlign: 'left',
  },
  paragraphBold: {
    fontSize: 17,
    fontWeight: '600',
    color: '#BE123C',
    lineHeight: 26,
    marginBottom: 24,
    marginTop: 8,
    textAlign: 'left',
  },
  signature: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
    fontStyle: 'italic',
    textAlign: 'left',
  },
  postscript: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'left',
  },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#D97706',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  musicButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  musicButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  songInfo: {
    color: '#E9D5FF',
    fontSize: 13,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#BE123C',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#BE123C',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default CoFounderWelcomeScreen;
