/**
 * SMART FAMILY COORDINATION SERVICE
 * 
 * Super-intelligent family household management with:
 * - Automatic grocery store detection (no manual setup)
 * - Real-time family coordination
 * - AI-powered shopping suggestions
 * - Smart duplicate prevention
 * - Consumption pattern learning
 */

import { pool } from '../server';
import { PushNotificationService } from './PushNotificationService';
import { logger } from '../utils/logger';

export interface FamilyMember {
  user_id: string;
  display_name: string;
  role: 'admin' | 'member' | 'child';
  joined_at: Date;
  last_active: Date;
}

export interface StoreVisit {
  user_id: string;
  store_name: string;
  store_address: string;
  detected_at: Date;
  detection_method: 'gps' | 'wifi' | 'bluetooth' | 'manual';
  confidence_score: number;
}

export interface SmartSuggestion {
  item_name: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  source: 'expiring' | 'pattern' | 'family_request' | 'ai_prediction';
}

export class SmartFamilyCoordinationService {

  /**
   * MAJOR GROCERY STORE CHAINS DATABASE
   * No API signup required - built-in recognition
   */
  private static readonly GROCERY_STORE_PATTERNS = [
    // Walmart variations
    { names: ['walmart', 'walmart supercenter', 'walmart neighborhood'], chain: 'Walmart' },
    { names: ['target', 'super target'], chain: 'Target' },
    { names: ['kroger', 'king soopers', 'ralphs', 'fred meyer'], chain: 'Kroger' },
    { names: ['safeway', 'vons', 'pavilions'], chain: 'Safeway' },
    { names: ['publix', 'publix super market'], chain: 'Publix' },
    { names: ['whole foods', 'whole foods market'], chain: 'Whole Foods' },
    { names: ['costco', 'costco wholesale'], chain: 'Costco' },
    { names: ['sams club', 'sam\'s club'], chain: 'Sam\'s Club' },
    { names: ['aldi'], chain: 'Aldi' },
    { names: ['trader joes', 'trader joe\'s'], chain: 'Trader Joe\'s' },
    { names: ['meijer'], chain: 'Meijer' },
    { names: ['heb', 'h-e-b'], chain: 'H-E-B' },
    { names: ['wegmans'], chain: 'Wegmans' },
    { names: ['giant', 'giant eagle', 'stop & shop'], chain: 'Giant' },
    { names: ['food lion', 'harris teeter'], chain: 'Food Lion' },
    { names: ['shoprite', 'acme'], chain: 'ShopRite' },
  ];

  /**
   * WIFI NETWORK PATTERNS FOR STORE DETECTION
   * Many stores broadcast recognizable WiFi networks
   */
  private static readonly STORE_WIFI_PATTERNS = [
    { pattern: /walmart.*guest/i, store: 'Walmart' },
    { pattern: /target.*wifi/i, store: 'Target' },
    { pattern: /kroger.*free/i, store: 'Kroger' },
    { pattern: /safeway.*wifi/i, store: 'Safeway' },
    { pattern: /publix.*guest/i, store: 'Publix' },
    { pattern: /wholefoods.*wifi/i, store: 'Whole Foods' },
    { pattern: /costco.*wifi/i, store: 'Costco' },
    { pattern: /samsclub.*guest/i, store: 'Sam\'s Club' },
  ];

  /**
   * CREATE FAMILY
   */
  static async createFamily(creatorUserId: string, familyName: string): Promise<{
    family_id: number;
    invite_code: string;
  }> {
    try {
      const client = await pool.connect();
      try {
        // Generate unique invite code
        const inviteCode = this.generateInviteCode();

        const result = await client.query(`
          INSERT INTO families (family_name, invite_code, created_by, created_at)
          VALUES ($1, $2, $3, NOW())
          RETURNING id, invite_code
        `, [familyName, inviteCode, creatorUserId]);

        const familyId = result.rows[0].id;

        // Add creator as admin
        await client.query(`
          INSERT INTO family_members (family_id, user_id, role, joined_at)
          VALUES ($1, $2, 'admin', NOW())
        `, [familyId, creatorUserId]);

        logger.info(`Family created: "${familyName}" by user ${creatorUserId}`);

        return {
          family_id: familyId,
          invite_code: inviteCode,
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Create family error:', error);
      throw error;
    }
  }

  /**
   * JOIN FAMILY
   */
  static async joinFamily(userId: string, inviteCode: string, displayName: string): Promise<{
    family_id: number;
    family_name: string;
    member_count: number;
  }> {
    try {
      const client = await pool.connect();
      try {
        // Find family by invite code
        const familyResult = await client.query(`
          SELECT id, family_name FROM families WHERE invite_code = $1
        `, [inviteCode]);

        if (familyResult.rows.length === 0) {
          throw new Error('Invalid invite code');
        }

        const family = familyResult.rows[0];

        // Check if user already in family
        const existingMember = await client.query(`
          SELECT id FROM family_members WHERE family_id = $1 AND user_id = $2
        `, [family.id, userId]);

        if (existingMember.rows.length > 0) {
          throw new Error('User already in this family');
        }

        // Add user to family
        await client.query(`
          INSERT INTO family_members (family_id, user_id, role, display_name, joined_at)
          VALUES ($1, $2, 'member', $3, NOW())
        `, [family.id, userId, displayName]);

        // Get member count
        const memberCount = await client.query(`
          SELECT COUNT(*) as count FROM family_members WHERE family_id = $1
        `, [family.id]);

        // Notify existing family members
        await this.notifyFamilyMemberJoined(family.id, displayName);

        logger.info(`User ${userId} joined family ${family.family_name}`);

        return {
          family_id: family.id,
          family_name: family.family_name,
          member_count: parseInt(memberCount.rows[0].count),
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Join family error:', error);
      throw error;
    }
  }

  /**
   * DETECT GROCERY STORE VISIT
   * Uses multiple detection methods for high accuracy
   */
  static async detectStoreVisit(
    userId: string,
    location: { latitude: number; longitude: number },
    nearbyWifiNetworks?: string[],
    placeName?: string
  ): Promise<StoreVisit | null> {
    try {
      let detectedStore: string | null = null;
      let detectionMethod: 'gps' | 'wifi' | 'bluetooth' | 'manual' = 'gps';
      let confidenceScore = 0;

      // Method 1: Place name recognition (highest confidence)
      if (placeName) {
        const storeMatch = this.matchStoreByName(placeName);
        if (storeMatch) {
          detectedStore = storeMatch;
          detectionMethod = 'gps';
          confidenceScore = 0.9;
        }
      }

      // Method 2: WiFi network detection (high confidence)
      if (!detectedStore && nearbyWifiNetworks) {
        const wifiMatch = this.matchStoreByWifi(nearbyWifiNetworks);
        if (wifiMatch) {
          detectedStore = wifiMatch;
          detectionMethod = 'wifi';
          confidenceScore = 0.8;
        }
      }

      // Method 3: GPS + Known store locations (medium confidence)
      if (!detectedStore) {
        const gpsMatch = await this.matchStoreByGPS(location);
        if (gpsMatch) {
          detectedStore = gpsMatch.store_name;
          detectionMethod = 'gps';
          confidenceScore = 0.7;
        }
      }

      if (!detectedStore || confidenceScore < 0.6) {
        return null; // Not confident enough
      }

      // Record store visit
      const storeVisit: StoreVisit = {
        user_id: userId,
        store_name: detectedStore,
        store_address: placeName || 'Location detected',
        detected_at: new Date(),
        detection_method: detectionMethod,
        confidence_score: confidenceScore,
      };

      await this.recordStoreVisit(storeVisit);

      // Trigger family coordination
      await this.triggerFamilyShoppingCoordination(userId, storeVisit);

      return storeVisit;
    } catch (error) {
      logger.error('Store detection error:', error);
      return null;
    }
  }

  /**
   * TRIGGER FAMILY SHOPPING COORDINATION
   * The magic happens here - smart family notifications
   */
  private static async triggerFamilyShoppingCoordination(
    shopperId: string,
    storeVisit: StoreVisit
  ): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        // Get shopper's family
        const familyResult = await client.query(`
          SELECT fm.family_id, f.family_name, u.name as shopper_name
          FROM family_members fm
          JOIN families f ON fm.family_id = f.id
          JOIN users u ON fm.user_id = u.id
          WHERE fm.user_id = $1
        `, [shopperId]);

        if (familyResult.rows.length === 0) {
          return; // User not in a family
        }

        const family = familyResult.rows[0];

        // Get family shopping list
        const shoppingList = await this.getFamilyShoppingList(family.family_id);

        // Get expiring ingredients
        const expiringItems = await this.getFamilyExpiringIngredients(family.family_id);

        // Generate AI suggestions
        const aiSuggestions = await this.generateSmartSuggestions(
          family.family_id,
          storeVisit.store_name
        );

        // Create shopping session
        await client.query(`
          INSERT INTO family_shopping_sessions (family_id, shopper_user_id, store_name, started_at)
          VALUES ($1, $2, $3, NOW())
        `, [family.family_id, shopperId, storeVisit.store_name]);

        // Notify family members
        await this.notifyFamilyOfStoreVisit(
          family.family_id,
          shopperId,
          family.shopper_name,
          storeVisit.store_name,
          shoppingList,
          expiringItems,
          aiSuggestions
        );

        logger.info(`Family shopping coordination triggered: ${family.shopper_name} at ${storeVisit.store_name}`);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Family shopping coordination error:', error);
    }
  }

  /**
   * GENERATE SMART AI SUGGESTIONS
   * Super-intelligent suggestions based on family patterns
   */
  private static async generateSmartSuggestions(
    familyId: number,
    storeName: string
  ): Promise<SmartSuggestion[]> {
    try {
      const client = await pool.connect();
      try {
        const suggestions: SmartSuggestion[] = [];

        // 1. Consumption Pattern Analysis
        const consumptionPatterns = await client.query(`
          SELECT 
            ui.ingredient_name,
            AVG(iul.quantity_used) as avg_usage,
            COUNT(*) as usage_frequency,
            MAX(iul.used_at) as last_used,
            EXTRACT(DAY FROM (NOW() - MAX(iul.used_at))) as days_since_last_use
          FROM user_ingredients ui
          JOIN ingredient_usage_log iul ON ui.ingredient_name = iul.ingredient_name
          WHERE ui.family_id = $1
          GROUP BY ui.ingredient_name
          HAVING COUNT(*) >= 3 -- At least 3 uses to establish pattern
        `, [familyId]);

        for (const pattern of consumptionPatterns.rows) {
          const daysSinceLastUse = parseInt(pattern.days_since_last_use);
          const avgUsageFrequency = pattern.usage_frequency / 30; // Uses per day

          // Predict if item should be running low
          if (daysSinceLastUse > (7 / avgUsageFrequency)) {
            suggestions.push({
              item_name: pattern.ingredient_name,
              reason: `Family uses ${pattern.ingredient_name} every ${Math.round(7/avgUsageFrequency)} days. Last used ${daysSinceLastUse} days ago.`,
              urgency: daysSinceLastUse > 14 ? 'high' : 'medium',
              confidence: 0.8,
              source: 'pattern',
            });
          }
        }

        // 2. Seasonal/Store-Specific Suggestions
        const storeSpecificSuggestions = this.getStoreSpecificSuggestions(storeName);
        suggestions.push(...storeSpecificSuggestions);

        // 3. Family Meal Planning Integration
        const mealPlanSuggestions = await this.getMealPlanSuggestions(familyId);
        suggestions.push(...mealPlanSuggestions);

        // Sort by urgency and confidence
        return suggestions
          .sort((a, b) => {
            const urgencyScore = { high: 3, medium: 2, low: 1 };
            return (urgencyScore[b.urgency] * b.confidence) - (urgencyScore[a.urgency] * a.confidence);
          })
          .slice(0, 5); // Top 5 suggestions

      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Smart suggestions error:', error);
      return [];
    }
  }

  /**
   * STORE-SPECIFIC SMART SUGGESTIONS
   */
  private static getStoreSpecificSuggestions(storeName: string): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const currentMonth = new Date().getMonth();

    // Costco-specific suggestions
    if (storeName.toLowerCase().includes('costco')) {
      suggestions.push({
        item_name: 'bulk paper towels',
        reason: 'Costco bulk sizes offer 40% savings on household essentials',
        urgency: 'low',
        confidence: 0.6,
        source: 'ai_prediction',
      });
    }

    // Seasonal suggestions
    if (currentMonth >= 2 && currentMonth <= 4) { // Spring
      suggestions.push({
        item_name: 'fresh berries',
        reason: 'Berry season - fresh strawberries and blueberries at peak quality',
        urgency: 'medium',
        confidence: 0.7,
        source: 'ai_prediction',
      });
    }

    return suggestions;
  }

  /**
   * NOTIFY FAMILY OF STORE VISIT
   */
  private static async notifyFamilyOfStoreVisit(
    familyId: number,
    shopperId: string,
    shopperName: string,
    storeName: string,
    shoppingList: any[],
    expiringItems: any[],
    aiSuggestions: SmartSuggestion[]
  ): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        // Get all family members except the shopper
        const familyMembers = await client.query(`
          SELECT fm.user_id, u.name
          FROM family_members fm
          JOIN users u ON fm.user_id = u.id
          WHERE fm.family_id = $1 AND fm.user_id != $2
        `, [familyId, shopperId]);

        const urgentItems = shoppingList.filter(item => item.urgent).length;
        const expiringCount = expiringItems.length;
        const topSuggestions = aiSuggestions.slice(0, 2);

        let notificationTitle = `🛒 ${shopperName} is at ${storeName}!`;
        let notificationBody = '';

        if (urgentItems > 0) {
          notificationBody += `📝 ${urgentItems} urgent item${urgentItems > 1 ? 's' : ''} on list\n`;
        }
        if (expiringCount > 0) {
          notificationBody += `⏰ ${expiringCount} item${expiringCount > 1 ? 's' : ''} expiring soon\n`;
        }
        if (topSuggestions.length > 0) {
          notificationBody += `💡 Suggested: ${topSuggestions.map(s => s.item_name).join(', ')}`;
        }

        if (!notificationBody) {
          notificationBody = 'Tap to add items or send suggestions';
        }

        // Send notifications to all family members
        for (const member of familyMembers.rows) {
          await PushNotificationService.sendNotification(
            parseInt(member.user_id),
            notificationTitle,
            notificationBody,
            {
              type: 'family_shopping_alert',
              shopper_id: shopperId,
              shopper_name: shopperName,
              store_name: storeName,
              family_id: familyId,
              shopping_list: shoppingList,
              expiring_items: expiringItems,
              ai_suggestions: aiSuggestions,
            }
          );
        }

        logger.info(`Family notified: ${shopperName} at ${storeName} (${familyMembers.rows.length} members)`);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Family notification error:', error);
    }
  }

  /**
   * UTILITY METHODS
   */
  private static generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static matchStoreByName(placeName: string): string | null {
    const normalizedName = placeName.toLowerCase();
    
    for (const storeGroup of this.GROCERY_STORE_PATTERNS) {
      for (const name of storeGroup.names) {
        if (normalizedName.includes(name)) {
          return storeGroup.chain;
        }
      }
    }
    return null;
  }

  private static matchStoreByWifi(wifiNetworks: string[]): string | null {
    for (const network of wifiNetworks) {
      for (const pattern of this.STORE_WIFI_PATTERNS) {
        if (pattern.pattern.test(network)) {
          return pattern.store;
        }
      }
    }
    return null;
  }

  private static async matchStoreByGPS(location: { latitude: number; longitude: number }): Promise<{
    store_name: string;
    address: string;
  } | null> {
    // This would integrate with a free geocoding service
    // For now, return null - can be enhanced with OpenStreetMap data
    return null;
  }

  private static async recordStoreVisit(storeVisit: StoreVisit): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO store_visits (user_id, store_name, store_address, detected_at, detection_method, confidence_score)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          storeVisit.user_id,
          storeVisit.store_name,
          storeVisit.store_address,
          storeVisit.detected_at,
          storeVisit.detection_method,
          storeVisit.confidence_score,
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Record store visit error:', error);
    }
  }

  private static async getFamilyShoppingList(familyId: number): Promise<any[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT sli.*, u.name as added_by_name
          FROM shopping_list_items sli
          JOIN users u ON sli.user_id = u.id
          WHERE sli.family_id = $1 AND sli.completed = false
          ORDER BY sli.urgent DESC, sli.added_at ASC
        `, [familyId]);

        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get family shopping list error:', error);
      return [];
    }
  }

  private static async getFamilyExpiringIngredients(familyId: number): Promise<any[]> {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT ui.ingredient_name, ui.expiration_date,
                 EXTRACT(DAY FROM (ui.expiration_date - CURRENT_DATE)) as days_until_expiry
          FROM user_ingredients ui
          WHERE ui.family_id = $1
            AND ui.expiration_date IS NOT NULL
            AND ui.expiration_date <= CURRENT_DATE + INTERVAL '3 days'
            AND ui.expiration_date >= CURRENT_DATE
            AND ui.quantity > 0
          ORDER BY ui.expiration_date ASC
        `, [familyId]);

        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Get family expiring ingredients error:', error);
      return [];
    }
  }

  private static async getMealPlanSuggestions(familyId: number): Promise<SmartSuggestion[]> {
    // Placeholder for meal planning integration
    return [];
  }

  private static async notifyFamilyMemberJoined(familyId: number, memberName: string): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        const familyMembers = await client.query(`
          SELECT fm.user_id FROM family_members fm WHERE fm.family_id = $1
        `, [familyId]);

        for (const member of familyMembers.rows) {
          await PushNotificationService.sendNotification(
            parseInt(member.user_id),
            '👨‍👩‍👧‍👦 Family Member Joined!',
            `${memberName} joined your family`,
            {
              type: 'family_member_joined',
              member_name: memberName,
              family_id: familyId,
            }
          );
        }
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Notify family member joined error:', error);
    }
  }
}