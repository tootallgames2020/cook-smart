# Ingredient Grouping Implementation Summary

## Overview
Implemented hybrid community + personal learning system for grouping similar ingredients (e.g., "Brown Eggs" + "Large Eggs" = "Eggs").

## What Was Built

### 1. Database Schema (Migration: `20250115000000_add_ingredient_grouping.js`)
- **ingredient_groups**: Stores base ingredient names with learned rules
  - `base_name`: "Eggs", "Milk", etc.
  - `strip_modifiers`: Words to ignore (brown, large, organic)
  - `keep_distinctions`: Important differences (whole vs skim milk)
  - `usage_count`: Community learning metric

- **ingredient_group_mappings**: Links ingredients to groups
  - Auto-learned from community behavior
  - Confidence scoring (0-100)

- **user_ingredient_preferences**: Personal overrides
  - Users can merge or split ingredients
  - Overrides community defaults

### 2. Service Layer (`IngredientGroupingService.ts`)
**Smart Matching Algorithm:**
- Strips common modifiers (brown, white, large, small, organic, etc.)
- Keeps important distinctions (whole milk ≠ skim milk)
- Fuzzy string matching for similarity
- Confidence scoring (>70% = auto-group)

**Community Learning:**
- When user merges ingredients → updates community patterns
- Increments usage_count for popular groupings
- Improves confidence scores over time

**Personal Preferences:**
- Users can override community groupings
- Split grouped items if they want them separate
- Merge items that system didn't group

### 3. API Endpoints (`ingredientGrouping.ts`)
```
GET  /api/v1/ingredients/grouped
     → Get user's ingredients with grouping applied
     
POST /api/v1/ingredients/merge
     → User merges ingredients (e.g., merge "Brown Eggs" + "White Eggs" into "Eggs")
     Body: { ingredient_ids: [...], group_name: "Eggs" }
     
POST /api/v1/ingredients/split
     → User splits ingredient from group
     Body: { ingredient_id: "..." }
```

### 4. Seed Data (`02_ingredient_groups.js`)
Pre-populated 15 common ingredient groups:
- Eggs, Milk, Butter, Chicken, Beef
- Cheese, Bread, Rice, Tomatoes, Onions
- Potatoes, Flour, Sugar, Oil, Pasta

Each with smart rules for what to strip vs keep.

## How It Works

### Example: Adding Eggs
1. User adds "Brown Eggs" → System checks for existing groups
2. Finds "Eggs" group with rule: strip "brown", "white", "large"
3. Calculates match score: 90% (high confidence)
4. Auto-groups as "Eggs"
5. Display shows: **Eggs (12)** with breakdown

### Community Learning
1. User A merges "Organic Eggs" with "Eggs" group
2. System records: "organic" should be stripped
3. User B adds "Organic Eggs" → Auto-groups correctly
4. Pattern improves for all users

### Personal Override
1. User wants "Whole Milk" separate from "Skim Milk"
2. User splits them via API
3. System remembers: this user keeps milk types separate
4. Community still groups them, but not for this user

## How to Deploy

### Step 1: Run Migration
```bash
cd backend
npx knex migrate:latest
```

### Step 2: Seed Data
```bash
npx knex seed:run
```

### Step 3: Rebuild Backend
```bash
npm run build
pm2 restart cook-smart-backend
```

### Step 4: Test
```bash
# Get grouped ingredients
curl -H "Authorization: Bearer <token>" \
  https://api.cooksmartapp.com/api/v1/ingredients/grouped

# Merge ingredients
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"ingredient_ids":["id1","id2"],"group_name":"Eggs"}' \
  https://api.cooksmartapp.com/api/v1/ingredients/merge
```

## Frontend Integration (TODO)

### Update Inventory Screen
```typescript
// Instead of fetching /api/v1/ingredients
const response = await fetch('/api/v1/ingredients/grouped');

// Response format:
{
  display_name: "Eggs",
  group_id: "...",
  category: "dairy",
  total_quantity: 12,
  units: ["piece"],
  items: [
    { name: "Brown Eggs", quantity: 6, ... },
    { name: "Large Eggs", quantity: 6, ... }
  ]
}
```

### Add Merge UI
- Long-press ingredient → "Merge with..."
- Select other ingredients to merge
- Enter group name
- Call `/api/v1/ingredients/merge`

### Add Split UI
- Tap grouped ingredient → Show breakdown
- Option to "Keep separate"
- Call `/api/v1/ingredients/split`

## Benefits

✅ **Cleaner Inventory**: "Eggs" instead of 5 egg variations
✅ **Accurate Totals**: See total quantity across all variations
✅ **Smart Learning**: Gets better with use
✅ **User Control**: Can override any grouping
✅ **Community Benefit**: Everyone learns from patterns
✅ **Privacy Preserved**: Only patterns shared, not personal data

## Technical Details

**Algorithm Confidence:**
- 100%: Exact match after stripping modifiers
- 90%: Contains match (e.g., "eggs" in "brown eggs")
- 70-89%: Fuzzy string similarity
- <70%: Keep separate

**Performance:**
- Grouping happens at query time (no data duplication)
- Cached community patterns for speed
- Minimal database overhead

**Scalability:**
- Community learning improves with more users
- Personal preferences stored efficiently
- Can handle millions of ingredients

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Frontend UI for merge/split
3. ⏳ Mobile app integration
4. ⏳ Analytics dashboard for grouping patterns
5. ⏳ ML model for better matching (future enhancement)

## Notes

- System starts with 15 pre-seeded groups
- Will learn new groups from user behavior
- Confidence scores improve over time
- Users always have final control
