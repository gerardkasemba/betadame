CREATE OR REPLACE FUNCTION execute_sell_trade_unified(
    p_market_id UUID,
    p_user_id UUID, 
    p_outcome TEXT,
    p_shares_to_sell NUMERIC,
    p_platform_fee_percent NUMERIC DEFAULT 1.0
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trade_id UUID,
    payout_amount NUMERIC,
    average_price NUMERIC,
    platform_fee NUMERIC,
    new_yes_price NUMERIC,
    new_no_price NUMERIC,
    new_draw_price NUMERIC
) AS $$
DECLARE
    v_lp RECORD;
    v_position RECORD;
    v_market_type TEXT;
    v_payout NUMERIC;
    v_platform_fee NUMERIC;
    v_new_yes_reserve NUMERIC;
    v_new_no_reserve NUMERIC;
    v_new_draw_reserve NUMERIC;
    v_constant_product NUMERIC;
BEGIN
    -- Check if user has enough shares
    SELECT * INTO v_position
    FROM market_positions 
    WHERE market_id = p_market_id 
      AND user_id = p_user_id 
      AND outcome = p_outcome;
    
    IF v_position IS NULL OR v_position.shares < p_shares_to_sell THEN
        RETURN QUERY SELECT FALSE, 'Insufficient shares to sell', NULL, 0, 0, 0, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Get liquidity pool
    SELECT * INTO v_lp FROM liquidity_pools WHERE market_id = p_market_id;
    v_market_type := get_market_type(p_market_id);
    v_constant_product := v_lp.yes_reserve * v_lp.no_reserve * v_lp.draw_reserve;
    
    -- Calculate new reserves and payout
    IF v_market_type = '3outcome' THEN
        IF p_outcome = 'yes' THEN
            v_new_yes_reserve := v_lp.yes_reserve + p_shares_to_sell;
            v_new_no_reserve := SQRT((v_constant_product / v_new_yes_reserve) * (v_lp.no_reserve / v_lp.draw_reserve));
            v_new_draw_reserve := (v_constant_product / v_new_yes_reserve) / v_new_no_reserve;
            v_payout := (v_lp.no_reserve - v_new_no_reserve) + (v_lp.draw_reserve - v_new_draw_reserve);
            
        ELSIF p_outcome = 'no' THEN
            v_new_no_reserve := v_lp.no_reserve + p_shares_to_sell;
            v_new_yes_reserve := SQRT((v_constant_product / v_new_no_reserve) * (v_lp.yes_reserve / v_lp.draw_reserve));
            v_new_draw_reserve := (v_constant_product / v_new_no_reserve) / v_new_yes_reserve;
            v_payout := (v_lp.yes_reserve - v_new_yes_reserve) + (v_lp.draw_reserve - v_new_draw_reserve);
            
        ELSE -- 'draw'
            v_new_draw_reserve := v_lp.draw_reserve + p_shares_to_sell;
            v_new_yes_reserve := SQRT((v_constant_product / v_new_draw_reserve) * (v_lp.yes_reserve / v_lp.no_reserve));
            v_new_no_reserve := (v_constant_product / v_new_draw_reserve) / v_new_yes_reserve;
            v_payout := (v_lp.yes_reserve - v_new_yes_reserve) + (v_lp.no_reserve - v_new_no_reserve);
        END IF;
    ELSE
        -- Binary market selling (simpler)
        IF p_outcome = 'yes' THEN
            v_new_yes_reserve := v_lp.yes_reserve + p_shares_to_sell;
            v_new_no_reserve := (v_lp.yes_reserve * v_lp.no_reserve) / v_new_yes_reserve;
            v_payout := v_lp.no_reserve - v_new_no_reserve;
            v_new_draw_reserve := 0;
        ELSE -- 'no'
            v_new_no_reserve := v_lp.no_reserve + p_shares_to_sell;
            v_new_yes_reserve := (v_lp.yes_reserve * v_lp.no_reserve) / v_new_no_reserve;
            v_payout := v_lp.yes_reserve - v_new_yes_reserve;
            v_new_draw_reserve := 0;
        END IF;
    END IF;
    
    -- Calculate platform fee
    v_platform_fee := ROUND(v_payout * (p_platform_fee_percent / 100), 2);
    v_payout := v_payout - v_platform_fee;
    
    -- Update liquidity pool
    UPDATE liquidity_pools
    SET yes_reserve = v_new_yes_reserve,
        no_reserve = v_new_no_reserve,
        draw_reserve = v_new_draw_reserve,
        constant_product = v_new_yes_reserve * v_new_no_reserve * 
                          CASE WHEN v_new_draw_reserve > 0 THEN v_new_draw_reserve ELSE 1 END,
        updated_at = NOW()
    WHERE market_id = p_market_id;
    
    -- Update user position
    UPDATE market_positions
    SET shares = shares - p_shares_to_sell,
        total_invested = total_invested - (p_shares_to_sell * average_price),
        updated_at = NOW()
    WHERE market_id = p_market_id 
      AND user_id = p_user_id 
      AND outcome = p_outcome;
    
    -- Delete position if no shares left
    DELETE FROM market_positions 
    WHERE market_id = p_market_id 
      AND user_id = p_user_id 
      AND outcome = p_outcome 
      AND shares = 0;
    
    -- Credit user balance
    UPDATE profiles 
    SET balance = balance + v_payout,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Record sell trade
    -- (Similar to buy trade but with negative shares)
    
    RETURN QUERY SELECT TRUE, 'Sell executed successfully', 
        gen_random_uuid(), v_payout, v_payout / p_shares_to_sell, 
        v_platform_fee, 0, 0, 0; -- Simplified price return
END;
$$ LANGUAGE plpgsql;