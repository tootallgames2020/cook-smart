import fetch from 'node-fetch';
import NotificationLogModel from '../models/NotificationLog';

interface ErrorContext {
  userId?: string;
  endpoint?: string;
  affectedUsers?: number;
  requestBody?: any;
}

interface FeedbackData {
  userId: string;
  userName: string;
  userEmail: string;
  rating?: number;
  category?: string;
  message: string;
  screenshot?: string;
  timestamp: Date;
}

interface ActivityData {
  signup?: {
    userName: string;
    userEmail: string;
    referredBy?: string;
    referralCode?: string;
  };
  purchase?: {
    userName: string;
    userEmail: string;
    plan: string;
    amount: number;
  };
  referral?: {
    referrerName: string;
    referrerEmail: string;
    refereeName: string;
    refereeEmail: string;
    referralCode: string;
  };
}

interface HealthStats {
  totalErrors: number;
  errorRate: number;
  uptime: number;
  apiUsage: {
    edamam: number;
    themealdb: number;
  };
  databaseStatus: 'healthy' | 'degraded' | 'down';
}

type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
type ActivityType = 'signup' | 'purchase' | 'referral';

/**
 * Notification Service - Discord webhook integration for system notifications
 * 
 * Sends real-time notifications to Discord channels for monitoring and alerts.
 * Implements fail-safe error handling to prevent notification cascades.
 * 
 * Notification Types:
 * - Error notifications (critical system errors)
 * - Feedback notifications (user feedback submissions)
 * - Activity notifications (signups, purchases, referrals)
 * - Health summaries (system health metrics)
 * - Achievement notifications (user achievements)
 * 
 * Features:
 * - Discord webhook integration
 * - Rich embed formatting
 * - Screenshot attachments
 * - Severity-based coloring
 * - Notification logging
 * - Fail-safe error handling
 * 
 * Configuration:
 * - DISCORD_ERROR_WEBHOOK - Error notifications channel
 * - DISCORD_FEEDBACK_WEBHOOK - Feedback channel
 * - DISCORD_ACTIVITY_WEBHOOK - Activity channel
 * 
 * @example
 * ```typescript
 * const service = new NotificationService();
 * 
 * // Send error notification
 * await service.sendErrorNotification(
 *   new Error('Database connection failed'),
 *   'critical',
 *   { endpoint: '/api/recipes', affectedUsers: 150 }
 * );
 * 
 * // Send feedback notification
 * await service.sendFeedbackNotification({
 *   userId: 'user_123',
 *   userName: 'John Doe',
 *   userEmail: 'john@example.com',
 *   rating: 5,
 *   category: 'feature-request',
 *   message: 'Love the new recipe search!',
 *   timestamp: new Date()
 * });
 * ```
 */
class NotificationService {
  private errorWebhook: string | null = null;
  private feedbackWebhook: string | null = null;
  private activityWebhook: string | null = null;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize webhooks in constructor - wait for first use
    // This allows .env to load first
  }

  private initializeWebhooks(): void {
    if (this.initialized) return;

    this.errorWebhook =
      process.env.DISCORD_ERROR_WEBHOOK_URL ||
      process.env.DISCORD_ERROR_WEBHOOK ||
      null;
    this.feedbackWebhook = process.env.DISCORD_FEEDBACK_WEBHOOK || null;
    this.activityWebhook = process.env.DISCORD_ACTIVITY_WEBHOOK || null;
    this.initialized = true;

    this.validateWebhooks();
  }

  private validateWebhooks(): void {
    if (!this.errorWebhook) {
      console.warn(
        '⚠️  DISCORD_ERROR_WEBHOOK not configured - error notifications disabled',
      );
    }
    if (!this.feedbackWebhook) {
      console.warn(
        '⚠️  DISCORD_FEEDBACK_WEBHOOK not configured - feedback notifications disabled',
      );
    }
    if (!this.activityWebhook) {
      console.warn(
        '⚠️  DISCORD_ACTIVITY_WEBHOOK not configured - activity notifications disabled',
      );
    }

    // Validate webhook URL format
    const webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/;

    if (this.errorWebhook && !webhookPattern.test(this.errorWebhook)) {
      console.error('❌ Invalid DISCORD_ERROR_WEBHOOK URL format');
      this.errorWebhook = null;
    }
    if (this.feedbackWebhook && !webhookPattern.test(this.feedbackWebhook)) {
      console.error('❌ Invalid DISCORD_FEEDBACK_WEBHOOK URL format');
      this.feedbackWebhook = null;
    }
    if (this.activityWebhook && !webhookPattern.test(this.activityWebhook)) {
      console.error('❌ Invalid DISCORD_ACTIVITY_WEBHOOK URL format');
      this.activityWebhook = null;
    }
  }

  /**
   * Send error notification to Discord
   * Formats and sends error details with severity-based coloring
   * Never throws errors to prevent notification cascades
   * 
   * @param error - Error object to report
   * @param severity - Error severity level ('critical', 'high', 'medium', 'low')
   * @param context - Optional context information
   * @param context.userId - User ID if error is user-specific
   * @param context.endpoint - API endpoint where error occurred
   * @param context.affectedUsers - Number of users affected
   * @param context.requestBody - Request body that caused error
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * // Critical database error
   * await service.sendErrorNotification(
   *   new Error('Database connection lost'),
   *   'critical',
   *   { endpoint: '/api/recipes', affectedUsers: 500 }
   * );
   * 
   * // User-specific error
   * await service.sendErrorNotification(
   *   new Error('Payment processing failed'),
   *   'high',
   *   { userId: 'user_123', endpoint: '/api/payments' }
   * );
   * ```
   */
  async sendErrorNotification(
    error: Error,
    severity: ErrorSeverity,
    context?: ErrorContext,
  ): Promise<void> {
    try {
      this.initializeWebhooks();

      if (!this.errorWebhook) {
        console.log('Error notification skipped - webhook not configured');
        return;
      }

      const embed = this.formatErrorEmbed(error, severity, context);
      await this.sendToWebhook(this.errorWebhook, embed, 'error');
    } catch (notificationError) {
      // CRITICAL: Never throw errors from notification service to prevent cascades
      console.error(
        'Discord notification failed (non-critical):',
        (notificationError as Error).message,
      );
      // Don't re-throw - this prevents cascade errors
    }
  }

  /**
   * Send feedback notification to Discord
   * Formats user feedback with optional screenshot attachment
   * Never throws errors to prevent notification cascades
   * 
   * @param feedback - User feedback data
   * @param feedback.userId - User ID
   * @param feedback.userName - User's display name
   * @param feedback.userEmail - User's email
   * @param feedback.rating - Optional rating (1-5)
   * @param feedback.category - Feedback category
   * @param feedback.message - Feedback message
   * @param feedback.screenshot - Optional base64 screenshot
   * @param feedback.timestamp - Submission timestamp
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * // Feedback with rating
   * await service.sendFeedbackNotification({
   *   userId: 'user_123',
   *   userName: 'John Doe',
   *   userEmail: 'john@example.com',
   *   rating: 5,
   *   category: 'feature-request',
   *   message: 'Please add dark mode!',
   *   timestamp: new Date()
   * });
   * 
   * // Feedback with screenshot
   * await service.sendFeedbackNotification({
   *   userId: 'user_456',
   *   userName: 'Jane Smith',
   *   userEmail: 'jane@example.com',
   *   category: 'bug-report',
   *   message: 'Button not working',
   *   screenshot: base64ImageData,
   *   timestamp: new Date()
   * });
   * ```
   */
  async sendFeedbackNotification(feedback: FeedbackData): Promise<void> {
    try {
      this.initializeWebhooks();

      if (!this.feedbackWebhook) {
        console.log('Feedback notification skipped - webhook not configured');
        return;
      }

      const embed = this.formatFeedbackEmbed(feedback);

      // If screenshot is provided, send as file attachment
      if (feedback.screenshot) {
        await this.sendToWebhookWithFile(
          this.feedbackWebhook,
          embed,
          feedback.screenshot,
          'feedback',
        );
      } else {
        await this.sendToWebhook(this.feedbackWebhook, embed, 'feedback');
      }
    } catch (notificationError) {
      // CRITICAL: Never throw errors from notification service to prevent cascades
      console.error(
        'Discord feedback notification failed (non-critical):',
        (notificationError as Error).message,
      );
      // Don't re-throw - this prevents cascade errors
    }
  }

  /**
   * Send activity notification to Discord
   * Notifies about user signups, purchases, and referrals
   * Never throws errors to prevent notification cascades
   * 
   * @param type - Activity type ('signup', 'purchase', 'referral')
   * @param data - Activity-specific data
   * @returns Promise<void>
   * 
   * @example
   * ```typescript
   * // New user signup
   * await service.sendActivityNotification('signup', {
   *   signup: {
   *     userName: 'John Doe',
   *     userEmail: 'john@example.com',
   *     referredBy: 'Jane Smith',
   *     referralCode: 'JANE123'
   *   }
   * });
   * 
   * // Purchase notification
   * await service.sendActivityNotification('purchase', {
   *   purchase: {
   *     userName: 'John Doe',
   *     userEmail: 'john@example.com',
   *     plan: 'Premium Monthly',
   *     amount: 9.99
   *   }
   * });
   * 
   * // Referral notification
   * await service.sendActivityNotification('referral', {
   *   referral: {
   *     referrerName: 'Jane Smith',
   *     referrerEmail: 'jane@example.com',
   *     refereeName: 'John Doe',
   *     refereeEmail: 'john@example.com',
   *     referralCode: 'JANE123'
   *   }
   * });
   * ```
   */
  async sendActivityNotification(
    type: ActivityType,
    data: ActivityData,
  ): Promise<void> {
    try {
      this.initializeWebhooks();

      if (!this.activityWebhook) {
        console.log('Activity notification skipped - webhook not configured');
        return;
      }

      const embed = this.formatActivityEmbed(type, data);
      await this.sendToWebhook(this.activityWebhook, embed, 'activity');
    } catch (notificationError) {
      // CRITICAL: Never throw errors from notification service to prevent cascades
      console.error(
        'Discord activity notification failed (non-critical):',
        (notificationError as Error).message,
      );
      // Don't re-throw - this prevents cascade errors
    }
  }

  /**
   * Send daily health summary to Discord
   */
  async sendHealthSummary(stats: HealthStats): Promise<void> {
    if (!this.errorWebhook) {
      console.log('Health summary skipped - webhook not configured');
      return;
    }

    const embed = this.formatHealthEmbed(stats);
    await this.sendToWebhook(this.errorWebhook, embed, 'health');
  }

  /**
   * Format error notification embed
   */
  private formatErrorEmbed(
    error: Error,
    severity: ErrorSeverity,
    context?: ErrorContext,
  ): any {
    const severityColors = {
      critical: 10038562, // Dark red
      high: 15158332, // Red
      medium: 16744192, // Orange
      low: 16776960, // Yellow
    };

    const severityEmojis = {
      critical: '🔴',
      high: '🚨',
      medium: '⚠️',
      low: '💡',
    };

    const fields: any[] = [
      {
        name: 'Severity',
        value: `${severityEmojis[severity]} ${severity.toUpperCase()}`,
        inline: true,
      },
      {
        name: 'Time',
        value:
          new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        inline: true,
      },
    ];

    if (context?.endpoint) {
      fields.push({
        name: 'Endpoint',
        value: context.endpoint,
        inline: true,
      });
    }

    fields.push({
      name: 'Error',
      value: error.message.substring(0, 1000), // Limit length
      inline: false,
    });

    if (context?.affectedUsers) {
      fields.push({
        name: 'Affected Users',
        value: context.affectedUsers.toString(),
        inline: true,
      });
    }

    // Add stack trace for critical/high errors (truncated)
    if ((severity === 'critical' || severity === 'high') && error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 5).join('\n');
      fields.push({
        name: 'Stack Trace',
        value: `\`\`\`\n${stackLines.substring(0, 500)}\n\`\`\``,
        inline: false,
      });
    }

    return {
      embeds: [
        {
          title: '🚨 ERROR DETECTED',
          color: severityColors[severity],
          fields,
          footer: {
            text: 'Cook Smart Error Monitor',
          },
          timestamp: new Date().toISOString(),
        },
      ],
      // Mention @everyone for critical errors
      content: severity === 'critical' ? '@everyone' : undefined,
    };
  }

  /**
   * Format feedback notification embed
   */
  private formatFeedbackEmbed(feedback: FeedbackData): any {
    const ratingStars = feedback.rating
      ? '⭐'.repeat(feedback.rating)
      : 'No rating';

    const fields: any[] = [
      {
        name: 'User',
        value: `${feedback.userName} (${feedback.userEmail})`,
        inline: false,
      },
      {
        name: 'Rating',
        value: ratingStars,
        inline: true,
      },
    ];

    if (feedback.category) {
      fields.push({
        name: 'Category',
        value: feedback.category,
        inline: true,
      });
    }

    fields.push({
      name: 'Time',
      value:
        feedback.timestamp.toISOString().replace('T', ' ').substring(0, 19) +
        ' UTC',
      inline: true,
    });

    fields.push({
      name: 'Message',
      value: feedback.message.substring(0, 1000), // Limit length
      inline: false,
    });

    // Add note if screenshot is attached
    if (feedback.screenshot) {
      fields.push({
        name: '📎 Attachment',
        value: 'Screenshot attached below',
        inline: false,
      });
    }

    const embed: any = {
      title: '💬 NEW FEEDBACK',
      color: 3447003, // Blue
      fields,
      footer: {
        text: 'Cook Smart Feedback',
      },
      timestamp: feedback.timestamp.toISOString(),
    };

    return {
      embeds: [embed],
    };
  }

  /**
   * Format activity notification embed
   */
  private formatActivityEmbed(type: ActivityType, data: ActivityData): any {
    let title: string;
    let fields: any[];
    let emoji: string;

    switch (type) {
      case 'signup':
        emoji = '👤';
        title = `${emoji} NEW USER SIGNUP`;
        fields = [
          {
            name: 'Name',
            value: data.signup!.userName,
            inline: true,
          },
          {
            name: 'Email',
            value: data.signup!.userEmail,
            inline: true,
          },
          {
            name: 'Time',
            value:
              new Date().toISOString().replace('T', ' ').substring(0, 19) +
              ' UTC',
            inline: true,
          },
        ];

        if (data.signup!.referredBy) {
          fields.push({
            name: 'Referred By',
            value: `${data.signup!.referredBy} (Code: ${data.signup!.referralCode})`,
            inline: false,
          });
        } else {
          fields.push({
            name: 'Source',
            value: 'Direct signup',
            inline: false,
          });
        }
        break;

      case 'purchase':
        emoji = '💰';
        title = `${emoji} NEW PURCHASE`;
        fields = [
          {
            name: 'User',
            value: `${data.purchase!.userName} (${data.purchase!.userEmail})`,
            inline: false,
          },
          {
            name: 'Plan',
            value: data.purchase!.plan,
            inline: true,
          },
          {
            name: 'Amount',
            value: `$${data.purchase!.amount.toFixed(2)}`,
            inline: true,
          },
          {
            name: 'Time',
            value:
              new Date().toISOString().replace('T', ' ').substring(0, 19) +
              ' UTC',
            inline: true,
          },
        ];
        break;

      case 'referral':
        emoji = '🎁';
        title = `${emoji} NEW REFERRAL`;
        fields = [
          {
            name: 'Referrer',
            value: `${data.referral!.referrerName} (${data.referral!.referrerEmail})`,
            inline: false,
          },
          {
            name: 'Referee',
            value: `${data.referral!.refereeName} (${data.referral!.refereeEmail})`,
            inline: false,
          },
          {
            name: 'Code',
            value: data.referral!.referralCode,
            inline: true,
          },
          {
            name: 'Time',
            value:
              new Date().toISOString().replace('T', ' ').substring(0, 19) +
              ' UTC',
            inline: true,
          },
          {
            name: 'Status',
            value: 'Signup complete ✅',
            inline: false,
          },
        ];
        break;

      default:
        throw new Error(`Unknown activity type: ${type}`);
    }

    return {
      embeds: [
        {
          title,
          color: 5763719, // Green
          fields,
          footer: {
            text: 'Cook Smart Activity',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Format health summary embed
   */
  private formatHealthEmbed(stats: HealthStats): any {
    const statusEmojis = {
      healthy: '✅',
      degraded: '⚠️',
      down: '❌',
    };

    const fields: any[] = [
      {
        name: 'Total Errors (24h)',
        value: stats.totalErrors.toString(),
        inline: true,
      },
      {
        name: 'Error Rate',
        value: `${(stats.errorRate * 100).toFixed(2)}%`,
        inline: true,
      },
      {
        name: 'Uptime',
        value: `${(stats.uptime * 100).toFixed(2)}%`,
        inline: true,
      },
      {
        name: 'Database',
        value: `${statusEmojis[stats.databaseStatus]} ${stats.databaseStatus}`,
        inline: true,
      },
      {
        name: 'Edamam API',
        value: `${stats.apiUsage.edamam} calls`,
        inline: true,
      },
      {
        name: 'TheMealDB API',
        value: `${stats.apiUsage.themealdb} calls`,
        inline: true,
      },
    ];

    // Determine overall health color
    let color = 5763719; // Green
    if (stats.databaseStatus === 'down' || stats.errorRate > 0.05) {
      color = 15158332; // Red
    } else if (stats.databaseStatus === 'degraded' || stats.errorRate > 0.01) {
      color = 16744192; // Orange
    }

    return {
      embeds: [
        {
          title: '📊 DAILY HEALTH SUMMARY',
          color,
          fields,
          footer: {
            text: 'Cook Smart Health Monitor',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * Send embed to Discord webhook with retry logic
   */
  private async sendToWebhook(
    webhookUrl: string,
    payload: any,
    type: string,
    retries = 3,
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(
            `Discord webhook failed: ${response.status} ${response.statusText}`,
          );
        }

        console.log(`✅ ${type} notification sent to Discord`);

        // Log successful notification
        await this.logNotification(type, payload, true);
        return;
      } catch (error) {
        console.error(
          `❌ Failed to send ${type} notification (attempt ${attempt}/${retries}):`,
          error,
        );

        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(
      `❌ Failed to send ${type} notification after ${retries} attempts`,
    );

    // Log failed notification
    await this.logNotification(type, payload, false, 'Failed after 3 retries');
  }

  /**
   * Send embed to Discord webhook with file attachment
   */
  private async sendToWebhookWithFile(
    webhookUrl: string,
    payload: any,
    base64Image: string,
    type: string,
    retries = 3,
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Extract base64 data and convert to buffer
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Create form data
        const FormData = require('form-data');
        const form = new FormData();

        // Add the JSON payload
        form.append('payload_json', JSON.stringify(payload));

        // Add the image file
        form.append('file', imageBuffer, {
          filename: 'screenshot.jpg',
          contentType: 'image/jpeg',
        });

        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: form,
          headers: form.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(
            `Discord webhook failed: ${response.status} ${response.statusText}`,
          );
        }

        console.log(`✅ ${type} notification with file sent to Discord`);

        // Log successful notification
        await this.logNotification(type, payload, true);
        return;
      } catch (error) {
        console.error(
          `❌ Failed to send ${type} notification with file (attempt ${attempt}/${retries}):`,
          error,
        );

        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(
      `❌ Failed to send ${type} notification with file after ${retries} attempts`,
    );

    // Log failed notification
    await this.logNotification(type, payload, false, 'Failed after 3 retries');
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    type: string,
    payload: any,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const channel =
        type === 'error' || type === 'health'
          ? 'error'
          : type === 'feedback'
            ? 'feedback'
            : 'activity';

      const params: any = {
        type: type as any,
        channel: channel as any,
        payload,
        success,
      };

      if (errorMessage) {
        params.error_message = errorMessage;
      }

      await NotificationLogModel.create(params);
    } catch (error) {
      // Don't throw - logging failures shouldn't break notifications
      console.error('Failed to log notification:', error);
    }
  }

  // Stub methods for community features (to be implemented)
  async notifyAchievement(
    userId: string,
    achievement: string,
    _description: string,
  ): Promise<void> {
    console.log(`Achievement notification stub: ${userId} - ${achievement}`);
  }

  async getUserNotifications(
    userId: string,
    _page: number,
    _limit: number,
  ): Promise<any[]> {
    console.log(`Get notifications stub: ${userId}`);
    return [];
  }

  async getUnreadCount(userId: string): Promise<number> {
    console.log(`Get unread count stub: ${userId}`);
    return 0;
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    console.log(`Mark as read stub: ${userId} - ${notificationId}`);
    return true;
  }

  async markAllAsRead(userId: string): Promise<number> {
    console.log(`Mark all as read stub: ${userId}`);
    return 0;
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<boolean> {
    console.log(`Delete notification stub: ${userId} - ${notificationId}`);
    return true;
  }

  /**
   * Send custom notification to Discord (for System Guardian)
   */
  async sendCustomNotification(data: {
    title: string;
    description: string;
    color: number;
    timestamp: string;
    footer: string;
  }): Promise<void> {
    if (!this.errorWebhook) {
      console.log('Error notification skipped - webhook not configured');
      return;
    }

    try {
      const payload = {
        embeds: [
          {
            title: data.title,
            description: data.description,
            color: data.color,
            footer: {
              text: data.footer,
            },
            timestamp: data.timestamp,
          },
        ],
      };

      const response = await fetch(this.errorWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord API returned ${response.status}`);
      }

      console.log('✅ Custom notification sent to Discord');
    } catch (error) {
      console.error('Failed to send custom notification:', error);
    }
  }
}

export default new NotificationService();
