"use client"
import React, { useState, useEffect } from 'react';

interface Card {
  suit: string;
  value: string;
}

const suits = ["♠", "♥", "♦", "♣"] as const;
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

function App() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [computerHand, setComputerHand] = useState<Card[]>([]);
  const [pile, setPile] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [playerTurn, setPlayerTurn] = useState<boolean>(true);
  const [demandedValue, setDemandedValue] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Your turn!");
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  const createDeck = (): Card[] => {
    const newDeck: Card[] = [];
    for (let s of suits) {
      for (let v of values) {
        newDeck.push({ suit: s, value: v });
      }
    }
    newDeck.push({ suit: "🃏", value: "Joker" });
    newDeck.push({ suit: "🃏", value: "Joker" });
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const drawCards = (hand: Card[], deckArr: Card[], n: number = 1): { newHand: Card[], newDeck: Card[] } => {
    const newHand = [...hand];
    let newDeck = [...deckArr];
    
    for (let i = 0; i < n; i++) {
      if (newDeck.length === 0) {
        const lastCard = pile[pile.length - 1];
        const reshuffled = [...pile.slice(0, -1)].sort(() => Math.random() - 0.5);
        newDeck = reshuffled;
        setPile([lastCard]);
      }
      if (newDeck.length > 0) {
        newHand.push(newDeck.pop()!);
      }
    }
    
    return { newHand, newDeck };
  };

  const startGame = (): void => {
    const newDeck = createDeck();
    const pHand: Card[] = [];
    const cHand: Card[] = [];
    
    for (let i = 0; i < 4; i++) {
      pHand.push(newDeck.pop()!);
      cHand.push(newDeck.pop()!);
    }
    
    const startCard = newDeck.pop()!;
    
    setDeck(newDeck);
    setPlayerHand(pHand);
    setComputerHand(cHand);
    setCurrentCard(startCard);
    setPile([startCard]);
    setPlayerTurn(true);
    setDemandedValue(null);
    setStatus("Your turn! Select cards to play.");
    setGameOver(false);
    setSelectedCards([]);
  };

  useEffect(() => {
    startGame();
  }, []);

  const canPlay = (card: Card, topCard: Card | null): boolean => {
    if (!topCard) return true;
    
    // Jokers and 8s can always be played (wild cards)
    if (card.suit === "🃏" || card.value === "8") return true;
    
    // If the top card is a Joker, any card can be played on it
    if (topCard.suit === "🃏") return true;
    
    // If there's a demand, must play the demanded value
    if (demandedValue) {
      return card.value === demandedValue;
    }
    
    // Normal play: match suit or value
    return card.suit === topCard.suit || card.value === topCard.value;
  };

  const canPlayMultiple = (cards: Card[]): boolean => {
    if (cards.length === 0) return false;
    if (cards.length === 1) return canPlay(cards[0], currentCard);
    
    // All cards must have the same value
    const firstValue = cards[0].value;
    if (!cards.every(c => c.value === firstValue)) return false;
    
    // First card must be playable
    return canPlay(cards[0], currentCard);
  };

  const toggleCardSelection = (index: number): void => {
    if (selectedCards.includes(index)) {
      setSelectedCards(selectedCards.filter(i => i !== index));
    } else {
      setSelectedCards([...selectedCards, index]);
    }
  };

const playSelectedCards = (): void => {
  if (!playerTurn || gameOver || selectedCards.length === 0) return;

  const cardsToPlay = selectedCards.map(i => playerHand[i]);

  if (!canPlayMultiple(cardsToPlay)) {
    setStatus("❌ You can't play those cards!");
    return;
  }

  const newHand = playerHand.filter((_, i) => !selectedCards.includes(i));
  setPlayerHand(newHand);
  setSelectedCards([]);

  let lastCard = cardsToPlay[cardsToPlay.length - 1];
  setPile(prev => [...prev, ...cardsToPlay]);
  setCurrentCard(lastCard);

  if (demandedValue && lastCard.value !== "8") {
    setDemandedValue(null);
  }

  if (newHand.length === 0) {
    setStatus("🎉 You win!");
    setGameOver(true);
    return;
  }

  // Handle special cards with fixed draw amounts
  const has2 = cardsToPlay.some(c => c.value === "2");
  const has10 = cardsToPlay.some(c => c.value === "10");
  const hasJoker = cardsToPlay.some(c => c.suit === "🃏");
  const hasAce = cardsToPlay.some(c => c.value === "A");

  if (has2) {
    const result = drawCards(computerHand, deck, 2); // Always draw 2 cards
    setComputerHand(result.newHand);
    setDeck(result.newDeck);
    setStatus(`➕ You played 2! Computer draws 2 cards and is skipped. Your turn again!`);
    return;
  }

  if (has10) {
    const result = drawCards(computerHand, deck, 4); // Always draw 4 cards
    setComputerHand(result.newHand);
    setDeck(result.newDeck);
    setStatus(`➕ You played 10! Computer draws 4 cards and is skipped. Your turn again!`);
    return;
  }

  if (hasJoker) {
    const result = drawCards(computerHand, deck, 5); // Always draw 5 cards
    setComputerHand(result.newHand);
    setDeck(result.newDeck);
    setStatus(`🃏 You played Joker! Computer draws 5 cards and is skipped. Your turn again!`);
    return;
  }

  if (hasAce) {
    setStatus(`🛑 You played Ace! Computer is skipped. Your turn again!`);
    return;
  }

  if (lastCard.value === "8") {
    const chosen = prompt("You played 8! Demand which value? (A,2,3,4,5,6,7,9,10,J,Q,K)");
    if (chosen && values.includes(chosen.toUpperCase() as any) && chosen.toUpperCase() !== "8") {
      setDemandedValue(chosen.toUpperCase());
      setStatus(`You demanded: ${chosen.toUpperCase()}. Computer checking...`);
      setPlayerTurn(false);
      setTimeout(() => handleComputerDemandResponseFor8(chosen.toUpperCase(), newHand), 1200);
    } else {
      setStatus("Invalid demand. Computer's turn!");
      setPlayerTurn(false);
      setTimeout(() => computerTurn(newHand), 1200);
    }
    return;
  }

  setStatus("Computer's turn...");
  setPlayerTurn(false);
  setTimeout(() => computerTurn(newHand), 1200);
};

  const handleComputerDemandResponseFor8 = (demandedVal: string, playerHandAfterDemand: Card[]): void => {
    const demandCards = computerHand.filter(c => c.value === demandedVal || c.suit === "🃏");
    
    if (demandCards.length > 0) {
      // Computer has the demanded card(s) - play them all
      const newHand = computerHand.filter(c => !demandCards.includes(c));
      setComputerHand(newHand);
      const lastCard = demandCards[demandCards.length - 1];
      setCurrentCard(lastCard);
      setPile(prev => [...prev, ...demandCards]);
      setDemandedValue(null);
      
      if (newHand.length === 0) {
        setStatus("💻 Computer wins!");
        setGameOver(true);
        return;
      }
      
      setStatus(`💻 Computer has ${demandedVal} and plays it! Computer's turn continues...`);
      // Computer continues
      setTimeout(() => computerTurn(playerHandAfterDemand), 1200);
    } else {
      // Computer doesn't have it - draw one card, then PLAYER must play the demanded card
      const result = drawCards(computerHand, deck, 1);
      setComputerHand(result.newHand);
      setDeck(result.newDeck);
      setStatus(`💻 Computer doesn't have ${demandedVal}, draws a card. Now YOU must play ${demandedVal}!`);
      
      // Now player must play the demanded card
      setTimeout(() => handlePlayerMustPlayDemand(demandedVal, playerHandAfterDemand), 1200);
    }
  };

  const handlePlayerMustPlayDemand = (demandedVal: string, currentPlayerHand: Card[]): void => {
    const demandCards = currentPlayerHand.filter(c => c.value === demandedVal || c.suit === "🃏");
    
    if (demandCards.length > 0) {
      // Player has the demanded card(s) - auto-play them
      const newHand = currentPlayerHand.filter(c => !demandCards.includes(c));
      setPlayerHand(newHand);
      const lastCard = demandCards[demandCards.length - 1];
      setCurrentCard(lastCard);
      setPile(prev => [...prev, ...demandCards]);
      setDemandedValue(null);
      
      if (newHand.length === 0) {
        setStatus("🎉 You win!");
        setGameOver(true);
        return;
      }
      
      setStatus(`You play ${demandCards.length}x ${demandedVal} to fulfill YOUR demand! Your turn continues.`);
      setPlayerTurn(true);
    } else {
      // Player doesn't have the card they demanded - draw and lose turn
      const result = drawCards(currentPlayerHand, deck, 1);
      setPlayerHand(result.newHand);
      setDeck(result.newDeck);
      setDemandedValue(null);
      
      setStatus(`You don't have ${demandedVal} either! Drew a card. Computer's turn.`);
      setPlayerTurn(false);
      setTimeout(() => computerTurn(result.newHand), 1200);
    }
  };

  const handleComputerMustPlayDemand = (demandedVal: string, currentPlayerHand: Card[]): void => {
    const demandCards = computerHand.filter(c => c.value === demandedVal || c.suit === "🃏");
    
    if (demandCards.length > 0) {
      // Computer has the demanded card(s) - auto-play them
      const newHand = computerHand.filter(c => !demandCards.includes(c));
      setComputerHand(newHand);
      const lastCard = demandCards[demandCards.length - 1];
      setCurrentCard(lastCard);
      setPile(prev => [...prev, ...demandCards]);
      setDemandedValue(null);
      
      if (newHand.length === 0) {
        setStatus("💻 Computer wins!");
        setGameOver(true);
        return;
      }
      
      setStatus(`💻 Computer plays ${demandCards.length}x ${demandedVal} to fulfill ITS demand! Computer continues.`);
      // Computer continues
      setTimeout(() => computerTurn(currentPlayerHand), 1200);
    } else {
      // Computer doesn't have the card it demanded - draw and lose turn
      const result = drawCards(computerHand, deck, 1);
      setComputerHand(result.newHand);
      setDeck(result.newDeck);
      setDemandedValue(null);
      
      setStatus(`💻 Computer doesn't have ${demandedVal} either! Drew a card. Your turn.`);
      setPlayerTurn(true);
    }
  };

  const handlePlayerDemandResponse = (demandedVal: string, computerHandCurrent: Card[]): void => {
    const demandCards = playerHand.filter(c => c.value === demandedVal || c.suit === "🃏");
    
    if (demandCards.length > 0) {
      // Player has the demanded card(s) - auto-play them
      const newHand = playerHand.filter(c => !demandCards.includes(c));
      setPlayerHand(newHand);
      const lastCard = demandCards[demandCards.length - 1];
      setCurrentCard(lastCard);
      setPile(prev => [...prev, ...demandCards]);
      setDemandedValue(null);
      
      if (newHand.length === 0) {
        setStatus("🎉 You win!");
        setGameOver(true);
        return;
      }
      
      setStatus(`You play ${demandCards.length}x ${demandCards[0].value}${demandCards[0].suit} to fulfill demand! Computer continues...`);
      
      // Computer continues after player fulfills demand (not recursive - continue from where it was)
      setPlayerTurn(false);
      setTimeout(() => computerTurn(newHand), 1200);
    } else {
      // Player doesn't have it - draw one card
      const result = drawCards(playerHand, deck, 1);
      setPlayerHand(result.newHand);
      setDeck(result.newDeck);
      setDemandedValue(null);
      
      setStatus(`You don't have ${demandedVal}, drew a card. Computer continues...`);
      
      // Computer continues after player draws
      setPlayerTurn(false);
      setTimeout(() => computerTurn(result.newHand), 1200);
    }
  };

  const computerTurn = (currentPlayerHand: Card[]): void => {
    if (gameOver) return;

    // Ensure playerTurn is false during computer's turn
    setPlayerTurn(false);

    // Handle demand from player's 8
    if (demandedValue) {
      handleComputerDemandResponseFor8(demandedValue, currentPlayerHand);
      return;
    }

    // Find all playable cards with same value
    const playableByValue: Record<string, Card[]> = {};
    computerHand.forEach(card => {
      if (canPlay(card, currentCard)) {
        if (!playableByValue[card.value]) {
          playableByValue[card.value] = [];
        }
        playableByValue[card.value].push(card);
      }
    });

    if (Object.keys(playableByValue).length > 0) {
      let cardsToPlay: Card[] | null = null;

      // Prioritize special cards
      if (playableByValue["A"]) {
        cardsToPlay = playableByValue["A"];
      } else if (playableByValue["2"]) {
        cardsToPlay = playableByValue["2"];
      } else if (playableByValue["10"]) {
        cardsToPlay = playableByValue["10"];
      } else if (playableByValue["Joker"]) {
        cardsToPlay = playableByValue["Joker"];
      } else if (playableByValue["8"]) {
        cardsToPlay = [playableByValue["8"][0]]; // Only play one 8
      } else {
        const bestValue = Object.keys(playableByValue).reduce((a, b) =>
          playableByValue[a].length > playableByValue[b].length ? a : b
        );
        cardsToPlay = playableByValue[bestValue];
      }

      const newHand = computerHand.filter(c => !cardsToPlay!.includes(c));
      setComputerHand(newHand);
      const lastCard = cardsToPlay![cardsToPlay!.length - 1];
      setCurrentCard(lastCard);
      setPile(prev => [...prev, ...cardsToPlay!]);

      const cardDesc = cardsToPlay!.length > 1 ?
        `${cardsToPlay!.length}x ${cardsToPlay![0].value}` :
        `${lastCard.value}${lastCard.suit}`;

      if (newHand.length === 0) {
        setStatus("💻 Computer wins!");
        setGameOver(true);
        return;
      }

      // Handle special cards with fixed draw amounts
      const has2 = cardsToPlay!.some(c => c.value === "2");
      const has10 = cardsToPlay!.some(c => c.value === "10");
      const hasJoker = cardsToPlay!.some(c => c.suit === "🃏");
      const hasAce = cardsToPlay!.some(c => c.value === "A");

      if (has2) {
        const result = drawCards(currentPlayerHand, deck, 2); // Always draw 2 cards
        setPlayerHand(result.newHand);
        setDeck(result.newDeck);
        setStatus(`💻 Computer plays ${cardDesc}! You draw 2 cards and are skipped. Computer plays again!`);
        setTimeout(() => computerTurn(result.newHand), 1500);
        return;
      }

      if (has10) {
        const result = drawCards(currentPlayerHand, deck, 4); // Always draw 4 cards
        setPlayerHand(result.newHand);
        setDeck(result.newDeck);
        setStatus(`💻 Computer plays ${cardDesc}! You draw 4 cards and are skipped. Computer plays again!`);
        setTimeout(() => computerTurn(result.newHand), 1500);
        return;
      }

      if (hasJoker) {
        const result = drawCards(currentPlayerHand, deck, 5); // Always draw 5 cards
        setPlayerHand(result.newHand);
        setDeck(result.newDeck);
        setStatus(`💻 Computer plays ${cardDesc}! You draw 5 cards and are skipped. Computer plays again!`);
        setTimeout(() => computerTurn(result.newHand), 1500);
        return;
      }

      if (hasAce) {
        setStatus(`💻 Computer plays ${cardDesc}! You are skipped. Computer plays again!`);
        setPlayerTurn(false);
        setTimeout(() => computerTurn(currentPlayerHand), 1500);
        return;
      }

      if (lastCard.value === "8") {
        const validValues = values.filter(v => v !== "8");
        const demanded = validValues[Math.floor(Math.random() * validValues.length)];
        setDemandedValue(demanded);
        setStatus(`💻 Computer plays 8 and demands: ${demanded}! Checking your hand...`);

        const demandCards = currentPlayerHand.filter(c => c.value === demanded || c.suit === "🃏");

        if (demandCards.length > 0) {
          setTimeout(() => {
            const newPlayerHand = currentPlayerHand.filter(c => !demandCards.includes(c));
            setPlayerHand(newPlayerHand);
            const lastCard = demandCards[demandCards.length - 1];
            setCurrentCard(lastCard);
            setPile(prev => [...prev, ...demandCards]);
            setDemandedValue(null);

            if (newPlayerHand.length === 0) {
              setStatus("🎉 You win!");
              setGameOver(true);
              return;
            }

            setStatus(`You have ${demanded} and play it! Computer's turn continues...`);
            setTimeout(() => computerTurn(newPlayerHand), 1200);
          }, 1200);
        } else {
          setTimeout(() => {
            const result = drawCards(currentPlayerHand, deck, 1);
            setPlayerHand(result.newHand);
            setDeck(result.newDeck);
            setStatus(`You don't have ${demanded}, drew a card. Computer must now play ${demanded}!`);
            setTimeout(() => handleComputerMustPlayDemand(demanded, result.newHand), 1200);
          }, 1200);
        }
        return;
      }

      setStatus(`💻 Computer plays ${cardDesc}. Your turn!`);
      setPlayerTurn(true);
    } else {
      const result = drawCards(computerHand, deck, 1);
      setComputerHand(result.newHand);
      setDeck(result.newDeck);
      setStatus("💻 Computer draws a card. Your turn!");
      setPlayerTurn(true);
    }
  };

  const handleDraw = (): void => {
    if (!playerTurn || gameOver) return;
    setSelectedCards([]);

    // Normal draw - player draws and turn passes to computer
    const result = drawCards(playerHand, deck, 1);
    setPlayerHand(result.newHand);
    setDeck(result.newDeck);
    setStatus("You drew a card. Computer's turn!");
    setPlayerTurn(false);
    setTimeout(() => computerTurn(result.newHand), 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 to-green-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Inter-Demande</h1>
        
        <div className="bg-green-800 rounded-lg p-6 mb-6">
          <div className="text-center mb-4">
            <div className="text-white text-sm mb-2">Computer has {computerHand.length} cards</div>
            <div className="flex justify-center gap-2">
              {computerHand.map((_, i) => (
                <div key={i} className="w-12 h-16 bg-blue-900 rounded border-2 border-white"></div>
              ))}
            </div>
          </div>
          
          <div className="text-center my-8">
            <div className="text-white text-xl mb-2">Current Card</div>
            <div className="inline-block bg-white rounded-lg px-8 py-6 text-4xl font-bold shadow-lg">
              {currentCard ? `${currentCard.value}${currentCard.suit}` : ''}
            </div>
            {demandedValue && (
              <div className="text-yellow-300 text-lg mt-2 font-semibold">
                Demanded: {demandedValue}
              </div>
            )}
          </div>
          
          <div className="text-center text-white text-lg mb-4 min-h-8">
            {status}
          </div>
          
          <div className="text-center mb-4">
            <div className="text-white text-sm mb-2">Your Hand (Click to select, then Play Selected)</div>
            <div className="flex flex-wrap justify-center gap-2">
              {playerHand.map((card, i) => (
                <button
                  key={i}
                  onClick={() => toggleCardSelection(i)}
                  disabled={!playerTurn || gameOver}
                  className={`rounded-lg px-4 py-3 text-xl font-bold shadow-lg transition-all hover:scale-105 ${
                    selectedCards.includes(i)
                      ? 'bg-yellow-400 border-4 border-yellow-600'
                      : 'bg-white hover:bg-gray-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {card.value}{card.suit}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={playSelectedCards}
              disabled={!playerTurn || gameOver || selectedCards.length === 0}
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Play Selected ({selectedCards.length})
            </button>
            <button
              onClick={handleDraw}
              disabled={!playerTurn || gameOver}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Draw Card
            </button>
            <button
              onClick={startGame}
              className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600"
            >
              New Game
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 text-sm">
          <h3 className="font-bold mb-2">Congolese Inter-Demande Rules:</h3>
          <ul className="space-y-1 text-gray-700">
            <li><strong>2:</strong> Opponent picks 2 cards and is skipped - you play again!</li>
            <li><strong>10:</strong> Opponent picks 4 cards and is skipped - you play again!</li>
            <li><strong>Joker:</strong> Opponent picks 5 cards and is skipped - you play again!</li>
            <li><strong>Ace:</strong> Skip opponent - you play again!</li>
            <li><strong>8 (Inter-demande):</strong> Can be played on ANY card! Demand a value. If opponent has it, they play it and continue. If not, they draw 1 card and YOU must play the card you demanded!</li>
            <li><strong>Multiple cards:</strong> You can play multiple cards of the same value at once!</li>
            <li><strong>Normal play:</strong> Match suit or value, or play a Joker/8. Any card can be played after a Joker!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;