/**
 * Enhanced Ingredient Categorization Service
 * 
 * Improves upon the existing categorization system with:
 * - Machine learning-inspired scoring
 * - Context-aware categorization
 * - User feedback integration
 * - Multi-language support
 * - Nutritional data integration
 */

import { pool } from '../server';
import { logger } from '../utils/logger';

export interface CategoryMatch {
  category: string;
  confidence: number;
  reason: string;
  alternatives?: { category: string; confidence: number }[];
}

export interface IngredientAnalysis {
  originalName: string;
  cleanedName: string;
  primaryCategory: CategoryMatch;
  alternativeCategories: CategoryMatch[];
  nutritionalHints?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  userFeedback?: {
    correctCategory?: string;
    feedbackCount: number;
  };
}

export class EnhancedIngredientCategorizationService {
  
  // Enhanced category definitions with nutritional profiles
  private static readonly ENHANCED_CATEGORIES = {
    'Proteins': {
      icon: '🍗',
      nutritionalProfile: { protein: 20, carbs: 5, fat: 15 },
      keywords: [
        // Meats
        'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'veal', 'venison',
        'steak', 'ribeye', 'sirloin', 'brisket', 'ground beef', 'hamburger',
        'bacon', 'ham', 'sausage', 'pepperoni', 'salami', 'prosciutto',
        
        // Seafood
        'fish', 'salmon', 'tuna', 'cod', 'halibut', 'tilapia', 'trout', 'bass',
        'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'clam', 'mussel', 'oyster',
        'squid', 'octopus', 'anchovy', 'sardine', 'mackerel',
        
        // Plant proteins
        'tofu', 'tempeh', 'seitan', 'protein powder', 'quinoa',
        
        // Eggs
        'egg', 'eggs', 'egg white', 'egg yolk'
      ],
      patterns: [
        /\b(chicken|turkey|duck|poultry)\s*(breast|thigh|wing|leg|drumstick)?\b/i,
        /\b(beef|steak|ground\s*beef|hamburger|brisket|chuck|ribeye|sirloin)\b/i,
        /\b(pork|bacon|ham|sausage|pork\s*chop|pork\s*loin|ribs)\b/i,
        /\b(fish|salmon|tuna|cod|halibut|tilapia|trout|bass|mahi)\b/i,
        /\b(shrimp|prawn|crab|lobster|scallop|seafood)\b/i,
        /\b(egg|eggs)\b/i,
        /\b(tofu|tempeh|seitan)\b/i
      ]
    },

    'Vegetables': {
      icon: '🥕',
      nutritionalProfile: { protein: 3, carbs: 8, fat: 0.5 },
      keywords: [
        // Root vegetables
        'carrot', 'potato', 'sweet potato', 'beet', 'radish', 'turnip', 'parsnip',
        
        // Leafy greens
        'spinach', 'kale', 'lettuce', 'arugula', 'chard', 'collard', 'romaine',
        'cabbage', 'brussels sprout', 'bok choy',
        
        // Cruciferous
        'broccoli', 'cauliflower', 'cabbage', 'brussels sprout',
        
        // Peppers (specific to avoid spice confusion)
        'bell pepper', 'sweet pepper', 'green pepper', 'red pepper', 'yellow pepper',
        'jalapeño', 'serrano', 'poblano', 'anaheim', 'habanero',
        
        // Alliums
        'onion', 'garlic', 'shallot', 'leek', 'scallion', 'green onion', 'chive',
        
        // Squashes
        'zucchini', 'squash', 'pumpkin', 'butternut', 'acorn squash', 'spaghetti squash',
        
        // Tomatoes
        'tomato', 'cherry tomato', 'grape tomato', 'roma tomato', 'beefsteak tomato',
        
        // Others
        'cucumber', 'eggplant', 'celery', 'asparagus', 'artichoke', 'okra',
        'mushroom', 'portobello', 'shiitake', 'button mushroom', 'cremini'
      ],
      patterns: [
        /\b(bell\s*pepper|sweet\s*pepper|green\s*pepper|red\s*pepper|yellow\s*pepper)\b/i,
        /\b(tomato|cherry\s*tomato|grape\s*tomato|roma\s*tomato)\b/i,
        /\b(onion|red\s*onion|white\s*onion|yellow\s*onion|green\s*onion)\b/i,
        /\b(potato|sweet\s*potato|russet|yukon)\b/i,
        /\b(mushroom|portobello|shiitake|button\s*mushroom)\b/i,
        /\b(spinach|kale|lettuce|arugula|romaine)\b/i,
        /\b(broccoli|cauliflower|brussels\s*sprout)\b/i,
        /\b(carrot|celery|cucumber|zucchini|eggplant)\b/i
      ]
    },

    'Fruits': {
      icon: '🍓',
      nutritionalProfile: { protein: 1, carbs: 15, fat: 0.3 },
      keywords: [
        // Citrus
        'lemon', 'lime', 'orange', 'grapefruit', 'tangerine', 'clementine',
        
        // Berries
        'strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry',
        'elderberry', 'gooseberry', 'boysenberry',
        
        // Tree fruits
        'apple', 'pear', 'peach', 'plum', 'apricot', 'nectarine', 'cherry',
        
        // Tropical
        'banana', 'pineapple', 'mango', 'papaya', 'kiwi', 'passion fruit',
        'dragon fruit', 'star fruit', 'guava', 'lychee',
        
        // Melons
        'watermelon', 'cantaloupe', 'honeydew', 'melon',
        
        // Others
        'grape', 'avocado', 'coconut', 'date', 'fig', 'pomegranate'
      ],
      patterns: [
        /\b(apple|banana|orange|lemon|lime|grapefruit)\b/i,
        /\b(strawberry|blueberry|raspberry|blackberry|cranberry)\b/i,
        /\b(peach|pear|plum|apricot|nectarine|cherry)\b/i,
        /\b(pineapple|mango|papaya|kiwi|coconut)\b/i,
        /\b(watermelon|cantaloupe|honeydew|melon)\b/i,
        /\b(grape|avocado|date|fig|pomegranate)\b/i
      ]
    },

    'Grains & Starches': {
      icon: '🍞',
      nutritionalProfile: { protein: 8, carbs: 70, fat: 2 },
      keywords: [
        // Rice varieties
        'rice', 'white rice', 'brown rice', 'jasmine rice', 'basmati rice',
        'wild rice', 'arborio rice', 'sushi rice', 'long grain rice',
        
        // Pasta
        'pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'macaroni',
        'rigatoni', 'farfalle', 'rotini', 'angel hair', 'lasagna noodle',
        
        // Noodles
        'noodle', 'ramen', 'udon', 'soba', 'rice noodle', 'egg noodle',
        
        // Bread
        'bread', 'baguette', 'sourdough', 'wheat bread', 'white bread',
        'roll', 'bun', 'bagel', 'croissant', 'pita', 'naan', 'tortilla',
        
        // Flours
        'flour', 'all-purpose flour', 'wheat flour', 'bread flour', 'cake flour',
        'almond flour', 'coconut flour', 'rice flour',
        
        // Grains
        'oat', 'oatmeal', 'rolled oats', 'steel cut oats', 'quinoa',
        'couscous', 'bulgur', 'farro', 'barley', 'millet', 'buckwheat',
        
        // Cereals
        'cereal', 'granola', 'cornmeal', 'polenta', 'grits'
      ],
      patterns: [
        /\b(rice|white\s*rice|brown\s*rice|jasmine|basmati|wild\s*rice)\b/i,
        /\b(pasta|spaghetti|penne|fettuccine|linguine|macaroni)\b/i,
        /\b(bread|baguette|sourdough|wheat\s*bread|bagel|roll)\b/i,
        /\b(flour|all-purpose\s*flour|wheat\s*flour|bread\s*flour)\b/i,
        /\b(oat|oatmeal|rolled\s*oats|quinoa|couscous|bulgur)\b/i,
        /\b(noodle|ramen|udon|soba|rice\s*noodle)\b/i
      ]
    },

    'Dairy & Eggs': {
      icon: '🧀',
      nutritionalProfile: { protein: 12, carbs: 5, fat: 8 },
      keywords: [
        // Milk
        'milk', 'whole milk', 'skim milk', '2% milk', '1% milk', 'buttermilk',
        'almond milk', 'soy milk', 'oat milk', 'coconut milk',
        
        // Cheese
        'cheese', 'cheddar', 'mozzarella', 'parmesan', 'swiss', 'gouda',
        'brie', 'feta', 'ricotta', 'cottage cheese', 'cream cheese',
        'provolone', 'monterey jack', 'blue cheese', 'goat cheese',
        
        // Butter & Cream
        'butter', 'margarine', 'ghee', 'clarified butter',
        'cream', 'heavy cream', 'whipping cream', 'half and half',
        'sour cream', 'crème fraîche',
        
        // Yogurt
        'yogurt', 'greek yogurt', 'plain yogurt', 'vanilla yogurt'
      ],
      patterns: [
        /\b(milk|whole\s*milk|skim\s*milk|buttermilk|almond\s*milk)\b/i,
        /\b(cheese|cheddar|mozzarella|parmesan|swiss|feta|ricotta)\b/i,
        /\b(butter|margarine|ghee|clarified\s*butter)\b/i,
        /\b(cream|heavy\s*cream|sour\s*cream|whipping\s*cream)\b/i,
        /\b(yogurt|greek\s*yogurt)\b/i
      ]
    },

    'Spices & Herbs': {
      icon: '🧂',
      nutritionalProfile: { protein: 5, carbs: 20, fat: 3 },
      keywords: [
        // Salt & Pepper (most specific first)
        'salt', 'sea salt', 'kosher salt', 'table salt', 'himalayan salt',
        'black pepper', 'white pepper', 'red pepper flakes', 'cayenne pepper',
        'peppercorn', 'ground pepper',
        
        // Fresh herbs
        'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint', 'dill',
        'tarragon', 'marjoram', 'parsley', 'cilantro', 'chives',
        
        // Dried spices
        'cumin', 'coriander', 'cardamom', 'turmeric', 'curry powder',
        'garam masala', 'paprika', 'chili powder', 'garlic powder',
        'onion powder', 'cinnamon', 'nutmeg', 'cloves', 'allspice',
        'ginger powder', 'ground ginger',
        
        // Extracts
        'vanilla extract', 'almond extract', 'peppermint extract',
        
        // Spice blends
        'italian seasoning', 'herbs de provence', 'old bay', 'cajun seasoning'
      ],
      patterns: [
        /\b(black\s*pepper|white\s*pepper|red\s*pepper\s*flakes|cayenne\s*pepper)\b/i,
        /\b(salt|sea\s*salt|kosher\s*salt|table\s*salt)\b/i,
        /\b(basil|oregano|thyme|rosemary|sage|mint|dill|parsley|cilantro)\b/i,
        /\b(cumin|coriander|cardamom|turmeric|curry|paprika)\b/i,
        /\b(garlic\s*powder|onion\s*powder|chili\s*powder)\b/i,
        /\b(cinnamon|nutmeg|cloves|allspice|ginger\s*powder)\b/i,
        /\b(vanilla\s*extract|almond\s*extract)\b/i
      ]
    },

    'Oils & Fats': {
      icon: '🫒',
      nutritionalProfile: { protein: 0, carbs: 0, fat: 100 },
      keywords: [
        'olive oil', 'extra virgin olive oil', 'vegetable oil', 'canola oil',
        'sunflower oil', 'coconut oil', 'sesame oil', 'peanut oil',
        'avocado oil', 'grapeseed oil', 'corn oil', 'safflower oil',
        'cooking oil', 'frying oil', 'spray oil', 'cooking spray'
      ],
      patterns: [
        /\b(olive\s*oil|extra\s*virgin|vegetable\s*oil|canola\s*oil)\b/i,
        /\b(coconut\s*oil|sesame\s*oil|peanut\s*oil|avocado\s*oil)\b/i,
        /\b(cooking\s*oil|frying\s*oil|spray\s*oil)\b/i,
        /\boil\b/i // Generic oil as last resort
      ]
    },

    'Condiments & Sauces': {
      icon: '🍯',
      nutritionalProfile: { protein: 1, carbs: 25, fat: 0.5 },
      keywords: [
        // Basic condiments
        'ketchup', 'mustard', 'mayonnaise', 'mayo', 'relish',
        
        // Asian sauces
        'soy sauce', 'tamari', 'teriyaki sauce', 'hoisin sauce',
        'fish sauce', 'oyster sauce', 'sriracha', 'sweet and sour sauce',
        
        // Vinegars
        'vinegar', 'balsamic vinegar', 'apple cider vinegar', 'white vinegar',
        'rice vinegar', 'red wine vinegar', 'white wine vinegar',
        
        // Hot sauces
        'hot sauce', 'tabasco', 'salsa', 'pico de gallo', 'guacamole',
        
        // BBQ & Steak sauces
        'bbq sauce', 'barbecue sauce', 'worcestershire sauce', 'steak sauce',
        'a1 sauce',
        
        // Sweet condiments
        'honey', 'maple syrup', 'agave nectar', 'molasses', 'corn syrup',
        'jam', 'jelly', 'preserves', 'marmalade'
      ],
      patterns: [
        /\b(ketchup|mustard|mayonnaise|mayo|relish)\b/i,
        /\b(soy\s*sauce|tamari|teriyaki|hoisin|fish\s*sauce|oyster\s*sauce)\b/i,
        /\b(vinegar|balsamic|apple\s*cider\s*vinegar|white\s*vinegar)\b/i,
        /\b(hot\s*sauce|sriracha|tabasco|salsa)\b/i,
        /\b(bbq\s*sauce|barbecue\s*sauce|worcestershire)\b/i,
        /\b(honey|maple\s*syrup|agave|molasses)\b/i
      ]
    },

    'Nuts & Seeds': {
      icon: '🌰',
      nutritionalProfile: { protein: 15, carbs: 10, fat: 50 },
      keywords: [
        // Tree nuts
        'almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut',
        'macadamia', 'brazil nut', 'pine nut',
        
        // Nut butters
        'peanut butter', 'almond butter', 'cashew butter', 'sunflower butter',
        
        // Seeds
        'sunflower seed', 'pumpkin seed', 'chia seed', 'flax seed',
        'sesame seed', 'hemp seed', 'poppy seed',
        
        // Technically legumes but grouped here
        'peanut', 'peanuts'
      ],
      patterns: [
        /\b(almond|walnut|pecan|cashew|pistachio|hazelnut|macadamia)\b/i,
        /\b(peanut\s*butter|almond\s*butter|cashew\s*butter)\b/i,
        /\b(sunflower\s*seed|pumpkin\s*seed|chia\s*seed|flax\s*seed)\b/i,
        /\b(sesame\s*seed|hemp\s*seed|peanut)\b/i
      ]
    },

    'Legumes & Beans': {
      icon: '🫘',
      nutritionalProfile: { protein: 20, carbs: 45, fat: 2 },
      keywords: [
        // Beans
        'beans', 'black bean', 'kidney bean', 'pinto bean', 'navy bean',
        'lima bean', 'white bean', 'cannellini bean', 'great northern bean',
        
        // Lentils & Peas
        'lentil', 'red lentil', 'green lentil', 'split pea', 'chickpea',
        'garbanzo bean', 'black-eyed pea',
        
        // Soy products
        'soybean', 'edamame'
      ],
      patterns: [
        /\b(beans|black\s*bean|kidney\s*bean|pinto\s*bean|navy\s*bean)\b/i,
        /\b(lima\s*bean|white\s*bean|cannellini)\b/i,
        /\b(lentil|red\s*lentil|green\s*lentil|split\s*pea)\b/i,
        /\b(chickpea|garbanzo|edamame|soybean)\b/i
      ]
    },

    'Canned & Packaged': {
      icon: '🥫',
      nutritionalProfile: { protein: 5, carbs: 15, fat: 2 },
      keywords: [
        // Canned goods
        'canned', 'can of', 'jarred',
        
        // Broths & Stocks
        'broth', 'stock', 'chicken broth', 'beef broth', 'vegetable broth',
        'bone broth', 'chicken stock', 'beef stock',
        
        // Tomato products
        'tomato sauce', 'tomato paste', 'crushed tomato', 'diced tomato',
        'tomato puree', 'marinara sauce', 'pasta sauce',
        
        // Soups
        'soup', 'condensed soup', 'cream of mushroom', 'cream of chicken',
        
        // Packaged items
        'instant', 'boxed', 'frozen'
      ],
      patterns: [
        /\b(canned|can\s*of|jarred)\b/i,
        /\b(broth|stock|chicken\s*broth|beef\s*broth|vegetable\s*broth)\b/i,
        /\b(tomato\s*sauce|tomato\s*paste|crushed\s*tomato|diced\s*tomato)\b/i,
        /\b(soup|condensed\s*soup|cream\s*of)\b/i,
        /\b(instant|boxed|frozen)\b/i
      ]
    },

    'Beverages': {
      icon: '☕',
      nutritionalProfile: { protein: 0.5, carbs: 5, fat: 0 },
      keywords: [
        // Coffee
        'coffee', 'espresso', 'latte', 'cappuccino', 'americano', 'cold brew',
        
        // Tea
        'tea', 'green tea', 'black tea', 'herbal tea', 'chai tea', 'iced tea',
        
        // Juices
        'juice', 'orange juice', 'apple juice', 'cranberry juice', 'grape juice',
        'lemon juice', 'lime juice', 'tomato juice',
        
        // Soft drinks
        'soda', 'cola', 'sprite', 'ginger ale', 'tonic water', 'club soda',
        
        // Water
        'water', 'sparkling water', 'mineral water', 'seltzer water',
        
        // Alcoholic
        'wine', 'red wine', 'white wine', 'beer', 'ale', 'lager', 'stout',
        'liquor', 'vodka', 'rum', 'whiskey', 'tequila', 'gin', 'bourbon'
      ],
      patterns: [
        /\b(coffee|espresso|latte|cappuccino|americano)\b/i,
        /\b(tea|green\s*tea|black\s*tea|herbal\s*tea|chai)\b/i,
        /\b(juice|orange\s*juice|apple\s*juice|cranberry\s*juice)\b/i,
        /\b(soda|cola|sprite|ginger\s*ale|tonic\s*water)\b/i,
        /\b(water|sparkling\s*water|mineral\s*water)\b/i,
        /\b(wine|red\s*wine|white\s*wine|beer|ale|lager)\b/i
      ]
    }
  };

  /**
   * Enhanced categorization with multiple scoring methods
   */
  static async categorizeIngredient(ingredientName: string): Promise<IngredientAnalysis> {
    const cleanedName = this.cleanIngredientName(ingredientName);
    
    // Get all possible category matches
    const categoryScores = await this.calculateCategoryScores(cleanedName);
    
    // Sort by confidence
    categoryScores.sort((a, b) => b.confidence - a.confidence);
    
    const primaryCategory = categoryScores[0];
    const alternativeCategories = categoryScores.slice(1, 3); // Top 2 alternatives
    
    // Get user feedback if available
    const userFeedback = await this.getUserFeedback(cleanedName);
    
    // Get nutritional hints if available
    const nutritionalHints = await this.getNutritionalHints(cleanedName);
    
    return {
      originalName: ingredientName,
      cleanedName,
      primaryCategory,
      alternativeCategories,
      nutritionalHints,
      userFeedback
    };
  }

  /**
   * Calculate scores for all categories using multiple methods
   */
  private static async calculateCategoryScores(cleanedName: string): Promise<CategoryMatch[]> {
    const scores: CategoryMatch[] = [];
    
    for (const [categoryName, categoryData] of Object.entries(this.ENHANCED_CATEGORIES)) {
      let confidence = 0;
      let reason = '';
      
      // Method 1: Exact keyword match (highest confidence)
      const exactMatch = categoryData.keywords.find(keyword => 
        cleanedName.toLowerCase() === keyword.toLowerCase()
      );
      if (exactMatch) {
        confidence = 0.95;
        reason = `Exact keyword match: "${exactMatch}"`;
      }
      
      // Method 2: Pattern matching (high confidence)
      if (confidence < 0.8) {
        for (const pattern of categoryData.patterns) {
          if (pattern.test(cleanedName)) {
            confidence = Math.max(confidence, 0.85);
            reason = `Pattern match: ${pattern.source}`;
            break;
          }
        }
      }
      
      // Method 3: Partial keyword match (medium confidence)
      if (confidence < 0.7) {
        const partialMatch = categoryData.keywords.find(keyword => 
          cleanedName.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(cleanedName.toLowerCase())
        );
        if (partialMatch) {
          confidence = Math.max(confidence, 0.65);
          reason = `Partial keyword match: "${partialMatch}"`;
        }
      }
      
      // Method 4: Fuzzy string matching (lower confidence)
      if (confidence < 0.5) {
        const fuzzyMatch = this.findBestFuzzyMatch(cleanedName, categoryData.keywords);
        if (fuzzyMatch.similarity > 0.7) {
          confidence = Math.max(confidence, fuzzyMatch.similarity * 0.6);
          reason = `Fuzzy match: "${fuzzyMatch.keyword}" (${Math.round(fuzzyMatch.similarity * 100)}% similar)`;
        }
      }
      
      if (confidence > 0.1) {
        scores.push({
          category: categoryName,
          confidence,
          reason
        });
      }
    }
    
    // If no good matches, use fallback categorization
    if (scores.length === 0 || scores[0].confidence < 0.3) {
      const fallbackCategory = this.getFallbackCategory(cleanedName);
      scores.unshift({
        category: fallbackCategory.category,
        confidence: fallbackCategory.confidence,
        reason: fallbackCategory.reason
      });
    }
    
    return scores;
  }

  /**
   * Find best fuzzy match using improved algorithm
   */
  private static findBestFuzzyMatch(target: string, keywords: string[]): { keyword: string; similarity: number } {
    let bestMatch = { keyword: '', similarity: 0 };
    
    for (const keyword of keywords) {
      const similarity = this.calculateSimilarity(target.toLowerCase(), keyword.toLowerCase());
      if (similarity > bestMatch.similarity) {
        bestMatch = { keyword, similarity };
      }
    }
    
    return bestMatch;
  }

  /**
   * Enhanced similarity calculation with multiple algorithms
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    // Jaro-Winkler similarity (better for ingredient names)
    const jaroSimilarity = this.jaroWinklerSimilarity(str1, str2);
    
    // Levenshtein similarity
    const levenshteinSimilarity = this.levenshteinSimilarity(str1, str2);
    
    // Substring similarity
    const substringSimilarity = this.substringSimilarity(str1, str2);
    
    // Weighted average (Jaro-Winkler is best for names)
    return (jaroSimilarity * 0.5) + (levenshteinSimilarity * 0.3) + (substringSimilarity * 0.2);
  }

  /**
   * Jaro-Winkler similarity (better for ingredient names)
   */
  private static jaroWinklerSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0 || len2 === 0) return 0.0;
    
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    if (matchWindow < 0) return 0.0;
    
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0.0;
    
    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    
    // Winkler modification
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    
    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * Levenshtein similarity
   */
  private static levenshteinSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Substring similarity
   */
  private static substringSimilarity(str1: string, str2: string): number {
    if (str1.includes(str2) || str2.includes(str1)) {
      return Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
    }
    return 0;
  }

  /**
   * Fallback categorization for unknown ingredients
   */
  private static getFallbackCategory(cleanedName: string): CategoryMatch {
    // Use simple heuristics for unknown ingredients
    const name = cleanedName.toLowerCase();
    
    // Check for common endings
    if (name.endsWith('oil') || name.endsWith('fat')) {
      return { category: 'Oils & Fats', confidence: 0.4, reason: 'Ends with "oil" or "fat"' };
    }
    
    if (name.endsWith('sauce') || name.endsWith('dressing')) {
      return { category: 'Condiments & Sauces', confidence: 0.4, reason: 'Ends with "sauce" or "dressing"' };
    }
    
    if (name.endsWith('powder') || name.endsWith('seasoning')) {
      return { category: 'Spices & Herbs', confidence: 0.4, reason: 'Ends with "powder" or "seasoning"' };
    }
    
    // Check for common prefixes
    if (name.startsWith('fresh') || name.startsWith('dried')) {
      return { category: 'Spices & Herbs', confidence: 0.3, reason: 'Starts with "fresh" or "dried"' };
    }
    
    if (name.startsWith('ground') || name.startsWith('minced')) {
      return { category: 'Proteins', confidence: 0.3, reason: 'Starts with "ground" or "minced"' };
    }
    
    // Default to Other
    return { category: 'Other', confidence: 0.2, reason: 'No specific patterns matched' };
  }

  /**
   * Get user feedback for ingredient categorization
   */
  private static async getUserFeedback(ingredientName: string): Promise<{ correctCategory?: string; feedbackCount: number } | undefined> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT category, COUNT(*) as feedback_count
          FROM ingredient_categorization_feedback 
          WHERE LOWER(ingredient_name) = LOWER($1)
          GROUP BY category
          ORDER BY feedback_count DESC
          LIMIT 1
        `, [ingredientName]);
        
        if (result.rows.length > 0) {
          return {
            correctCategory: result.rows[0].category,
            feedbackCount: parseInt(result.rows[0].feedback_count)
          };
        }
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error getting user feedback:', error);
    }
    
    return undefined;
  }

  /**
   * Get nutritional hints from FatSecret or database
   */
  private static async getNutritionalHints(ingredientName: string): Promise<{ protein: number; carbs: number; fat: number } | undefined> {
    // This would integrate with FatSecret API or local nutrition database
    // For now, return undefined - can be implemented later
    return undefined;
  }

  /**
   * Enhanced ingredient name cleaning
   */
  private static cleanIngredientName(rawName: string): string {
    if (!rawName) return '';

    let cleaned = rawName.toLowerCase().trim();

    // Remove common prefixes that don't affect categorization
    cleaned = cleaned.replace(/^(fresh|dried|frozen|canned|organic|raw|cooked|grilled|baked|fried)\s+/i, '');
    
    // Remove measurements and quantities
    cleaned = cleaned.replace(/^\d+(\.\d+)?\s*(cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|piece|pieces|slice|slices|serving|servings)?\s*/i, '');
    
    // Remove fractions
    cleaned = cleaned.replace(/^\d+\/\d+\s*/i, '');
    
    // Remove preparation methods
    cleaned = cleaned.replace(/\s*(chopped|sliced|diced|minced|grated|shredded|crushed|ground)$/i, '');
    
    // Remove "of" constructions (e.g., "can of tomatoes" -> "tomatoes")
    cleaned = cleaned.replace(/^(can|jar|bottle|box|bag|package)\s+of\s+/i, '');
    
    // Remove parenthetical information
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Handle plurals more intelligently
    if (cleaned.endsWith('ies')) {
      cleaned = cleaned.slice(0, -3) + 'y';
    } else if (cleaned.endsWith('es') && cleaned.length > 4) {
      // Check if it's a real plural (not "cheese", "rice", etc.)
      const singular = cleaned.slice(0, -2);
      if (!['chees', 'ric', 'peas'].includes(singular)) {
        cleaned = singular;
      }
    } else if (cleaned.endsWith('s') && cleaned.length > 3) {
      // Check if it's a real plural
      const singular = cleaned.slice(0, -1);
      if (!['rice', 'cheese', 'peas', 'beans'].includes(cleaned)) {
        cleaned = singular;
      }
    }
    
    return cleaned;
  }

  /**
   * Record user feedback for improving categorization
   */
  static async recordUserFeedback(ingredientName: string, correctCategory: string, userId: string): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO ingredient_categorization_feedback 
          (ingredient_name, category, user_id, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (ingredient_name, category, user_id) 
          DO UPDATE SET updated_at = NOW()
        `, [ingredientName, correctCategory, userId]);
        
        logger.info(`Recorded categorization feedback: ${ingredientName} -> ${correctCategory}`);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error recording user feedback:', error);
    }
  }

  /**
   * Batch categorize multiple ingredients efficiently
   */
  static async categorizeIngredients(ingredientNames: string[]): Promise<IngredientAnalysis[]> {
    const results = await Promise.all(
      ingredientNames.map(name => this.categorizeIngredient(name))
    );
    return results;
  }

  /**
   * Get category statistics for analytics
   */
  static async getCategoryStatistics(): Promise<{ category: string; count: number; accuracy: number }[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            ui.category,
            COUNT(*) as ingredient_count,
            COALESCE(
              (SELECT COUNT(*) FROM ingredient_categorization_feedback icf 
               WHERE icf.category = ui.category) * 100.0 / COUNT(*), 
              0
            ) as feedback_accuracy
          FROM user_ingredients ui
          WHERE ui.category IS NOT NULL
          GROUP BY ui.category
          ORDER BY ingredient_count DESC
        `);
        
        return result.rows.map(row => ({
          category: row.category,
          count: parseInt(row.ingredient_count),
          accuracy: parseFloat(row.feedback_accuracy)
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error getting category statistics:', error);
      return [];
    }
  }
}
