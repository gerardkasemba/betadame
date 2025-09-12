-- Function to refund stake when game is closed
CREATE OR REPLACE FUNCTION refund_game_stake()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status = 'open' THEN
    UPDATE users
    SET balance = balance + NEW.stake
    WHERE id = NEW.player1_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call refund function on game status update
CREATE TRIGGER refund_stake_trigger
AFTER UPDATE OF status ON games
FOR EACH ROW
EXECUTE FUNCTION refund_game_stake();