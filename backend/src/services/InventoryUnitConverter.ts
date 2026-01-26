/**
 * INVENTORY UNIT CONVERSION SERVICE
 * 
 * Handles cross-unit calculations for ingredient inventory management:
 * - "5 lbs flour - 2 cups flour = remaining amount"
 * - "1 gallon milk - 2 cups milk = remaining amount"
 * - "2 lbs butter - 4 tbsp butter = remaining amount"
 * 
 * Supports ingredient-specific conversions (flour density vs sugar density)
 */

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
  ingredient?: string; // Some conversions are ingredient-specific
}

export interface ConversionResult {
  success: boolean;
  convertedQuantity?: number;
  remainingQuantity?: number;
  remainingUnit?: string;
  error?: string;
  conversionUsed?: string;
}

export class InventoryUnitConverter {
  /**
   * COMPREHENSIVE UNIT CONVERSION DATABASE
   * Includes ingredient-specific conversions for accurate cooking measurements
   */
  private static readonly UNIT_CONVERSIONS: UnitConversion[] = [
    // WEIGHT CONVERSIONS (Universal)
    { fromUnit: 'lb', toUnit: 'oz', factor: 16 },
    { fromUnit: 'pound', toUnit: 'ounce', factor: 16 },
    { fromUnit: 'kg', toUnit: 'g', factor: 1000 },
    { fromUnit: 'kilogram', toUnit: 'gram', factor: 1000 },
    
    // VOLUME CONVERSIONS (Universal)
    { fromUnit: 'gallon', toUnit: 'quart', factor: 4 },
    { fromUnit: 'gallon', toUnit: 'cup', factor: 16 },
    { fromUnit: 'gallon', toUnit: 'fl oz', factor: 128 },
    { fromUnit: 'quart', toUnit: 'cup', factor: 4 },
    { fromUnit: 'quart', toUnit: 'fl oz', factor: 32 },
    { fromUnit: 'cup', toUnit: 'fl oz', factor: 8 },
    { fromUnit: 'cup', toUnit: 'tbsp', factor: 16 },
    { fromUnit: 'cup', toUnit: 'tsp', factor: 48 },
    { fromUnit: 'tbsp', toUnit: 'tsp', factor: 3 },
    { fromUnit: 'tablespoon', toUnit: 'teaspoon', factor: 3 },
    
    // FLOUR CONVERSIONS (Weight ↔ Volume)
    { fromUnit: 'lb', toUnit: 'cup', factor: 3.6, ingredient: 'flour' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 3.6, ingredient: 'all-purpose flour' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 3.6, ingredient: 'self-rising flour' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 3.5, ingredient: 'whole wheat flour' },
    { fromUnit: 'oz', toUnit: 'cup', factor: 0.225, ingredient: 'flour' },
    
    // SUGAR CONVERSIONS (Weight ↔ Volume)
    { fromUnit: 'lb', toUnit: 'cup', factor: 2.25, ingredient: 'sugar' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 2.25, ingredient: 'granulated sugar' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 2.4, ingredient: 'brown sugar' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 3.75, ingredient: 'powdered sugar' },
    { fromUnit: 'oz', toUnit: 'cup', factor: 0.14, ingredient: 'sugar' },
    
    // BUTTER CONVERSIONS (Weight ↔ Volume)
    { fromUnit: 'lb', toUnit: 'cup', factor: 2, ingredient: 'butter' },
    { fromUnit: 'lb', toUnit: 'tbsp', factor: 32, ingredient: 'butter' },
    { fromUnit: 'oz', toUnit: 'tbsp', factor: 2, ingredient: 'butter' },
    { fromUnit: 'cup', toUnit: 'tbsp', factor: 16, ingredient: 'butter' },
    
    // RICE CONVERSIONS (Weight ↔ Volume)
    { fromUnit: 'lb', toUnit: 'cup', factor: 2.4, ingredient: 'rice' },
    { fromUnit: 'oz', toUnit: 'cup', factor: 0.15, ingredient: 'rice' },
    
    // MILK/LIQUID CONVERSIONS (Volume only - milk is close to water density)
    { fromUnit: 'gallon', toUnit: 'cup', factor: 16, ingredient: 'milk' },
    { fromUnit: 'quart', toUnit: 'cup', factor: 4, ingredient: 'milk' },
    { fromUnit: 'cup', toUnit: 'fl oz', factor: 8, ingredient: 'milk' },
    
    // OIL CONVERSIONS (Volume - oils are lighter than water)
    { fromUnit: 'cup', toUnit: 'tbsp', factor: 16, ingredient: 'oil' },
    { fromUnit: 'cup', toUnit: 'tbsp', factor: 16, ingredient: 'olive oil' },
    { fromUnit: 'cup', toUnit: 'tbsp', factor: 16, ingredient: 'vegetable oil' },
    
    // CHEESE CONVERSIONS (Weight ↔ Volume for shredded)
    { fromUnit: 'lb', toUnit: 'cup', factor: 4, ingredient: 'cheese' },
    { fromUnit: 'oz', toUnit: 'cup', factor: 0.25, ingredient: 'cheese' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 4, ingredient: 'cheddar cheese' },
    { fromUnit: 'lb', toUnit: 'cup', factor: 4, ingredient: 'mozzarella cheese' },
  ];

  /**
   * UNIT NORMALIZATION MAP
   * Standardizes different unit names to consistent forms
   */
  private static readonly UNIT_ALIASES: { [key: string]: string } = {
    // Weight aliases
    'pounds': 'lb',
    'pound': 'lb',
    'lbs': 'lb',
    'ounces': 'oz',
    'ounce': 'oz',
    'grams': 'g',
    'gram': 'g',
    'kilograms': 'kg',
    'kilogram': 'kg',
    
    // Volume aliases
    'cups': 'cup',
    'tablespoons': 'tbsp',
    'tablespoon': 'tbsp',
    'teaspoons': 'tsp',
    'teaspoon': 'tsp',
    'fluid ounces': 'fl oz',
    'fluid ounce': 'fl oz',
    'gallons': 'gallon',
    'quarts': 'quart',
    'pints': 'pint',
    
    // Count aliases
    'pieces': 'piece',
    'items': 'item',
    'each': 'piece',
  };

  /**
   * SUBTRACT USAGE FROM INVENTORY
   * Main function: "5 lbs flour - 2 cups flour = remaining amount"
   */
  static subtractUsage(
    inventoryQuantity: number,
    inventoryUnit: string,
    usedQuantity: number,
    usedUnit: string,
    ingredientName: string
  ): ConversionResult {
    try {
      // Normalize units
      const normalizedInventoryUnit = this.normalizeUnit(inventoryUnit);
      const normalizedUsedUnit = this.normalizeUnit(usedUnit);
      
      console.log(`[InventoryConverter] Subtracting ${usedQuantity} ${normalizedUsedUnit} from ${inventoryQuantity} ${normalizedInventoryUnit} of ${ingredientName}`);

      // If units are the same, simple subtraction
      if (normalizedInventoryUnit === normalizedUsedUnit) {
        const remaining = Math.max(0, inventoryQuantity - usedQuantity);
        return {
          success: true,
          convertedQuantity: usedQuantity,
          remainingQuantity: remaining,
          remainingUnit: normalizedInventoryUnit,
          conversionUsed: 'direct (same units)',
        };
      }

      // Try to convert used unit to inventory unit
      const conversionToInventory = this.findConversion(
        normalizedUsedUnit,
        normalizedInventoryUnit,
        ingredientName
      );

      if (conversionToInventory) {
        const convertedUsedQuantity = usedQuantity * conversionToInventory.factor;
        const remaining = Math.max(0, inventoryQuantity - convertedUsedQuantity);
        
        return {
          success: true,
          convertedQuantity: convertedUsedQuantity,
          remainingQuantity: remaining,
          remainingUnit: normalizedInventoryUnit,
          conversionUsed: `${usedQuantity} ${normalizedUsedUnit} = ${convertedUsedQuantity.toFixed(2)} ${normalizedInventoryUnit}`,
        };
      }

      // Try to convert inventory unit to used unit
      const conversionToUsed = this.findConversion(
        normalizedInventoryUnit,
        normalizedUsedUnit,
        ingredientName
      );

      if (conversionToUsed) {
        const convertedInventoryQuantity = inventoryQuantity * conversionToUsed.factor;
        const remaining = Math.max(0, convertedInventoryQuantity - usedQuantity);
        
        return {
          success: true,
          convertedQuantity: usedQuantity,
          remainingQuantity: remaining,
          remainingUnit: normalizedUsedUnit,
          conversionUsed: `${inventoryQuantity} ${normalizedInventoryUnit} = ${convertedInventoryQuantity.toFixed(2)} ${normalizedUsedUnit}`,
        };
      }

      // No conversion found
      return {
        success: false,
        error: `Cannot convert between ${normalizedUsedUnit} and ${normalizedInventoryUnit} for ${ingredientName}`,
      };

    } catch (error) {
      return {
        success: false,
        error: `Conversion error: ${error}`,
      };
    }
  }

  /**
   * FIND CONVERSION BETWEEN TWO UNITS
   * Supports ingredient-specific conversions
   */
  private static findConversion(
    fromUnit: string,
    toUnit: string,
    ingredientName: string
  ): { factor: number; conversion: UnitConversion } | null {
    
    // First try ingredient-specific conversions
    const ingredientSpecific = this.UNIT_CONVERSIONS.find(conv => 
      conv.fromUnit === fromUnit && 
      conv.toUnit === toUnit && 
      conv.ingredient && 
      this.ingredientMatches(ingredientName, conv.ingredient)
    );

    if (ingredientSpecific) {
      return { factor: ingredientSpecific.factor, conversion: ingredientSpecific };
    }

    // Then try universal conversions
    const universal = this.UNIT_CONVERSIONS.find(conv => 
      conv.fromUnit === fromUnit && 
      conv.toUnit === toUnit && 
      !conv.ingredient
    );

    if (universal) {
      return { factor: universal.factor, conversion: universal };
    }

    // Try reverse conversion (divide instead of multiply)
    const reverse = this.UNIT_CONVERSIONS.find(conv => 
      conv.fromUnit === toUnit && 
      conv.toUnit === fromUnit
    );

    if (reverse) {
      return { factor: 1 / reverse.factor, conversion: reverse };
    }

    // Try multi-step conversion (e.g., lb → oz → tbsp)
    const multiStep = this.findMultiStepConversion(fromUnit, toUnit, ingredientName);
    if (multiStep) {
      return multiStep;
    }

    return null;
  }

  /**
   * MULTI-STEP CONVERSION
   * Handles conversions like: lb → oz → tbsp (for butter)
   */
  private static findMultiStepConversion(
    fromUnit: string,
    toUnit: string,
    ingredientName: string
  ): { factor: number; conversion: UnitConversion } | null {
    
    // Common intermediate units to try
    const intermediateUnits = ['oz', 'cup', 'tbsp', 'g', 'ml'];
    
    for (const intermediate of intermediateUnits) {
      const step1 = this.findConversion(fromUnit, intermediate, ingredientName);
      const step2 = this.findConversion(intermediate, toUnit, ingredientName);
      
      if (step1 && step2) {
        const combinedFactor = step1.factor * step2.factor;
        return { 
          factor: combinedFactor, 
          conversion: {
            fromUnit,
            toUnit,
            factor: combinedFactor,
            ingredient: ingredientName,
          }
        };
      }
    }
    
    return null;
  }

  /**
   * CHECK IF INGREDIENT MATCHES CONVERSION RULE
   */
  private static ingredientMatches(ingredientName: string, conversionIngredient: string): boolean {
    const normalized = ingredientName.toLowerCase();
    const conversionNormalized = conversionIngredient.toLowerCase();
    
    // Exact match
    if (normalized === conversionNormalized) return true;
    
    // Partial match (e.g., "all-purpose flour" matches "flour")
    if (normalized.includes(conversionNormalized) || conversionNormalized.includes(normalized)) {
      return true;
    }
    
    return false;
  }

  /**
   * NORMALIZE UNIT NAMES
   */
  private static normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();
    return this.UNIT_ALIASES[normalized] || normalized;
  }

  /**
   * GET SUPPORTED CONVERSIONS FOR AN INGREDIENT
   */
  static getSupportedConversions(ingredientName: string): UnitConversion[] {
    return this.UNIT_CONVERSIONS.filter(conv => 
      !conv.ingredient || this.ingredientMatches(ingredientName, conv.ingredient)
    );
  }

  /**
   * VALIDATE IF CONVERSION IS POSSIBLE
   */
  static canConvert(
    fromUnit: string,
    toUnit: string,
    ingredientName: string
  ): boolean {
    const conversion = this.findConversion(
      this.normalizeUnit(fromUnit),
      this.normalizeUnit(toUnit),
      ingredientName
    );
    return conversion !== null;
  }

  /**
   * CONVERT QUANTITY BETWEEN UNITS (without subtraction)
   */
  static convertQuantity(
    quantity: number,
    fromUnit: string,
    toUnit: string,
    ingredientName: string
  ): ConversionResult {
    const conversion = this.findConversion(
      this.normalizeUnit(fromUnit),
      this.normalizeUnit(toUnit),
      ingredientName
    );

    if (!conversion) {
      return {
        success: false,
        error: `Cannot convert ${fromUnit} to ${toUnit} for ${ingredientName}`,
      };
    }

    const convertedQuantity = quantity * conversion.factor;
    return {
      success: true,
      convertedQuantity,
      conversionUsed: `${quantity} ${fromUnit} = ${convertedQuantity.toFixed(2)} ${toUnit}`,
    };
  }
}