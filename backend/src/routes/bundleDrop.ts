import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const router = express.Router();

interface BundleInfo {
  version: string;
  buildNumber: number;
  bundleHash: string;
  timestamp: string;
  platform: 'android' | 'ios';
  environment: 'staging' | 'production';
}

interface UpdateCheckRequest {
  appId: string;
  version: string;
  buildNumber?: number;
  platform?: 'android' | 'ios';
}

interface UpdateCheckResponse {
  hasUpdate: boolean;
  bundle?: {
    version: string;
    buildNumber: number;
    downloadUrl: string;
    bundleHash: string;
    timestamp: string;
  };
  message?: string;
}

// Get bundle directory based on environment
function getBundleDirectory(environment: 'staging' | 'production'): string {
  const bundleDir = path.join('/home/ubuntu/cook-smart/bundles', environment);
  return bundleDir;
}

// Calculate file hash for integrity verification
function calculateFileHash(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    logger.error('Error calculating file hash:', error);
    return '';
  }
}

// Get bundle info from bundle directory
function getBundleInfo(environment: 'staging' | 'production'): BundleInfo | null {
  try {
    const bundleDir = getBundleDirectory(environment);
    const bundlePath = path.join(bundleDir, 'index.android.bundle');
    
    logger.info(`Looking for bundle at: ${bundlePath}`);
    
    if (!fs.existsSync(bundlePath)) {
      logger.warn(`Bundle not found: ${bundlePath}`);
      return null;
    }
    
    const stats = fs.statSync(bundlePath);
    const bundleHash = calculateFileHash(bundlePath);
    
    // For now, we'll use a simple versioning system
    // In production, this could be read from a bundle-info.json file
    const version = '1.1.0'; // Email verification and ingredient classification version
    const buildNumber = Math.floor(stats.mtimeMs / 1000); // Use file modification time as build number
    
    const bundleInfo = {
      version,
      buildNumber,
      bundleHash,
      timestamp: stats.mtime.toISOString(),
      platform: 'android' as const,
      environment,
    };
    
    logger.info(`Bundle info created:`, bundleInfo);
    return bundleInfo;
  } catch (error) {
    logger.error('Error getting bundle info:', error);
    return null;
  }
}

// Check for updates endpoint
router.post('/check', (req, res): void => {
  try {
    const { appId, version }: UpdateCheckRequest = req.body;
    
    if (!appId || !version) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: appId, version',
      });`n    return;
    }
    
    // Determine environment based on appId
    let environment: 'staging' | 'production';
    if (appId === '550e8400-e29b-41d4-a716-446655440001') {
      environment = 'staging';
    } else if (appId === '550e8400-e29b-41d4-a716-446655440002') {
      environment = 'production';
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid appId',
      });`n    return;
    }
    
    const bundleInfo = getBundleInfo(environment);
    
    if (!bundleInfo) {
      logger.warn(`No bundle info found for environment: ${environment}`);
      res.json({
        hasUpdate: false,
        message: 'No bundle available',
      } as UpdateCheckResponse);
    }
    
    logger.info(`Bundle info found for ${environment}:`, bundleInfo);
    
    // Check if update is needed
    // Force update to push email verification and ingredient classification features
    const hasUpdate = true; // Always return true to push latest features
    
    if (hasUpdate) {
      const response: UpdateCheckResponse = {
        hasUpdate: true,
        bundle: {
          version: bundleInfo.version,
          buildNumber: bundleInfo.buildNumber,
          downloadUrl: `/api/v1/bundledrop/download/${environment}/index.android.bundle`,
          bundleHash: bundleInfo.bundleHash,
          timestamp: bundleInfo.timestamp,
        },
      };
      
      logger.info(`Update available for ${appId} (${environment}): ${bundleInfo.version}`);
      res.json(response);
    } else {
      res.json({
        hasUpdate: false,
        message: 'App is up to date',
      } as UpdateCheckResponse);
    }
    
  } catch (error) {
    logger.error('Bundle Drop check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check for updates',
      error: error instanceof Error ? error.message : 'Unknown error',
    });`n    return;
  }
});

// Download bundle endpoint
router.get('/download/:environment/:filename', (req: Request, res: Response) => {
  try {
    const { environment, filename } = req.params;
    
    if (environment !== 'staging' && environment !== 'production') {
      res.status(400).json({
        success: false,
        message: 'Invalid environment',
      });`n    return;
    }
    
    const bundleDir = getBundleDirectory(environment as 'staging' | 'production');
    const filePath = path.join(bundleDir, filename);
    
    // Security check: ensure file is within bundle directory
    if (!filePath.startsWith(bundleDir)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });`n    return;
    }
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Bundle file not found',
      });`n    return;
    }
    
    // Set appropriate headers for bundle download
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    logger.info(`Bundle downloaded: ${environment}/${filename}`);
    return;
    
  } catch (error) {
    logger.error('Bundle Drop download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download bundle',
      error: error instanceof Error ? error.message : 'Unknown error',
    });`n    return;
  }
});

// Health check for Bundle Drop service
router.get('/health', (_req, res): void => {
  try {
    const stagingBundle = getBundleInfo('staging');
    const productionBundle = getBundleInfo('production');
    
    res.json({
      status: 'OK',
      message: 'Bundle Drop service is running',
      timestamp: new Date().toISOString(),
      bundles: {
        staging: stagingBundle ? {
          version: stagingBundle.version,
          timestamp: stagingBundle.timestamp,
          available: true,
        } : {
          available: false,
        },
        production: productionBundle ? {
          version: productionBundle.version,
          timestamp: productionBundle.timestamp,
          available: true,
        } : {
          available: false,
        },
      },
    });`n    return;
    
  } catch (error) {
    logger.error('Bundle Drop health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Bundle Drop service health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });`n    return;
  }
});

export default router;
