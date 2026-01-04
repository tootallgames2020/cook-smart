import axios from 'axios';
import FatSecretService from './FatSecretService';

const fatSecretService = new FatSecretService();

interface BarcodeResult {
  found: boolean;
  product?: {
    name: string;
    brand?: string;
    category: string;
    nutrition_per_100g?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    barcode: string;
    source:
      | 'fatsecret'
      | 'openfoodfacts'
      | 'nutritionix'
      | 'usda'
      | 'manual'
      | 'upcitemdb'
      | 'barcodespider';
  };
  manualEntryRequired?: boolean;
  suggestions?: any[];
}

class BarcodeService {
  private nutritionixUsageCount = 0;
  private readonly NUTRITIONIX_LIMIT = 1500; // 500 free + 1000 paid per month

  async lookupBarcode(barcode: string): Promise<BarcodeResult> {
    try {
      console.log(`[Barcode] Starting lookup for: ${barcode}`);

      // Step 1: Try Open Food Facts FIRST (FREE, reliable, no IP restrictions)
      const openFoodResult = await this.tryOpenFoodFacts(barcode);
      if (openFoodResult.found && this.isGoodQuality(openFoodResult)) {
        console.log('[Barcode] Found via Open Food Facts (primary)');
        return openFoodResult;
      }

      // Step 2: Try additional barcode databases for better coverage
      const barcodeSpiderResult = await this.tryBarcodeSpider(barcode);
      if (barcodeSpiderResult.found) {
        console.log('[Barcode] Found via Barcode Spider');
        return barcodeSpiderResult;
      }

      // Step 3: Try UPC Database (free backup)
      const upcResult = await this.tryUPCDatabase(barcode);
      if (upcResult.found) {
        console.log('[Barcode] Found via UPC Database');
        return upcResult;
      }

      // Step 4: Try Nutritionix if configured (skip if placeholder keys)
      if (
        this.isNutritionixConfigured() &&
        this.nutritionixUsageCount < this.NUTRITIONIX_LIMIT
      ) {
        const nutritionixResult = await this.tryNutritionix(barcode);
        if (nutritionixResult.found) {
          this.nutritionixUsageCount++;
          console.log('[Barcode] Found via Nutritionix');
          return nutritionixResult;
        }
      }

      // Step 5: Try FatSecret (may be blocked by IP restrictions)
      // if (FatSecretService.isConfigured()) {
      //   const fatSecretResult = await this.tryFatSecret(barcode);
      //   if (fatSecretResult.found) {
      //     console.log('[Barcode] Found via FatSecret');
      //     return fatSecretResult;
      //   }
      // }

      // Step 6: Enhance Open Food Facts result with USDA data if available
      if (openFoodResult.product?.name) {
        const enhancedResult = await this.enhanceWithUSDA(openFoodResult);
        if (enhancedResult.found) {
          console.log('[Barcode] Enhanced with USDA data');
          return enhancedResult;
        }
      }

      // Step 7: Return Open Food Facts result even if low quality
      if (openFoodResult.found) {
        console.log('[Barcode] Returning low-quality Open Food Facts result');
        return openFoodResult;
      }

      // Step 8: Manual entry with smart suggestions
      console.log('[Barcode] No results found, requiring manual entry');
      return {
        found: false,
        manualEntryRequired: true,
        suggestions: await this.getSmartSuggestions(barcode),
      };
    } catch (error) {
      console.error('Barcode lookup error:', error);
      return {found: false, manualEntryRequired: true};
    }
  }

  private async tryFatSecret(barcode: string): Promise<BarcodeResult> {
    try {
      console.log(`[FatSecret] Attempting barcode lookup: ${barcode}`);
      const food = await fatSecretService.searchFoodByBarcode(barcode);

      if (food && food.servings && food.servings.serving) {
        console.log(`[FatSecret] Found food: ${food.food_name}`);
        const serving = Array.isArray(food.servings.serving)
          ? food.servings.serving[0]
          : food.servings.serving;

        const nutrition = {
          calories: parseFloat(serving.calories) || 0,
          protein: parseFloat(serving.protein) || 0,
          carbs: parseFloat(serving.carbohydrate) || 0,
          fat: parseFloat(serving.fat) || 0,
        };
        const category = this.mapToCategory(
          food.food_type || food.food_name || '',
        );

        return {
          found: true,
          product: {
            name: this.convertMetricInProductName(food.food_name),
            brand: food.brand_name,
            category,
            nutrition_per_100g: nutrition,
            barcode,
            source: 'fatsecret',
          },
        };
      }

      console.log(`[FatSecret] No food data found for barcode: ${barcode}`);
      return {found: false};
    } catch (error) {
      // FatSecret may be blocked by IP restrictions on AWS
      if (
        error instanceof Error &&
        error.message?.includes('Invalid IP address')
      ) {
        console.warn(
          '[FatSecret] IP address blocked - this is expected on AWS',
        );
      } else {
        console.error('[FatSecret] Barcode lookup error:', error);
      }
      return {found: false};
    }
  }

  private async tryOpenFoodFacts(barcode: string): Promise<BarcodeResult> {
    try {
      const response = await axios.get(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        {timeout: 5000},
      );

      if (response.data.status === 1 && response.data.product) {
        const product = response.data.product;

        // Get product name and use it for category mapping
        const productName =
          product.product_name || product.product_name_en || 'Unknown Product';

        // Use both categories and product name for better mapping
        const categoryInfo = [
          product.categories || '',
          product.categories_tags?.join(',') || '',
          productName,
        ].join(' ');

        const mappedCategory = this.mapToCategory(categoryInfo);

        return {
          found: true,
          product: {
            name: this.convertMetricInProductName(productName),
            brand: product.brands,
            category: mappedCategory,
            nutrition_per_100g: this.extractNutrition(product.nutriments),
            barcode,
            source: 'openfoodfacts',
          },
        };
      }

      return {found: false};
    } catch (error) {
      console.error('[OpenFoodFacts] API error:', error);
      return {found: false};
    }
  }

  private isNutritionixConfigured(): boolean {
    const appId = process.env.NUTRITIONIX_APP_ID;
    const apiKey = process.env.NUTRITIONIX_API_KEY;

    // Check if we have real credentials (not placeholders)
    return Boolean(
      appId &&
      apiKey &&
      appId !== 'your_nutritionix_app_id' &&
      apiKey !== 'your_nutritionix_api_key',
    );
  }

  private async tryNutritionix(barcode: string): Promise<BarcodeResult> {
    try {
      const response = await axios.get(
        `https://trackapi.nutritionix.com/v2/search/item`,
        {
          params: {upc: barcode},
          headers: {
            'x-app-id': process.env.NUTRITIONIX_APP_ID,
            'x-app-key': process.env.NUTRITIONIX_API_KEY,
          },
          timeout: 5000,
        },
      );

      if (response.data.foods && response.data.foods.length > 0) {
        const food = response.data.foods[0];

        return {
          found: true,
          product: {
            name: this.convertMetricInProductName(food.food_name),
            brand: food.brand_name,
            category: this.mapToCategory(
              food.tags?.food_group || food.food_name,
            ),
            nutrition_per_100g: {
              calories: Math.round(
                (food.nf_calories / food.serving_weight_grams) * 100,
              ),
              protein:
                Math.round(
                  (food.nf_protein / food.serving_weight_grams) * 100 * 10,
                ) / 10,
              carbs:
                Math.round(
                  (food.nf_total_carbohydrate / food.serving_weight_grams) *
                    100 *
                    10,
                ) / 10,
              fat:
                Math.round(
                  (food.nf_total_fat / food.serving_weight_grams) * 100 * 10,
                ) / 10,
            },
            barcode,
            source: 'nutritionix',
          },
        };
      }

      return {found: false};
    } catch (error) {
      if (error instanceof Error && (error as any).response?.status === 401) {
        console.warn(
          '[Nutritionix] Invalid API credentials - using placeholder keys',
        );
      } else {
        console.error(
          '[Nutritionix] API error:',
          error instanceof Error ? error.message : 'Unknown error',
        );
      }
      return {found: false};
    }
  }

  private async enhanceWithUSDA(
    openFoodResult: BarcodeResult,
  ): Promise<BarcodeResult> {
    try {
      if (!openFoodResult.product?.name) return openFoodResult;

      const response = await axios.get(
        'https://api.nal.usda.gov/fdc/v1/foods/search',
        {
          params: {
            query: openFoodResult.product.name,
            dataType: ['Branded', 'Survey (FNDDS)'],
            pageSize: 5,
            api_key: process.env.USDA_API_KEY || 'DEMO_KEY',
          },
          timeout: 5000,
        },
      );

      if (response.data.foods && response.data.foods.length > 0) {
        const food = response.data.foods[0];
        const nutrients = food.foodNutrients || [];

        const nutrition = {
          calories: this.findNutrient(nutrients, 1008) || 0, // Energy
          protein: this.findNutrient(nutrients, 1003) || 0, // Protein
          carbs: this.findNutrient(nutrients, 1005) || 0, // Carbs
          fat: this.findNutrient(nutrients, 1004) || 0, // Fat
        };

        return {
          found: true,
          product: {
            ...openFoodResult.product,
            nutrition_per_100g: nutrition,
            source: 'usda',
          },
        };
      }

      return openFoodResult;
    } catch (error) {
      console.error('USDA enhancement error:', error);
      return openFoodResult;
    }
  }

  private isGoodQuality(result: BarcodeResult): boolean {
    if (!result.product) return false;

    const hasName =
      result.product.name && result.product.name !== 'Unknown Product';
    const hasNutrition =
      result.product.nutrition_per_100g?.calories &&
      result.product.nutrition_per_100g.calories > 0;

    return Boolean(hasName && hasNutrition);
  }

  private extractNutrition(nutriments: any): any {
    if (!nutriments) return undefined;

    return {
      calories:
        nutriments['energy-kcal_100g'] || nutriments['energy_100g'] || 0,
      protein: nutriments['proteins_100g'] || 0,
      carbs: nutriments['carbohydrates_100g'] || 0,
      fat: nutriments['fat_100g'] || 0,
    };
  }

  private findNutrient(nutrients: any[], nutrientId: number): number {
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
    return nutrient ? nutrient.value : 0;
  }

  private convertToUSUnits(
    amount: string,
    unit: string,
  ): {amount: string; unit: string} | null {
    if (!amount || !unit) return null;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return null;

    const unitLower = unit.toLowerCase().trim();

    // Metric to US conversions
    const conversions: {[key: string]: {factor: number; newUnit: string}} = {
      // Weight conversions
      gram: {factor: 0.035274, newUnit: 'oz'},
      grams: {factor: 0.035274, newUnit: 'oz'},
      g: {factor: 0.035274, newUnit: 'oz'},
      kilogram: {factor: 2.20462, newUnit: 'lb'},
      kilograms: {factor: 2.20462, newUnit: 'lb'},
      kg: {factor: 2.20462, newUnit: 'lb'},

      // Volume conversions
      milliliter: {factor: 0.033814, newUnit: 'fl oz'}, // ml to fl oz
      milliliters: {factor: 0.033814, newUnit: 'fl oz'},
      ml: {factor: 0.033814, newUnit: 'fl oz'},
      liter: {factor: 33.814, newUnit: 'fl oz'}, // liters to fl oz
      liters: {factor: 33.814, newUnit: 'fl oz'},
      l: {factor: 33.814, newUnit: 'fl oz'},

      // Common cooking conversions
      centiliter: {factor: 0.338, newUnit: 'fl oz'}, // cl to fl oz
      centiliters: {factor: 0.338, newUnit: 'fl oz'},
      cl: {factor: 0.338, newUnit: 'fl oz'},
    };

    const conversion = conversions[unitLower];
    if (conversion) {
      const convertedAmount = numAmount * conversion.factor;

      // Round to reasonable precision
      let roundedAmount: string;
      if (convertedAmount < 1) {
        roundedAmount = convertedAmount.toFixed(2);
      } else if (convertedAmount < 10) {
        roundedAmount = convertedAmount.toFixed(1);
      } else {
        roundedAmount = Math.round(convertedAmount).toString();
      }

      return {
        amount: roundedAmount,
        unit: conversion.newUnit,
      };
    }

    return null;
  }

  private convertMetricInProductName(name: string): string {
    if (!name) return name;

    // Convert metric units in product names to US equivalents
    let convertedName = name;

    // Volume conversions (ml, l, cl)
    convertedName = convertedName.replace(
      /(\d+(?:\.\d+)?)\s*ml\b/gi,
      (match, amount) => {
        const flOz = (parseFloat(amount) * 0.033814).toFixed(1);
        return `${flOz} fl oz`;
      },
    );

    convertedName = convertedName.replace(
      /(\d+(?:\.\d+)?)\s*(?:l\b|liter\b|liters?\b)/gi,
      (match, amount) => {
        const flOz = (parseFloat(amount) * 33.814).toFixed(1);
        return `${flOz} fl oz`;
      },
    );

    convertedName = convertedName.replace(
      /(\d+(?:\.\d+)?)\s*cl\b/gi,
      (match, amount) => {
        const flOz = (parseFloat(amount) * 0.338).toFixed(1);
        return `${flOz} fl oz`;
      },
    );

    // Weight conversions (g, kg)
    convertedName = convertedName.replace(
      /(\d+(?:\.\d+)?)\s*g\b/gi,
      (match, amount) => {
        const oz = (parseFloat(amount) * 0.035274).toFixed(1);
        return `${oz} oz`;
      },
    );

    convertedName = convertedName.replace(
      /(\d+(?:\.\d+)?)\s*kg\b/gi,
      (match, amount) => {
        const lb = (parseFloat(amount) * 2.20462).toFixed(1);
        return `${lb} lb`;
      },
    );

    // Clean up decimal places (remove .0)
    convertedName = convertedName.replace(/(\d+)\.0\s+(fl oz|oz|lb)/g, '$1 $2');

    return convertedName;
  }

  private mapToCategory(categories: string): string {
    if (!categories) return 'other';

    const categoryStr = categories.toLowerCase();

    // Proteins (comprehensive list)
    if (
      categoryStr.includes('meat') ||
      categoryStr.includes('beef') ||
      categoryStr.includes('pork') ||
      categoryStr.includes('chicken') ||
      categoryStr.includes('turkey') ||
      categoryStr.includes('poultry') ||
      categoryStr.includes('fish') ||
      categoryStr.includes('salmon') ||
      categoryStr.includes('tuna') ||
      categoryStr.includes('seafood') ||
      categoryStr.includes('shrimp') ||
      categoryStr.includes('crab') ||
      categoryStr.includes('lobster') ||
      categoryStr.includes('eggs') ||
      categoryStr.includes('protein') ||
      categoryStr.includes('carne') ||
      categoryStr.includes('pescado') ||
      categoryStr.includes('pollo') ||
      categoryStr.includes('huevos')
    ) {
      return 'proteins';
    }

    // Vegetables (comprehensive list)
    if (
      categoryStr.includes('vegetable') ||
      categoryStr.includes('produce') ||
      categoryStr.includes('lettuce') ||
      categoryStr.includes('spinach') ||
      categoryStr.includes('broccoli') ||
      categoryStr.includes('carrot') ||
      categoryStr.includes('onion') ||
      categoryStr.includes('tomato') ||
      categoryStr.includes('pepper') ||
      categoryStr.includes('cucumber') ||
      categoryStr.includes('celery') ||
      categoryStr.includes('cabbage') ||
      categoryStr.includes('kale') ||
      categoryStr.includes('vegetal') ||
      categoryStr.includes('verdura') ||
      categoryStr.includes('lechuga') ||
      categoryStr.includes('zanahoria')
    ) {
      return 'vegetables';
    }

    // Fruits (comprehensive list)
    if (
      categoryStr.includes('fruit') ||
      categoryStr.includes('apple') ||
      categoryStr.includes('banana') ||
      categoryStr.includes('orange') ||
      categoryStr.includes('grape') ||
      categoryStr.includes('berry') ||
      categoryStr.includes('strawberry') ||
      categoryStr.includes('blueberry') ||
      categoryStr.includes('cherry') ||
      categoryStr.includes('peach') ||
      categoryStr.includes('pear') ||
      categoryStr.includes('mango') ||
      categoryStr.includes('pineapple') ||
      categoryStr.includes('fruta') ||
      categoryStr.includes('manzana') ||
      categoryStr.includes('naranja')
    ) {
      return 'fruits';
    }

    // Dairy (comprehensive list)
    if (
      categoryStr.includes('dairy') ||
      categoryStr.includes('milk') ||
      categoryStr.includes('cheese') ||
      categoryStr.includes('yogurt') ||
      categoryStr.includes('butter') ||
      categoryStr.includes('cream') ||
      categoryStr.includes('ice cream') ||
      categoryStr.includes('sour cream') ||
      categoryStr.includes('cottage cheese') ||
      categoryStr.includes('lácteo') ||
      categoryStr.includes('lacteo') ||
      categoryStr.includes('leche') ||
      categoryStr.includes('queso') ||
      categoryStr.includes('mantequilla')
    ) {
      return 'dairy';
    }

    // Grains (comprehensive list)
    if (
      categoryStr.includes('grain') ||
      categoryStr.includes('bread') ||
      categoryStr.includes('cereal') ||
      categoryStr.includes('cheerios') ||
      categoryStr.includes('pasta') ||
      categoryStr.includes('rice') ||
      categoryStr.includes('wheat') ||
      categoryStr.includes('oats') ||
      categoryStr.includes('quinoa') ||
      categoryStr.includes('barley') ||
      categoryStr.includes('flour') ||
      categoryStr.includes('noodle') ||
      categoryStr.includes('bagel') ||
      categoryStr.includes('muffin') ||
      categoryStr.includes('crackers') ||
      categoryStr.includes('tortilla') ||
      categoryStr.includes('chips') ||
      categoryStr.includes('corn') ||
      categoryStr.includes('grano') ||
      categoryStr.includes('pan') ||
      categoryStr.includes('arroz') ||
      categoryStr.includes('avena') ||
      categoryStr.includes('harina') ||
      categoryStr.includes('maíz')
    ) {
      return 'grains';
    }

    // Spices & Condiments (comprehensive list)
    if (
      categoryStr.includes('spice') ||
      categoryStr.includes('herb') ||
      categoryStr.includes('seasoning') ||
      categoryStr.includes('salt') ||
      categoryStr.includes('pepper') ||
      categoryStr.includes('garlic') ||
      categoryStr.includes('onion powder') ||
      categoryStr.includes('paprika') ||
      categoryStr.includes('cumin') ||
      categoryStr.includes('oregano') ||
      categoryStr.includes('basil') ||
      categoryStr.includes('thyme') ||
      categoryStr.includes('rosemary') ||
      categoryStr.includes('sauce') ||
      categoryStr.includes('ketchup') ||
      categoryStr.includes('mustard') ||
      categoryStr.includes('mayo') ||
      categoryStr.includes('dressing') ||
      categoryStr.includes('vinegar') ||
      categoryStr.includes('oil') ||
      categoryStr.includes('especia') ||
      categoryStr.includes('condimento') ||
      categoryStr.includes('sal') ||
      categoryStr.includes('pimienta') ||
      categoryStr.includes('ajo') ||
      categoryStr.includes('aceite')
    ) {
      return 'spices';
    }

    // Beverages
    if (
      categoryStr.includes('beverage') ||
      categoryStr.includes('drink') ||
      categoryStr.includes('juice') ||
      categoryStr.includes('soda') ||
      categoryStr.includes('water') ||
      categoryStr.includes('coffee') ||
      categoryStr.includes('tea') ||
      categoryStr.includes('beer') ||
      categoryStr.includes('wine') ||
      categoryStr.includes('energy drink') ||
      categoryStr.includes('bebida') ||
      categoryStr.includes('jugo') ||
      categoryStr.includes('agua') ||
      categoryStr.includes('café') ||
      categoryStr.includes('té')
    ) {
      return 'other'; // Beverages go to 'other' category
    }

    // Snacks & Processed Foods
    if (
      categoryStr.includes('snack') ||
      categoryStr.includes('chip') ||
      categoryStr.includes('cookie') ||
      categoryStr.includes('candy') ||
      categoryStr.includes('chocolate') ||
      categoryStr.includes('nuts') ||
      categoryStr.includes('crackers') ||
      categoryStr.includes('popcorn') ||
      categoryStr.includes('pretzel') ||
      categoryStr.includes('galleta') ||
      categoryStr.includes('dulce') ||
      categoryStr.includes('nueces')
    ) {
      return 'other';
    }

    return 'other';
  }

  private async getSmartSuggestions(barcode: string): Promise<string[]> {
    // Analyze barcode patterns to suggest likely products
    const prefix = barcode.substring(0, 3);

    // Common barcode prefixes
    const suggestions = [];
    if (prefix >= '000' && prefix <= '019')
      suggestions.push('US/Canada product');
    if (prefix >= '020' && prefix <= '029')
      suggestions.push('Store brand item');
    if (prefix >= '030' && prefix <= '039') suggestions.push('Pharmaceutical');
    if (prefix >= '200' && prefix <= '299')
      suggestions.push('Local store item');

    return suggestions;
  }

  private async tryBarcodeSpider(barcode: string): Promise<BarcodeResult> {
    try {
      // Barcode Spider - free barcode lookup service
      const response = await axios.get(
        `https://api.barcodespider.com/v1/lookup?token=free&upc=${barcode}`,
        {timeout: 5000},
      );

      if (
        response.data &&
        response.data.item_response &&
        response.data.item_response.code === 200
      ) {
        const item = response.data.item_response.item;

        return {
          found: true,
          product: {
            name: this.convertMetricInProductName(
              item.title || 'Unknown Product',
            ),
            brand: item.brand,
            category: this.mapToCategory(item.category || item.title || ''),
            barcode,
            source: 'barcodespider',
          },
        };
      }

      return {found: false};
    } catch (error) {
      console.error('[BarcodeSpider] API error:', error);
      return {found: false};
    }
  }

  private async tryUPCDatabase(barcode: string): Promise<BarcodeResult> {
    try {
      // UPC Database - free alternative
      const response = await axios.get(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
        {timeout: 5000},
      );

      if (response.data.items && response.data.items.length > 0) {
        const item = response.data.items[0];

        return {
          found: true,
          product: {
            name: this.convertMetricInProductName(
              item.title || 'Unknown Product',
            ),
            brand: item.brand,
            category: this.mapToCategory(item.category || item.title || ''),
            barcode,
            source: 'upcitemdb',
          },
        };
      }

      return {found: false};
    } catch (error) {
      console.error('[UPCDatabase] API error:', error);
      return {found: false};
    }
  }

  // Usage tracking methods
  getNutritionixUsage(): {used: number; limit: number; remaining: number} {
    return {
      used: this.nutritionixUsageCount,
      limit: this.NUTRITIONIX_LIMIT,
      remaining: this.NUTRITIONIX_LIMIT - this.nutritionixUsageCount,
    };
  }

  resetMonthlyUsage(): void {
    this.nutritionixUsageCount = 0;
  }
}

export default new BarcodeService();
