# Ingredient Grouping - Quick Deploy Checklist

## ✅ What's Ready
- [x] Database migration created
- [x] Service layer implemented
- [x] API endpoints created
- [x] Seed data prepared
- [x] Server routes configured
- [x] Documentation written

## 🚀 Deploy Steps

### 1. SSH to Production
```bash
ssh -i ~/.ssh/cook-smart-key.pem ubuntu@3.238.250.151
cd /home/ubuntu/cook-smart
```

### 2. Pull Latest Code
```bash
git pull origin main  # or your branch name
```

### 3. Install Dependencies (if needed)
```bash
cd backend
npm install
```

### 4. Run Migration
```bash
npx knex migrate:latest
```

### 5. Seed Data
```bash
npx knex seed:run
```

### 6. Rebuild & Restart
```bash
npm run build
pm2 restart cook-smart-backend
```

### 7. Verify
```bash
# Check logs
pm2 logs cook-smart-backend

# Test health endpoint
curl http://localhost:3000/health
```

## 🧪 Test Endpoints

### Get Grouped Ingredients
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.cooksmartapp.com/api/v1/ingredients/grouped
```

### Merge Ingredients
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ingredient_ids":["id1","id2"],"group_name":"Eggs"}' \
  https://api.cooksmartapp.com/api/v1/ingredients/merge
```

### Split Ingredient
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ingredient_id":"id1"}' \
  https://api.cooksmartapp.com/api/v1/ingredients/split
```

## 📱 Frontend TODO

1. Update inventory screen to use `/grouped` endpoint
2. Add long-press menu with "Merge" option
3. Add "Split" option for grouped items
4. Show expandable breakdown of grouped items
5. Display total quantity prominently

## ⚠️ Rollback Plan

If something breaks:
```bash
# Rollback migration
cd backend
npx knex migrate:rollback

# Restart backend
pm2 restart cook-smart-backend
```

## 📊 Expected Behavior

**Before:**
- Brown Eggs (6)
- Large Eggs (6)
- White Eggs (12)

**After:**
- Eggs (24) ▼
  - Brown Eggs: 6
  - Large Eggs: 6
  - White Eggs: 12

## 🎯 Success Metrics

- [ ] Migration runs without errors
- [ ] Seed data loads 15 groups
- [ ] API returns grouped ingredients
- [ ] Users can merge ingredients
- [ ] Users can split ingredients
- [ ] Community learning increments usage_count
- [ ] Personal preferences override community defaults

## 🐛 Troubleshooting

**Migration fails:**
- Check database connection
- Verify tables don't already exist
- Check for foreign key conflicts

**API returns 500:**
- Check PM2 logs: `pm2 logs cook-smart-backend`
- Verify migration ran successfully
- Check database permissions

**Grouping not working:**
- Verify seed data loaded
- Check ingredient names match patterns
- Review confidence scores in logs

## 📞 Support

Issues? Check:
1. `INGREDIENT_GROUPING_IMPLEMENTATION.md` - Full details
2. PM2 logs - Error messages
3. Database - Verify tables exist
4. API health endpoint - System status
