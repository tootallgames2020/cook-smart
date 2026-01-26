import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Import routes
import authRoutes from './routes/auth';
import passwordResetRoutes from './routes/passwordReset';
import recipeRoutes from './routes/recipes';
import recipeDetailsRoutes from './routes/recipeDetails';
import customRecipesRoutes from './routes/customRecipes';
import ingredientRoutes from './routes/ingredients';
import barcodeRoutes from './routes/barcode';
import dietaryRoutes from './routes/dietary';
import shoppingRoutes from './routes/shopping';
import pointsRoutes from './routes/points';
import referralRoutes from './routes/referrals';
import subscriptionRoutes from './routes/subscriptions';
import paymentRoutes from './routes/payments';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';
import socialRoutes from './routes/social';
import adminRoutes from './routes/admin';
import contactRoutes from './routes/contact';
import feedbackRoutes from './routes/feedback';
import welcomeContentRoutes from './routes/welcomeContent';
import mealPlanningRoutes from './routes/mealPlanning';
import trendingRecipesRoutes from './routes/trendingRecipes';
import achievementsRoutes from './routes/achievements';
import recipeEnhancementsRoutes from './routes/recipeEnhancements';
import usersRoutes from './routes/users';
import expirationRoutes from './routes/expiration';
import familiesRoutes from './routes/families';
import aiPreferencesRoutes from './routes/aiPreferences';
import apexIntelligenceRoutes from './routes/apexIntelligence';
import photoAnalysisRoutes from './routes/photoAnalysis';
import voiceCommandsRoutes from './routes/voiceCommands';
import predictiveAnalyticsRoutes from './routes/predictiveAnalytics';
import maintenanceBotRoutes from './routes/maintenanceBot';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Database connection pool
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection
async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    logger.info('✅ Database connected successfully');
    logger.info(`📊 Database time: ${result.rows[0].current_time}`);
    logger.info(`🗄️ Database version: ${result.rows[0].db_version.split(' ')[0]}`);
    client.release();
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    return false;
  }
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Trust proxy for rate limiting (behind nginx/load balancer)
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: [
    'https://cooksmartapp.com',
    'https://www.cooksmartapp.com',
    'http://localhost:3000',
    'http://localhost:8081',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
if (process.env.ENABLE_COMPRESSION === 'true') {
  app.use(compression());
}

// Rate limiting
if (process.env.ENABLE_RATE_LIMITING === 'true') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testDatabaseConnection();
    const uptime = process.uptime();
    
    res.json({
      status: 'OK',
      message: 'Cook Smart API is running',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      database: dbConnected ? 'connected' : 'disconnected',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/v1/auth/*',
        users: '/api/v1/users/*',
        recipes: '/api/v1/recipes/*',
        recipeDetails: '/api/v1/recipe-details/*',
        customRecipes: '/api/v1/custom-recipes/*',
        ingredients: '/api/v1/ingredients/*',
        barcode: '/api/v1/barcode/*',
        dietary: '/api/v1/dietary/*',
        shopping: '/api/v1/shopping-list/*',
        points: '/api/v1/points/*',
        achievements: '/api/v1/achievements/*',
        referrals: '/api/v1/referrals/*',
        subscriptions: '/api/v1/subscriptions/*',
        payments: '/api/v1/payments/*',
        settings: '/api/v1/settings/*',
        notifications: '/api/v1/notifications/*',
        social: '/api/v1/social/*',
        admin: '/api/v1/admin/*',
        contact: '/contact',
        mealPlanning: '/api/v1/meal-planning/*',
        families: '/api/v1/families/*',
        aiPreferences: '/api/v1/ai-preferences/*',
        apexIntelligence: '/api/v1/apex-intelligence/*',
        photoAnalysis: '/api/v1/photo-analysis/*',
        voiceCommands: '/api/v1/voice-commands/*',
        predictiveAnalytics: '/api/v1/predictive-analytics/*',
        maintenanceBot: '/api/v1/maintenance-bot/*',
      },
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', passwordResetRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/recipes', recipeRoutes);
app.use('/api/v1/recipe-details', recipeDetailsRoutes);
app.use('/api/v1/custom-recipes', customRecipesRoutes);
app.use('/api/v1/ingredients', ingredientRoutes);
app.use('/api/v1/barcode', barcodeRoutes);
app.use('/api/v1/dietary', dietaryRoutes);
app.use('/api/v1/shopping-list', shoppingRoutes);
app.use('/api/v1/points', pointsRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/social', socialRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/contact', contactRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/welcome', welcomeContentRoutes);
app.use('/api/v1/meal-planning', mealPlanningRoutes);
app.use('/api/v1', trendingRecipesRoutes);
app.use('/api/v1/achievements', achievementsRoutes);
app.use('/api/v1/recipe-enhancements', recipeEnhancementsRoutes);
app.use('/api/v1/expiration', expirationRoutes);
app.use('/api/v1/families', familiesRoutes);
app.use('/api/v1/ai-preferences', aiPreferencesRoutes);
app.use('/api/v1/apex-intelligence', apexIntelligenceRoutes);
app.use('/api/v1/photo-analysis', photoAnalysisRoutes);
app.use('/api/v1/voice-commands', voiceCommandsRoutes);
app.use('/api/v1/predictive-analytics', predictiveAnalyticsRoutes);
app.use('/api/v1/maintenance-bot', maintenanceBotRoutes);

// Test endpoint
app.get('/api/v1/test', (req, res) => {
  res.json({
    message: 'Cook Smart Production API Test Endpoint',
    status: 'Backend fully operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: [
      'User Authentication & Registration',
      'Recipe Search & Management',
      'Ingredient Management',
      'Barcode Scanning',
      'Dietary Preferences',
      'Shopping Lists',
      'Points & Achievements',
      'Referral System',
      'Subscription Management',
      'Payment Processing',
      'User Settings',
      'Push Notifications',
      'Social Features',
      'Admin Dashboard',
      'Contact Form',
      'Meal Planning',
    ],
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /api/v1/test',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/register',
      'GET /api/v1/recipes/search',
      'GET /api/v1/ingredients',
      'POST /api/v1/barcode/scan',
      'POST /contact',
    ],
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  process.exit(0);
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Test database connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('❌ Cannot start server without database connection');
      process.exit(1);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('🚀 Cook Smart Production Backend started successfully!');
      logger.info(`📡 Server running on http://0.0.0.0:${PORT}`);
      logger.info(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
      logger.info(`🧪 Test endpoint: http://0.0.0.0:${PORT}/api/v1/test`);
      logger.info(`🔐 Auth endpoints: http://0.0.0.0:${PORT}/api/v1/auth/*`);
      logger.info(`🍳 Recipe endpoints: http://0.0.0.0:${PORT}/api/v1/recipes/*`);
      logger.info('✅ Ready to accept connections');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize server
startServer();

export default app;