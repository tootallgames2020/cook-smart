-- Update trial days for post-beta phase
-- Beta: no trials, post-beta: 7 days for all plans

UPDATE subscription_plans 
SET trial_days = 7 
WHERE plan_name IN ('yearly', 'monthly', 'weekly');

-- Update descriptions to reflect correct pricing
UPDATE subscription_plans 
SET description = 'Full access to Cook Smart with yearly billing - Best Value! Lock in $24.99 during trial!'
WHERE plan_name = 'yearly';

UPDATE subscription_plans 
SET description = 'Full access to Cook Smart with monthly billing'
WHERE plan_name = 'monthly';

UPDATE subscription_plans 
SET description = 'Full access to Cook Smart with weekly billing - Perfect for trying out!'
WHERE plan_name = 'weekly';