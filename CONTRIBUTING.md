# Contributing to Cook Smart

Thank you for your interest in contributing to Cook Smart! This document provides guidelines and information for contributors.

## 🎯 Overview

Cook Smart is a proprietary project with controlled access. We welcome contributions from authorized team members and partners who help make our platform better.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:
- Node.js 18+ and npm 8+
- React Native development environment
- Access to development environment variables
- Familiarity with TypeScript and React Native

### Development Setup

1. **Clone and Setup**
   ```bash
   git clone https://github.com/tootallgames2020/cook-smart.git
   cd cook-smart
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cd backend
   cp .env.example .env.secure
   # Configure your development environment
   ```

3. **Database Setup**
   ```bash
   # Run migrations
   npm run migrate
   
   # Seed development data
   npm run seed
   ```

4. **Start Development Servers**
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev
   
   # Mobile App (Terminal 2)
   npx react-native run-android
   ```

## 📋 Development Workflow

### Branch Strategy

We use a **simplified Git Flow** with the following branches:

**Permanent Branches:**
- `main` - Production releases only (protected)
- `fresh-project-migration` - Active development branch (current working branch)

**Temporary Branches:**
- `feature/*` - Feature development branches (merge to `fresh-project-migration`)
- `hotfix/*` - Critical production fixes (merge to both `main` and `fresh-project-migration`)
- `bugfix/*` - Bug fixes (merge to `fresh-project-migration`)

**Branch Workflow:**
1. Create feature branches from `fresh-project-migration`
2. Develop and test your feature
3. Create PR to merge back into `fresh-project-migration`
4. When ready for production, merge `fresh-project-migration` into `main`
5. Delete feature branches after successful merge

**Branch Protection:**
- `main` branch requires PR approval
- Direct commits to `main` are not allowed
- All changes must go through `fresh-project-migration` first

### Commit Standards

We follow **Conventional Commits** specification:

```bash
# Format
<type>[optional scope]: <description>

# Examples
feat(auth): add OAuth2 integration
fix(api): resolve recipe search timeout
docs(readme): update installation instructions
test(auth): add unit tests for login flow
```

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout fresh-project-migration
   git pull origin fresh-project-migration
   git checkout -b feature/your-feature-name
   ```

2. **Development**
   - Write clean, well-documented code
   - Follow existing code style and patterns
   - Add tests for new functionality
   - Update documentation as needed

3. **Quality Checks**
   ```bash
   # Run tests
   npm test
   
   # Check code style
   npm run lint
   
   # Type checking
   npm run type-check
   
   # Security audit
   npm audit
   
   # Run verification scan
   node .kiro/verify-and-scan.js
   ```

4. **Submit Pull Request**
   - Create PR against `fresh-project-migration` branch
   - Use descriptive title and description
   - Link related issues
   - Request review from team members
   - Ensure all checks pass (tests, linting, type-checking)

### Pull Request Template

When creating a PR, use this template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring
- [ ] Performance improvement

## Related Issues
Closes #[issue number]

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console.log statements in production code
- [ ] No `any` types used
- [ ] All TypeScript errors resolved
- [ ] All ESLint errors resolved
- [ ] Verification scan passed (`node .kiro/verify-and-scan.js`)
- [ ] No breaking changes (or documented if necessary)

## Screenshots (if applicable)
Add screenshots or GIFs demonstrating the changes.

## Additional Notes
Any additional information reviewers should know.
```

## 🧪 Testing Standards

### Test Coverage Requirements
- **Minimum Coverage**: 90% for new code
- **Critical Paths**: 100% coverage required
- **Integration Tests**: Required for API endpoints
- **E2E Tests**: Required for user workflows

### Testing Commands
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Writing Tests
```typescript
// Example unit test
describe('RecipeService', () => {
  it('should find recipes by ingredients', async () => {
    const ingredients = ['chicken', 'rice'];
    const recipes = await RecipeService.findByIngredients(ingredients);
    
    expect(recipes).toBeDefined();
    expect(recipes.length).toBeGreaterThan(0);
  });
});
```

## 📝 Code Style Guide

### File Naming Conventions
- **Components**: PascalCase.tsx (e.g., `RecipeCard.tsx`, `VoiceCommandButton.tsx`)
- **Services**: PascalCase.ts (e.g., `RecipeService.ts`, `AuthService.ts`)
- **Utilities**: camelCase.ts (e.g., `formatDate.ts`, `validateEmail.ts`)
- **Types**: PascalCase.types.ts (e.g., `Recipe.types.ts`, `User.types.ts`)
- **Constants**: UPPER_SNAKE.ts (e.g., `API_ENDPOINTS.ts`, `ERROR_MESSAGES.ts`)

### Import Organization
```typescript
// 1. External dependencies (React, React Native, third-party)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import axios from 'axios';

// 2. Internal dependencies (absolute imports using path aliases)
import { RecipeService } from '@/services/RecipeService';
import { Recipe } from '@/types/Recipe.types';
import { API_ENDPOINTS } from '@/constants/API_ENDPOINTS';

// 3. Relative imports (only for co-located files)
import { RecipeCard } from './RecipeCard';
import styles from './styles';
```

### Export Pattern
```typescript
// ✅ Preferred: Named exports
export class RecipeService { ... }
export function formatRecipe() { ... }
export const API_URL = '...';

// ❌ Avoid: Default exports (except for React components in some cases)
export default RecipeService;
```

### TypeScript Standards
- Use **strict mode** TypeScript configuration
- Provide explicit type annotations for public APIs
- Use interfaces for object shapes
- Prefer `const` assertions for immutable data
- **NEVER use `any` type** - use `unknown` or proper types
- Add JSDoc comments to all public methods and classes

### Logging Standards
```typescript
// ✅ Development only
if (__DEV__) {
  console.log('Debug info:', data);
}

// ✅ Use logger service (backend)
logger.info('Recipe search', { ingredients, count });
logger.error('API error', { error, endpoint });

// ❌ NEVER in production code
console.log('Recipe search:', ingredients);  // ❌ Will fail CI/CD
```

### Zero Tolerance Policy
- **0 console.log statements** in production code (except logger service)
- **0 `any` types** (use proper types or `unknown`)
- **0 backup files** (*.backup, *_backup.ts, *.old)
- **0 temporary files** (temp-*, *.tmp)
- **0 ESLint errors** (warnings are acceptable with justification)
- **0 TypeScript errors** (must compile successfully)

### React Native Standards
- Use **strict mode** TypeScript configuration
- Provide explicit type annotations for public APIs
- Use interfaces for object shapes
- Prefer `const` assertions for immutable data

### React Native Standards
- Use functional components with hooks
- Implement proper error boundaries
- Follow React Native performance best practices
- Use TypeScript for all component props

### Code Formatting
- **Prettier** for code formatting
- **ESLint** for code quality
- **2 spaces** for indentation
- **Single quotes** for strings
- **Trailing commas** in multiline structures

### Example Code Style
```typescript
// Good
interface UserProfile {
  id: number;
  name: string;
  email: string;
  preferences: UserPreferences;
}

const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleEdit = useCallback(async () => {
    setIsLoading(true);
    try {
      await onEdit(user);
    } catch (error) {
      console.error('Failed to edit user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, onEdit]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user.name}</Text>
      <Button onPress={handleEdit} disabled={isLoading}>
        Edit
      </Button>
    </View>
  );
};
```

## 🔒 Security Guidelines

### Security Requirements
- **Never commit secrets** to version control
- **Validate all inputs** on both client and server
- **Use parameterized queries** to prevent SQL injection
- **Implement proper authentication** and authorization
- **Follow OWASP security guidelines**

### Security Checklist
- [ ] Input validation implemented
- [ ] SQL injection prevention
- [ ] XSS protection in place
- [ ] Authentication tokens secured
- [ ] Sensitive data encrypted
- [ ] Security headers configured
- [ ] Dependencies regularly updated

## 📊 Performance Guidelines

### Performance Standards
- **API Response Time**: < 200ms average
- **Mobile App Launch**: < 3 seconds
- **Database Queries**: Optimized with proper indexing
- **Bundle Size**: Minimized with code splitting
- **Memory Usage**: Monitored and optimized

### Performance Checklist
- [ ] Database queries optimized
- [ ] Images properly compressed
- [ ] Unnecessary re-renders prevented
- [ ] Bundle size analyzed
- [ ] Memory leaks checked
- [ ] Performance metrics monitored

## 🐛 Bug Reports

### Bug Report Template
```markdown
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g., iOS 15, Android 12]
- App Version: [e.g., 1.1.8]
- Device: [e.g., iPhone 13, Samsung Galaxy S21]

**Additional Context**
Any other context about the problem.
```

## 💡 Feature Requests

### Feature Request Template
```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How would you like this feature to work?

**Alternatives Considered**
Any alternative solutions you've considered.

**Additional Context**
Any other context or screenshots about the feature.
```

## 📞 Communication

### Team Communication
- **Slack**: #cook-smart-dev (internal team)
- **Discord**: [Community Server](https://discord.gg/btemMmWy2e) (public)
- **Email**: services.cooksmart@gmail.com (technical issues)

### Code Reviews
- All code must be reviewed before merging
- Reviews focus on functionality, security, and performance
- Constructive feedback is encouraged
- Address all review comments before merging

## 🎉 Recognition

We appreciate all contributions to Cook Smart! Contributors will be:
- Recognized in release notes
- Added to the contributors list
- Invited to team events and discussions
- Considered for advancement opportunities

## 📄 License

By contributing to Cook Smart, you agree that your contributions will be licensed under the same proprietary license as the project.

---

**Questions?** Reach out to the development team at services.cooksmart@gmail.com

*Last updated: December 14, 2025*