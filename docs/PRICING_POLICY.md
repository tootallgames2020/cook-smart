# Cook Smart Pricing Policy

## Lifetime Price Lock Guarantee (Yearly Plans Only)

### Policy Overview
Cook Smart offers a **Lifetime Price Lock** exclusively for yearly subscription plans. This means users who subscribe to any yearly plan will maintain their original subscription price for as long as they keep their subscription active or renew within the grace period.

### How It Works

#### Price Lock Benefits
- **Beta Pre-Purchase**: Users who pre-purchase during beta at $24.99/year keep this price forever
- **Post-Beta Yearly**: Users who subscribe at $34.99/year keep this price even if we raise prices to $39.99+ later
- **Future Price Increases**: No matter how much yearly prices increase, existing yearly subscribers pay their original rate

#### Grace Period
- **7-day grace period** after subscription expiration
- Users can renew within 7 days and maintain their locked price
- After 7 days, new subscription rates apply

#### Subscription Types Covered
- ✅ **Yearly Plans**: Full lifetime price lock guarantee
- ❌ **Monthly Plans**: No price lock (subject to current market rates)
- ❌ **Weekly Plans**: No price lock (subject to current market rates)

### Examples

### Pricing Tiers

#### Beta Phase (Current)
- **App Usage**: Completely FREE
- **Pre-Purchase Option**: Yearly at $24.99 (normally $34.99)
- **Price Lock**: $24.99/year forever

#### Post-Beta Phase
- **Free Trial**: 7 days for all users
- **Trial Pricing**: Yearly at $24.99 (limited time during trial)
- **Regular Pricing**: Yearly at $34.99, Monthly at $6.99, Weekly at $2.99
- **Price Lock**: Whatever yearly price paid becomes lifetime rate

#### Future Price Increases
- **Existing Yearly Subscribers**: Keep their original price forever
- **New Subscribers**: Pay current market rates
- **Example**: If yearly goes from $34.99 to $39.99, existing users keep paying $34.99

#### Post-Beta Scenario
1. User starts 7-day free trial
2. During trial: yearly available at $24.99 (trial pricing)
3. After trial ends: yearly becomes $34.99 (regular pricing)
4. Users who subscribe at $24.99 during trial keep that price forever
5. Users who subscribe at $34.99 after trial keep that price forever

#### Trial Pricing Benefits (Post-Beta)
- **During 7-day trial**: Yearly at $24.99 (same as beta pre-purchase price)
- **After trial expires**: Yearly at $34.99 (regular price)
- **Price lock applies**: Whatever price they pay becomes their lifetime rate

#### Grace Period Scenario
1. User's yearly subscription expires
2. User has 7 days to renew at their locked price ($24.99 or $34.99)
3. If renewed within 7 days: keeps locked price
4. If renewed after 7 days: pays current market rate

### Business Benefits
- **Customer Retention**: Strong incentive to maintain yearly subscriptions
- **Early Adopter Rewards**: Beta users get permanent discount
- **Predictable Revenue**: Locked-in customers provide stable income
- **Competitive Advantage**: Unique value proposition in the market

### Technical Implementation
- Stripe subscription prices are locked at creation
- Database tracks original subscription price
- Grace period logic prevents price increases during renewal window
- Only yearly plans eligible for price lock benefits

---

**Last Updated**: January 22, 2026
**Policy Effective**: During Beta Phase
**Applies To**: All yearly subscription plans only