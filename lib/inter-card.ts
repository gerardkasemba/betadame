export interface Card {
  suit: string;
  value: string;
}

export type Suit = "♠" | "♥" | "♦" | "♣" | "🃏";
export type Value = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "Joker";

export const suits: readonly Suit[] = ["♠", "♥", "♦", "♣"];
export const values: readonly Value[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export interface GameState {
  deck: Card[];
  player1Hand: Card[];
  player2Hand: Card[];
  pile: Card[];
  currentCard: Card | null;
  playerTurn: number; // 1 or 2
  demandedValue: string | null;
  status: string;
  gameOver: boolean;
}

export class InterCardGame {
  static createDeck(): Card[] {
    const newDeck: Card[] = [];
    
    // Create 52 regular cards (4 suits × 13 values)
    for (let s of suits) {
      for (let v of values) {
        newDeck.push({ suit: s, value: v });
      }
    }
    
    // Add 2 jokers
    newDeck.push({ suit: "🃏", value: "Joker" });
    newDeck.push({ suit: "🃏", value: "Joker" });
    
    // Verify deck size: 52 + 2 = 54 cards
    console.log(`Deck created with ${newDeck.length} cards (52 regular + 2 jokers)`);
    
    return newDeck.sort(() => Math.random() - 0.5);
  }

  static drawCards(hand: Card[], deckArr: Card[], pile: Card[], n: number = 1): { newHand: Card[], newDeck: Card[], newPile: Card[] } {
    const newHand = [...hand];
    let newDeck = [...deckArr];
    let newPile = [...pile];
    
    for (let i = 0; i < n; i++) {
      if (newDeck.length === 0) {
        // Reshuffle pile (except last card) back into deck
        const lastCard = newPile[newPile.length - 1];
        const reshuffled = [...newPile.slice(0, -1)].sort(() => Math.random() - 0.5);
        newDeck = reshuffled;
        newPile = [lastCard];
        console.log(`Reshuffled ${reshuffled.length} cards from pile into deck`);
      }
      if (newDeck.length > 0) {
        newHand.push(newDeck.pop()!);
      }
    }
    
    return { newHand, newDeck, newPile };
  }

  static canPlay(card: Card, topCard: Card | null, demandedValue: string | null): boolean {
    if (!topCard) return true;
    
    // If there's a demand from an 8, ONLY the demanded value can be played (or 8 to cancel, or Joker)
    if (demandedValue) {
      // Can only play: the demanded card, another 8 to cancel, or a Joker
      return card.value === demandedValue || card.value === "8" || card.suit === "🃏";
    }
    
    // 8s can always be played (wild cards)
    if (card.value === "8") return true;
    
    // Jokers can always be played
    if (card.suit === "🃏") return true;
    
    // If the top card is a Joker, any card can be played (Joker acts as a reset)
    if (topCard.suit === "🃏") return true;
    
    // Normal play: match suit or value
    return card.suit === topCard.suit || card.value === topCard.value;
  }

  static canPlayMultiple(cards: Card[], topCard: Card | null, demandedValue: string | null): boolean {
    if (cards.length === 0) return false;
    if (cards.length === 1) return this.canPlay(cards[0], topCard, demandedValue);
    
    // All cards must have the same value (suits can be different)
    const firstValue = cards[0].value;
    if (!cards.every(c => c.value === firstValue)) return false;
    
    // At least one card must be playable according to normal rules
    // This ensures that if there's a demand or suit/value matching requirement,
    // at least one of the cards satisfies it
    const hasPlayableCard = cards.some(card => {
      // Check basic playability
      if (card.value === "8" || card.suit === "🃏") return true;
      if (topCard?.suit === "🃏") return true;
      
      if (demandedValue) {
        return card.value === demandedValue;
      }
      
      if (!topCard) return true;
      return card.suit === topCard.suit || card.value === topCard.value;
    });
    
    return hasPlayableCard;
  }

  static hasSpecialCard(cards: Card[], value: Value): boolean {
    return cards.some(card => card.value === value);
  }

  static hasJoker(cards: Card[]): boolean {
    return cards.some(card => card.suit === "🃏");
  }

  static getSpecialCardEffects(cards: Card[]): {
    has2: boolean;
    has10: boolean;
    hasJoker: boolean;
    hasAce: boolean;
    has8: boolean;
  } {
    return {
      has2: this.hasSpecialCard(cards, "2"),
      has10: this.hasSpecialCard(cards, "10"),
      hasJoker: this.hasJoker(cards),
      hasAce: this.hasSpecialCard(cards, "A"),
      has8: this.hasSpecialCard(cards, "8")
    };
  }

  static getCardDescription(cards: Card[]): string {
    if (cards.length === 0) return "";
    if (cards.length === 1) return `${cards[0].value}${cards[0].suit}`;
    return `${cards.length}x ${cards[0].value}`;
  }

  static findPlayableCards(hand: Card[], topCard: Card | null, demandedValue: string | null): Record<string, Card[]> {
    const playableByValue: Record<string, Card[]> = {};
    
    hand.forEach(card => {
      if (this.canPlay(card, topCard, demandedValue)) {
        if (!playableByValue[card.value]) {
          playableByValue[card.value] = [];
        }
        playableByValue[card.value].push(card);
      }
    });
    
    return playableByValue;
  }

  static findDemandCards(hand: Card[], demandedValue: string): Card[] {
    return hand.filter(card => card.value === demandedValue || card.suit === "🃏" || card.value === "8");
  }

  static calculateDrawAmount(effects: ReturnType<typeof InterCardGame.getSpecialCardEffects>, cardsPlayed: Card[]): number {
    // Count how many of each special card was played
    const jokerCount = cardsPlayed.filter(c => c.suit === "🃏").length;
    const tenCount = cardsPlayed.filter(c => c.value === "10").length;
    const twoCount = cardsPlayed.filter(c => c.value === "2").length;
    
    // Calculate total draw amount based on card counts
    if (jokerCount > 0) return jokerCount * 5; // Each Joker = 5 cards
    if (tenCount > 0) return tenCount * 4; // Each 10 = 4 cards
    if (twoCount > 0) return twoCount * 2; // Each 2 = 2 cards
    
    return 1; // Default draw amount
  }

  static getSpecialCardStatus(effects: ReturnType<typeof InterCardGame.getSpecialCardEffects>, isPlayer: boolean, cardsPlayed: Card[], demandedValue?: string): string {
    const actor = isPlayer ? "Vous" : "L'adversaire";
    const target = isPlayer ? "l'adversaire" : "vous";
    
    // Count how many of each special card was played for better messages
    const jokerCount = cardsPlayed.filter(c => c.suit === "🃏").length;
    const tenCount = cardsPlayed.filter(c => c.value === "10").length;
    const twoCount = cardsPlayed.filter(c => c.value === "2").length;
    
    if (effects.hasJoker) {
      const drawAmount = jokerCount * 5;
      return `🃏 ${actor} a joué ${jokerCount > 1 ? jokerCount + ' Jokers' : 'un Joker'}! ${target} pioche ${drawAmount} cartes et passe son tour. ${actor} rejoue!`;
    }
    if (effects.has10) {
      const drawAmount = tenCount * 4;
      return `➕ ${actor} a joué ${tenCount > 1 ? tenCount + ' 10s' : 'un 10'}! ${target} pioche ${drawAmount} cartes et passe son tour. ${actor} rejoue!`;
    }
    if (effects.has2) {
      const drawAmount = twoCount * 2;
      return `➕ ${actor} a joué ${twoCount > 1 ? twoCount + ' 2s' : 'un 2'}! ${target} pioche ${drawAmount} cartes et passe son tour. ${actor} rejoue!`;
    }
    if (effects.hasAce) {
      const aceCount = cardsPlayed.filter(c => c.value === "A").length;
      return `🛑 ${actor} a joué ${aceCount > 1 ? aceCount + ' As' : 'un As'}! ${target} passe son tour. ${actor} rejoue!`;
    }
    if (effects.has8 && demandedValue) return `🎯 ${actor} a joué un 8 et demande: ${demandedValue}. ${target} doit jouer ${demandedValue} ou piocher 1 carte.`;
    
    return "";
  }

  // Helper method to verify deck composition
  static verifyDeck(deck: Card[]): void {
    const counts: Record<string, number> = {};
    
    deck.forEach(card => {
      const key = `${card.value}${card.suit}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    
    console.log('Deck composition:', counts);
    console.log('Total cards:', deck.length);
  }

  static createInitialGameState(): GameState {
    const newDeck = this.createDeck();
    const player1Hand: Card[] = [];
    const player2Hand: Card[] = [];
    
    // Deal 4 cards to each player
    for (let i = 0; i < 4; i++) {
      const card1 = newDeck.pop();
      const card2 = newDeck.pop();
      if (card1) player1Hand.push(card1);
      if (card2) player2Hand.push(card2);
    }
    
    const startCard = newDeck.pop();
    
    // Ensure we have a valid starting card
    const pile = startCard ? [startCard] : [];
    const currentCard = startCard || null;
    
    console.log(`Game started with: Player 1 (${player1Hand.length} cards), Player 2 (${player2Hand.length} cards), Deck (${newDeck.length} cards), Current Card: ${currentCard ? currentCard.value + currentCard.suit : 'none'}`);
    
    return {
      deck: newDeck,
      player1Hand,
      player2Hand,
      pile,
      currentCard,
      playerTurn: 1,
      demandedValue: null,
      status: "Tour du Joueur 1",
      gameOver: false
    };
  }

  // Get the current player's hand based on player number
  static getPlayerHand(gameState: GameState, playerNumber: number): Card[] {
    return playerNumber === 1 ? gameState.player1Hand : gameState.player2Hand;
  }

  // Get the opponent's player number
  static getOpponent(playerNumber: number): number {
    return playerNumber === 1 ? 2 : 1;
  }

  // Check if a player has won (empty hand)
  static checkWinCondition(gameState: GameState): number | null {
    if (gameState.player1Hand.length === 0) return 1;
    if (gameState.player2Hand.length === 0) return 2;
    return null;
  }

  // Process special card effects and return updated game state
  // Returns: shouldSwitchTurn = false means current player plays again
  static processSpecialCardEffects(
    gameState: GameState, 
    cardsPlayed: Card[], 
    currentPlayer: number
  ): { newGameState: GameState; shouldSwitchTurn: boolean; needsDemand: boolean } {
    const effects = this.getSpecialCardEffects(cardsPlayed);
    let newGameState = { ...gameState };
    let shouldSwitchTurn = true;
    let needsDemand = false;

    const opponent = this.getOpponent(currentPlayer);
    const opponentHand = this.getPlayerHand(gameState, opponent);

    // Handle Joker: opponent draws (5 * number of Jokers), skips turn, current player plays again
    if (effects.hasJoker) {
      const drawAmount = this.calculateDrawAmount(effects, cardsPlayed);
      const { newHand, newDeck, newPile } = this.drawCards(opponentHand, newGameState.deck, newGameState.pile, drawAmount);
      if (opponent === 1) {
        newGameState.player1Hand = newHand;
      } else {
        newGameState.player2Hand = newHand;
      }
      newGameState.deck = newDeck;
      newGameState.pile = newPile;
      newGameState.status = this.getSpecialCardStatus(effects, currentPlayer === 1, cardsPlayed);
      shouldSwitchTurn = false; // Current player plays again
      newGameState.demandedValue = null; // Clear any demand
    }
    // Handle 10: opponent draws (4 * number of 10s), skips turn, current player plays again
    else if (effects.has10) {
      const drawAmount = this.calculateDrawAmount(effects, cardsPlayed);
      const { newHand, newDeck, newPile } = this.drawCards(opponentHand, newGameState.deck, newGameState.pile, drawAmount);
      if (opponent === 1) {
        newGameState.player1Hand = newHand;
      } else {
        newGameState.player2Hand = newHand;
      }
      newGameState.deck = newDeck;
      newGameState.pile = newPile;
      newGameState.status = this.getSpecialCardStatus(effects, currentPlayer === 1, cardsPlayed);
      shouldSwitchTurn = false; // Current player plays again
      newGameState.demandedValue = null; // Clear any demand
    }
    // Handle 2: opponent draws (2 * number of 2s), skips turn, current player plays again
    else if (effects.has2) {
      const drawAmount = this.calculateDrawAmount(effects, cardsPlayed);
      const { newHand, newDeck, newPile } = this.drawCards(opponentHand, newGameState.deck, newGameState.pile, drawAmount);
      if (opponent === 1) {
        newGameState.player1Hand = newHand;
      } else {
        newGameState.player2Hand = newHand;
      }
      newGameState.deck = newDeck;
      newGameState.pile = newPile;
      newGameState.status = this.getSpecialCardStatus(effects, currentPlayer === 1, cardsPlayed);
      shouldSwitchTurn = false; // Current player plays again
      newGameState.demandedValue = null; // Clear any demand
    }
    // Handle Ace: opponent skips turn, current player plays again
    else if (effects.hasAce) {
      newGameState.status = this.getSpecialCardStatus(effects, currentPlayer === 1, cardsPlayed);
      shouldSwitchTurn = false; // Current player plays again
      newGameState.demandedValue = null; // Clear any demand
    }
    // Handle 8: player must make a demand, opponent must respond, then turn returns to demanding player
    else if (effects.has8) {
      needsDemand = true; // Signal that a demand is needed
      newGameState.demandedValue = null; // Will be set by the UI
      newGameState.status = `Joueur ${currentPlayer} a joué un 8. Choisissez une valeur à demander.`;
      // Turn temporarily switches to opponent to respond to demand
      shouldSwitchTurn = true;
    }
    else {
      // Normal card played, clear demand and switch turn
      newGameState.demandedValue = null;
      shouldSwitchTurn = true;
    }

    return { newGameState, shouldSwitchTurn, needsDemand };
  }

  // Check if opponent can fulfill the demand
  static canFulfillDemand(
    gameState: GameState,
    opponentPlayerNumber: number
  ): boolean {
    const opponentHand = this.getPlayerHand(gameState, opponentPlayerNumber);
    return opponentHand.some(card => 
      card.value === gameState.demandedValue || 
      card.value === "8" || 
      card.suit === "🃏"
    );
  }

  // Process opponent's response to an 8 demand
  static processDemandResponse(
    gameState: GameState,
    demandingPlayer: number,
    responseCards: Card[] | null
  ): GameState {
    const opponent = this.getOpponent(demandingPlayer);
    const opponentHand = this.getPlayerHand(gameState, opponent);
    let newGameState = { ...gameState };
    
    // If opponent played cards in response to demand
    if (responseCards && responseCards.length > 0) {
      // Remove played cards from opponent's hand
      const newOpponentHand = opponentHand.filter(card => 
        !responseCards.some(rc => rc.suit === card.suit && rc.value === card.value)
      );
      
      if (opponent === 1) {
        newGameState.player1Hand = newOpponentHand;
      } else {
        newGameState.player2Hand = newOpponentHand;
      }
      
      // Add cards to pile and update current card
      newGameState.pile = [...newGameState.pile, ...responseCards];
      newGameState.currentCard = responseCards[responseCards.length - 1];
      
      // Check if opponent played another 8 to cancel the demand
      const playedEffects = this.getSpecialCardEffects(responseCards);
      if (playedEffects.has8) {
        // Opponent played an 8 to CANCEL the first 8
        // Now the opponent makes a NEW demand
        // Turn switches back to the original demanding player who must respond to the NEW demand
        newGameState.status = `Joueur ${opponent} a joué un 8 pour annuler! En attente de la nouvelle demande.`;
        newGameState.playerTurn = opponent; // Opponent stays to make their demand
        newGameState.demandedValue = null; // Will be set when opponent makes new demand
      } else {
        // Opponent fulfilled the demand with the requested card
        // Demand is cleared, game returns to normal
        newGameState.playerTurn = demandingPlayer;
        newGameState.demandedValue = null; // CLEAR THE DEMAND - game returns to normal
        newGameState.status = `Joueur ${opponent} a joué ${this.getCardDescription(responseCards)}. Tour du Joueur ${demandingPlayer}.`;
      }
    } else {
      // Opponent cannot fulfill demand, must draw 1 card
      const { newHand, newDeck, newPile } = this.drawCards(opponentHand, newGameState.deck, newGameState.pile, 1);
      if (opponent === 1) {
        newGameState.player1Hand = newHand;
      } else {
        newGameState.player2Hand = newHand;
      }
      newGameState.deck = newDeck;
      newGameState.pile = newPile;
      
      // Turn goes back to the demanding player
      // BUT THE DEMAND STAYS ACTIVE - demanding player must now play the demanded card
      newGameState.playerTurn = demandingPlayer;
      // KEEP demandedValue - do NOT clear it
      newGameState.status = `Joueur ${opponent} n'a pas ${gameState.demandedValue}, pioche 1 carte. Joueur ${demandingPlayer} doit jouer ${gameState.demandedValue}.`;
    }

    return newGameState;
  }

  // Validate if a move is legal
  static validateMove(
    gameState: GameState, 
    cardsToPlay: Card[], 
    playerNumber: number
  ): { isValid: boolean; error?: string } {
    if (cardsToPlay.length === 0) {
      return { isValid: false, error: "Aucune carte sélectionnée" };
    }

    if (!this.canPlayMultiple(cardsToPlay, gameState.currentCard, gameState.demandedValue)) {
      return { isValid: false, error: "Vous ne pouvez pas jouer ces cartes" };
    }

    // Check if all cards belong to the player's hand
    const playerHand = this.getPlayerHand(gameState, playerNumber);
    for (const card of cardsToPlay) {
      if (!playerHand.some(c => c.suit === card.suit && c.value === card.value)) {
        return { isValid: false, error: "Vous ne possédez pas toutes ces cartes" };
      }
    }

    return { isValid: true };
  }
}

// Legacy function for backward compatibility
export const createInitialGameState = (): GameState => {
  return InterCardGame.createInitialGameState();
};