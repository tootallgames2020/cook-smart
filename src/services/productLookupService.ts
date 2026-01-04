import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';

export interface ScannedProduct {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  serving_size?: string;
  cachedAt?: number;
  lastAccessedAt?: number;
  accessCount?: number;
}

interface BarcodeApiResponse {
  success: boolean;
  product?: {
    barcode: string;
    name: string;
    brand?: string;
    category?: string;
    nutrition?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    };
    serving_size?: string;
  };
  provider?: string;
  message?: string;
}

export interface ProductLookupService {
  lookupByBarcode(barcode: string): Promise<ScannedProduct | null>;
  getCachedProduct(barcode: string): Promise<ScannedProduct | null>;
  cacheProduct(barcode: string, product: ScannedProduct): Promise<void>;
  updateCacheAccess(barcode: string): Promise<void>;
  clearExpiredCache(): Promise<void>;
}

class ProductLookupServiceImpl implements ProductLookupService {
  private readonly CACHE_PREFIX = 'barcode_cache_';
  private readonly API_TIMEOUT = 10000; // 10 seconds
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second rate limit

  /**
   * Get auth token for API requests
   */
  private async getAuthToken(): Promise<string> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token');
    }
    return token;
  }

  /**
   * Lookup product by barcode (cache-first strategy)
   * @param barcode - The barcode to lookup
   * @returns Promise<ScannedProduct | null>
   */
  async lookupByBarcode(barcode: string): Promise<ScannedProduct | null> {
    try {
      // Check cache first
      const cachedProduct = await this.getCachedProduct(barcode);
      if (cachedProduct) {
        // Update access tracking
        await this.updateCacheAccess(barcode);
        return cachedProduct;
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Call API
      const product = await this.fetchFromAPI(barcode);
      
      if (product) {
        // Cache the result
        await this.cacheProduct(barcode, product);
      }

      return product;
    } catch (error) {
      console.error('Error looking up product:', error);
      throw error;
    }
  }

  /**
   * Get cached product from AsyncStorage
   * @param barcode - The barcode to lookup
   * @returns Promise<ScannedProduct | null>
   */
  async getCachedProduct(barcode: string): Promise<ScannedProduct | null> {
    try {
      const key = `${this.CACHE_PREFIX}${barcode}`;
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) {
        return null;
      }

      const product: ScannedProduct = JSON.parse(cached);
      
      // Check if expired based on access count
      if (this.isExpired(product)) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return product;
    } catch (error) {
      console.error('Error getting cached product:', error);
      return null;
    }
  }

  /**
   * Cache product data with access tracking
   * @param barcode - The barcode
   * @param product - The product data to cache
   */
  async cacheProduct(barcode: string, product: ScannedProduct): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${barcode}`;
      const now = Date.now();
      
      const cachedProduct: ScannedProduct = {
        ...product,
        cachedAt: now,
        lastAccessedAt: now,
        accessCount: 1,
      };

      await AsyncStorage.setItem(key, JSON.stringify(cachedProduct));
    } catch (error) {
      console.error('Error caching product:', error);
    }
  }

  /**
   * Update cache access tracking (increment count and timestamp)
   * @param barcode - The barcode
   */
  async updateCacheAccess(barcode: string): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${barcode}`;
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) {
        return;
      }

      const product: ScannedProduct = JSON.parse(cached);
      product.lastAccessedAt = Date.now();
      product.accessCount = (product.accessCount || 0) + 1;

      await AsyncStorage.setItem(key, JSON.stringify(product));
    } catch (error) {
      console.error('Error updating cache access:', error);
    }
  }

  /**
   * Clear expired cache entries based on smart expiration rules
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const product: ScannedProduct = JSON.parse(cached);
          if (this.isExpired(product)) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Fetch product data from Cook Smart API (FatSecret backend)
   * @param barcode - The barcode to lookup
   * @returns Promise<ScannedProduct | null>
   */
  private async fetchFromAPI(barcode: string): Promise<ScannedProduct | null> {
    try {
      const token = await this.getAuthToken();
      const url = `${API_BASE_URL}/api/v1/barcode/lookup/${barcode}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: this.API_TIMEOUT,
      });

      const data: BarcodeApiResponse = await response.json();

      if (data.success && data.product) {
        return this.parseProductData(data.product);
      }

      return null;
    } catch (error) {
      console.error('API lookup error:', error);
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('Request timeout - please try again');
        }
        if (error.message.includes('Network')) {
          throw new Error('Network error - check your connection');
        }
      }
      throw error;
    }
  }

  /**
   * Parse Cook Smart API response
   * @param product - The API response product
   * @returns ScannedProduct
   */
  private parseProductData(product: BarcodeApiResponse['product']): ScannedProduct {
    if (!product) {
      throw new Error('Invalid product data');
    }
    
    return {
      barcode: product.barcode,
      name: product.name || 'Unknown Product',
      brand: product.brand,
      category: product.category || 'food',
      nutrition: product.nutrition,
      serving_size: product.serving_size,
    };
  }

  /**
   * Check if cached product is expired based on access count
   * Smart expiration rules:
   * - 5+ scans: Never expires
   * - 3-4 scans: Expires after 90 days of no access
   * - 1-2 scans: Expires after 30 days of no access
   * @param product - The cached product
   * @returns boolean
   */
  private isExpired(product: ScannedProduct): boolean {
    const accessCount = product.accessCount || 0;
    const lastAccessed = product.lastAccessedAt || product.cachedAt || 0;
    const now = Date.now();
    const daysSinceAccess = (now - lastAccessed) / (1000 * 60 * 60 * 24);

    // Frequently scanned items never expire
    if (accessCount >= 5) {
      return false;
    }

    // Medium usage: 90 days
    if (accessCount >= 3) {
      return daysSinceAccess > 90;
    }

    // Rarely scanned: 30 days
    return daysSinceAccess > 30;
  }

  /**
   * Enforce rate limiting (1 request per second)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise<void>(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
}

// Export singleton instance
export const productLookupService = new ProductLookupServiceImpl();
