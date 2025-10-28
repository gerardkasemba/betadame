-- Function to calculate initial liquidity based on market type and popularity
CREATE OR REPLACE FUNCTION calculate_initial_liquidity(
    p_market_type TEXT,
    p_sport_type TEXT DEFAULT NULL,
    p_league TEXT DEFAULT NULL,
    p_expected_popularity TEXT DEFAULT 'medium'
)
RETURNS NUMERIC AS $$
BEGIN
    -- Binary markets have lower initial liquidity
    IF p_market_type = 'binary' THEN
        RETURN CASE p_expected_popularity
            WHEN 'high' THEN 500.00
            WHEN 'medium' THEN 300.00
            WHEN 'low' THEN 100.00
            ELSE 200.00
        END;
    END IF;
    
    -- Sports markets need more liquidity (3 outcomes)
    IF p_market_type = 'sports' THEN
        RETURN CASE p_expected_popularity
            WHEN 'high' THEN 1500.00   -- Big match (Champions League, Derby)
            WHEN 'medium' THEN 750.00  -- Regular league game
            WHEN 'low' THEN 300.00     -- Lower division match
            ELSE 500.00                -- Default
        END;
    END IF;
    
    -- Default fallback
    RETURN 300.00;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate minimum bet based on market type
CREATE OR REPLACE FUNCTION calculate_min_bet(
    p_market_type TEXT,
    p_initial_liquidity NUMERIC
)
RETURNS NUMERIC AS $$
BEGIN
    -- Min bet is 0.5% of initial liquidity, with a floor
    RETURN GREATEST(p_initial_liquidity * 0.005, 1.00);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate maximum bet based on current liquidity
CREATE OR REPLACE FUNCTION calculate_max_bet(
    p_market_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
    v_liquidity NUMERIC;
    v_market_type TEXT;
BEGIN
    SELECT lp.total_liquidity, m.market_type 
    INTO v_liquidity, v_market_type
    FROM liquidity_pools lp
    JOIN markets m ON m.id = lp.market_id
    WHERE lp.market_id = p_market_id;
    
    -- Max bet = 15% of current liquidity for sports (3 outcomes), 20% for binary
    IF v_market_type = 'sports' THEN
        RETURN GREATEST(v_liquidity * 0.15, 10.00);
    ELSE
        RETURN GREATEST(v_liquidity * 0.20, 10.00);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to set initial values when market is created
CREATE OR REPLACE FUNCTION set_market_initial_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate initial liquidity if not provided
    IF NEW.initial_liquidity IS NULL OR NEW.initial_liquidity = 100.00 THEN
        NEW.initial_liquidity := calculate_initial_liquidity(
            NEW.market_type::TEXT,
            NEW.sport_type,
            NEW.league,
            'medium'  -- Default to medium popularity
        );
    END IF;
    
    -- Calculate min bet based on initial liquidity
    IF NEW.min_bet_amount IS NULL OR NEW.min_bet_amount = 1.00 THEN
        NEW.min_bet_amount := calculate_min_bet(
            NEW.market_type::TEXT,
            NEW.initial_liquidity
        );
    END IF;
    
    -- Set initial max bet (will be updated dynamically)
    IF NEW.max_bet_amount IS NULL OR NEW.max_bet_amount = 10000.00 THEN
        -- Initial max bet is 20% of initial liquidity
        NEW.max_bet_amount := GREATEST(NEW.initial_liquidity * 0.20, 10.00);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on markets table
DROP TRIGGER IF EXISTS trigger_set_market_initial_values ON markets;
CREATE TRIGGER trigger_set_market_initial_values
    BEFORE INSERT ON markets
    FOR EACH ROW
    EXECUTE FUNCTION set_market_initial_values();

-- Function to update max bet after trades
CREATE OR REPLACE FUNCTION update_max_bet_after_trade()
RETURNS TRIGGER AS $$
DECLARE
    v_new_max_bet NUMERIC;
BEGIN
    -- Recalculate max bet based on new liquidity
    v_new_max_bet := calculate_max_bet(NEW.market_id);
    
    -- Update market's max_bet_amount
    UPDATE markets
    SET max_bet_amount = v_new_max_bet,
        updated_at = NOW()
    WHERE id = NEW.market_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on liquidity_pools table
DROP TRIGGER IF EXISTS trigger_update_max_bet ON liquidity_pools;
CREATE TRIGGER trigger_update_max_bet
    AFTER UPDATE ON liquidity_pools
    FOR EACH ROW
    WHEN (OLD.total_liquidity IS DISTINCT FROM NEW.total_liquidity)
    EXECUTE FUNCTION update_max_bet_after_trade();