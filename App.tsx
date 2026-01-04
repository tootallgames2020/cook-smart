import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {AuthProvider, useAuth} from './src/contexts/AuthContext';
import {IngredientProvider} from './src/contexts/IngredientContext';
import {RecipeProvider} from './src/contexts/RecipeContext';
import {SubscriptionProvider} from './src/contexts/SubscriptionContext';
import {API_BASE_URL} from './src/config/api';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import CoFounderWelcomeScreen from './src/screens/CoFounderWelcomeScreen';
import {ForgotPasswordScreen} from './src/screens/ForgotPasswordScreen';
import {ResetPasswordScreen} from './src/screens/ResetPasswordScreen';
import {PrivacyPolicyScreen} from './src/screens/PrivacyPolicyScreen';
import {TermsOfServiceScreen} from './src/screens/TermsOfServiceScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import CookieConsent from './src/components/CookieConsent';
// Recipe API: FatSecret Platform (Premier)
import AsyncStorage from '@react-native-async-storage/async-storage';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {productLookupService} from './src/services/productLookupService';
import authService from './src/services/authService';
// Initialize Firebase
import '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

const Stack = createStackNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
  </Stack.Navigator>
);

const AppContent = () => {
  const {isAuthenticated, isLoading, user} = useAuth();
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [checkingWelcome, setCheckingWelcome] = useState(true);

  // Cleanup expired barcode cache on app startup
  useEffect(() => {
    productLookupService.clearExpiredCache().catch(error => {
      console.error('Failed to clear expired barcode cache:', error);
    });
  }, []);

  // Setup Firebase messaging
  useEffect(() => {
    // Request permission and get token on app start
    const setupMessaging = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('✅ Firebase messaging authorized');
        }
      } catch (error) {
        console.log('Firebase messaging setup error:', error);
      }
    };

    setupMessaging();

    // Handle foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('📬 Foreground notification:', remoteMessage);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const checkWelcomeScreen = async () => {
      try {
        const token = await authService.getStoredToken();
        if (!token) return;

        // Check if user has a welcome screen configured
        const response = await fetch(`${API_BASE_URL}/api/v1/welcome/my-welcome`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        
        if (data.success && data.hasWelcomeScreen) {
          // Check if we've already shown this user's welcome screen
          const hasShown = await AsyncStorage.getItem(data.welcomeContent.storageKey);
          setShowWelcomeScreen(!hasShown);
        } else {
          setShowWelcomeScreen(false);
        }
      } catch (error) {
        console.error('Failed to check welcome screen:', error);
        setShowWelcomeScreen(false);
      } finally {
        setCheckingWelcome(false);
      }
    };

    if (!isLoading && isAuthenticated) {
      checkWelcomeScreen();
    } else {
      setCheckingWelcome(false);
    }
  }, [user, isAuthenticated, isLoading]);

  if (isLoading || checkingWelcome) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading Cook Smart...</Text>
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        {isAuthenticated ? (
          <Stack.Navigator
            screenOptions={{headerShown: false}}
            initialRouteName={showWelcomeScreen ? 'CoFounderWelcome' : 'Main'}>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            {/* Welcome screen - for any user with welcome content configured */}
            <Stack.Screen
              name="CoFounderWelcome"
              component={CoFounderWelcomeScreen}
            />
          </Stack.Navigator>
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
      <CookieConsent />
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <IngredientProvider>
          <RecipeProvider>
            <AppContent />
          </RecipeProvider>
        </IngredientProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default App;
