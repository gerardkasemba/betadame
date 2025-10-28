// lib/trade-execution.ts
import { createClient } from '@/lib/supabase/client'
import { calculateTradeQuote } from './amm-calculations'

export async function executeTrade(
  marketId: string,
  outcome: 'yes' | 'no' | 'draw',
  amount: number,
  tradeType: 'buy' | 'sell' = 'buy',
  outcomeId?: string | null  // 🔥 NEW: For multi-choice markets
) {
  console.log('🚀 Executing trade client-side:', { marketId, outcome, amount, tradeType, outcomeId })
  
  const supabase = createClient()

  try {
    // 1. Get current market and pool data
    console.log('📋 Step 1: Fetching market data...')
    const { data: marketData, error: marketError } = await supabase
      .from('markets')
      .select(`
        *,
        liquidity_pools (*)
      `)
      .eq('id', marketId)
      .single()

    if (marketError || !marketData || !marketData.liquidity_pools) {
      throw new Error('Market or liquidity pool not found')
    }

    // 🔥 NEW: Determine if this is a multi-choice market
    const isMultiChoice = marketData.market_type === 'multiple' && outcomeId

    // 🔥 NEW: For multi-choice, fetch the specific outcome data
    let outcomeData: any = null
    if (isMultiChoice) {
      const { data: outcome_data, error: outcomeError } = await supabase
        .from('market_outcomes')
        .select('*')
        .eq('id', outcomeId)
        .single()

      if (outcomeError || !outcome_data) {
        throw new Error('Outcome not found')
      }
      outcomeData = outcome_data
      console.log('🎯 Trading on outcome:', outcomeData.title)
    }

    const pool = Array.isArray(marketData.liquidity_pools) 
      ? marketData.liquidity_pools[0] 
      : marketData.liquidity_pools

    console.log('🎯 Market Type:', marketData.market_type)
    console.log('📊 Market Details:', {
      type: marketData.market_type,
      title: marketData.title,
      isMultiChoice: isMultiChoice,
      outcomeTitle: outcomeData?.title || 'N/A',
      yes_price: isMultiChoice ? outcomeData?.yes_price : marketData.yes_price,
      no_price: isMultiChoice ? outcomeData?.no_price : marketData.no_price,
      draw_price: marketData.draw_price,
      total_volume: marketData.total_volume
    })
    console.log('💧 Pool data:', pool)

    // Validate outcome is valid for market type
    if (marketData.market_type === 'binary' && outcome === 'draw') {
      throw new Error('Draw outcome is not available for binary markets')
    }

    if (marketData.market_type === 'sports' && !['yes', 'no', 'draw'].includes(outcome)) {
      throw new Error('Invalid outcome for sports market')
    }

    // 🔥 NEW: For multi-choice, treat as binary per outcome
    if (isMultiChoice && outcome === 'draw') {
      throw new Error('Draw outcome is not available for multi-choice markets')
    }

    // Validate liquidity pool structure
    if (marketData.market_type === 'sports' && (!pool.draw_reserve || pool.draw_reserve <= 0)) {
      throw new Error('Sports market requires draw reserve')
    }

    if (marketData.status !== 'active') {
      throw new Error(`Market is ${marketData.status}. Only active markets can be traded.`)
    }

    console.log('✅ Market type validation passed')

    // 2. Calculate the trade
    console.log('🧮 Step 2: Calculating trade quote...')
    
    // 🔥 NEW: For multi-choice, use outcome-specific reserves
    const effectivePool = isMultiChoice ? {
      yes_reserve: outcomeData.yes_reserve || 100,
      no_reserve: outcomeData.no_reserve || 100,
      draw_reserve: 0,
      constant_product: outcomeData.constant_product || 10000,
      total_liquidity: outcomeData.total_liquidity || 200
    } : pool

    const quote = calculateTradeQuote(effectivePool, outcome, amount, tradeType)
    console.log('📈 Trade quote:', quote)
    
    // ✅ Validate quote is valid
    if (!quote || quote.shares <= 0) {
      throw new Error('Unable to calculate valid trade quote')
    }

    // ✅ LIQUIDITY CHECK - Prevent reserve depletion
    if (tradeType === 'buy') {
      const shares = Number(quote.shares)
      const isSportsMarket = marketData.market_type === 'sports'
      
      // Calculate minimum safe reserve (5% of current reserve)
      const MIN_RESERVE_PERCENTAGE = 0.05
      
      let currentReserve: number
      let minReserve: number
      let availableShares: number
      let reserveName: string
      
      if (isSportsMarket) {
        if (outcome === 'yes') {
          currentReserve = effectivePool.yes_reserve
          reserveName = 'YES'
        } else if (outcome === 'no') {
          currentReserve = effectivePool.no_reserve
          reserveName = 'NO'
        } else { // draw
          currentReserve = effectivePool.draw_reserve
          reserveName = 'DRAW'
        }
      } else {
        // Binary market or multi-choice (both are binary-like)
        if (outcome === 'yes') {
          currentReserve = effectivePool.yes_reserve
          reserveName = isMultiChoice ? `YES for ${outcomeData.title}` : 'YES'
        } else { // no
          currentReserve = effectivePool.no_reserve
          reserveName = isMultiChoice ? `NO for ${outcomeData.title}` : 'NO'
        }
      }
      
      minReserve = currentReserve * MIN_RESERVE_PERCENTAGE
      availableShares = currentReserve - minReserve
      
      console.log('🔍 Liquidity check:', {
        outcome: outcome.toUpperCase(),
        requestedShares: shares.toFixed(4),
        currentReserve: currentReserve.toFixed(4),
        minReserve: minReserve.toFixed(4),
        availableShares: availableShares.toFixed(4),
        willDeplete: shares > availableShares
      })
      
      if (shares > availableShares) {
        const maxAmount = (availableShares / shares) * amount
        throw new Error(
          `Insufficient liquidity in ${reserveName} pool. ` +
          `Requested ${shares.toFixed(2)} shares, but only ${availableShares.toFixed(2)} available. ` +
          `Try reducing your bet to $${maxAmount.toFixed(2)} or less.`
        )
      }
      
      console.log('✅ Liquidity check passed')
    }
    
    // 3. Get user and validate
    console.log('👤 Step 3: Validating user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('User profile not found')
    }

    // Validate amount limits
    if (amount < marketData.min_bet_amount) {
      throw new Error(`Minimum bet amount is $${marketData.min_bet_amount}`)
    }

    if (amount > marketData.max_bet_amount) {
      throw new Error(`Maximum bet amount is $${marketData.max_bet_amount}`)
    }

    // Validate balance for BUY or shares for SELL
    if (tradeType === 'buy') {
      if (profile.balance < quote.totalCost) {
        throw new Error(`Insufficient balance. Available: $${profile.balance.toFixed(2)}, Required: $${quote.totalCost.toFixed(2)}`)
      }
    } else {
      // For selling, check if user has enough shares
      // 🔥 UPDATED: For multi-choice, check by outcome_id
      const query = supabase
        .from('market_trades')
        .select('*')
        .eq('market_id', marketId)
        .eq('user_id', user.id)
        .eq('outcome', outcome)

      if (isMultiChoice && outcomeId) {
        query.eq('outcome_id', outcomeId)
      }

      const { data: trades } = await query

      let totalShares = 0
      trades?.forEach((trade) => {
        if (trade.trade_type === 'buy') {
          totalShares += Number(trade.shares)
        } else if (trade.trade_type === 'sell') {
          totalShares -= Number(trade.shares)
        }
      })

      if (totalShares < Number(quote.shares)) {
        throw new Error(`Insufficient shares. Available: ${totalShares.toFixed(4)}, Required: ${quote.shares}`)
      }
    }

    console.log('✅ User validation passed')

    // 4. Calculate new reserves based on market type
    console.log('💰 Step 4: Calculating new reserves...')
    let newYesReserve: number
    let newNoReserve: number 
    let newDrawReserve: number
    let newConstantProduct: number

    const shares = Number(quote.shares)
    const isSportsMarket = marketData.market_type === 'sports'
    const investAmount = amount * (isSportsMarket ? 1.00 : 1.00)

    if (tradeType === 'buy') {
      // BUYING: Money goes into pool, shares come out
      if (isSportsMarket) {
        // Sports market (3 outcomes)
        if (outcome === 'yes') {
          newYesReserve = effectivePool.yes_reserve - shares
          const splitAmount = investAmount / 2
          newNoReserve = effectivePool.no_reserve + splitAmount
          newDrawReserve = effectivePool.draw_reserve + splitAmount
        } else if (outcome === 'no') {
          newNoReserve = effectivePool.no_reserve - shares
          const splitAmount = investAmount / 2
          newYesReserve = effectivePool.yes_reserve + splitAmount
          newDrawReserve = effectivePool.draw_reserve + splitAmount
        } else { // draw
          newDrawReserve = effectivePool.draw_reserve - shares
          const splitAmount = investAmount / 2
          newYesReserve = effectivePool.yes_reserve + splitAmount
          newNoReserve = effectivePool.no_reserve + splitAmount
        }
      } else {
        // Binary market or multi-choice (both are binary-like - 2 outcomes)
        newDrawReserve = 0
        if (outcome === 'yes') {
          newYesReserve = effectivePool.yes_reserve - shares
          newNoReserve = effectivePool.no_reserve + investAmount
        } else { // no
          newNoReserve = effectivePool.no_reserve - shares
          newYesReserve = effectivePool.yes_reserve + investAmount
        }
      }
    } else {
      // SELLING: Shares go back into pool, money comes out
      if (isSportsMarket) {
        // Sports market (3 outcomes)
        if (outcome === 'yes') {
          newYesReserve = effectivePool.yes_reserve + shares
          const splitAmount = investAmount / 2
          newNoReserve = Math.max(effectivePool.no_reserve - splitAmount, 0.01)
          newDrawReserve = Math.max(effectivePool.draw_reserve - splitAmount, 0.01)
        } else if (outcome === 'no') {
          newNoReserve = effectivePool.no_reserve + shares
          const splitAmount = investAmount / 2
          newYesReserve = Math.max(effectivePool.yes_reserve - splitAmount, 0.01)
          newDrawReserve = Math.max(effectivePool.draw_reserve - splitAmount, 0.01)
        } else { // draw
          newDrawReserve = effectivePool.draw_reserve + shares
          const splitAmount = investAmount / 2
          newYesReserve = Math.max(effectivePool.yes_reserve - splitAmount, 0.01)
          newNoReserve = Math.max(effectivePool.no_reserve - splitAmount, 0.01)
        }
      } else {
        // Binary market or multi-choice
        newDrawReserve = 0
        if (outcome === 'yes') {
          newYesReserve = effectivePool.yes_reserve + shares
          newNoReserve = Math.max(effectivePool.no_reserve - investAmount, 0.01)
        } else { // no
          newNoReserve = effectivePool.no_reserve + shares
          newYesReserve = Math.max(effectivePool.yes_reserve - investAmount, 0.01)
        }
      }
    }

    // Calculate new constant product
    if (isSportsMarket) {
      newConstantProduct = newYesReserve * newNoReserve * newDrawReserve
    } else {
      newConstantProduct = newYesReserve * newNoReserve
    }

    console.log('📊 New reserves:', {
      yes: newYesReserve.toFixed(4),
      no: newNoReserve.toFixed(4),
      draw: isSportsMarket ? newDrawReserve.toFixed(4) : 'N/A',
      constantProduct: newConstantProduct.toFixed(4)
    })

    // 5. Update user balance
    console.log('💰 Step 5: Updating user balance...')
    const oldBalance = profile.balance
    const newBalance = tradeType === 'buy'
      ? oldBalance - quote.totalCost
      : oldBalance + quote.totalCost

    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id)

    if (balanceError) {
      throw new Error(`Balance update failed: ${balanceError.message}`)
    }

    console.log('💵 Balance updated:', {
      old: oldBalance.toFixed(2),
      new: newBalance.toFixed(2),
      change: (newBalance - oldBalance).toFixed(2)
    })

    // 6. Create transaction record
    console.log('📝 Step 6: Creating transaction...')
    const transactionType = tradeType === 'buy' ? 'bet_placed' : 'bet_sold'
    
    // 🔥 UPDATED: Include outcome title for multi-choice
    const outcomeLabel = isMultiChoice
      ? `${outcome.toUpperCase()} on ${outcomeData.title}`
      : isSportsMarket 
      ? (outcome === 'yes' ? (marketData.team_a_name || 'YES') : 
         outcome === 'no' ? (marketData.team_b_name || 'NO') : 'DRAW')
      : outcome.toUpperCase()
      
    const transactionDescription = tradeType === 'buy'
      ? `Bought ${shares.toFixed(4)} ${outcomeLabel} shares - ${marketData.title}`
      : `Sold ${shares.toFixed(4)} ${outcomeLabel} shares - ${marketData.title}`

    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: transactionType,
        amount: amount,
        status: 'completed',
        description: transactionDescription,
        currency_code: 'USD',
        metadata: {
          market_id: marketId,
          market_title: marketData.title,
          market_type: marketData.market_type,
          outcome: outcome,
          outcome_id: outcomeId || null,  // 🔥 NEW
          outcome_label: outcomeLabel,
          outcome_title: outcomeData?.title || null,  // 🔥 NEW
          shares: shares,
          trade_type: tradeType,
          price_per_share: quote.pricePerShare,
          platform_fee: quote.platformFee,
          old_balance: oldBalance,
          new_balance: newBalance
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (transactionError) {
      console.error('⚠️ Transaction record error:', transactionError)
    } else {
      console.log('✅ Transaction recorded:', transaction?.id)
    }

    // 7. Update liquidity pool
    console.log('🏊 Step 7: Updating liquidity pool...')
    
    // 🔥 UPDATED: For multi-choice, update market_outcomes table instead
    if (isMultiChoice && outcomeId) {
      const { error: outcomeUpdateError } = await supabase
        .from('market_outcomes')
        .update({
          yes_reserve: newYesReserve,
          no_reserve: newNoReserve,
          constant_product: newConstantProduct,
          total_liquidity: tradeType === 'buy' 
            ? (outcomeData.total_liquidity || 0) + amount 
            : Math.max((outcomeData.total_liquidity || 0) - amount, 0),
          total_volume: tradeType === 'buy'
            ? (outcomeData.total_volume || 0) + amount
            : Math.max((outcomeData.total_volume || 0) - amount, 0),
          total_yes_shares: outcome === 'yes'
            ? (tradeType === 'buy'
                ? (outcomeData.total_yes_shares || 0) + shares
                : Math.max((outcomeData.total_yes_shares || 0) - shares, 0))
            : outcomeData.total_yes_shares,
          total_no_shares: outcome === 'no'
            ? (tradeType === 'buy'
                ? (outcomeData.total_no_shares || 0) + shares
                : Math.max((outcomeData.total_no_shares || 0) - shares, 0))
            : outcomeData.total_no_shares,
          yes_price: newYesReserve / (newYesReserve + newNoReserve),
          no_price: newNoReserve / (newYesReserve + newNoReserve),
          updated_at: new Date().toISOString()
        })
        .eq('id', outcomeId)

      if (outcomeUpdateError) {
        throw new Error(`Outcome update failed: ${outcomeUpdateError.message}`)
      }
    } else {
      // Regular binary/sports market - update liquidity_pools
      const { error: poolError } = await supabase
        .from('liquidity_pools')
        .update({
          yes_reserve: newYesReserve,
          no_reserve: newNoReserve,
          draw_reserve: isSportsMarket ? newDrawReserve : 0,
          constant_product: newConstantProduct,
          total_liquidity: tradeType === 'buy' 
            ? pool.total_liquidity + amount 
            : Math.max(pool.total_liquidity - amount, 0),
          updated_at: new Date().toISOString()
        })
        .eq('market_id', marketId)

      if (poolError) {
        throw new Error(`Pool update failed: ${poolError.message}`)
      }
    }

    // 8. Update market prices and volume
    console.log('📊 Step 8: Updating market prices...')
    let newYesPrice: number
    let newNoPrice: number
    let newDrawPrice: number | null

    if (isSportsMarket) {
      // Sports market: 3-way pricing
      const totalReserves = newYesReserve + newNoReserve + newDrawReserve
      newYesPrice = (newNoReserve + newDrawReserve) / totalReserves
      newNoPrice = (newYesReserve + newDrawReserve) / totalReserves
      newDrawPrice = (newYesReserve + newNoReserve) / totalReserves
    } else if (isMultiChoice) {
      // Multi-choice: prices already updated in market_outcomes
      newYesPrice = newYesReserve / (newYesReserve + newNoReserve)
      newNoPrice = newNoReserve / (newYesReserve + newNoReserve)
      newDrawPrice = null
    } else {
      // Binary market: 2-way pricing
      const totalReserves = newYesReserve + newNoReserve
      newYesPrice = newNoReserve / totalReserves
      newNoPrice = newYesReserve / totalReserves
      newDrawPrice = null
    }

    // 🔥 UPDATED: Don't update market-level prices for multi-choice
    if (!isMultiChoice) {
      const { error: marketUpdateError } = await supabase
        .from('markets')
        .update({
          yes_price: newYesPrice,
          no_price: newNoPrice,
          draw_price: newDrawPrice,
          total_volume: tradeType === 'buy'
            ? (marketData.total_volume || 0) + amount
            : Math.max((marketData.total_volume || 0) - amount, 0),
          total_yes_shares: outcome === 'yes' 
            ? (tradeType === 'buy' 
                ? (marketData.total_yes_shares || 0) + shares 
                : Math.max((marketData.total_yes_shares || 0) - shares, 0))
            : marketData.total_yes_shares,
          total_no_shares: outcome === 'no'
            ? (tradeType === 'buy'
                ? (marketData.total_no_shares || 0) + shares
                : Math.max((marketData.total_no_shares || 0) - shares, 0))
            : marketData.total_no_shares,
          updated_at: new Date().toISOString()
        })
        .eq('id', marketId)

      if (marketUpdateError) {
        throw new Error(`Market update failed: ${marketUpdateError.message}`)
      }
    } else {
      // For multi-choice, just update total volume
      const { error: marketUpdateError } = await supabase
        .from('markets')
        .update({
          total_volume: tradeType === 'buy'
            ? (marketData.total_volume || 0) + amount
            : Math.max((marketData.total_volume || 0) - amount, 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', marketId)

      if (marketUpdateError) {
        throw new Error(`Market update failed: ${marketUpdateError.message}`)
      }
    }

    console.log('📈 New prices:', {
      yes: newYesPrice.toFixed(4),
      no: newNoPrice.toFixed(4),
      draw: newDrawPrice?.toFixed(4) || 'N/A'
    })

    // 9. Record the trade in market_trades
    console.log('📝 Step 9: Recording market trade...')
    const { data: trade, error: tradeError } = await supabase
      .from('market_trades')
      .insert({
        market_id: marketId,
        user_id: user.id,
        trade_type: tradeType,
        outcome,
        outcome_id: outcomeId || null,  // 🔥 NEW: Store outcome_id for multi-choice
        shares: shares,
        price_per_share: quote.pricePerShare,
        total_amount: amount,
        platform_fee: quote.platformFee,
        status: 'completed'
      })
      .select()
      .single()

    if (tradeError) {
      throw new Error(`Trade record failed: ${tradeError.message}`)
    }

    console.log('✅ Market trade recorded:', trade.id)

    // 10. Update or create position
    console.log('📈 Step 10: Updating position...')
    
    // 🔥 UPDATED: For multi-choice, query by outcome_id
    const positionQuery = supabase
      .from('market_positions')
      .select('*')
      .eq('market_id', marketId)
      .eq('user_id', user.id)
      .eq('outcome', outcome)

    if (isMultiChoice && outcomeId) {
      positionQuery.eq('outcome_id', outcomeId)
    }

    const { data: existingPosition } = await positionQuery.single()

    if (existingPosition) {
      const newShares = tradeType === 'buy'
        ? (existingPosition.shares || 0) + shares
        : (existingPosition.shares || 0) - shares

      const newTotalInvested = tradeType === 'buy'
        ? (existingPosition.total_invested || 0) + amount
        : Math.max((existingPosition.total_invested || 0) - amount, 0)

      if (newShares > 0.0001) {
        // Update position
        const newAveragePrice = newTotalInvested / newShares
        
        await supabase
          .from('market_positions')
          .update({
            shares: newShares,
            total_invested: newTotalInvested,
            average_price: newAveragePrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPosition.id)
      } else {
        // Delete position if shares become 0
        await supabase
          .from('market_positions')
          .delete()
          .eq('id', existingPosition.id)
        
        console.log('🗑️ Position closed (0 shares)')
      }
    } else if (tradeType === 'buy') {
      // Create new position only for buys
      await supabase
        .from('market_positions')
        .insert({
          market_id: marketId,
          user_id: user.id,
          outcome,
          outcome_id: outcomeId || null,  // 🔥 NEW
          shares: shares,
          average_price: quote.pricePerShare,
          total_invested: amount
        })
    }

    console.log('✅ Trade executed successfully!')
    console.log(`🎯 Market: ${marketData.market_type}${isMultiChoice ? ` (${outcomeData.title})` : ''}`)
    console.log(`💵 ${tradeType === 'buy' ? 'Spent' : 'Received'}: $${amount.toFixed(2)}`)
    console.log(`📊 Shares: ${shares.toFixed(4)} ${outcomeLabel}`)
    console.log(`💰 New Balance: $${newBalance.toFixed(2)}`)
    
    return {
      success: true,
      trade: {
        id: trade.id,
        transactionId: transaction?.id,
        marketType: marketData.market_type,
        shares: shares,
        pricePerShare: quote.pricePerShare,
        totalAmount: amount,
        platformFee: quote.platformFee,
        outcome,
        outcomeLabel,
        tradeType,
        oldBalance: oldBalance,
        newBalance: newBalance,
        newPrices: {
          yes: newYesPrice,
          no: newNoPrice,
          draw: newDrawPrice
        }
      }
    }

  } catch (error) {
    console.error('❌ Trade execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown trade execution error'
    }
  }
}