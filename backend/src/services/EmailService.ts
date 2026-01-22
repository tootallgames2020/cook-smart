import {Resend} from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL =
  process.env.EMAIL_FROM || 'Cook Smart <noreply@cooksmartapp.com>';

export class EmailService {
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Reset Your Cook Smart Password',
        html: `
          <h2>Reset Your Password</h2>
          <p>Your verification code: <strong>${resetToken}</strong></p>
          <p>This code expires in 1 hour.</p>
        `,
      });
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }

  static async sendSubscriptionExpiryReminder(
    email: string,
    firstName: string,
    daysUntilExpiry: number,
    expiryDate: Date,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Your Cook Smart subscription expires in ${daysUntilExpiry} days`,
        html: `
          <h2>Hi ${firstName},</h2>
          <p>Your Cook Smart subscription will expire on <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
          <p>To continue enjoying unlimited recipes and features, please renew your subscription.</p>
          <p><a href="https://cooksmartapp.com/subscribe">Renew Now</a></p>
          <p>Thanks for using Cook Smart!</p>
        `,
      });
    } catch (error) {
      console.error('Error sending expiry reminder:', error);
    }
  }

  static async sendPaymentFailedNotification(
    email: string,
    firstName: string,
    gracePeriodEnd: Date,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Payment Failed - Update Your Payment Method',
        html: `
          <h2>Hi ${firstName},</h2>
          <p>We couldn't process your subscription payment.</p>
          <p>You have until <strong>${gracePeriodEnd.toLocaleDateString()}</strong> to update your payment method.</p>
          <p>During this time, you'll continue to have full access to Cook Smart.</p>
          <p><a href="https://cooksmartapp.com/payment-methods">Update Payment Method</a></p>
          <p>If you have questions, please contact support.</p>
        `,
      });
    } catch (error) {
      console.error('Error sending payment failed notification:', error);
    }
  }

  static async sendGracePeriodWarning(
    email: string,
    firstName: string,
    daysRemaining: number,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `${daysRemaining} days left to update payment method`,
        html: `
          <h2>Hi ${firstName},</h2>
          <p>Your payment method still needs to be updated.</p>
          <p>You have <strong>${daysRemaining} days</strong> remaining before your access is restricted.</p>
          <p><a href="https://cooksmartapp.com/payment-methods">Update Payment Method Now</a></p>
        `,
      });
    } catch (error) {
      console.error('Error sending grace period warning:', error);
    }
  }

  static async sendAccessRestricted(
    email: string,
    firstName: string,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Cook Smart Access Restricted',
        html: `
          <h2>Hi ${firstName},</h2>
          <p>Your Cook Smart access has been restricted due to payment issues.</p>
          <p>You can still:</p>
          <ul>
            <li>Update your payment method</li>
            <li>View your account settings</li>
            <li>Submit feedback</li>
          </ul>
          <p><a href="https://cooksmartapp.com/payment-methods">Update Payment Method</a></p>
          <p>Once payment is successful, full access will be restored immediately.</p>
        `,
      });
    } catch (error) {
      console.error('Error sending access restricted notification:', error);
    }
  }

  static async sendTrialEndingNotification(
    email: string,
    firstName: string,
    daysRemaining: number,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `Your Cook Smart trial ends in ${daysRemaining} days`,
        html: `
          <h2>Hi ${firstName},</h2>
          <p>Your Cook Smart trial will end in <strong>${daysRemaining} days</strong>.</p>
          <p>Don't lose access to your favorite recipes and features!</p>
          <p><a href="https://cooksmartapp.com/subscribe">Subscribe Now</a></p>
          <p>Choose from our flexible plans and continue your cooking journey.</p>
        `,
      });
    } catch (error) {
      console.error('Error sending trial ending notification:', error);
    }
  }

  static async sendAdminPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Cook Smart Admin - Reset Your Password',
        html: `
          <h2>Admin Password Reset</h2>
          <p>Your admin password reset code: <strong>${resetToken}</strong></p>
          <p>This code expires in 1 hour.</p>
          <p>If you didn't request this reset, please contact the system administrator.</p>
        `,
      });
    } catch (error) {
      console.error('Error sending admin password reset email:', error);
    }
  }

  static async sendAdminVerificationEmail(
    email: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Cook Smart Admin - Verify Your Email',
        html: `
          <h2>Admin Email Verification</h2>
          <p>Your admin email verification code: <strong>${verificationToken}</strong></p>
          <p>This code expires in 24 hours.</p>
          <p>Enter this code to complete your admin account setup.</p>
        `,
      });
    } catch (error) {
      console.error('Error sending admin verification email:', error);
    }
  }
}
