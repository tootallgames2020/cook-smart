import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';
import {SafeAreaView} from 'react-native-safe-area-context';

const SpecialUserWelcomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [sound, setSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicLoaded, setMusicLoaded] = useState(false);

  useEffect(() => {
    // Enable playback in silence mode
    Sound.setCategory('Playback');

    // Load the music file
    const music = new Sound('mom_song.mp3', Sound.MAIN_BUNDLE, error => {
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

    return () => {
      if (sound) {
        sound.stop();
        sound.release();
      }
    };
  }, [sound]);

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
    if (sound) {
      sound.stop();
      sound.release();
    }
    // Mark that we've shown the welcome screen (only on first visit)
    const hasShown = await AsyncStorage.getItem('special_user_welcome_shown');
    if (!hasShown) {
      await AsyncStorage.setItem('special_user_welcome_shown', 'true');
    }
    // Go back to previous screen (or navigate to Main if this is first visit)
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main' as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>💐</Text>
            <Text style={styles.title}>Welcome, Mom!</Text>
          </View>

          <View style={styles.letterContainer}>
            <Text style={styles.paragraph}>
              When I was a kid, you worked your tail off to make sure I had
              everything I needed. I may not have always had what I wanted, but
              I always had what I needed. Things weren't always perfect, but I
              miss those days more than you know.
            </Text>

            <Text style={styles.paragraph}>
              Growing up, we had our disagreements - I see that now for what it
              really was. You just wanted the best for me, even when I couldn't
              see it.
            </Text>

            <Text style={styles.paragraph}>
              I've tried so many different paths in life, and I know you've
              worried about me through all of them. These past few years on the
              road have taken me almost 1,000 miles away, and the distance has
              cost me something I can never get back - time with you and our
              family.
            </Text>

            <Text style={styles.paragraph}>
              I know growing up means going out on your own, and I've tried my
              best to do that. But I've missed too much. Too many moments. Too
              much time with the people who matter most.
            </Text>

            <Text style={styles.paragraph}>
              This app is part of something bigger I'm working toward - a way to
              build a life where I don't have to choose between providing and
              being present. Where I can be there for the moments that matter.
            </Text>

            <Text style={styles.paragraphBold}>
              I just want you to know that I love you. I'm so grateful for
              everything you sacrificed, for every time you pointed me in the
              right direction even when I didn't want to hear it, and for being
              the mother who gave me everything I needed to become who I am.
            </Text>

            <Text style={styles.paragraphBold}>
              Thank you, Mom. For everything.
            </Text>

            <Text style={styles.signature}>
              With all my love,{'\n'}
              Brad
            </Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>💝 SPECIAL ACCESS - LIFETIME</Text>
          </View>

          {musicLoaded && (
            <TouchableOpacity style={styles.musicButton} onPress={toggleMusic}>
              <Text style={styles.musicButtonText}>
                {isPlaying ? '⏸️ Pause Music' : '▶️ Play Music'}
              </Text>
              <Text style={styles.songInfo}>A special song for you 💕</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
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
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#DB2777',
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
    color: '#DB2777',
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
    backgroundColor: '#DB2777',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#BE185D',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  musicButton: {
    backgroundColor: '#A855F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#A855F7',
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
    color: '#F3E8FF',
    fontSize: 13,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: '#DB2777',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#DB2777',
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

export default SpecialUserWelcomeScreen;
