# Website Deployment Guide

## DEPLOYMENT FIXED! ✅

**To update cooksmartapp.com:**

1. Make changes to your website files in the `website/` folder
2. Run `deploy.bat` from the root directory
3. Wait 2-3 minutes

That's it!

## What deploy.bat does:

1. Builds the Next.js website (`npm run build` in website folder)
2. Exports static files to `website/out/` folder
3. Syncs the built static files to S3 bucket
4. Invalidates CloudFront cache
5. Your changes go live globally

## Infrastructure Details

- **S3 Bucket**: cooksmartapp-website
- **CloudFront**: E31XPFYZVQELB6
- **Domain**: cooksmartapp.com  
- **SSL**: Auto-managed by AWS
- **Cost**: ~$1-5/month

## Manual Build (if needed):

```bash
cd website
npm run build
```

This creates static files in `website/out/` folder.

## Manual Deployment (if needed):

```bash
cd website
aws s3 sync out/ s3://cooksmartapp-website --delete --exclude "*.map"
aws cloudfront create-invalidation --distribution-id E31XPFYZVQELB6 --paths "/*"
```

## Current Status

✅ **WORKING**: Static export configured  
✅ **WORKING**: Build process  
✅ **WORKING**: S3 sync  
✅ **WORKING**: CloudFront invalidation  
✅ **WORKING**: Production API URLs configured  

## Notes

- Admin routes temporarily removed (not needed for static website)
- Dynamic blog/recipe routes temporarily removed (will be re-added later with proper static generation)
- Website focuses on marketing pages, contact forms, and static content
- All API calls use production URLs (`https://api.cooksmartapp.com`)

**No other deployment methods are supported.**