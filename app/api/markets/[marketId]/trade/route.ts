// app/api/markets/[marketId]/trade/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface TradeRequest {
  outcome: 'yes' | 'no' | 'draw'
  amount: number
  tradeType: 'buy' | 'sell'
  shares?: number
}

interface LiquidityPool {
  yes_reserve: number
  no_reserve: number
  draw_reserve: number
  constant_product: number
}

// Calculate trade using 3-outcome AMM formula
function calculate3OutcomeTrade(
  pool: LiquidityPool,
  outcome: 'yes' | 'no' | 'draw',
  investAmount: number,
  tradeType: 'buy'
): { shares: number; pricePerShare: number; newPool: LiquidityPool; totalCost: number } {
  
  console.log('=== calculate3OutcomeTrade START ===')
  console.log('Pool:', pool)
  console.log('Outcome:', outcome)
  console.log('Amount:', investAmount)
  
  // Validate inputs
  if (investAmount <= 0) {
    throw new Error('Investment amount must be positive')
  }

  if (pool.yes_reserve <= 0 || pool.no_reserve <= 0 || pool.draw_reserve <= 0) {
    throw new Error(`Invalid pool reserves - YES: ${pool.yes_reserve}, NO: ${pool.no_reserve}, DRAW: ${pool.draw_reserve}`)
  }

  // Apply 2% fee upfront
  const investAfterFee = investAmount * 0.98
  console.log('Investment after fee:', investAfterFee)

  if (tradeType === 'buy') {
    let newYesReserve = pool.yes_reserve
    let newNoReserve = pool.no_reserve
    let newDrawReserve = pool.draw_reserve
    let shares = 0

    if (outcome === 'yes') {
      // When buying YES, distribute investment to NO and DRAW
      const splitAmount = investAfterFee / 2
      newNoReserve = pool.no_reserve + splitAmount
      newDrawReserve = pool.draw_reserve + splitAmount
      
      // Calculate YES shares based on current price
      const totalReserves = pool.yes_reserve + pool.no_reserve + pool.draw_reserve
      const currentYesPrice = (pool.no_reserve + pool.draw_reserve) / totalReserves
      
      console.log('Total reserves:', totalReserves)
      console.log('Current YES price:', currentYesPrice)
      
      shares = investAmount / Math.max(currentYesPrice, 0.01)
      newYesReserve = pool.yes_reserve - shares
      
      console.log('Calculated shares:', shares)
      console.log('New YES reserve:', newYesReserve)
      
      if (newYesReserve <= 0) {
        throw new Error(`Insufficient YES reserve in pool. Would need ${shares} but only have ${pool.yes_reserve}`)
      }
      
    } else if (outcome === 'no') {
      const splitAmount = investAfterFee / 2
      newYesReserve = pool.yes_reserve + splitAmount
      newDrawReserve = pool.draw_reserve + splitAmount
      
      const totalReserves = pool.yes_reserve + pool.no_reserve + pool.draw_reserve
      const currentNoPrice = (pool.yes_reserve + pool.draw_reserve) / totalReserves
      
      console.log('Total reserves:', totalReserves)
      console.log('Current NO price:', currentNoPrice)
      
      shares = investAmount / Math.max(currentNoPrice, 0.01)
      newNoReserve = pool.no_reserve - shares
      
      console.log('Calculated shares:', shares)
      console.log('New NO reserve:', newNoReserve)
      
      if (newNoReserve <= 0) {
        throw new Error(`Insufficient NO reserve in pool. Would need ${shares} but only have ${pool.no_reserve}`)
      }
      
    } else { // 'draw'
      const splitAmount = investAfterFee / 2
      newYesReserve = pool.yes_reserve + splitAmount
      newNoReserve = pool.no_reserve + splitAmount
      
      const totalReserves = pool.yes_reserve + pool.no_reserve + pool.draw_reserve
      const currentDrawPrice = (pool.yes_reserve + pool.no_reserve) / totalReserves
      
      console.log('Total reserves:', totalReserves)
      console.log('Current DRAW price:', currentDrawPrice)
      
      shares = investAmount / Math.max(currentDrawPrice, 0.01)
      newDrawReserve = pool.draw_reserve - shares
      
      console.log('Calculated shares:', shares)
      console.log('New DRAW reserve:', newDrawReserve)
      
      if (newDrawReserve <= 0) {
        throw new Error(`Insufficient DRAW reserve in pool. Would need ${shares} but only have ${pool.draw_reserve}`)
      }
    }

    // Validate calculation results
    if (shares <= 0 || isNaN(shares) || !isFinite(shares)) {
      throw new Error(`Invalid shares calculation: ${shares}`)
    }

    if (newYesReserve <= 0 || newNoReserve <= 0 || newDrawReserve <= 0) {
      throw new Error(`Invalid reserve calculation - YES: ${newYesReserve}, NO: ${newNoReserve}, DRAW: ${newDrawReserve}`)
    }

    const pricePerShare = investAmount / shares
    const newK = newYesReserve * newNoReserve * newDrawReserve

    console.log('Price per share:', pricePerShare)
    console.log('New constant product:', newK)
    console.log('=== calculate3OutcomeTrade END ===')

    return {
      shares: Math.floor(shares * 1000000) / 1000000,
      pricePerShare: Math.floor(pricePerShare * 10000) / 10000,
      totalCost: investAmount,
      newPool: {
        yes_reserve: newYesReserve,
        no_reserve: newNoReserve,
        draw_reserve: newDrawReserve,
        constant_product: newK
      }
    }
  }

  throw new Error('Sell orders not implemented in this function')
}

// Calculate binary trade
function calculateBinaryTrade(
  pool: LiquidityPool,
  outcome: 'yes' | 'no',
  investAmount: number,
  tradeType: 'buy'
): { shares: number; pricePerShare: number; newPool: LiquidityPool; totalCost: number } {
  
  console.log('=== calculateBinaryTrade START ===')
  console.log('Pool:', pool)
  console.log('Outcome:', outcome)
  console.log('Amount:', investAmount)
  
  // Validate inputs
  if (investAmount <= 0) {
    throw new Error('Investment amount must be positive')
  }

  if (pool.yes_reserve <= 0 || pool.no_reserve <= 0) {
    throw new Error(`Invalid pool reserves - YES: ${pool.yes_reserve}, NO: ${pool.no_reserve}`)
  }

  if (pool.constant_product <= 0) {
    throw new Error(`Invalid constant product: ${pool.constant_product}`)
  }

  const k = pool.constant_product
  console.log('Constant product (k):', k)
  
  // Apply 2% fee upfront
  const investAfterFee = investAmount * 0.98
  console.log('Investment after fee:', investAfterFee)

  if (tradeType === 'buy') {
    if (outcome === 'yes') {
      // Buying YES means adding to NO reserve
      const newNoReserve = pool.no_reserve + investAfterFee
      const newYesReserve = k / newNoReserve
      const shares = pool.yes_reserve - newYesReserve
      
      console.log('New NO reserve:', newNoReserve)
      console.log('New YES reserve:', newYesReserve)
      console.log('Shares:', shares)
      
      // Validate
      if (shares <= 0 || isNaN(shares) || shares > pool.yes_reserve) {
        throw new Error(`Invalid shares calculation for YES outcome. Shares: ${shares}, Available: ${pool.yes_reserve}`)
      }
      
      const pricePerShare = investAmount / shares
      console.log('Price per share:', pricePerShare)
      console.log('=== calculateBinaryTrade END ===')

      return {
        shares: Math.floor(shares * 1000000) / 1000000,
        pricePerShare: Math.floor(pricePerShare * 10000) / 10000,
        totalCost: investAmount,
        newPool: {
          yes_reserve: newYesReserve,
          no_reserve: newNoReserve,
          draw_reserve: pool.draw_reserve,
          constant_product: k
        }
      }
    } else {
      // Buying NO means adding to YES reserve
      const newYesReserve = pool.yes_reserve + investAfterFee
      const newNoReserve = k / newYesReserve
      const shares = pool.no_reserve - newNoReserve
      
      console.log('New YES reserve:', newYesReserve)
      console.log('New NO reserve:', newNoReserve)
      console.log('Shares:', shares)
      
      // Validate
      if (shares <= 0 || isNaN(shares) || shares > pool.no_reserve) {
        throw new Error(`Invalid shares calculation for NO outcome. Shares: ${shares}, Available: ${pool.no_reserve}`)
      }
      
      const pricePerShare = investAmount / shares
      console.log('Price per share:', pricePerShare)
      console.log('=== calculateBinaryTrade END ===')

      return {
        shares: Math.floor(shares * 1000000) / 1000000,
        pricePerShare: Math.floor(pricePerShare * 10000) / 10000,
        totalCost: investAmount,
        newPool: {
          yes_reserve: newYesReserve,
          no_reserve: newNoReserve,
          draw_reserve: pool.draw_reserve,
          constant_product: k
        }
      }
    }
  }

  throw new Error('Sell orders not implemented in this function')
}

// Check if market supports draw (3-outcome)
function is3OutcomeMarket(pool: LiquidityPool): boolean {
  return pool.draw_reserve > 0
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { outcome, amount, tradeType } = body

    if (!outcome || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Implement trade execution
    return NextResponse.json({
      success: true,
      message: 'Trade executed successfully'
    })
  } catch (error) {
    console.error('Trade execution error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for price quotes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const outcome = searchParams.get('outcome')
    const amount = parseFloat(searchParams.get('amount') || '0')

    console.log('Trade quote request:', { id, outcome, amount })

    if (!outcome || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: market, error: marketError } = await supabase
      .from('markets')
      .select(`
        *,
        liquidity_pools (
          yes_reserve,
          no_reserve,
          draw_reserve,
          constant_product,
          total_liquidity
        )
      `)
      .eq('id', id)
      .single()

    console.log('Market data:', JSON.stringify(market, null, 2))
    console.log('Market error:', marketError)

    if (marketError || !market) {
      return NextResponse.json(
        { success: false, error: 'Market not found' },
        { status: 404 }
      )
    }

    // Handle different return formats from Supabase
    let pool = null
    
    if (Array.isArray(market.liquidity_pools)) {
      pool = market.liquidity_pools[0]
    } else if (market.liquidity_pools && typeof market.liquidity_pools === 'object') {
      pool = market.liquidity_pools
    }

    console.log('Liquidity pool:', pool)

    if (!pool) {
      return NextResponse.json(
        { success: false, error: 'No liquidity pool found for this market' },
        { status: 400 }
      )
    }

    // Calculate shares based on constant product AMM
    let shares = 0
    let pricePerShare = 0
    const platformFeeRate = 0.02
    const amountAfterFee = amount * (1 - platformFeeRate)

    const yesReserve = Number(pool.yes_reserve || 0)
    const noReserve = Number(pool.no_reserve || 0)
    const drawReserve = Number(pool.draw_reserve || 0)

    console.log('Reserves:', { yesReserve, noReserve, drawReserve })

    if (outcome === 'yes') {
      if (yesReserve <= 0 || noReserve <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid liquidity reserves' },
          { status: 400 }
        )
      }
      const k = yesReserve * noReserve
      const newNoReserve = noReserve + amountAfterFee
      const newYesReserve = k / newNoReserve
      shares = yesReserve - newYesReserve
      pricePerShare = shares > 0 ? amount / shares : 0
    } else if (outcome === 'no') {
      if (yesReserve <= 0 || noReserve <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid liquidity reserves' },
          { status: 400 }
        )
      }
      const k = yesReserve * noReserve
      const newYesReserve = yesReserve + amountAfterFee
      const newNoReserve = k / newYesReserve
      shares = noReserve - newNoReserve
      pricePerShare = shares > 0 ? amount / shares : 0
    } else if (outcome === 'draw' && drawReserve > 0) {
      // For sports markets with draw
      const totalReserve = yesReserve + noReserve + drawReserve
      if (totalReserve <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid liquidity reserves' },
          { status: 400 }
        )
      }
      shares = (amountAfterFee / totalReserve) * drawReserve
      pricePerShare = shares > 0 ? amount / shares : 0
    }

    const platformFee = amount * platformFeeRate
    const totalCost = amount

    console.log('Quote calculated:', { shares, pricePerShare, platformFee, totalCost })

    return NextResponse.json({
      success: true,
      quote: {
        shares: shares,
        pricePerShare: pricePerShare,
        platformFee: platformFee,
        totalCost: totalCost,
        outcome: outcome,
        marketId: id
      }
    })
  } catch (error) {
    console.error('Trade quote error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
