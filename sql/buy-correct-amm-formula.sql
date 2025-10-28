CREATE OR REPLACE FUNCTION calculate_3outcome_price_impact_fixed(
    p_yes_reserve NUMERIC,
    p_no_reserve NUMERIC, 
    p_draw_reserve NUMERIC,
    p_shares_to_buy NUMERIC,
    p_outcome TEXT
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
    v_total_cost NUMERIC;
    -- Add the missing price variables
    v_new_yes_price NUMERIC;
    v_new_no_price NUMERIC;
    v_new_draw_price NUMERIC;
    v_denominator NUMERIC;
BEGIN
    -- Constant product: k = yes * no * draw
    v_constant_product := p_yes_reserve * p_no_reserve * p_draw_reserve;
    
    -- Calculate new reserves after purchase
    IF p_outcome = 'yes' THEN
        v_new_yes_reserve := p_yes_reserve - p_shares_to_buy;
        -- Maintain constant product: find new no/draw reserves such that:
        -- new_yes * new_no * new_draw = k
        -- And maintain ratio: new_no/new_draw = p_no_reserve/p_draw_reserve
        v_new_no_reserve := SQRT((v_constant_product / v_new_yes_reserve) * (p_no_reserve / p_draw_reserve));
        v_new_draw_reserve := (v_constant_product / v_new_yes_reserve) / v_new_no_reserve;
        v_total_cost := (v_new_no_reserve - p_no_reserve) + (v_new_draw_reserve - p_draw_reserve);
        
    ELSIF p_outcome = 'no' THEN
        v_new_no_reserve := p_no_reserve - p_shares_to_buy;
        v_new_yes_reserve := SQRT((v_constant_product / v_new_no_reserve) * (p_yes_reserve / p_draw_reserve));
        v_new_draw_reserve := (v_constant_product / v_new_no_reserve) / v_new_yes_reserve;
        v_total_cost := (v_new_yes_reserve - p_yes_reserve) + (v_new_draw_reserve - p_draw_reserve);
        
    ELSE -- 'draw'
        v_new_draw_reserve := p_draw_reserve - p_shares_to_buy;
        v_new_yes_reserve := SQRT((v_constant_product / v_new_draw_reserve) * (p_yes_reserve / p_no_reserve));
        v_new_no_reserve := (v_constant_product / v_new_draw_reserve) / v_new_yes_reserve;
        v_total_cost := (v_new_yes_reserve - p_yes_reserve) + (v_new_no_reserve - p_no_reserve);
    END IF;

    -- Calculate marginal prices (proper AMM pricing)
    v_denominator := (v_new_yes_reserve * v_new_no_reserve) + 
                     (v_new_yes_reserve * v_new_draw_reserve) + 
                     (v_new_no_reserve * v_new_draw_reserve);
    
    v_new_yes_price := (v_new_no_reserve * v_new_draw_reserve) / v_denominator;
    v_new_no_price := (v_new_yes_reserve * v_new_draw_reserve) / v_denominator;
    v_new_draw_price := (v_new_yes_reserve * v_new_no_reserve) / v_denominator;

    -- Return all calculated values
    RETURN QUERY SELECT 
        ROUND(v_new_yes_reserve, 6),
        ROUND(v_new_no_reserve, 6), 
        ROUND(v_new_draw_reserve, 6),
        ROUND(v_new_yes_price, 4),
        ROUND(v_new_no_price, 4),
        ROUND(v_new_draw_price, 4),
        ROUND(v_total_cost / p_shares_to_buy, 4),
        ROUND(v_total_cost, 2),
        0.0; -- Simplified price impact for now
END;
$$ LANGUAGE plpgsql IMMUTABLE;