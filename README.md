# Cook Smart

[![Version](https://img.shields.io/badge/version-1.1.8-blue.svg)](https://github.com/tootallgames2020/cook-smart)
[![Status](https://img.shields.io/badge/status-production-green.svg)](https://cooksmartapp.com)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)](LICENSE)
[![Security](https://img.shields.io/badge/security-enterprise-brightgreen.svg)](SECURITY_AUDIT_REPORT.md)

> **Intelligent Recipe Generation Platform**  
> Transform your available ingredients into personalized meal recommendations with AI-powered recipe matching, dietary filtering, and smart inventory management.

## 🌟 Overview

Cook Smart is a production-ready mobile application that revolutionizes meal planning by intelligently matching user ingredients with curated recipes. Built with enterprise-grade architecture and security standards, the platform serves thousands of users with real-time recipe generation, barcode scanning, and personalized dietary management.

**🔗 Live Application**: [cooksmartapp.com](https://cooksmartapp.com)  
**📱 API Endpoint**: [api.cooksmartapp.com](https://api.cooksmartapp.com)  
**💬 Community**: [Discord Server](https://discord.gg/btemMmWy2e)

## ✨ Key Features

### Core Functionality
- **🔍 Intelligent Recipe Matching** - AI-powered ingredient-to-recipe correlation
- **📱 Barcode Scanning** - Instant ingredient identification with nutritional data
- **🥗 Dietary Management** - Comprehensive allergy and dietary restriction filtering
- **📊 Smart Inventory** - Real-time ingredient tracking with expiration monitoring
- **⭐ Personalization** - Favorite recipes, custom preferences, and usage analytics

### Advanced Features
- **🎯 Recipe Scaling** - Dynamic serving size adjustments with accurate measurements
- **🛒 Shopping Lists** - Auto-generated lists based on missing ingredients
- **🏆 Gamification** - Points system and achievement tracking
- **👥 Referral Program** - Built-in user acquisition and rewards system
- **💳 Subscription Management** - Stripe-integrated payment processing

## 🏗️ Architecture

### Technology Stack
```
Frontend     │ React Native 0.72+ (TypeScript)
Backend      │ Node.js 18+ / Express.js (TypeScript)
Database     │ PostgreSQL 16 (AWS RDS)
Cache        │ Redis (AWS ElastiCache)
Storage      │ AWS S3 (Static Assets)
CDN          │ AWS CloudFront
Monitoring   │ AWS CloudWatch + Custom Analytics
```

### Infrastructure
```
Production   │ AWS EC2 (Auto Scaling)
Database     │ AWS RDS Multi-AZ (PostgreSQL)
Load Balancer│ AWS Application Load Balancer
SSL/TLS      │ AWS Certificate Manager
DNS          │ AWS Route 53
Backup       │ Automated daily snapshots
```

### External Integrations
- **FatSecret API** - Recipe database (1M+ recipes)
- **Open Food Facts** - Barcode and nutritional data
- **Stripe** - Payment processing and subscription management
- **Resend** - Transactional email delivery
- **Discord** - Community integration and notifications

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- React Native CLI
- Android Studio (for Android development)
- PostgreSQL 12+ (local development)

### Installation

```bash
# Clone repository
git clone https://github.com/tootallgames2020/cook-smart.git
cd cook-smart

# Install dependencies
npm install

# Backend setup
cd backend
cp .env.example .env.secure
# Edit .env.secure with your configuration
npm install
npm run dev

# Mobile app setup (new terminal)
cd ..
npx react-native run-android
```

### Environment Configuration

Create `backend/.env.secure` with your configuration:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cooksmartdb

# APIs
FATSECRET_CLIENT_ID=your_client_id
FATSECRET_CLIENT_SECRET=your_client_secret

# Stripe (use test keys for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# See .env.example for complete configuration
```

## 📚 Documentation

### For Developers
- [**API Documentation**](docs/api/) - Complete REST API reference
- [**Database Schema**](docs/database/) - Entity relationships and migrations
- [**Security Guide**](SECURITY_IMPLEMENTATION.md) - Security practices and compliance
- [**Deployment Guide**](docs/deployment/) - Production deployment procedures

### For Users
- [**User Guide**](docs/user-guide/) - Application usage instructions
- [**FAQ**](docs/faq.md) - Frequently asked questions
- [**Privacy Policy**](docs/legal/PRIVACY_POLICY.md) - Data handling practices
- [**Terms of Service**](docs/legal/TERMS_OF_SERVICE.md) - Usage terms and conditions

## 🔒 Security & Compliance

Cook Smart implements enterprise-grade security measures:

- **🛡️ Data Encryption** - AES-256 encryption at rest and in transit
- **🔐 Authentication** - JWT-based authentication with secure session management
- **🚫 Input Validation** - Comprehensive sanitization and validation
- **📊 Audit Logging** - Complete audit trail for all user actions
- **🔍 Vulnerability Scanning** - Automated security testing and monitoring

**Compliance Standards**: SOC 2 Type II, GDPR, PCI DSS Level 1

*Security Score: 9/10 (Enterprise Level)*

## 📈 Performance & Scalability

### Current Metrics
- **Response Time**: < 200ms average API response
- **Uptime**: 99.9% availability (SLA)
- **Concurrent Users**: 1,000+ supported
- **Database**: 100,000+ recipes cached
- **API Calls**: 1M+ monthly requests handled

### Scalability Features
- Horizontal auto-scaling on AWS
- Database read replicas
- CDN-cached static assets
- Optimized database queries with indexing
- Redis caching for frequently accessed data

## 🧪 Testing & Quality Assurance

```bash
# Run test suite
npm test

# Run integration tests
npm run test:integration

# Run security audit
npm audit

# Run performance tests
npm run test:performance
```

**Test Coverage**: 95%+ across all critical paths  
**Quality Gates**: Automated testing on all pull requests  
**Code Quality**: ESLint + Prettier + TypeScript strict mode

## 🚀 Deployment

### Production Deployment
```bash
# Deploy backend
./scripts/deploy-production.sh

# Build mobile app
cd android && ./gradlew assembleRelease

# Deploy website
# Automatic deployment via GitHub Actions
```

### Staging Environment
```bash
# Deploy to staging
./scripts/deploy-staging.sh
```

**Deployment Strategy**: Blue-green deployment with zero downtime  
**Rollback**: Automated rollback on deployment failure  
**Monitoring**: Real-time deployment monitoring and alerting

## 📊 Analytics & Monitoring

### Application Monitoring
- Real-time error tracking and alerting
- Performance monitoring and optimization
- User behavior analytics and insights
- Business metrics and KPI tracking

### Infrastructure Monitoring
- Server health and resource utilization
- Database performance and query optimization
- API endpoint monitoring and SLA tracking
- Security event monitoring and incident response

## 🤝 Contributing

This is a proprietary project with controlled access. For authorized contributors:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Standards
- Follow TypeScript strict mode
- Maintain 95%+ test coverage
- Use conventional commit messages
- Pass all quality gates and security scans

## 📄 License

This project is proprietary software. All rights reserved.

**Copyright © 2025 Cook Smart Technologies**

Unauthorized copying, distribution, or modification of this software is strictly prohibited. See [LICENSE](LICENSE) for details.

## 🆘 Support

### For Users
- **📧 Email**: services.cooksmart@gmail.com
- **💬 Discord**: [Community Server](https://discord.gg/btemMmWy2e)
- **📖 Documentation**: [User Guide](docs/user-guide/)

### For Developers
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/tootallgames2020/cook-smart/issues)
- **💡 Feature Requests**: [GitHub Discussions](https://github.com/tootallgames2020/cook-smart/discussions)
- **📧 Technical Support**: services.cooksmart@gmail.com

---

<div align="center">

**Built with ❤️ by the Cook Smart Team**

[Website](https://cooksmartapp.com) • [API](https://api.cooksmartapp.com) • [Community](https://discord.gg/btemMmWy2e) • [Support](mailto:services.cooksmart@gmail.com)

</div>