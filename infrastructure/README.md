# Cook Smart Website Infrastructure - Clean Slate

This directory contains the AWS infrastructure documentation for the Cook Smart website using **S3 + CloudFront** (clean slate approach).

## Current Architecture (WORKING)

Our website uses a simple, reliable S3 + CloudFront setup:

- ✅ **S3 Bucket**: `cooksmartapp-website` (static file hosting)
- ✅ **CloudFront**: `E31XPFYZVQELB6` (global CDN)
- ✅ **Route 53**: `cooksmartapp.com` domain with SSL
- ✅ **Contact Form**: Formspree integration (sends to services.cooksmart@gmail.com)
- ✅ **Cost**: ~$1-3/month (very low cost)

## Deployment Process

### Single Command Deployment

```bash
deploy-website.bat
```

This script:
1. Builds the Next.js website (`npm run build`)
2. Syncs static files to S3 bucket
3. Invalidates CloudFront cache
4. Website is live in 1-2 minutes

### Manual Steps (if needed)

```bash
# 1. Build website
cd website
npm run build
cd ..

# 2. Deploy to S3
aws s3 sync website/out/ s3://cooksmartapp-website --delete

# 3. Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id E31XPFYZVQELB6 --paths "/*"
```

## Infrastructure Resources

### Active AWS Resources
- **S3 Bucket**: `cooksmartapp-website`
- **CloudFront Distribution**: `E31XPFYZVQELB6`
- **Route 53 Hosted Zone**: `cooksmartapp.com`
- **SSL Certificate**: Auto-managed by CloudFront

### Domain Configuration
- **Primary**: https://cooksmartapp.com
- **WWW**: https://www.cooksmartapp.com (redirects to primary)
- **SSL**: Automatic HTTPS redirect enabled

## File Structure

```
infrastructure/
└── README.md                   # This file (documentation only)
```

**Note**: All deployment logic is in the root `deploy-website.bat` script.

## How It Works

1. **Local Build**: Run `npm run build` in `website/` directory
2. **S3 Upload**: Static files uploaded to S3 bucket
3. **CloudFront**: CDN serves files globally with caching
4. **Route 53**: Domain points to CloudFront distribution
5. **Live**: Changes are live in 1-2 minutes after deployment

## Contact Form Integration

The contact form uses **Formspree** (external service):
- **Endpoint**: `https://formspree.io/f/mrbgbqpz`
- **Destination**: `services.cooksmart@gmail.com`
- **Cost**: FREE (up to 50 submissions/month)
- **No backend required**: Works with static hosting

## Cost Breakdown

Monthly costs (estimated):
- **S3 Storage**: ~$0.10 (1GB storage)
- **CloudFront**: ~$0.50 (data transfer)
- **Route 53**: $0.50 (hosted zone)
- **SSL Certificate**: FREE
- **Total**: ~$1.10/month

## Troubleshooting

### Deployment Issues
1. Check AWS CLI credentials: `aws sts get-caller-identity`
2. Verify S3 bucket exists: `aws s3 ls s3://cooksmartapp-website`
3. Check CloudFront distribution: AWS Console > CloudFront

### Website Not Loading
1. Check CloudFront distribution status (must be "Deployed")
2. Verify Route 53 DNS records point to CloudFront
3. Clear browser cache or test in incognito mode

### Contact Form Not Working
1. Test Formspree endpoint directly
2. Check email delivery to services.cooksmart@gmail.com
3. Verify form action URL in contact page

## Clean Slate Benefits

This approach provides:
- **Simplicity**: No complex build pipelines
- **Reliability**: Proven S3 + CloudFront architecture
- **Cost-effective**: Minimal AWS resource usage
- **Fast deployment**: 1-2 minute deployment time
- **No vendor lock-in**: Standard AWS services

## Monitoring

- **Website Status**: https://cooksmartapp.com
- **AWS Console**: CloudFront > Distributions > E31XPFYZVQELB6
- **Costs**: AWS Billing Dashboard
- **Contact Form**: Check services.cooksmart@gmail.com for submissions

---

**Last Updated**: January 2, 2026
**Status**: Production ready (clean slate deployment)
**Architecture**: S3 + CloudFront + Route 53
**Deployment Time**: 1-2 minutes