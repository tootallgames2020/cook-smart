/**
 * Build Configuration
 * Detects build environment and provides build-specific settings
 */

import { Platform } from 'react-native';

export interface BuildConfig {
  environment: 'production' | 'test' | 'development';
  isTestBuild: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  packageName: string;
  appName: string;
  enableDebugLogging: boolean;
}

// Detect if this is a test build
const detectTestBuild = (): boolean => {
  if (__DEV__) {
    // In development mode, we can manually switch to test server
    // by setting an environment variable or using a simple flag
    return false; // Set to true to connect to test server in debug mode
  }
  
  // For release builds, detect if this is the firebase flavor
  // The firebase flavor will have package name "cook.smart.test"
  return Platform.select({
    android: () => {
      try {
        // In a real implementation, you'd use BuildConfig or similar
        // For now, we assume firebase builds are test builds
        // This can be enhanced with proper build config detection
        const packageName = require('react-native').NativeModules?.PlatformConstants?.packageName;
        return packageName === 'cook.smart.test';
      } catch {
        return false;
      }
    },
    ios: () => false,
    default: () => false,
  })() || false;
};

// Get environment based on build type
const getEnvironment = (): 'production' | 'test' | 'development' => {
  if (__DEV__) {
    return 'development';
  }
  
  return detectTestBuild() ? 'test' : 'production';
};

// Build configuration
export const buildConfig: BuildConfig = {
  environment: getEnvironment(),
  isTestBuild: detectTestBuild(),
  isDevelopment: __DEV__,
  isProduction: !__DEV__ && !detectTestBuild(),
  packageName: Platform.select({
    android: 'com.cooksmartfresh' + (detectTestBuild() ? '.test' : ''),
    ios: 'com.cooksmartfresh' + (detectTestBuild() ? '.test' : ''),
    default: 'com.cooksmartfresh',
  }),
  appName: 'Cook Smart' + (detectTestBuild() ? ' Firebase' : ''),
  enableDebugLogging: __DEV__ || detectTestBuild(),
};

// Export individual properties for convenience
export const {
  environment,
  isTestBuild,
  isDevelopment,
  isProduction,
  packageName,
  appName,
  enableDebugLogging,
} = buildConfig;

// Log build configuration
console.log('[Build Config]', {
  environment,
  isTestBuild,
  isDevelopment,
  isProduction,
  packageName,
  appName,
  enableDebugLogging,
});

export default buildConfig;