-- ============================================================================
-- POLYMARKET-STYLE AMM WITH DRAW SUPPORT (3-OUTCOME MARKETS)
-- For sports betting: Win / Draw / Lose
-- ============================================================================

-- ============================================================================
-- 1. UPDATE LIQUIDITY POOLS TABLE TO SUPPORT DRAW
-- ============================================================================

-- Add draw_reserve column to existing liquidity_pools table
DO $$ 
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'liquidity_pools' 
        AND column_name = 'draw_reserve'
    ) THEN
        ALTER TABLE liquidity_pools 
        ADD COLUMN draw_reserve NUMERIC(12, 6) DEFAULT 0;
    END IF;
    
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'positive_draw_reserve'
        AND table_name = 'liquidity_pools'
    ) THEN
        ALTER TABLE liquidity_pools
        ADD CONSTRAINT positive_draw_reserve CHECK (draw_reserve >= 0);
    END IF;
END $$;

-- ============================================================================
-- 2. CORE AMM CALCULATION FOR 3-OUTCOME MARKETS
-- ============================================================================

-- For 3-outcome markets, we use a different formula:
-- Instead of x*y = k, we use: x * y * z = k (constant product of 3 reserves)

CREATE OR REPLACE FUNCTION calculate_3outcome_price_impact(
    p_yes_reserve NUMERIC,
    p_no_reserve NUMERIC,
    p_draw_reserve NUMERIC,
    p_shares_to_buy NUMERIC,
    p_outcome TEXT -- 'yes', 'no', or 'draw'
)
RETURNS TABLE(
    new_yes_reserve NUMERIC,
    new_no_reserve NUMERIC,
    new_draw_reserve NUMERIC,
    new_yes_price NUMERIC,
    new_no_price NUMERIC,
    new_draw_price NUMERIC,
    average_price NUMERIC,
    total_cost NUMERIC,
    price_impact NUMERIC
) AS $$
DECLARE
    v_constant_product NUMERIC;
    v_new_yes_reserve NUMERIC;
    v_new_no_reserve NUMERIC;
    v_new_draw_reserve NUMERIC;
    v_total_reserves NUMERIC;
    v_new_total_reserves NUMERIC;
    v_total_cost NUMERIC;
    v_average_price NUMERIC;
    v_old_price NUMERIC;
    v_new_yes_price NUMERIC;
    v_new_no_price NUMERIC;
    v_new_draw_price NUMERIC;
    v_price_impact NUMERIC;
BEGIN
    -- Calculate constant product k = x * y * z
    v_constant_product := p_yes_reserve * p_no_reserve * p_draw_reserve;
    v_total_reserves := p_yes_reserve + p_no_reserve + p_draw_reserve;
    
    -- Calculate old price (for price impact)
    CASE p_outcome
        WHEN 'yes' THEN
            v_old_price := (p_no_reserve + p_draw_reserve) / v_total_reserves;
        WHEN 'no' THEN
            v_old_price := (p_yes_reserve + p_draw_reserve) / v_total_reserves;
        WHEN 'draw' THEN
            v_old_price := (p_yes_reserve + p_no_reserve) / v_total_reserves;
    END CASE;
    
    -- Calculate new reserves based on which outcome is being bought
    IF p_outcome = 'yes' THEN
        -- Buying YES: remove from yes_reserve
        v_new_yes_reserve := p_yes_reserve - p_shares_to_buy;
        
        -- Maintain constant product: k = new_yes * new_no * new_draw
        -- We increase the other two reserves proportionally
        -- Cost = increase in (no_reserve + draw_reserve)
        
        -- For simplicity in 3-outcome: we increase both other reserves equally
        -- new_no * new_draw = k / new_yes
        -- Assuming new_no = new_draw (equal split), then:
        -- new_no^2 = k / new_yes, so new_no = sqrt(k / new_yes)
        
        -- But better approach: maintain ratio of no:draw
        DECLARE
            v_other_product NUMERIC;
            v_no_ratio NUMERIC;
            v_draw_ratio NUMERIC;
            v_scale_factor NUMERIC;
        BEGIN
            v_other_product := v_constant_product / v_new_yes_reserve;
            v_no_ratio := p_no_reserve / (p_no_reserve + p_draw_reserve);
            v_draw_ratio := p_draw_reserve / (p_no_reserve + p_draw_reserve);
            
            -- Scale factor to maintain product
            v_scale_factor := SQRT(v_other_product / (p_no_reserve * p_draw_reserve));
            
            v_new_no_reserve := p_no_reserve * v_scale_factor;
            v_new_draw_reserve := p_draw_reserve * v_scale_factor;
            
            v_total_cost := (v_new_no_reserve - p_no_reserve) + (v_new_draw_reserve - p_draw_reserve);
        END;
        
    ELSIF p_outcome = 'no' THEN
        v_new_no_reserve := p_no_reserve - p_shares_to_buy;
        
        DECLARE
            v_other_product NUMERIC;
            v_scale_factor NUMERIC;
        BEGIN
            v_other_product := v_constant_product / v_new_no_reserve;
            v_scale_factor := SQRT(v_other_product / (p_yes_reserve * p_draw_reserve));
            
            v_new_yes_reserve := p_yes_reserve * v_scale_factor;
            v_new_draw_reserve := p_draw_reserve * v_scale_factor;
            
            v_total_cost := (v_new_yes_reserve - p_yes_reserve) + (v_new_draw_reserve - p_draw_reserve);
        END;
        
    ELSE -- 'draw'
        v_new_draw_reserve := p_draw_reserve - p_shares_to_buy;
        
        DECLARE
            v_other_product NUMERIC;
            v_scale_factor NUMERIC;
        BEGIN
            v_other_product := v_constant_product / v_new_draw_reserve;
            v_scale_factor := SQRT(v_other_product / (p_yes_reserve * p_no_reserve));
            
            v_new_yes_reserve := p_yes_reserve * v_scale_factor;
            v_new_no_reserve := p_no_reserve * v_scale_factor;
            
            v_total_cost := (v_new_yes_reserve - p_yes_reserve) + (v_new_no_reserve - p_no_reserve);
        END;
    END IF;
    
    -- Calculate average price
    v_average_price := v_total_cost / p_shares_to_buy;
    
    -- Calculate new prices (each outcome's price = sum of other reserves / total)
    v_new_total_reserves := v_new_yes_reserve + v_new_no_reserve + v_new_draw_reserve;
    v_new_yes_price := (v_new_no_reserve + v_new_draw_reserve) / v_new_total_reserves;
    v_new_no_price := (v_new_yes_reserve + v_new_draw_reserve) / v_new_total_reserves;
    v_new_draw_price := (v_new_yes_reserve + v_new_no_reserve) / v_new_total_reserves;
    
    -- Calculate price impact
    v_price_impact := ABS((v_average_price - v_old_price) / v_old_price * 100);
    
    RETURN QUERY SELECT 
        ROUND(v_new_yes_reserve, 6)::NUMERIC,
        ROUND(v_new_no_reserve, 6)::NUMERIC,
        ROUND(v_new_draw_reserve, 6)::NUMERIC,
        ROUND(v_new_yes_price, 4)::NUMERIC,
        ROUND(v_new_no_price, 4)::NUMERIC,
        ROUND(v_new_draw_price, 4)::NUMERIC,
        ROUND(v_average_price, 4)::NUMERIC,
        ROUND(v_total_cost, 2)::NUMERIC,
        ROUND(v_price_impact, 2)::NUMERIC;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. CALCULATE SHARES FROM AMOUNT (3-OUTCOME)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_3outcome_shares_from_amount(
    p_yes_reserve NUMERIC,
    p_no_reserve NUMERIC,
    p_draw_reserve NUMERIC,
    p_amount NUMERIC,
    p_outcome TEXT
)
RETURNS TABLE(
    shares_received NUMERIC,
    average_price NUMERIC,
    new_yes_price NUMERIC,
    new_no_price NUMERIC,
    new_draw_price NUMERIC,
    price_impact NUMERIC
) AS $$
DECLARE
    v_constant_product NUMERIC;
    v_shares NUMERIC;
    v_iteration INTEGER := 0;
    v_max_iterations INTEGER := 20;
    v_shares_low NUMERIC := 0;
    v_shares_high NUMERIC := p_amount * 2; -- Upper bound estimate
    v_shares_mid NUMERIC;
    v_cost NUMERIC;
    v_tolerance NUMERIC := 0.01;
BEGIN
    v_constant_product := p_yes_reserve * p_no_reserve * p_draw_reserve;
    
    -- Use binary search to find the right number of shares
    -- that costs approximately p_amount
    WHILE v_iteration < v_max_iterations LOOP
        v_shares_mid := (v_shares_low + v_shares_high) / 2;
        
        -- Calculate cost for this number of shares
        SELECT calc.total_cost INTO v_cost
        FROM calculate_3outcome_price_impact(
            p_yes_reserve,
            p_no_reserve,
            p_draw_reserve,
            v_shares_mid,
            p_outcome
        ) calc;
        
        -- Check if we're close enough
        IF ABS(v_cost - p_amount) < v_tolerance THEN
            v_shares := v_shares_mid;
            EXIT;
        END IF;
        
        -- Adjust search range
        IF v_cost < p_amount THEN
            v_shares_low := v_shares_mid;
        ELSE
            v_shares_high := v_shares_mid;
        END IF;
        
        v_iteration := v_iteration + 1;
    END LOOP;
    
    -- If we didn't converge, use the last mid value
    IF v_shares IS NULL THEN
        v_shares := v_shares_mid;
    END IF;
    
    -- Return final calculation
    RETURN QUERY 
    SELECT 
        ROUND(v_shares, 6)::NUMERIC,
        calc.average_price,
        calc.new_yes_price,
        calc.new_no_price,
        calc.new_draw_price,
        calc.price_impact
    FROM calculate_3outcome_price_impact(
        p_yes_reserve,
        p_no_reserve,
        p_draw_reserve,
        v_shares,
        p_outcome
    ) calc;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 4. DETECT MARKET TYPE (BINARY vs 3-OUTCOME)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_market_type(p_market_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_draw_reserve NUMERIC;
BEGIN
    SELECT draw_reserve INTO v_draw_reserve
    FROM liquidity_pools
    WHERE market_id = p_market_id;
    
    IF v_draw_reserve IS NULL OR v_draw_reserve = 0 THEN
        RETURN 'binary';
    ELSE
        RETURN '3outcome';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. UNIFIED EXECUTE BUY TRADE (SUPPORTS BOTH BINARY AND 3-OUTCOME)
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_buy_trade_unified(
    p_market_id UUID,
    p_user_id UUID,
    p_outcome TEXT, -- 'yes', 'no', or 'draw'
    p_amount NUMERIC,
    p_platform_fee_percent NUMERIC DEFAULT 2.0
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trade_id UUID,
    shares_received NUMERIC,
    average_price NUMERIC,
    total_cost NUMERIC,
    platform_fee NUMERIC,
    new_yes_price NUMERIC,
    new_no_price NUMERIC,
    new_draw_price NUMERIC
) AS $$
DECLARE
    v_lp RECORD;
    v_user_balance NUMERIC;
    v_market_type TEXT;
    v_shares NUMERIC;
    v_avg_price NUMERIC;
    v_new_yes_reserve NUMERIC;
    v_new_no_reserve NUMERIC;
    v_new_draw_reserve NUMERIC;
    v_new_yes_price NUMERIC;
    v_new_no_price NUMERIC;
    v_new_draw_price NUMERIC;
    v_platform_fee NUMERIC;
    v_total_cost NUMERIC;
    v_trade_id UUID;
    v_position_id UUID;
    v_min_bet NUMERIC;
    v_max_bet NUMERIC;
    v_price_impact NUMERIC;
BEGIN
    -- Validate outcome
    IF p_outcome NOT IN ('yes', 'no', 'draw') THEN
        RETURN QUERY SELECT FALSE, 'Invalid outcome. Must be yes, no, or draw', 
            NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Get liquidity pool
    SELECT * INTO v_lp
    FROM liquidity_pools
    WHERE market_id = p_market_id;
    
    IF v_lp IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Market not found', 
            NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Determine market type
    v_market_type := get_market_type(p_market_id);
    
    -- For binary markets, reject draw bets
    IF v_market_type = 'binary' AND p_outcome = 'draw' THEN
        RETURN QUERY SELECT FALSE, 'This market does not support draw outcome', 
            NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Get user balance
    SELECT balance INTO v_user_balance FROM profiles WHERE id = p_user_id;
    
    -- Get bet limits
    SELECT min_bet_amount, max_bet_amount INTO v_min_bet, v_max_bet
    FROM markets WHERE id = p_market_id;
    
    -- Validate amount
    IF p_amount < v_min_bet THEN
        RETURN QUERY SELECT FALSE, 'Bet amount below minimum', 
            NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    IF p_amount > v_max_bet THEN
        RETURN QUERY SELECT FALSE, 'Bet amount exceeds maximum', 
            NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Calculate platform fee
    v_platform_fee := ROUND(p_amount * (p_platform_fee_percent / 100), 2);
    v_total_cost := p_amount + v_platform_fee;
    
    -- Check balance
    IF v_user_balance < v_total_cost THEN
        RETURN QUERY SELECT FALSE, 'Insufficient balance', 
            NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Calculate shares based on market type
    IF v_market_type = '3outcome' THEN
        -- Use 3-outcome formula
        SELECT 
            calc.shares_received,
            calc.average_price,
            calc.new_yes_price,
            calc.new_no_price,
            calc.new_draw_price,
            calc.price_impact
        INTO v_shares, v_avg_price, v_new_yes_price, v_new_no_price, v_new_draw_price, v_price_impact
        FROM calculate_3outcome_shares_from_amount(
            v_lp.yes_reserve,
            v_lp.no_reserve,
            v_lp.draw_reserve,
            p_amount,
            p_outcome
        ) calc;
        
        -- Calculate new reserves
        SELECT 
            calc.new_yes_reserve,
            calc.new_no_reserve,
            calc.new_draw_reserve
        INTO v_new_yes_reserve, v_new_no_reserve, v_new_draw_reserve
        FROM calculate_3outcome_price_impact(
            v_lp.yes_reserve,
            v_lp.no_reserve,
            v_lp.draw_reserve,
            v_shares,
            p_outcome
        ) calc;
        
    ELSE
        -- Use binary formula (existing logic from previous file)
        SELECT 
            calc.shares_received,
            calc.average_price,
            calc.new_yes_price,
            calc.new_no_price,
            calc.price_impact
        INTO v_shares, v_avg_price, v_new_yes_price, v_new_no_price, v_price_impact
        FROM calculate_shares_from_amount(
            v_lp.yes_reserve,
            v_lp.no_reserve,
            p_amount,
            p_outcome
        ) calc;
        
        -- Calculate new reserves for binary
        IF p_outcome = 'yes' THEN
            v_new_yes_reserve := v_lp.yes_reserve - v_shares;
            v_new_no_reserve := v_lp.no_reserve + p_amount;
        ELSE
            v_new_yes_reserve := v_lp.yes_reserve + p_amount;
            v_new_no_reserve := v_lp.no_reserve - v_shares;
        END IF;
        
        v_new_draw_reserve := 0; -- No draw in binary
        v_new_draw_price := 0;
    END IF;
    
    -- Check slippage
    IF v_price_impact > 10.0 THEN
        RETURN QUERY SELECT FALSE, 
            FORMAT('Price impact too high: %s%%', v_price_impact), 
            NULL::UUID, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Deduct from user balance
    UPDATE profiles
    SET balance = balance - v_total_cost, updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Update liquidity pool
    UPDATE liquidity_pools
    SET yes_reserve = v_new_yes_reserve,
        no_reserve = v_new_no_reserve,
        draw_reserve = v_new_draw_reserve,
        constant_product = v_new_yes_reserve * v_new_no_reserve * 
                          CASE WHEN v_new_draw_reserve > 0 THEN v_new_draw_reserve ELSE 1 END,
        total_liquidity = total_liquidity + p_amount,
        updated_at = NOW()
    WHERE market_id = p_market_id;
    
    -- Update market
    UPDATE markets
    SET yes_price = v_new_yes_price,
        no_price = v_new_no_price,
        total_volume = total_volume + p_amount,
        total_yes_shares = CASE WHEN p_outcome = 'yes' THEN total_yes_shares + v_shares ELSE total_yes_shares END,
        total_no_shares = CASE WHEN p_outcome = 'no' THEN total_no_shares + v_shares ELSE total_no_shares END
    WHERE id = p_market_id;
    
    -- Update or create position
    INSERT INTO market_positions (
        market_id, user_id, outcome, shares, average_price, total_invested
    )
    VALUES (p_market_id, p_user_id, p_outcome, v_shares, v_avg_price, p_amount)
    ON CONFLICT (market_id, user_id, outcome)
    DO UPDATE SET
        shares = market_positions.shares + v_shares,
        average_price = (market_positions.total_invested + p_amount) / 
                       (market_positions.shares + v_shares),
        total_invested = market_positions.total_invested + p_amount,
        updated_at = NOW()
    RETURNING id INTO v_position_id;
    
    -- Record trade
    INSERT INTO market_trades (
        market_id, user_id, trade_type, outcome, shares, 
        price_per_share, total_amount, platform_fee, position_id, status
    )
    VALUES (
        p_market_id, p_user_id, 'buy', p_outcome, v_shares,
        v_avg_price, p_amount, v_platform_fee, v_position_id, 'completed'
    )
    RETURNING id INTO v_trade_id;
    
    -- Update unique traders
    UPDATE markets
    SET unique_traders = (
        SELECT COUNT(DISTINCT user_id)
        FROM market_trades
        WHERE market_id = p_market_id
    )
    WHERE id = p_market_id;
    
    RETURN QUERY SELECT 
        TRUE,
        'Trade executed successfully'::TEXT,
        v_trade_id,
        v_shares,
        v_avg_price,
        v_total_cost,
        v_platform_fee,
        v_new_yes_price,
        v_new_no_price,
        COALESCE(v_new_draw_price, 0::NUMERIC);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. INITIALIZE LIQUIDITY POOL (UPDATED FOR DRAW SUPPORT)
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_liquidity_pool_with_draw()
RETURNS TRIGGER AS $$
DECLARE
    v_initial_liquidity NUMERIC;
    v_initial_reserve NUMERIC;
    v_has_draw BOOLEAN;
BEGIN
    v_initial_liquidity := COALESCE(NEW.initial_liquidity, 100.00);
    
    -- Check if market supports draw
    -- You can determine this by checking match_type or a dedicated field
    v_has_draw := (NEW.match_type = 'match_winner' OR NEW.sport_type IN ('football', 'soccer'));
    
    IF v_has_draw THEN
        -- Split liquidity into 3 equal parts
        v_initial_reserve := v_initial_liquidity / 3;
        
        INSERT INTO liquidity_pools (
            market_id,
            yes_reserve,
            no_reserve,
            draw_reserve,
            constant_product,
            total_liquidity
        )
        VALUES (
            NEW.id,
            v_initial_reserve,
            v_initial_reserve,
            v_initial_reserve,
            v_initial_reserve * v_initial_reserve * v_initial_reserve,
            v_initial_liquidity
        );
    ELSE
        -- Binary market (no draw)
        v_initial_reserve := v_initial_liquidity / 2;
        
        INSERT INTO liquidity_pools (
            market_id,
            yes_reserve,
            no_reserve,
            draw_reserve,
            constant_product,
            total_liquidity
        )
        VALUES (
            NEW.id,
            v_initial_reserve,
            v_initial_reserve,
            0, -- No draw
            v_initial_reserve * v_initial_reserve,
            v_initial_liquidity
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to use new function
DROP TRIGGER IF EXISTS trigger_initialize_liquidity_pool ON markets;
CREATE TRIGGER trigger_initialize_liquidity_pool
AFTER INSERT ON markets
FOR EACH ROW
EXECUTE FUNCTION initialize_liquidity_pool_with_draw();

-- ============================================================================
-- 7. RESOLVE MARKET WITH DRAW SUPPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_market_with_draw(
    p_market_id UUID,
    p_winning_outcome TEXT, -- 'yes', 'no', or 'draw'
    p_resolved_by UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    winners_count INTEGER,
    total_payout NUMERIC
) AS $$
DECLARE
    v_total_payout NUMERIC := 0;
    v_winners_count INTEGER := 0;
    v_position RECORD;
BEGIN
    -- Validate outcome
    IF p_winning_outcome NOT IN ('yes', 'no', 'draw') THEN
        RETURN QUERY SELECT FALSE, 'Invalid outcome', 0, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Update market
    UPDATE markets
    SET status = 'resolved',
        winning_outcome = p_winning_outcome::outcome_type,
        resolution_date = NOW(),
        resolved_by = p_resolved_by
    WHERE id = p_market_id AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Market not found or already resolved', 0, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Pay winners
    FOR v_position IN
        SELECT *
        FROM market_positions
        WHERE market_id = p_market_id
            AND outcome = p_winning_outcome
            AND shares > 0
    LOOP
        v_total_payout := v_total_payout + v_position.shares;
        
        UPDATE profiles
        SET balance = balance + v_position.shares,
            updated_at = NOW()
        WHERE id = v_position.user_id;
        
        UPDATE market_positions
        SET realized_profit = v_position.shares - v_position.total_invested,
            updated_at = NOW()
        WHERE id = v_position.id;
        
        v_winners_count := v_winners_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT 
        TRUE, 
        FORMAT('Market resolved. %s winners paid %s total', v_winners_count, v_total_payout),
        v_winners_count,
        v_total_payout;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. GET QUOTE WITH DRAW SUPPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_trade_quote_with_draw(
    p_market_id UUID,
    p_amount NUMERIC,
    p_outcome TEXT,
    p_trade_type TEXT DEFAULT 'buy'
)
RETURNS TABLE(
    shares NUMERIC,
    average_price NUMERIC,
    total_cost NUMERIC,
    platform_fee NUMERIC,
    new_yes_price NUMERIC,
    new_no_price NUMERIC,
    new_draw_price NUMERIC,
    price_impact NUMERIC,
    current_yes_price NUMERIC,
    current_no_price NUMERIC,
    current_draw_price NUMERIC,
    market_type TEXT
) AS $$
DECLARE
    v_lp RECORD;
    v_platform_fee NUMERIC;
    v_market_type TEXT;
    v_total_reserves NUMERIC;
BEGIN
    SELECT * INTO v_lp FROM liquidity_pools WHERE market_id = p_market_id;
    
    IF v_lp IS NULL THEN
        RETURN;
    END IF;
    
    v_market_type := get_market_type(p_market_id);
    v_platform_fee := ROUND(p_amount * 0.02, 2);
    
    IF v_market_type = '3outcome' THEN
        v_total_reserves := v_lp.yes_reserve + v_lp.no_reserve + v_lp.draw_reserve;
        
        RETURN QUERY
        SELECT 
            calc.shares_received,
            calc.average_price,
            p_amount + v_platform_fee,
            v_platform_fee,
            calc.new_yes_price,
            calc.new_no_price,
            calc.new_draw_price,
            calc.price_impact,
            ROUND((v_lp.no_reserve + v_lp.draw_reserve) / v_total_reserves, 4)::NUMERIC,
            ROUND((v_lp.yes_reserve + v_lp.draw_reserve) / v_total_reserves, 4)::NUMERIC,
            ROUND((v_lp.yes_reserve + v_lp.no_reserve) / v_total_reserves, 4)::NUMERIC,
            v_market_type
        FROM calculate_3outcome_shares_from_amount(
            v_lp.yes_reserve,
            v_lp.no_reserve,
            v_lp.draw_reserve,
            p_amount,
            p_outcome
        ) calc;
    ELSE
        -- Binary market
        v_total_reserves := v_lp.yes_reserve + v_lp.no_reserve;
        
        RETURN QUERY
        SELECT 
            calc.shares_received,
            calc.average_price,
            p_amount + v_platform_fee,
            v_platform_fee,
            calc.new_yes_price,
            calc.new_no_price,
            0::NUMERIC, -- no draw price
            calc.price_impact,
            ROUND(v_lp.no_reserve / v_total_reserves, 4)::NUMERIC,
            ROUND(v_lp.yes_reserve / v_total_reserves, 4)::NUMERIC,
            0::NUMERIC, -- no current draw price
            v_market_type
        FROM calculate_shares_from_amount(
            v_lp.yes_reserve,
            v_lp.no_reserve,
            p_amount,
            p_outcome
        ) calc;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 9. UPDATED VIEWS FOR 3-OUTCOME SUPPORT
-- ============================================================================

CREATE OR REPLACE VIEW market_overview_with_draw AS
SELECT 
    m.id,
    m.title,
    m.category,
    m.status,
    m.yes_price,
    m.no_price,
    m.total_volume,
    m.unique_traders,
    lp.yes_reserve,
    lp.no_reserve,
    lp.draw_reserve,
    lp.total_liquidity,
    lp.constant_product,
    -- Market type
    CASE 
        WHEN lp.draw_reserve > 0 THEN '3outcome'
        ELSE 'binary'
    END as market_type,
    -- Calculate prices for 3-outcome
    CASE 
        WHEN lp.draw_reserve > 0 THEN
            ROUND((lp.no_reserve + lp.draw_reserve) / (lp.yes_reserve + lp.no_reserve + lp.draw_reserve) * 100, 2)
        ELSE
            ROUND((lp.no_reserve / (lp.yes_reserve + lp.no_reserve)) * 100, 2)
    END as yes_probability_percent,
    CASE 
        WHEN lp.draw_reserve > 0 THEN
            ROUND((lp.yes_reserve + lp.draw_reserve) / (lp.yes_reserve + lp.no_reserve + lp.draw_reserve) * 100, 2)
        ELSE
            ROUND((lp.yes_reserve / (lp.yes_reserve + lp.no_reserve)) * 100, 2)
    END as no_probability_percent,
    CASE 
        WHEN lp.draw_reserve > 0 THEN
            ROUND((lp.yes_reserve + lp.no_reserve) / (lp.yes_reserve + lp.no_reserve + lp.draw_reserve) * 100, 2)
        ELSE
            0
    END as draw_probability_percent,
    -- Active traders
    COUNT(DISTINCT mt.user_id) as active_traders
FROM markets m
LEFT JOIN liquidity_pools lp ON m.id = lp.market_id
LEFT JOIN market_trades mt ON m.id = mt.market_id
WHERE m.deleted_at IS NULL
GROUP BY m.id, lp.id;

-- ============================================================================
-- 10. EXAMPLE USAGE
-- ============================================================================

/*
-- Example 1: Create a market with draw support (3-outcome)
INSERT INTO markets (
    title,
    description,
    category,
    end_date,
    match_type,
    sport_type,
    team_a_name,
    team_b_name,
    initial_liquidity
)
VALUES (
    'TP Mazembe vs AS Vita Club',
    'Who will win this Linafoot match?',
    'sports',
    NOW() + INTERVAL '2 days',
    'match_winner',
    'football',
    'TP Mazembe',
    'AS Vita Club',
    300.00 -- Will be split into 3 reserves of 100 each
);

-- Example 2: Get quote for draw bet
SELECT * FROM get_trade_quote_with_draw(
    'market-uuid'::UUID,
    10.00,
    'draw',
    'buy'
);

-- Example 3: Place bet on draw
SELECT * FROM execute_buy_trade_unified(
    'market-uuid'::UUID,
    'user-uuid'::UUID,
    'draw',
    10.00,
    2.0
);

-- Example 4: Check all current prices
SELECT 
    title,
    market_type,
    yes_probability_percent,
    no_probability_percent,
    draw_probability_percent
FROM market_overview_with_draw
WHERE status = 'active';

-- Example 5: Resolve match as draw
SELECT * FROM resolve_market_with_draw(
    'market-uuid'::UUID,
    'draw',
    'admin-uuid'::UUID
);
*/

-- ============================================================================
-- KEY DIFFERENCES FROM BINARY MARKETS
-- ============================================================================

/*
BINARY MARKET (Yes/No):
- Formula: x * y = k
- Prices: yes_price + no_price ≈ 1.0
- Initial reserves: 50/50 split
- Example: "Will Team A win?" (Yes = Team A wins, No = Team A loses OR draws)

3-OUTCOME MARKET (Yes/No/Draw):
- Formula: x * y * z = k
- Prices: yes_price + no_price + draw_price ≈ 1.0
- Initial reserves: 33/33/33 split
- Example: "Match result?" (Yes = Team A wins, No = Team B wins, Draw = Draw)

SPORTS WHERE DRAW IS COMMON:
- Football/Soccer (most common)
- Hockey (regular time)
- Rugby
- Basketball (very rare, mainly in exhibitions)

SPORTS WITHOUT DRAW:
- Tennis
- Boxing/MMA
- Most American sports (overtime rules)
- Volleyball
- Basketball (with overtime)

RECOMMENDATIONS FOR YOUR PLATFORM:
1. Use 3-outcome for: Football matches (Linafoot, Premier League, etc.)
2. Use binary for: Tennis, Boxing, "Will team reach finals?" type bets
3. Display odds clearly: "Team A Win 40% | Draw 30% | Team B Win 30%"
4. Educate users on the difference
*/


-- FORMULA

yes_price  = (no_reserve + draw_reserve) / total_reserves = 200/300 = 0.6667
no_price   = (yes_reserve + draw_reserve) / total_reserves = 200/300 = 0.6667  
draw_price = (yes_reserve + no_reserve) / total_reserves = 200/300 = 0.6667
-- This sums to 200%! There's an issue...