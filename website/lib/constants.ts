// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.cooksmartapp.com';

// Email Configuration
export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
export const EMAIL_FROM = process.env.EMAIL_FROM || 'Cook Smart <noreply@cooksmartapp.com>';

// Discord Configuration (for system monitoring, bugs, etc. - NOT for contact form)
export const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// App Store Links
export const ANDROID_STORE_URL =
  process.env.NEXT_PUBLIC_ANDROID_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.cooksmartapp';
export const IOS_STORE_URL =
  process.env.NEXT_PUBLIC_IOS_STORE_URL || 'https://apps.apple.com/app/cook-smart/id123456789';

// Social Media Links (Coming Soon - uncomment when ready)
// export const SOCIAL_LINKS = {
//   facebook: 'https://facebook.com/cooksmartapp',
//   instagram: 'https://instagram.com/cooksmartapp',
//   twitter: 'https://twitter.com/cooksmartapp',
// };

// Contact Information
export const CONTACT_EMAIL = 'services.cooksmart@gmail.com';

// Pagination
export const RECIPES_PER_PAGE = 12;
export const BLOG_POSTS_PER_PAGE = 10;

// Session Timeout (30 minutes in milliseconds)
export const SESSION_TIMEOUT = 30 * 60 * 1000;
