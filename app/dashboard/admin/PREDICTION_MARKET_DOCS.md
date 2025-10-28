# Prediction Market System - Documentation

## Overview
This system implements a Polymarket-style prediction market using an Automated Market Maker (AMM) with a constant product formula.

## Database Schema

### Tables

#### 1. `markets`
Main table storing all prediction markets/events.

**Key Fields:**
- `id`: Unique identifier
- `title`: Question being predicted (e.g., "Will X win the election?")
- `description`: Detailed description and resolution criteria
- `category`: Market category (politics, sports, entertainment, crypto, business, other)
- `status`: Market lifecycle state (pending, active, closed, resolved, cancelled)
- `yes_price` / `no_price`: Current probability prices (0-1 scale)
- `initial_liquidity`: Starting liquidity pool size
- `total_volume`: Total amount traded
- `unique_traders`: Number of unique participants

#### 2. `market_positions`
Tracks user holdings in each market.

**Key Fields:**
- `market_id`: Reference to market
- `user_id`: Reference to user
- `outcome`: 'yes' or 'no'
- `shares`: Number of shares held
- `average_price`: Average price paid
- `total_invested`: Total amount invested
- `realized_profit`: Profit from sold shares
- `unrealized_profit`: Current potential profit

#### 3. `market_trades`
Records all buy/sell transactions.

**Key Fields:**
- `trade_type`: 'buy' or 'sell'
- `outcome`: 'yes' or 'no'
- `shares`: Number of shares traded
- `price_per_share`: Execution price
- `total_amount`: Total transaction value
- `platform_fee`: Fee charged (if any)

#### 4. `liquidity_pools`
Stores AMM state for price calculations.

**Key Fields:**
- `yes_reserve`: Available YES tokens
- `no_reserve`: Available NO tokens
- `constant_product`: k = yes_reserve × no_reserve
- `total_liquidity`: Total pool size

## How the Automated Market Maker (AMM) Works

### Constant Product Formula
The system uses the formula: **x × y = k**

Where:
- `x` = yes_reserve (YES token supply)
- `y` = no_reserve (NO token supply)
- `k` = constant product (remains constant during trades)

### Price Calculation

When a user wants to buy YES shares:
1. The YES reserve decreases (tokens removed from pool)
2. The NO reserve increases (to maintain k constant)
3. Price = Change in NO reserve / Shares purchased

Example:
```
Initial state:
- yes_reserve = 100
- no_reserve = 100
- k = 10,000

User buys 10 YES shares:
- New yes_reserve = 90
- New no_reserve = k / 90 = 111.11
- Price = (111.11 - 100) / 10 = $1.11 per share
```

### Key Concepts

1. **Shares are probability representations:**
   - Price of $0.65 = 65% probability
   - YES price + NO price always ≈ $1.00

2. **Slippage:**
   - Larger trades move the price more
   - This creates natural market depth

3. **Resolution:**
   - When resolved, winning shares pay $1.00
   - Losing shares become worthless

## Admin Workflow

### Creating a Market

1. **Navigate to Admin Markets page**
2. **Click "Créer un Marché"**
3. **Fill in the form:**
   - Title: The prediction question
   - Description: Resolution criteria
   - Category: Select appropriate category
   - Image URL: Optional market image
   - Dates:
     - Start date: When trading begins
     - End date: When trading stops
     - Resolution date: When outcome is determined
   - Financial settings:
     - Initial liquidity: Starting pool size (higher = less slippage)
     - Min/Max bet: Betting limits

4. **Market is created with "pending" status**

### Activating a Market

1. Market starts in "pending" status (not visible to users)
2. Admin reviews the market
3. Click the "Unlock" icon to activate
4. Market becomes "active" and visible to all users

### Managing Active Markets

**Available Actions:**
- **Lock (Close)**: Stop new trades, prepare for resolution
- **Resolve**: Declare the winning outcome
- **Delete**: Soft delete (mark as deleted_at)

### Resolving a Market

1. Click "Résoudre" (CheckCircle icon)
2. Select winning outcome: YES or NO
3. Optionally add resolution source (URL or description)
4. Confirm resolution
5. System will:
   - Pay out winning positions ($1.00 per share)
   - Mark losing positions as worthless
   - Update user balances
   - Record profits

## Integration with Existing System

### User Balance Integration

The market system integrates with your existing `profiles` table:

```sql
-- When user buys shares
UPDATE profiles 
SET balance = balance - total_amount 
WHERE id = user_id;

-- When user sells or market resolves
UPDATE profiles 
SET balance = balance + payout_amount 
WHERE id = user_id;
```

### Transaction Recording

Market trades should also create entries in your existing `transactions` table:

```sql
INSERT INTO transactions (
  user_id,
  type,
  amount,
  status,
  reference,
  metadata
) VALUES (
  user_id,
  'game_bet', -- or create new type 'market_bet'
  amount,
  'completed',
  'MARKET-' || market_id,
  jsonb_build_object('market_id', market_id, 'outcome', outcome)
);
```

## Platform Profit Model

### Fee Structure Options

1. **Trading Fees** (2-5% per trade)
   ```sql
   platform_fee = total_amount * 0.02
   ```

2. **Resolution Fees** (1-2% of winning payouts)
   ```sql
   platform_fee = winning_amount * 0.01
   ```

3. **Liquidity Provision** (Platform provides initial liquidity and earns from spread)

### Recording Profits

```sql
INSERT INTO admin_market_profit (
  market_id,
  trade_id,
  amount,
  fee_type
) VALUES (
  market_id,
  trade_id,
  fee_amount,
  'trading_fee'
);
```

## User-Facing Features to Build

### Market List Page
- Display all active markets
- Filter by category
- Show current prices (YES/NO percentages)
- Display volume and trader count

### Market Detail Page
- Full market information
- Interactive trading interface
- Price chart over time
- Recent trades list
- Comment section
- User's current position

### User Portfolio
- List of all positions
- Unrealized P&L
- Realized P&L
- Transaction history

## Trading Flow (User Perspective)

### Buying Shares

1. User selects market
2. Chooses outcome (YES or NO)
3. Enters amount to invest
4. System calculates shares and price
5. User confirms trade
6. Balance deducted, shares added to position

### Selling Shares

1. User views their position
2. Clicks "Sell"
3. Enters shares to sell (or sell all)
4. System calculates payout at current market price
5. User confirms sale
6. Shares removed, balance credited

### Market Resolution

1. Market reaches resolution date
2. Admin resolves market
3. System calculates payouts:
   - Winning shares: shares × $1.00
   - Losing shares: $0.00
4. User balances updated automatically

## API Endpoints to Create

### For Users

```typescript
// Get all active markets
GET /api/markets

// Get market details
GET /api/markets/:id

// Get user positions
GET /api/markets/positions

// Place trade
POST /api/markets/:id/trade
Body: { outcome: 'yes' | 'no', amount: number }

// Get market price quote
POST /api/markets/:id/quote
Body: { outcome: 'yes' | 'no', shares: number }

// Add comment
POST /api/markets/:id/comments
Body: { content: string, parent_id?: string }
```

### For Admin

```typescript
// Create market
POST /api/admin/markets
Body: MarketForm

// Update market status
PATCH /api/admin/markets/:id/status
Body: { status: string }

// Resolve market
POST /api/admin/markets/:id/resolve
Body: { winning_outcome: 'yes' | 'no', source?: string }

// Delete market
DELETE /api/admin/markets/:id
```

## Best Practices

### Market Creation

1. **Clear resolution criteria**: Make it obvious how the market will be resolved
2. **Appropriate time frames**: End date should be before resolution date
3. **Sufficient liquidity**: Higher liquidity = less price slippage
4. **Good descriptions**: Help users understand what they're betting on

### Resolution

1. **Use reliable sources**: Official results, trusted news outlets
2. **Document sources**: Save URL or description
3. **Be timely**: Resolve as soon as outcome is known
4. **Be fair**: Follow the stated resolution criteria exactly

### Risk Management

1. **Set appropriate limits**: Min/max bet amounts
2. **Monitor for manipulation**: Watch for unusual trading patterns
3. **Have clear policies**: What happens if event is cancelled?
4. **Reserve liquidity**: Ensure platform can pay out winners

## Future Enhancements

1. **Multi-outcome markets**: More than just YES/NO
2. **Range markets**: Predict a value within a range
3. **Liquidity mining**: Reward users who provide liquidity
4. **Social features**: Follow traders, leaderboards
5. **Mobile app**: Native mobile experience
6. **Push notifications**: Alert users of resolution, price changes
7. **API access**: Let third parties integrate
8. **Analytics dashboard**: Detailed market statistics

## Security Considerations

1. **RLS Policies**: Already implemented in schema
2. **Input validation**: Validate all user inputs
3. **Rate limiting**: Prevent spam and abuse
4. **Admin authentication**: Strong admin verification
5. **Audit logs**: Track all admin actions
6. **Balance checks**: Ensure users can't bet more than they have
7. **Atomic transactions**: Use database transactions for trades

## Monitoring & Analytics

### Key Metrics to Track

1. **Market metrics:**
   - Total volume per market
   - Unique traders per market
   - Average trade size
   - Price volatility

2. **Platform metrics:**
   - Total platform volume
   - Active users
   - New markets per day
   - Resolution accuracy

3. **Revenue metrics:**
   - Total fees collected
   - Fees per market
   - Average fee per user

## Support & Troubleshooting

### Common Issues

1. **Price calculation errors**: Check liquidity pool reserves
2. **Failed trades**: Verify user balance and market status
3. **Resolution disputes**: Have clear policies and arbitration process
4. **Liquidity issues**: May need to adjust initial liquidity

### Admin Tools Needed

1. Market analytics dashboard
2. User position viewer
3. Manual balance adjustment (for disputes)
4. Bulk market operations
5. Automated resolution (for clear outcomes)

---

## Quick Start Checklist

- [ ] Run the SQL schema in Supabase
- [ ] Verify all tables created successfully
- [ ] Test RLS policies
- [ ] Add AdminMarkets component to your app
- [ ] Create API routes for trading
- [ ] Build user-facing market pages
- [ ] Test complete trading flow
- [ ] Set up monitoring
- [ ] Launch with beta markets
