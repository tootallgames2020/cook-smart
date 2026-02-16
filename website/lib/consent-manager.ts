/**
 * Consent Management System
 * GDPR and CCPA compliant consent tracking
 */

export interface ConsentRecord {
  id: string;
  userId?: string;
  email: string;
  consentType: 'marketing' | 'analytics' | 'functional' | 'all';
  consentGiven: boolean;
  consentDate: Date;
  consentMethod: 'signup_form' | 'cookie_banner' | 'email_link' | 'account_settings';
  ipAddress: string;
  userAgent: string;
  consentText: string;
  source: string;
  doubleOptIn: boolean;
  doubleOptInDate?: Date;
  withdrawnDate?: Date;
  version: string;
}

export interface CookieConsent {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: Date;
  version: string;
}

export class ConsentManager {
  private static CONSENT_VERSION = '1.0';
  private static STORAGE_KEY = 'cook-smart-consent';

  /**
   * Save cookie consent preferences
   */
  static saveCookieConsent(consent: Omit<CookieConsent, 'timestamp' | 'version'>): void {
    const consentRecord: CookieConsent = {
      ...consent,
      timestamp: new Date(),
      version: this.CONSENT_VERSION,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(consentRecord));
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('consentUpdated', { detail: consentRecord }));
    }
  }

  /**
   * Get current cookie consent preferences
   */
  static getCookieConsent(): CookieConsent | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      const consent = JSON.parse(stored) as CookieConsent;
      
      // Check if consent is still valid (version matches)
      if (consent.version !== this.CONSENT_VERSION) {
        return null;
      }

      return consent;
    } catch {
      return null;
    }
  }

  /**
   * Check if user has given consent for specific type
   */
  static hasConsent(type: keyof Omit<CookieConsent, 'timestamp' | 'version'>): boolean {
    const consent = this.getCookieConsent();
    if (!consent) {
      return false;
    }

    return consent[type] === true;
  }

  /**
   * Clear all consent (for testing or user request)
   */
  static clearConsent(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('consentCleared'));
    }
  }

  /**
   * Create consent record for database storage
   */
  static createConsentRecord(data: {
    email: string;
    userId?: string;
    consentType: ConsentRecord['consentType'];
    consentGiven: boolean;
    consentMethod: ConsentRecord['consentMethod'];
    source: string;
    consentText: string;
    doubleOptIn?: boolean;
  }): Omit<ConsentRecord, 'id'> {
    return {
      ...data,
      consentDate: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      version: this.CONSENT_VERSION,
      doubleOptIn: data.doubleOptIn || false,
    };
  }

  /**
   * Get client IP (placeholder - should be implemented server-side)
   */
  private static getClientIP(): string {
    // This should be implemented server-side for accuracy
    // Client-side IP detection is not reliable
    return 'client-side-unknown';
  }

  /**
   * Validate consent age (must be recent for GDPR)
   */
  static isConsentValid(consentDate: Date, maxAgeMonths: number = 12): boolean {
    const now = new Date();
    const ageInMonths = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return ageInMonths <= maxAgeMonths;
  }

  /**
   * Export user consent data (for GDPR data portability)
   */
  static exportConsentData(): string {
    const consent = this.getCookieConsent();
    if (!consent) {
      return JSON.stringify({ message: 'No consent data found' }, null, 2);
    }

    return JSON.stringify({
      cookieConsent: consent,
      exportDate: new Date().toISOString(),
      version: this.CONSENT_VERSION,
    }, null, 2);
  }
}

/**
 * Email Consent Manager
 */
export class EmailConsentManager {
  /**
   * Generate unsubscribe token
   */
  static generateUnsubscribeToken(email: string): string {
    // In production, use proper cryptographic token generation
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return Buffer.from(`${email}:${timestamp}:${random}`).toString('base64');
  }

  /**
   * Verify unsubscribe token
   */
  static verifyUnsubscribeToken(token: string): { email: string; timestamp: number } | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [email, timestamp] = decoded.split(':');
      
      // Token should be valid for 30 days
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (tokenAge > maxAge) {
        return null;
      }

      return { email, timestamp: parseInt(timestamp) };
    } catch {
      return null;
    }
  }

  /**
   * Create email consent record
   */
  static createEmailConsent(data: {
    email: string;
    consentGiven: boolean;
    source: string;
  }): Omit<ConsentRecord, 'id'> {
    return ConsentManager.createConsentRecord({
      email: data.email,
      consentType: 'marketing',
      consentGiven: data.consentGiven,
      consentMethod: 'signup_form',
      source: data.source,
      consentText: 'I agree to receive marketing emails from Cook Smart',
      doubleOptIn: false,
    });
  }
}

/**
 * Analytics Consent Manager
 */
export class AnalyticsConsentManager {
  /**
   * Check if analytics can be loaded
   */
  static canLoadAnalytics(): boolean {
    return ConsentManager.hasConsent('analytics');
  }

  /**
   * Initialize analytics if consent given
   */
  static initializeAnalytics(): void {
    if (!this.canLoadAnalytics()) {
      return;
    }

    // Initialize analytics here (Google Analytics, etc.)
  }

  /**
   * Track event with consent check
   */
  static trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.canLoadAnalytics()) {
      return;
    }

    // Track event here
  }
}

/**
 * Marketing Consent Manager
 */
export class MarketingConsentManager {
  /**
   * Check if marketing cookies can be set
   */
  static canSetMarketingCookies(): boolean {
    return ConsentManager.hasConsent('marketing');
  }

  /**
   * Initialize marketing tools if consent given
   */
  static initializeMarketing(): void {
    if (!this.canSetMarketingCookies()) {
      return;
    }

    // Initialize marketing tools here (Facebook Pixel, etc.)
  }
}
