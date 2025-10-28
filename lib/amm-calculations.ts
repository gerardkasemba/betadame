// lib/amm-calculations.ts
export interface LiquidityPool {
  yes_reserve: number
  no_reserve: number
  draw_reserve: number
  constant_product: number
  total_liquidity: number
}

export interface TradeQuote {
  shares: number
  pricePerShare: number
  platformFee: number
  totalCost: number
  slippage: number
  marketType: 'binary' | '3outcome'
  tradeType: 'buy' | 'sell'
  newPool?: LiquidityPool // Added to return updated pool state
}

// Binary market calculations (x * y = k)
export function calculateBinaryTrade(
  pool: LiquidityPool,
  outcome: 'yes' | 'no',
  amount: number,
  tradeType: 'buy' | 'sell' = 'buy'
): TradeQuote {
  console.log('🔢 Binary calculation START:', { 
    outcome, 
    amount, 
    tradeType, 
    pool,
    draw_reserve: pool.draw_reserve,
    is_binary: pool.draw_reserve === 0
  })
  
  // CRITICAL: Ensure this is actually a binary market
  if (pool.draw_reserve !== 0) {
    console.error('❌ ERROR: Binary calculation called on 3-outcome market!', {
      draw_reserve: pool.draw_reserve
    })
    throw new Error('Cannot use binary calculation on 3-outcome market')
  }
  
  const k = pool.constant_product
  const platformFee = amount * 0.00 // 0% fee for binary
  const netAmount = amount * 1.00 // 100% of investment

  let shares: number
  let pricePerShare: number
  let newYesReserve: number
  let newNoReserve: number

  if (tradeType === 'buy') {
    // Calculate CURRENT price before trade for display
    const currentPrice = outcome === 'yes' 
      ? pool.no_reserve / (pool.yes_reserve + pool.no_reserve)
      : pool.yes_reserve / (pool.yes_reserve + pool.no_reserve)
    
    console.log('💰 Current price before trade:', currentPrice)
    
    // BUYING: Add money to opposite reserve, remove shares from outcome reserve
    if (outcome === 'yes') {
      newNoReserve = pool.no_reserve + netAmount
      newYesReserve = k / newNoReserve
      shares = pool.yes_reserve - newYesReserve
    } else {
      newYesReserve = pool.yes_reserve + netAmount
      newNoReserve = k / newYesReserve
      shares = pool.no_reserve - newNoReserve
    }
    
    // Use effective price (includes slippage)
    pricePerShare = amount / shares
    
    console.log('📊 Trade execution:', {
      shares,
      pricePerShare,
      effectivePrice: pricePerShare,
      currentPrice,
      slippageAmount: pricePerShare - currentPrice
    })
  } else {
    // SELLING: Calculate shares from current price, return shares to pool
    const currentPrice = outcome === 'yes' 
      ? pool.no_reserve / (pool.yes_reserve + pool.no_reserve)
      : pool.yes_reserve / (pool.yes_reserve + pool.no_reserve)
    
    shares = amount / currentPrice
    
    // When selling, shares go back to pool, user gets money
    if (outcome === 'yes') {
      newYesReserve = pool.yes_reserve + shares
      newNoReserve = k / newYesReserve
      const amountReceived = pool.no_reserve - newNoReserve
      pricePerShare = amountReceived / shares
    } else {
      newNoReserve = pool.no_reserve + shares
      newYesReserve = k / newNoReserve
      const amountReceived = pool.yes_reserve - newYesReserve
      pricePerShare = amountReceived / shares
    }
  }

  // Validate shares
  if (shares <= 0 || isNaN(shares) || !isFinite(shares)) {
    console.error('❌ Invalid shares:', shares)
    throw new Error('Invalid shares calculation')
  }

  const totalCost = amount + platformFee

  // Calculate slippage (price impact)
  const oldPrice = outcome === 'yes' 
    ? pool.no_reserve / (pool.yes_reserve + pool.no_reserve)
    : pool.yes_reserve / (pool.yes_reserve + pool.no_reserve)
  
  const slippage = Math.abs(((pricePerShare - oldPrice) / oldPrice) * 100)

  // CRITICAL: Create new pool with draw_reserve EXACTLY 0
  const newPool: LiquidityPool = {
    yes_reserve: newYesReserve,
    no_reserve: newNoReserve,
    draw_reserve: 0, // MUST be 0 for binary markets
    constant_product: newYesReserve * newNoReserve,
    total_liquidity: pool.total_liquidity
  }

  console.log('✅ Binary calculation END:', {
    newPool,
    draw_reserve: newPool.draw_reserve,
    still_binary: newPool.draw_reserve === 0
  })

  return {
    shares: Math.floor(shares * 1000000) / 1000000,
    pricePerShare: Math.floor(pricePerShare * 10000) / 10000,
    platformFee: Math.floor(platformFee * 100) / 100,
    totalCost: Math.floor(totalCost * 100) / 100,
    slippage: Math.floor(slippage * 100) / 100,
    marketType: 'binary',
    tradeType,
    newPool
  }
}

// 3-outcome market calculations (x * y * z = k)
export function calculate3OutcomeTrade(
  pool: LiquidityPool,
  outcome: 'yes' | 'no' | 'draw',
  amount: number,
  tradeType: 'buy' | 'sell' = 'buy'
): TradeQuote {
  console.log('🔢 3-outcome calculation START:', { 
    outcome, 
    amount, 
    tradeType, 
    pool,
    draw_reserve: pool.draw_reserve,
    is_3outcome: pool.draw_reserve > 0
  })
  
  // CRITICAL: Ensure this is actually a 3-outcome market
  if (pool.draw_reserve <= 0) {
    console.error('❌ ERROR: 3-outcome calculation called on binary market!', {
      draw_reserve: pool.draw_reserve
    })
    throw new Error('Cannot use 3-outcome calculation on binary market')
  }
  
  // Validate pool has sufficient reserves
  if (outcome === 'draw' && pool.draw_reserve <= 0.01) {
    throw new Error('Draw market has insufficient liquidity. Please try a smaller amount.')
  }

  const platformFee = amount * 0.00 // 0% fee for sports
  const netAmount = amount * 1.00

  // Calculate current prices from reserves
  const totalReserves = pool.yes_reserve + pool.no_reserve + pool.draw_reserve
  
  if (totalReserves <= 0) {
    throw new Error('Invalid pool reserves')
  }

  const currentYesPrice = (pool.no_reserve + pool.draw_reserve) / totalReserves
  const currentNoPrice = (pool.yes_reserve + pool.draw_reserve) / totalReserves
  const currentDrawPrice = (pool.yes_reserve + pool.no_reserve) / totalReserves

  console.log('💰 Current prices:', {
    yes: currentYesPrice,
    no: currentNoPrice,
    draw: currentDrawPrice,
    reserves: {
      yes: pool.yes_reserve,
      no: pool.no_reserve,
      draw: pool.draw_reserve
    }
  })

  let shares: number
  let pricePerShare: number
  let newYesReserve = pool.yes_reserve
  let newNoReserve = pool.no_reserve
  let newDrawReserve = pool.draw_reserve

  if (tradeType === 'buy') {
    // BUYING: Calculate shares based on current price
    switch (outcome) {
      case 'yes':
        shares = netAmount / Math.max(currentYesPrice, 0.0001)
        pricePerShare = currentYesPrice
        newYesReserve = pool.yes_reserve - shares
        newNoReserve = pool.no_reserve + (netAmount / 2)
        newDrawReserve = pool.draw_reserve + (netAmount / 2)
        break
      case 'no':
        shares = netAmount / Math.max(currentNoPrice, 0.0001)
        pricePerShare = currentNoPrice
        newNoReserve = pool.no_reserve - shares
        newYesReserve = pool.yes_reserve + (netAmount / 2)
        newDrawReserve = pool.draw_reserve + (netAmount / 2)
        break
      case 'draw':
        shares = netAmount / Math.max(currentDrawPrice, 0.0001)
        pricePerShare = currentDrawPrice
        newDrawReserve = pool.draw_reserve - shares
        newYesReserve = pool.yes_reserve + (netAmount / 2)
        newNoReserve = pool.no_reserve + (netAmount / 2)
        break
      default:
        throw new Error('Invalid outcome')
    }

    // Get maximum available shares
    const maxShares = outcome === 'yes' ? pool.yes_reserve :
                     outcome === 'no' ? pool.no_reserve :
                     pool.draw_reserve

    console.log('📊 Share validation:', {
      calculatedShares: shares,
      maxAvailable: maxShares,
      outcome
    })

    // Validate shares don't exceed available
    if (shares > maxShares) {
      if (maxShares < 1) {
        // For very small reserves, allow buying most of what's available
        shares = maxShares * 0.8 // Allow buying 80% of available shares
        console.log('🔄 Adjusted shares for small reserve:', shares)
      } else {
        throw new Error(`Trade size too large. Maximum ${outcome.toUpperCase()} shares available: ${maxShares.toFixed(4)}`)
      }
    }

  } else {
    // SELLING: Calculate shares from amount, user gets money back
    switch (outcome) {
      case 'yes':
        pricePerShare = currentYesPrice
        shares = amount / Math.max(currentYesPrice, 0.0001)
        newYesReserve = pool.yes_reserve + shares
        newNoReserve = pool.no_reserve - (netAmount / 2)
        newDrawReserve = pool.draw_reserve - (netAmount / 2)
        break
      case 'no':
        pricePerShare = currentNoPrice
        shares = amount / Math.max(currentNoPrice, 0.0001)
        newNoReserve = pool.no_reserve + shares
        newYesReserve = pool.yes_reserve - (netAmount / 2)
        newDrawReserve = pool.draw_reserve - (netAmount / 2)
        break
      case 'draw':
        pricePerShare = currentDrawPrice
        shares = amount / Math.max(currentDrawPrice, 0.0001)
        newDrawReserve = pool.draw_reserve + shares
        newYesReserve = pool.yes_reserve - (netAmount / 2)
        newNoReserve = pool.no_reserve - (netAmount / 2)
        break
      default:
        throw new Error('Invalid outcome')
    }
  }

  // Ensure we don't get microscopic shares
  if (shares < 0.0001) {
    shares = 0.0001
  }

  // Validate shares
  if (shares <= 0 || isNaN(shares) || !isFinite(shares)) {
    throw new Error(`Invalid shares calculation: ${shares}`)
  }

  // Validate reserves remain positive
  if (newYesReserve < 0 || newNoReserve < 0 || newDrawReserve < 0) {
    throw new Error('Trade would result in negative reserves')
  }

  const totalCost = amount + platformFee
  const slippage = 0.5 // Fixed slippage for 3-outcome markets

  // CRITICAL: Create new pool maintaining draw_reserve > 0
  const newPool: LiquidityPool = {
    yes_reserve: newYesReserve,
    no_reserve: newNoReserve,
    draw_reserve: newDrawReserve, // Keep draw reserve for 3-outcome
    constant_product: newYesReserve * newNoReserve * newDrawReserve,
    total_liquidity: pool.total_liquidity
  }

  console.log('✅ 3-outcome calculation END:', {
    newPool,
    draw_reserve: newPool.draw_reserve,
    still_3outcome: newPool.draw_reserve > 0
  })

  return {
    shares: Math.floor(shares * 1000000) / 1000000,
    pricePerShare: Math.floor(pricePerShare * 10000) / 10000,
    platformFee: Math.floor(platformFee * 100) / 100,
    totalCost: Math.floor(totalCost * 100) / 100,
    slippage,
    marketType: '3outcome',
    tradeType,
    newPool
  }
}

// Main function to calculate trade quote
export function calculateTradeQuote(
  pool: LiquidityPool,
  outcome: 'yes' | 'no' | 'draw',
  amount: number,
  tradeType: 'buy' | 'sell' = 'buy'
): TradeQuote {
  console.log('🎯 Calculate trade quote START:', { 
    outcome, 
    amount, 
    tradeType,
    pool_draw_reserve: pool.draw_reserve 
  })

  // Validate amount
  if (amount <= 0 || isNaN(amount) || !isFinite(amount)) {
    throw new Error('Invalid amount')
  }

  // Validate pool
  if (!pool || !pool.yes_reserve || !pool.no_reserve) {
    throw new Error('Invalid liquidity pool')
  }

  // Normalize draw_reserve to exactly 0 if it's null, undefined, or very small
  if (pool.draw_reserve === null || 
      pool.draw_reserve === undefined || 
      pool.draw_reserve < 0.000001) {
    console.log('⚠️ Normalizing draw_reserve to 0 (was:', pool.draw_reserve, ')')
    pool.draw_reserve = 0
  }

  // Determine market type based on draw_reserve
  const is3Outcome = pool.draw_reserve > 0

  console.log('🔍 Market type detection:', {
    draw_reserve: pool.draw_reserve,
    is3Outcome,
    marketType: is3Outcome ? '3-outcome' : 'binary'
  })

  // Validate outcome matches market type
  if (!is3Outcome && outcome === 'draw') {
    throw new Error('Draw outcome not supported for binary markets')
  }

  // Route to appropriate calculation
  if (is3Outcome) {
    console.log('➡️ Routing to 3-outcome calculation')
    return calculate3OutcomeTrade(pool, outcome, amount, tradeType)
  } else {
    console.log('➡️ Routing to binary calculation')
    if (outcome === 'draw') {
      throw new Error('Draw outcome not supported for binary markets')
    }
    return calculateBinaryTrade(pool, outcome, amount, tradeType)
  }
}

// Helper function to calculate potential profit
export function calculatePotentialProfit(
  shares: number,
  pricePerShare: number,
  outcome: 'yes' | 'no' | 'draw'
): { maxProfit: number; breakEven: number; roi: number } {
  const investment = shares * pricePerShare
  const maxProfit = shares - investment // If outcome wins, each share is worth $1
  const breakEven = pricePerShare
  const roi = (maxProfit / investment) * 100

  return {
    maxProfit: Math.floor(maxProfit * 100) / 100,
    breakEven: Math.floor(breakEven * 10000) / 10000,
    roi: Math.floor(roi * 100) / 100
  }
}

// Helper function to validate trade size
export function validateTradeSize(
  amount: number,
  minAmount: number = 1,
  maxAmount: number = 10000,
  userBalance?: number
): { valid: boolean; error?: string } {
  if (amount < minAmount) {
    return {
      valid: false,
      error: `Minimum trade amount is $${minAmount}`
    }
  }

  if (amount > maxAmount) {
    return {
      valid: false,
      error: `Maximum trade amount is $${maxAmount}`
    }
  }

  if (userBalance !== undefined && amount > userBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Available: $${userBalance.toFixed(2)}`
    }
  }

  return { valid: true }
}

// Helper function to ensure pool maintains correct market type
export function validatePoolIntegrity(
  pool: LiquidityPool,
  expectedType: 'binary' | '3outcome'
): { valid: boolean; error?: string } {
  const isBinary = pool.draw_reserve === 0
  const is3Outcome = pool.draw_reserve > 0

  if (expectedType === 'binary' && !isBinary) {
    return {
      valid: false,
      error: `Pool integrity error: Expected binary market but draw_reserve is ${pool.draw_reserve}`
    }
  }

  if (expectedType === '3outcome' && !is3Outcome) {
    return {
      valid: false,
      error: `Pool integrity error: Expected 3-outcome market but draw_reserve is ${pool.draw_reserve}`
    }
  }

  return { valid: true }
}