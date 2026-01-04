/**
 * Unit Conversion Service
 * 
 * Handles conversion between metric and imperial units based on user location/preference.
 * Supports geographical detection and user preference settings.
 */

export interface ConversionResult {
  amount: number;
  unit: string;
  originalAmount: number;
  originalUnit: string;
  conversionApplied: boolean;
}

export interface UserLocation {
  country: string;
  countryCode: string;
  preferredSystem: 'metric' | 'imperial';
}

export class UnitConversionService {
  // Countries that primarily use imperial system
  private static readonly IMPERIAL_COUNTRIES = [
    'US', 'USA', 'United States',
    'LR', 'Liberia', 
    'MM', 'Myanmar'
  ];

  // Volume conversions (to milliliters)
  private static readonly VOLUME_CONVERSIONS = {
    // Metric
    'ml': 1,
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'litre': 1000,
    'litres': 1000,
    
    // Imperial
    'tsp': 4.92892,
    'teaspoon': 4.92892,
    'teaspoons': 4.92892,
    'tbsp': 14.7868,
    'tablespoon': 14.7868,
    'tablespoons': 14.7868,
    'fl oz': 29.5735,
    'fluid ounce': 29.5735,
    'fluid ounces': 29.5735,
    'cup': 236.588,
    'cups': 236.588,
    'pint': 473.176,
    'pints': 473.176,
    'quart': 946.353,
    'quarts': 946.353,
    'gallon': 3785.41,
    'gallons': 3785.41,
  };

  // Weight conversions (to grams)
  private static readonly WEIGHT_CONVERSIONS = {
    // Metric
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    
    // Imperial
    'oz': 28.3495,
    'ounce': 28.3495,
    'ounces': 28.3495,
    'lb': 453.592,
    'pound': 453.592,
    'pounds': 453.592,
    'lbs': 453.592,
  };

  // Temperature conversions
  private static readonly TEMPERATURE_CONVERSIONS = {
    'celsius': 'celsius',
    'c': 'celsius',
    '°c': 'celsius',
    'fahrenheit': 'fahrenheit',
    'f': 'fahrenheit',
    '°f': 'fahrenheit',
  };

  /**
   * Detect user's preferred unit system based on location
   */
  static detectPreferredSystem(countryCode?: string, userPreference?: string): 'metric' | 'imperial' {
    // User preference takes priority
    if (userPreference === 'metric' || userPreference === 'imperial') {
      return userPreference;
    }

    // Fallback to geographical detection
    if (countryCode && this.IMPERIAL_COUNTRIES.includes(countryCode.toUpperCase())) {
      return 'imperial';
    }

    // Default to metric (used by most of the world)
    return 'metric';
  }

  /**
   * Convert recipe ingredients to user's preferred unit system
   */
  static convertRecipeUnits(
    recipe: any, 
    targetSystem: 'metric' | 'imperial'
  ): any {
    if (!recipe.ingredients) {
      return recipe;
    }

    const convertedIngredients = recipe.ingredients.map((ingredient: any) => {
      const converted = this.convertIngredient(ingredient, targetSystem);
      return converted.conversionApplied ? {
        ...ingredient,
        amount: converted.amount,
        unit: converted.unit,
        originalAmount: converted.originalAmount,
        originalUnit: converted.originalUnit,
      } : ingredient;
    });

    return {
      ...recipe,
      ingredients: convertedIngredients,
      unitSystem: targetSystem,
      unitsConverted: convertedIngredients.some((ing: any) => ing.originalAmount !== undefined),
    };
  }

  /**
   * Convert a single ingredient to target unit system
   */
  static convertIngredient(
    ingredient: any, 
    targetSystem: 'metric' | 'imperial'
  ): ConversionResult {
    const amount = this.parseAmount(ingredient.amount || ingredient.quantity || 1);
    const unit = (ingredient.unit || ingredient.measurement_description || '').toLowerCase().trim();

    // Skip conversion for unitless items
    if (!unit || unit === 'piece' || unit === 'pieces' || unit === 'item' || unit === 'items') {
      return {
        amount,
        unit: ingredient.unit || '',
        originalAmount: amount,
        originalUnit: ingredient.unit || '',
        conversionApplied: false,
      };
    }

    // Volume conversions
    if (unit in this.VOLUME_CONVERSIONS) {
      return this.convertVolume(amount, unit, targetSystem);
    }

    // Weight conversions
    if (unit in this.WEIGHT_CONVERSIONS) {
      return this.convertWeight(amount, unit, targetSystem);
    }

    // Temperature conversions
    if (unit in this.TEMPERATURE_CONVERSIONS) {
      return this.convertTemperature(amount, unit, targetSystem);
    }

    // No conversion needed/possible
    return {
      amount,
      unit: ingredient.unit || '',
      originalAmount: amount,
      originalUnit: ingredient.unit || '',
      conversionApplied: false,
    };
  }

  /**
   * Convert volume measurements
   */
  private static convertVolume(
    amount: number, 
    fromUnit: string, 
    targetSystem: 'metric' | 'imperial'
  ): ConversionResult {
    const mlAmount = amount * (this.VOLUME_CONVERSIONS as Record<string, number>)[fromUnit];
    
    if (targetSystem === 'metric') {
      // Convert to metric
      if (mlAmount >= 1000) {
        return {
          amount: Math.round(mlAmount / 1000 * 10) / 10,
          unit: 'l',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      } else {
        return {
          amount: Math.round(mlAmount),
          unit: 'ml',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      }
    } else {
      // Convert to imperial
      if (mlAmount >= 3785) { // Gallon
        return {
          amount: Math.round(mlAmount / 3785.41 * 10) / 10,
          unit: 'gallon',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      } else if (mlAmount >= 946) { // Quart
        return {
          amount: Math.round(mlAmount / 946.353 * 10) / 10,
          unit: 'quart',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      } else if (mlAmount >= 236) { // Cup
        return {
          amount: Math.round(mlAmount / 236.588 * 4) / 4, // Round to nearest 1/4
          unit: 'cup',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      } else if (mlAmount >= 15) { // Tablespoon
        return {
          amount: Math.round(mlAmount / 14.7868 * 2) / 2, // Round to nearest 1/2
          unit: 'tbsp',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      } else { // Teaspoon
        return {
          amount: Math.round(mlAmount / 4.92892 * 4) / 4, // Round to nearest 1/4
          unit: 'tsp',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      }
    }
  }

  /**
   * Convert weight measurements
   */
  private static convertWeight(
    amount: number, 
    fromUnit: string, 
    targetSystem: 'metric' | 'imperial'
  ): ConversionResult {
    const gramAmount = amount * (this.WEIGHT_CONVERSIONS as Record<string, number>)[fromUnit];
    
    if (targetSystem === 'metric') {
      // Convert to metric
      if (gramAmount >= 1000) {
        return {
          amount: Math.round(gramAmount / 1000 * 10) / 10,
          unit: 'kg',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      } else {
        return {
          amount: Math.round(gramAmount),
          unit: 'g',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      }
    } else {
      // Convert to imperial
      if (gramAmount >= 453) { // Pound
        return {
          amount: Math.round(gramAmount / 453.592 * 10) / 10,
          unit: 'lb',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      } else { // Ounce
        return {
          amount: Math.round(gramAmount / 28.3495 * 10) / 10,
          unit: 'oz',
          originalAmount: amount,
          originalUnit: fromUnit,
          conversionApplied: true,
        };
      }
    }
  }

  /**
   * Convert temperature measurements
   */
  private static convertTemperature(
    amount: number, 
    fromUnit: string, 
    targetSystem: 'metric' | 'imperial'
  ): ConversionResult {
    const fromTemp = (this.TEMPERATURE_CONVERSIONS as any)[fromUnit];
    
    if (targetSystem === 'metric' && fromTemp === 'fahrenheit') {
      // Fahrenheit to Celsius
      const celsius = Math.round((amount - 32) * 5 / 9);
      return {
        amount: celsius,
        unit: '°C',
        originalAmount: amount,
        originalUnit: fromUnit,
        conversionApplied: true,
      };
    } else if (targetSystem === 'imperial' && fromTemp === 'celsius') {
      // Celsius to Fahrenheit
      const fahrenheit = Math.round(amount * 9 / 5 + 32);
      return {
        amount: fahrenheit,
        unit: '°F',
        originalAmount: amount,
        originalUnit: fromUnit,
        conversionApplied: true,
      };
    }

    // No conversion needed
    return {
      amount,
      unit: fromUnit,
      originalAmount: amount,
      originalUnit: fromUnit,
      conversionApplied: false,
    };
  }

  /**
   * Parse amount from various formats
   */
  private static parseAmount(amount: any): number {
    if (typeof amount === 'number') {
      return amount;
    }

    if (typeof amount === 'string') {
      // Handle fractions like "1/2", "3/4"
      if (amount.includes('/')) {
        const parts = amount.split('/');
        if (parts.length === 2) {
          const numerator = parseFloat(parts[0]);
          const denominator = parseFloat(parts[1]);
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            return numerator / denominator;
          }
        }
      }

      // Handle mixed numbers like "1 1/2"
      const mixedMatch = amount.match(/(\d+)\s+(\d+)\/(\d+)/);
      if (mixedMatch) {
        const whole = parseFloat(mixedMatch[1]);
        const numerator = parseFloat(mixedMatch[2]);
        const denominator = parseFloat(mixedMatch[3]);
        if (!isNaN(whole) && !isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          return whole + numerator / denominator;
        }
      }

      // Handle regular numbers
      const parsed = parseFloat(amount);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Default fallback
    return 1;
  }

  /**
   * Get user's location-based preferences
   */
  static getUserLocationPreferences(countryCode?: string): UserLocation {
    const preferredSystem = this.detectPreferredSystem(countryCode);
    
    return {
      country: this.getCountryName(countryCode),
      countryCode: countryCode || 'US',
      preferredSystem,
    };
  }

  /**
   * Get country name from country code
   */
  private static getCountryName(countryCode?: string): string {
    const countryNames: Record<string, string> = {
      'US': 'United States',
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'AU': 'Australia',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'JP': 'Japan',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'RU': 'Russia',
      'KR': 'South Korea',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
    };

    return countryNames[countryCode?.toUpperCase() || 'US'] || 'Unknown';
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: number): string {
    // Handle fractions for common cooking amounts
    const fractions: Record<number, string> = {
      0.125: '1/8',
      0.25: '1/4',
      0.33: '1/3',
      0.5: '1/2',
      0.67: '2/3',
      0.75: '3/4',
    };

    // Check if amount is close to a common fraction
    for (const [decimal, fraction] of Object.entries(fractions)) {
      if (Math.abs(amount - parseFloat(decimal)) < 0.05) {
        return fraction;
      }
    }

    // Handle mixed numbers
    if (amount > 1) {
      const whole = Math.floor(amount);
      const remainder = amount - whole;
      
      for (const [decimal, fraction] of Object.entries(fractions)) {
        if (Math.abs(remainder - parseFloat(decimal)) < 0.05) {
          return `${whole} ${fraction}`;
        }
      }
    }

    // Default number formatting
    if (amount < 1) {
      return amount.toFixed(2).replace(/\.?0+$/, '');
    } else if (amount < 10) {
      return amount.toFixed(1).replace(/\.?0+$/, '');
    } else {
      return Math.round(amount).toString();
    }
  }
}