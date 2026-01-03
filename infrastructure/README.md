# Cook Smart Website Infrastructure

This directory contains the AWS infrastructure setup for the Cook Smart website using AWS Amplify.

## Why AWS Amplify?

AWS Amplify is the right choice for our Next.js static site because:

- ✅ **Built for Next.js**: Native support for static exports
- ✅ **Automatic deployments**: Git-based deployments from GitHub
- ✅ **Custom domains**: Easy SSL and domain management
- ✅ **Cost-effective**: Pay only for what you use (~$1-5/month)
- ✅ **Reliable routing**: Proper SPA routing without 403 errors
- ✅ **Built-in CDN**: Global content delivery included

## Quick Setup

### 1. Deploy Infrastructure

```bash
cd infrastructure
deploy-amplify.bat
```

This will:

- Clean up the broken CloudFront setup
- Deploy new Amplify infrastructure
- Set up proper domain routing

### 2. Connect GitHub (One-time setup)

```bash
setup-github-connection.bat
```

Or manually in AWS Console:

1. Go to [Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app
3. Connect your GitHub repository
4. Choose `fresh-project-migration` branch

### 3. Verify Domain

Ensure your domain DNS points to Amplify:

- Go to Amplify Console > Domain management
- Follow the DNS verification steps
- Update your domain registrar if needed

## File Structure

```
infrastructure/
├── amplify-setup.yml           # CloudFormation template
├── deploy-amplify.bat          # Main deployment script
├── setup-github-connection.bat # GitHub integration
├── README.md                   # This file
└── manual-deploy.bat           # Manual deployment option
```

## How It Works

1. **GitHub Push**: You push changes to `fresh-project-migration` branch
2. **Auto Build**: Amplify detects changes and starts build
3. **Next.js Build**: Runs `npm run build` in `website/` directory
4. **Deploy**: Deploys static files to global CDN
5. **Live**: Changes are live at https://cooksmartapp.com in 3-5 minutes

## Build Configuration

The build process:

```yaml
version: 1
applications:
  - appRoot: website          # Build from website/ directory
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci          # Install dependencies
        build:
          commands:
            - npm run build   # Build Next.js static export
      artifacts:
        baseDirectory: out    # Deploy from out/ directory
        files:
          - '**/*'           # Deploy all files
```

## Custom Routing Rules

Amplify handles SPA routing with these rules:

- `/recipes` → `/recipes/` (redirect)
- `/about` → `/about/` (redirect)  
- `/contact` → `/contact/` (redirect)
- `/faq` → `/faq/` (redirect)
- `/<*>` → `/index.html` (fallback for client-side routing)

## Cost Estimate

AWS Amplify pricing for our use case:

- **Build minutes**: ~2 minutes per build × 10 builds/month = $0.02
- **Hosting**: ~1GB storage + CDN = $0.15/month
- **Custom domain**: Free SSL certificate
- **Total**: ~$0.20-$1.00/month

## Troubleshooting

### Build Fails

1. Check build logs in Amplify Console
2. Verify `website/package.json` has correct scripts
3. Ensure `next.config.ts` has `output: 'export'`

### Domain Not Working

1. Check DNS settings in your domain registrar
2. Verify domain is verified in Amplify Console
3. Wait up to 48 hours for DNS propagation

### 404 Errors

1. Check custom rules in Amplify Console
2. Ensure trailing slashes in navigation links
3. Verify `trailingSlash: true` in `next.config.ts`

## Manual Deployment

If you need to deploy manually without GitHub:

```bash
cd website
npm run build
aws s3 sync out/ s3://your-amplify-bucket --delete
```

## Monitoring

- **Build Status**: Amplify Console > App > Builds
- **Domain Status**: Amplify Console > App > Domain management  
- **Logs**: Amplify Console > App > Monitoring
- **Costs**: AWS Billing Dashboard

## Support

If you encounter issues:

1. Check the Amplify Console for detailed error messages
2. Review build logs for specific errors
3. Verify all environment variables are set correctly
4. Contact AWS Support if needed (included with paid accounts)

---

**Last Updated**: January 2, 2026
**Status**: Ready for deployment
**Estimated Setup Time**: 15-30 minutes