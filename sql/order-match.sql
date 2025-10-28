-- ============================================================================
-- 1. CREATE ORDER BOOK TABLES
-- ============================================================================

-- Orders table for limit orders
CREATE TABLE IF NOT EXISTS market_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
    outcome TEXT NOT NULL CHECK (outcome IN ('yes', 'no', 'draw')),
    shares NUMERIC(12, 6) NOT NULL CHECK (shares > 0),
    price_per_share NUMERIC(12, 6) NOT NULL CHECK (price_per_share > 0 AND price_per_share <= 1),
    total_amount NUMERIC(12, 2) NOT NULL,
    filled_shares NUMERIC(12, 6) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'partially_filled', 'filled', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Order matches table to track which orders matched
CREATE TABLE IF NOT EXISTS order_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id),
    buy_order_id UUID NOT NULL REFERENCES market_orders(id),
    sell_order_id UUID NOT NULL REFERENCES market_orders(id),
    matched_shares NUMERIC(12, 6) NOT NULL,
    match_price NUMERIC(12, 6) NOT NULL,
    buyer_id UUID NOT NULL REFERENCES profiles(id),
    seller_id UUID NOT NULL REFERENCES profiles(id),
    outcome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_market_orders_market_status ON market_orders(market_id, status) WHERE status IN ('open', 'partially_filled');
CREATE INDEX idx_market_orders_outcome ON market_orders(market_id, outcome, order_type, status);
CREATE INDEX idx_order_matches_market ON order_matches(market_id, created_at DESC);

-- ============================================================================
-- 2. ORDER MATCHING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION match_orders(
    p_market_id UUID,
    p_outcome TEXT,
    p_new_order_id UUID DEFAULT NULL
)
RETURNS TABLE(
    matches_count INTEGER,
    total_shares_matched NUMERIC,
    message TEXT
) AS $$
DECLARE
    v_buy_order RECORD;
    v_sell_order RECORD;
    v_match_shares NUMERIC;
    v_match_price NUMERIC;
    v_matches_count INTEGER := 0;
    v_total_matched NUMERIC := 0;
BEGIN
    -- Match buy orders with sell orders
    FOR v_buy_order IN
        SELECT * FROM market_orders
        WHERE market_id = p_market_id
          AND outcome = p_outcome
          AND order_type = 'buy'
          AND status IN ('open', 'partially_filled')
          AND (shares - filled_shares) > 0
        ORDER BY price_per_share DESC, created_at ASC  -- Best price first, then FIFO
    LOOP
        FOR v_sell_order IN
            SELECT * FROM market_orders
            WHERE market_id = p_market_id
              AND outcome = p_outcome
              AND order_type = 'sell'
              AND status IN ('open', 'partially_filled')
              AND (shares - filled_shares) > 0
              AND price_per_share <= v_buy_order.price_per_share  -- Price match
            ORDER BY price_per_share ASC, created_at ASC  -- Best price first, then FIFO
        LOOP
            -- Calculate how many shares can be matched
            v_match_shares := LEAST(
                v_buy_order.shares - v_buy_order.filled_shares,
                v_sell_order.shares - v_sell_order.filled_shares
            );
            
            IF v_match_shares <= 0 THEN
                CONTINUE;
            END IF;
            
            -- Match price is the average of buy and sell prices
            v_match_price := (v_buy_order.price_per_share + v_sell_order.price_per_share) / 2;
            
            -- Create match record
            INSERT INTO order_matches (
                market_id,
                buy_order_id,
                sell_order_id,
                matched_shares,
                match_price,
                buyer_id,
                seller_id,
                outcome
            ) VALUES (
                p_market_id,
                v_buy_order.id,
                v_sell_order.id,
                v_match_shares,
                v_match_price,
                v_buy_order.user_id,
                v_sell_order.user_id,
                p_outcome
            );
            
            -- Update buy order
            UPDATE market_orders
            SET 
                filled_shares = filled_shares + v_match_shares,
                status = CASE 
                    WHEN (filled_shares + v_match_shares) >= shares THEN 'filled'
                    ELSE 'partially_filled'
                END,
                filled_at = CASE 
                    WHEN (filled_shares + v_match_shares) >= shares THEN NOW()
                    ELSE filled_at
                END,
                updated_at = NOW()
            WHERE id = v_buy_order.id;
            
            -- Update sell order
            UPDATE market_orders
            SET 
                filled_shares = filled_shares + v_match_shares,
                status = CASE 
                    WHEN (filled_shares + v_match_shares) >= shares THEN 'filled'
                    ELSE 'partially_filled'
                END,
                filled_at = CASE 
                    WHEN (filled_shares + v_match_shares) >= shares THEN NOW()
                    ELSE filled_at
                END,
                updated_at = NOW()
            WHERE id = v_sell_order.id;
            
            -- Transfer shares and funds
            -- Credit buyer with shares
            INSERT INTO market_positions (market_id, user_id, outcome, shares, average_price, total_invested)
            VALUES (
                p_market_id,
                v_buy_order.user_id,
                p_outcome,
                v_match_shares,
                v_match_price,
                v_match_shares * v_match_price
            )
            ON CONFLICT (market_id, user_id, outcome)
            DO UPDATE SET
                shares = market_positions.shares + v_match_shares,
                total_invested = market_positions.total_invested + (v_match_shares * v_match_price),
                average_price = (market_positions.total_invested + (v_match_shares * v_match_price)) / (market_positions.shares + v_match_shares),
                updated_at = NOW();
            
            -- Deduct shares from seller
            UPDATE market_positions
            SET 
                shares = shares - v_match_shares,
                total_invested = GREATEST(total_invested - (v_match_shares * average_price), 0),
                updated_at = NOW()
            WHERE market_id = p_market_id
              AND user_id = v_sell_order.user_id
              AND outcome = p_outcome;
            
            -- Delete position if no shares left
            DELETE FROM market_positions
            WHERE market_id = p_market_id
              AND user_id = v_sell_order.user_id
              AND outcome = p_outcome
              AND shares <= 0;
            
            -- Credit seller with funds
            UPDATE profiles
            SET balance = balance + (v_match_shares * v_match_price)
            WHERE id = v_sell_order.user_id;
            
            -- Deduct funds from buyer
            UPDATE profiles
            SET balance = balance - (v_match_shares * v_match_price)
            WHERE id = v_buy_order.user_id;
            
            -- Record trades
            INSERT INTO market_trades (market_id, user_id, trade_type, outcome, shares, price_per_share, total_amount, status)
            VALUES 
                (p_market_id, v_buy_order.user_id, 'buy', p_outcome, v_match_shares, v_match_price, v_match_shares * v_match_price, 'completed'),
                (p_market_id, v_sell_order.user_id, 'sell', p_outcome, v_match_shares, v_match_price, v_match_shares * v_match_price, 'completed');
            
            v_matches_count := v_matches_count + 1;
            v_total_matched := v_total_matched + v_match_shares;
            
            -- Update buy order for next iteration
            SELECT * INTO v_buy_order FROM market_orders WHERE id = v_buy_order.id;
            
            -- Exit inner loop if buy order is fully filled
            EXIT WHEN v_buy_order.filled_shares >= v_buy_order.shares;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT 
        v_matches_count,
        v_total_matched,
        'Matched ' || v_matches_count || ' orders, total shares: ' || v_total_matched;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. HYBRID EXECUTION: ORDER BOOK + AMM FALLBACK
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_trade_hybrid(
    p_market_id UUID,
    p_user_id UUID,
    p_outcome TEXT,
    p_trade_type TEXT,
    p_shares NUMERIC,
    p_max_price_per_share NUMERIC DEFAULT NULL,  -- For buys: max willing to pay
    p_min_price_per_share NUMERIC DEFAULT NULL   -- For sells: min willing to accept
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    order_id UUID,
    filled_shares NUMERIC,
    remaining_shares NUMERIC,
    avg_execution_price NUMERIC,
    used_order_book BOOLEAN,
    used_amm BOOLEAN
) AS $$
DECLARE
    v_order_id UUID;
    v_initial_balance NUMERIC;
    v_current_balance NUMERIC;
    v_shares_from_orders NUMERIC := 0;
    v_shares_from_amm NUMERIC := 0;
    v_remaining_shares NUMERIC;
    v_avg_price NUMERIC := 0;
    v_total_cost NUMERIC := 0;
    v_market_type TEXT;
    v_amm_result RECORD;
BEGIN
    -- Get user balance
    SELECT balance INTO v_initial_balance FROM profiles WHERE id = p_user_id;
    
    -- Get market type
    SELECT market_type::TEXT INTO v_market_type FROM markets WHERE id = p_market_id;
    
    -- Step 1: Create order
    INSERT INTO market_orders (
        market_id,
        user_id,
        order_type,
        outcome,
        shares,
        price_per_share,
        total_amount,
        status
    ) VALUES (
        p_market_id,
        p_user_id,
        p_trade_type,
        p_outcome,
        p_shares,
        COALESCE(
            CASE WHEN p_trade_type = 'buy' THEN p_max_price_per_share ELSE p_min_price_per_share END,
            0.5  -- Default to 50% if no price specified
        ),
        p_shares * COALESCE(
            CASE WHEN p_trade_type = 'buy' THEN p_max_price_per_share ELSE p_min_price_per_share END,
            0.5
        ),
        'open'
    )
    RETURNING id INTO v_order_id;
    
    -- Step 2: Try to match with existing orders
    PERFORM match_orders(p_market_id, p_outcome, v_order_id);
    
    -- Check how much was filled
    SELECT filled_shares INTO v_shares_from_orders
    FROM market_orders
    WHERE id = v_order_id;
    
    v_remaining_shares := p_shares - v_shares_from_orders;
    
    -- Step 3: If not fully filled, use AMM for remaining
    IF v_remaining_shares > 0.0001 THEN
        IF p_trade_type = 'buy' THEN
            -- Use AMM to buy remaining shares
            SELECT * INTO v_amm_result
            FROM execute_buy_trade_unified(
                p_market_id,
                p_user_id,
                p_outcome,
                v_remaining_shares * COALESCE(p_max_price_per_share, 0.5),
                2.0
            );
            
            IF v_amm_result.success THEN
                v_shares_from_amm := v_remaining_shares;
                
                -- Mark order as filled via AMM
                UPDATE market_orders
                SET 
                    status = 'filled',
                    filled_shares = shares,
                    filled_at = NOW(),
                    updated_at = NOW()
                WHERE id = v_order_id;
            END IF;
        ELSE
            -- Use AMM to sell remaining shares
            SELECT * INTO v_amm_result
            FROM execute_sell_trade_unified(
                p_market_id,
                p_user_id,
                p_outcome,
                v_remaining_shares,
                2.0
            );
            
            IF v_amm_result.success THEN
                v_shares_from_amm := v_remaining_shares;
                
                -- Mark order as filled via AMM
                UPDATE market_orders
                SET 
                    status = 'filled',
                    filled_shares = shares,
                    filled_at = NOW(),
                    updated_at = NOW()
                WHERE id = v_order_id;
            END IF;
        END IF;
    END IF;
    
    -- Calculate final stats
    SELECT balance INTO v_current_balance FROM profiles WHERE id = p_user_id;
    v_total_cost := ABS(v_current_balance - v_initial_balance);
    v_avg_price := CASE 
        WHEN (v_shares_from_orders + v_shares_from_amm) > 0 
        THEN v_total_cost / (v_shares_from_orders + v_shares_from_amm)
        ELSE 0
    END;
    
    RETURN QUERY SELECT
        TRUE,
        'Trade executed: ' || (v_shares_from_orders + v_shares_from_amm) || ' shares filled',
        v_order_id,
        v_shares_from_orders + v_shares_from_amm,
        p_shares - (v_shares_from_orders + v_shares_from_amm),
        v_avg_price,
        v_shares_from_orders > 0,
        v_shares_from_amm > 0;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT
            FALSE,
            'Trade failed: ' || SQLERRM,
            NULL::UUID,
            0::NUMERIC,
            p_shares,
            0::NUMERIC,
            FALSE,
            FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CLIENT-SIDE FUNCTION TO USE
-- ============================================================================

-- Simple wrapper for your existing code
CREATE OR REPLACE FUNCTION execute_trade_with_matching(
    p_market_id UUID,
    p_user_id UUID,
    p_outcome TEXT,
    p_amount NUMERIC,
    p_trade_type TEXT DEFAULT 'buy'
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trade_id UUID,
    shares_filled NUMERIC,
    avg_price NUMERIC,
    execution_method TEXT
) AS $$
DECLARE
    v_result RECORD;
    v_estimated_shares NUMERIC;
    v_current_price NUMERIC;
BEGIN
    -- Estimate shares from amount
    SELECT CASE p_outcome
        WHEN 'yes' THEN yes_price
        WHEN 'no' THEN no_price
        WHEN 'draw' THEN COALESCE(draw_price, 0.33)
    END INTO v_current_price
    FROM markets
    WHERE id = p_market_id;
    
    v_estimated_shares := p_amount / COALESCE(v_current_price, 0.5);
    
    -- Execute hybrid trade
    SELECT * INTO v_result
    FROM execute_trade_hybrid(
        p_market_id,
        p_user_id,
        p_outcome,
        p_trade_type,
        v_estimated_shares,
        CASE WHEN p_trade_type = 'buy' THEN 1.0 ELSE NULL END,  -- Max price for buy
        CASE WHEN p_trade_type = 'sell' THEN 0.0 ELSE NULL END  -- Min price for sell
    );
    
    RETURN QUERY SELECT
        v_result.success,
        v_result.message,
        v_result.order_id,
        v_result.filled_shares,
        v_result.avg_execution_price,
        CASE
            WHEN v_result.used_order_book AND v_result.used_amm THEN 'hybrid'
            WHEN v_result.used_order_book THEN 'order_book'
            WHEN v_result.used_amm THEN 'amm'
            ELSE 'unknown'
        END;
END;
$$ LANGUAGE plpgsql;