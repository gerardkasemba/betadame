"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaCoins, FaUserFriends, FaCrown, FaHome } from 'react-icons/fa';
import { createClient } from '@/lib/supabase/client';
import { Clock, Trophy, Users } from 'lucide-react';
import { TbPlayCardStar } from "react-icons/tb";
import { 
  Card, 
  InterCardGame, 
  GameState as InterCardGameState,
  values 
} from '@/lib/inter-card';

interface GameRoom {
  id: string;
  name: string;
  bet_amount: number;
  status: string;
  board_state: any;
  current_player: number;
  winner_id: string | null;
}

interface GameParticipant {
  id: string;
  user_id: string;
  player_number: number;
  is_ready: boolean;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  balance: number;
}

interface GameResult {
  title: string;
  message: string;
  type: 'win' | 'lose';
  prize?: number;
}

export default function InterCardGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameRoomId = params.id as string;
  
  const [gameState, setGameState] = useState<InterCardGameState>({
    deck: [],
    player1Hand: [],
    player2Hand: [],
    pile: [],
    currentCard: null,
    playerTurn: 1,
    demandedValue: null,
    demandingPlayer: null,
    status: "En attente du début de la partie",
    gameOver: false
  });
  
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [showGameResult, setShowGameResult] = useState<GameResult | null>(null);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [pendingDemandState, setPendingDemandState] = useState<InterCardGameState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const supabase = createClient();

  const currentPlayerHand = playerNumber === 1 
    ? (gameState.player1Hand || []) 
    : (gameState.player2Hand || []);
  
  const opponentHand = playerNumber === 1 
    ? (gameState.player2Hand || []) 
    : (gameState.player1Hand || []);
  
  const opponentPlayerNumber = playerNumber === 1 ? 2 : 1;
  const isMyTurn = playerNumber === gameState.playerTurn && !gameState.gameOver;
  const isSpectator = playerNumber === null || playerNumber === undefined;

  const totalBetAmount = gameRoom ? (gameRoom.bet_amount || 0) * Math.max(participants.length, 2) : 0;

  // Timer effect
  useEffect(() => {
    if (gameRoom?.status !== 'playing' || gameState.gameOver || !isMyTurn) {
      setTimeLeft(60);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isMyTurn, gameRoom?.status, gameState.gameOver]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    if (gameRoomId) {
      fetchInitialData();
    }
  }, [gameRoomId]);

  useEffect(() => {
    if (!gameRoomId) return;

    const gameChannel = supabase
      .channel(`game-room-${gameRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${gameRoomId}`,
        },
        (payload) => handleGameRoomUpdate(payload.new as GameRoom)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_room_id=eq.${gameRoomId}`,
        },
        () => fetchParticipants()
      )
      .subscribe();

    return () => {
      gameChannel.unsubscribe();
    };
  }, [gameRoomId]);

  const handleTimeout = async () => {
    if (!userProfile || !gameRoom || gameState.gameOver || !playerNumber) return;

    if (gameState.demandedValue) {
      // Timeout during a demand: force a draw
      const demandingPlayerNum = gameState.demandingPlayer || opponentPlayerNumber;
      const newState = InterCardGame.processDemandResponse(gameState, demandingPlayerNum, null);
      await updateGameRoomState(newState);
      showToast('Temps écoulé! Vous piochez une carte.', 'info');
    } else {
      // Normal timeout: opponent wins
      const winnerPlayerNumber = opponentPlayerNumber;
      const winnerUserId = participants.find(p => p.player_number === winnerPlayerNumber)?.user_id || null;

      await supabase
        .from('game_rooms')
        .update({
          status: 'finished',
          winner_id: winnerUserId,
        })
        .eq('id', gameRoomId);

      if (winnerUserId && totalBetAmount > 0) {
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('balance, games_played')
          .eq('id', winnerUserId)
          .single();

        if (winnerProfile) {
          await supabase
            .from('profiles')
            .update({
              balance: Number(winnerProfile.balance) + totalBetAmount,
              games_played: (winnerProfile.games_played || 0) + 1
            })
            .eq('id', winnerUserId);
        }

        const { data: loserProfile } = await supabase
          .from('profiles')
          .select('games_played')
          .eq('id', userProfile.id)
          .single();

        if (loserProfile) {
          await supabase
            .from('profiles')
            .update({
              games_played: (loserProfile.games_played || 0) + 1
            })
            .eq('id', userProfile.id);
        }
      }

      showToast('Temps écoulé! Vous avez perdu la partie.', 'error');
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await fetchUserProfile();
      await fetchGameRoom();
      await fetchParticipants();
    } catch (err) {
      showToast('Erreur lors du chargement de la partie');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Veuillez vous connecter');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      setUserProfile(profile);
      await fetchPlayerNumber(user.id);
    }
  };

  const fetchPlayerNumber = async (userId: string) => {
    const { data: participant } = await supabase
      .from('game_participants')
      .select('player_number, is_ready')
      .eq('game_room_id', gameRoomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (participant) {
      setPlayerNumber(participant.player_number);
      setIsReady(participant.is_ready);
    }
  };

  const fetchGameRoom = async () => {
    const { data: room, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', gameRoomId)
      .single();

    if (error) {
      showToast('Salle de jeu non trouvée');
      return;
    }

    setGameRoom(room);
    
    if (room.board_state && 
        typeof room.board_state === 'object' && 
        Array.isArray(room.board_state.player1Hand)) {
      handleGameRoomUpdate(room);
    } else if (room.status === 'playing') {
      const initialState = InterCardGame.createInitialGameState();
      await updateGameRoomState(initialState);
    }
  };

  const fetchParticipants = async () => {
    const { data: participantsData } = await supabase
      .from('game_participants')
      .select('id, user_id, player_number, is_ready')
      .eq('game_room_id', gameRoomId)
      .order('player_number', { ascending: true });

    if (participantsData) {
      const participantsWithProfiles = await Promise.all(
        participantsData.map(async (participant) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', participant.user_id)
            .single();

          return {
            ...participant,
            profiles: profile || undefined,
          };
        })
      );

      setParticipants(participantsWithProfiles);

      if (gameRoom?.status === 'waiting' && 
          participantsWithProfiles.length >= 2 && 
          participantsWithProfiles.every(p => p.is_ready)) {
        startGame();
      }
    }
  };

  const handleGameRoomUpdate = (room: GameRoom) => {
    setGameRoom(room);

    if (room.board_state && typeof room.board_state === 'object') {
      const loadedState = room.board_state as InterCardGameState;
      const repairedState: InterCardGameState = {
        deck: Array.isArray(loadedState.deck) ? loadedState.deck : [],
        player1Hand: Array.isArray(loadedState.player1Hand) ? loadedState.player1Hand : [],
        player2Hand: Array.isArray(loadedState.player2Hand) ? loadedState.player2Hand : [],
        pile: Array.isArray(loadedState.pile) ? 
              loadedState.pile.filter(card => card !== null) : [],
        currentCard: loadedState.currentCard && 
                    typeof loadedState.currentCard === 'object' && 
                    loadedState.currentCard.suit && 
                    loadedState.currentCard.value ? 
                    loadedState.currentCard : null,
        playerTurn: typeof loadedState.playerTurn === 'number' ? loadedState.playerTurn : 1,
        demandedValue: loadedState.demandedValue || null,
        demandingPlayer: loadedState.demandingPlayer || null,
        status: loadedState.status || "Partie en cours",
        gameOver: Boolean(loadedState.gameOver)
      };

      setGameState(repairedState);
      
      if (repairedState.demandedValue && playerNumber === repairedState.playerTurn && !isSpectator) {
        checkDemandResponse(repairedState);
      }
    } else if (room.status === 'playing') {
      const initialState = InterCardGame.createInitialGameState();
      updateGameRoomState(initialState);
    }

    if (room.status === 'finished' && gameRoom?.status !== 'finished') {
      handleGameFinish(room.winner_id);
    }
  };

  const checkDemandResponse = (state: InterCardGameState) => {
    if (!state.demandedValue || !playerNumber) return;

    if (playerNumber === state.demandingPlayer) {
      showToast(
        `Vous devez jouer ${state.demandedValue}, un 8, ou un Joker. Si vous ne l'avez pas, vous piochez automatiquement.`,
        'info'
      );
    } else {
      const canFulfill = InterCardGame.canFulfillDemand(state, playerNumber);
      if (!canFulfill) {
        showToast(
          `Vous n'avez pas ${state.demandedValue}. Cliquez sur "Piocher" pour continuer.`,
          'info'
        );
      } else {
        showToast(
          `Jouez ${state.demandedValue}, un 8, ou un Joker, ou cliquez sur "Piocher".`,
          'info'
        );
      }
    }
  };

  const updateGameRoomState = async (newGameState: InterCardGameState) => {
    if (!gameRoom) return;

    const cleanGameState: InterCardGameState = {
      ...newGameState,
      deck: newGameState.deck || [],
      player1Hand: newGameState.player1Hand || [],
      player2Hand: newGameState.player2Hand || [],
      pile: newGameState.pile || [],
      currentCard: newGameState.currentCard || null,
      demandedValue: newGameState.demandedValue || null,
      demandingPlayer: newGameState.demandingPlayer || null,
      status: newGameState.status || "Partie en cours",
      playerTurn: newGameState.playerTurn || 1,
      gameOver: newGameState.gameOver || false
    };
    
    const { error } = await supabase
      .from('game_rooms')
      .update({
        board_state: cleanGameState,
        current_player: cleanGameState.playerTurn,
        status: cleanGameState.gameOver ? 'finished' : 'playing',
        winner_id: cleanGameState.gameOver ? getWinnerUserId(cleanGameState) : null
      })
      .eq('id', gameRoomId);

    if (error) {
      console.error('Update error:', error);
      showToast('Erreur lors de la mise à jour de la partie. Veuillez réessayer.', 'error');
      return false;
    }
    return true;
  };

  const getWinnerUserId = (state: InterCardGameState): string | null => {
    if (state.player1Hand.length === 0) {
      return participants.find(p => p.player_number === 1)?.user_id || null;
    } else if (state.player2Hand.length === 0) {
      return participants.find(p => p.player_number === 2)?.user_id || null;
    }
    return null;
  };

  const markAsReady = async () => {
    if (!userProfile) return;

    const { error } = await supabase
      .from('game_participants')
      .update({ is_ready: true })
      .eq('game_room_id', gameRoomId)
      .eq('user_id', userProfile.id);

    if (error) {
      showToast('Erreur lors de la mise à jour du statut');
      return;
    }

    setIsReady(true);
    showToast('Vous êtes prêt!', 'success');
  };

  const startGame = async () => {
    const initialState = InterCardGame.createInitialGameState();
    
    if (!initialState.currentCard && initialState.pile.length > 0) {
      initialState.currentCard = initialState.pile[initialState.pile.length - 1];
    }
    
    await updateGameRoomState(initialState);
    showToast('La partie commence!', 'success');
  };

  const toggleCardSelection = (index: number): void => {
    if (!isMyTurn || gameState.gameOver) return;

    if (selectedCards.includes(index)) {
      setSelectedCards(selectedCards.filter(i => i !== index));
    } else {
      setSelectedCards([...selectedCards, index]);
    }
  };

  const playSelectedCards = async (): Promise<void> => {
    if (!isMyTurn || gameState.gameOver || selectedCards.length === 0) {
      showToast('Aucune carte sélectionnée ou ce n\'est pas votre tour');
      return;
    }

    const cardsToPlay = selectedCards.map(i => currentPlayerHand[i]).filter(card => card !== null && card !== undefined);

    if (cardsToPlay.length === 0) {
      showToast('Aucune carte valide sélectionnée');
      return;
    }

    const validation = InterCardGame.validateMove(gameState, cardsToPlay, playerNumber!);
    if (!validation.isValid) {
      showToast(validation.error || 'Mouvement invalide');
      return;
    }

    const newPlayerHand = currentPlayerHand.filter((card, i) => !selectedCards.includes(i) && card !== null && card !== undefined);
    const lastCard = cardsToPlay[cardsToPlay.length - 1];
    const newPile = [...gameState.pile.filter(card => card !== null && card !== undefined), ...cardsToPlay];

    let newGameState: InterCardGameState = {
      ...gameState,
      pile: newPile,
      currentCard: lastCard,
    };

    if (playerNumber === 1) {
      newGameState.player1Hand = newPlayerHand;
    } else {
      newGameState.player2Hand = newPlayerHand;
    }

    const winner = InterCardGame.checkWinCondition(newGameState);
    if (winner) {
      newGameState.gameOver = true;
      newGameState.status = `🎉 Joueur ${winner} gagne!`;
      newGameState.demandedValue = null;
      newGameState.demandingPlayer = null;

      const winnerUserId = participants.find(p => p.player_number === winner)?.user_id || null;

      const { error: roomError } = await supabase
        .from('game_rooms')
        .update({
          status: 'finished',
          winner_id: winnerUserId,
          board_state: newGameState
        })
        .eq('id', gameRoomId);

      if (roomError) {
        console.error('Error updating game room:', roomError);
      }

      if (winnerUserId && totalBetAmount > 0) {
        const { data: winnerProfile } = await supabase
          .from('profiles')
          .select('balance, games_played')
          .eq('id', winnerUserId)
          .single();

        if (winnerProfile) {
          await supabase
            .from('profiles')
            .update({
              balance: Number(winnerProfile.balance) + totalBetAmount,
              games_played: (winnerProfile.games_played || 0) + 1
            })
            .eq('id', winnerUserId);
        }

        const loserId = participants.find(p => p.user_id !== winnerUserId)?.user_id;
        if (loserId) {
          const { data: loserProfile } = await supabase
            .from('profiles')
            .select('games_played')
            .eq('id', loserId)
            .single();

          if (loserProfile) {
            await supabase
              .from('profiles')
              .update({
                games_played: (loserProfile.games_played || 0) + 1
              })
              .eq('id', loserId);
          }
        }

        if (winnerUserId === userProfile?.id) {
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userProfile.id)
            .single();

          if (updatedProfile) {
            setUserProfile(updatedProfile);
          }
        }
      }

      showToast('🎉 Vous avez gagné la partie!', 'success');
      setSelectedCards([]);
      return;
    }

    const effects = InterCardGame.getSpecialCardEffects(cardsToPlay);

    if (effects.has8) {
      setPendingDemandState(newGameState);
      setShowDemandModal(true);
      setSelectedCards([]);
    } else if (effects.has2 || effects.has10 || effects.hasJoker || effects.hasAce) {
      const opponentHand = playerNumber === 1 ? newGameState.player2Hand : newGameState.player1Hand;
      const opponent = opponentPlayerNumber;

      const drawAmount = InterCardGame.calculateDrawAmount(effects, cardsToPlay);

      if (drawAmount > 0 && (effects.has2 || effects.has10 || effects.hasJoker)) {
        const { newHand, newDeck, newPile: updatedPile } = InterCardGame.drawCards(
          opponentHand,
          newGameState.deck,
          newGameState.pile,
          drawAmount
        );

        if (opponent === 1) {
          newGameState.player1Hand = newHand;
        } else {
          newGameState.player2Hand = newHand;
        }
        newGameState.deck = newDeck;
        newGameState.pile = updatedPile;
      }

      newGameState.status = InterCardGame.getSpecialCardStatus(effects, true, cardsToPlay);
      newGameState.demandedValue = null;
      newGameState.demandingPlayer = null;

      const cardCount = cardsToPlay.length;
      if (cardCount > 1) {
        showToast(`${cardCount} cartes spéciales! Adversaire pioche ${drawAmount} cartes. Vous rejouez!`, 'success');
      } else {
        showToast('Carte spéciale! Vous rejouez.', 'success');
      }
      setSelectedCards([]);
      await updateGameRoomState(newGameState);
    } else {
      newGameState.playerTurn = opponentPlayerNumber;
      newGameState.status = `Tour du Joueur ${opponentPlayerNumber}`;
      if (gameState.demandedValue && playerNumber === gameState.demandingPlayer) {
        newGameState.demandedValue = null;
        newGameState.demandingPlayer = null;
      }
      setTimeLeft(60);
      setSelectedCards([]);
      await updateGameRoomState(newGameState);
    }
  };

  const handleDemandSelection = async (demandedValue: string) => {
    if (!pendingDemandState || !playerNumber) return;
    
    const newGameState = InterCardGame.setDemand(pendingDemandState, playerNumber, demandedValue);
    
    setShowDemandModal(false);
    setPendingDemandState(null);
    
    await updateGameRoomState(newGameState);
    showToast(`Vous demandez: ${demandedValue}`, 'info');
  };

  const handleDraw = async (): Promise<void> => {
    if (!isMyTurn || gameState.gameOver) return;

    let newGameState: InterCardGameState;

    if (gameState.demandedValue) {
      const demandingPlayerNum = gameState.demandingPlayer || opponentPlayerNumber;
      newGameState = InterCardGame.processDemandResponse(gameState, demandingPlayerNum, null);
    } else {
      const result = InterCardGame.drawCards(
        currentPlayerHand,
        gameState.deck,
        gameState.pile,
        1
      );
      newGameState = {
        ...gameState,
        deck: result.newDeck,
        pile: result.newPile,
        playerTurn: opponentPlayerNumber,
        status: `Joueur ${playerNumber} pioche. Tour du Joueur ${opponentPlayerNumber}`,
        demandedValue: null,
        demandingPlayer: null
      };
      if (playerNumber === 1) {
        newGameState.player1Hand = result.newHand;
      } else {
        newGameState.player2Hand = result.newHand;
      }
    }

    setSelectedCards([]);
    setTimeLeft(60);
    await updateGameRoomState(newGameState);
    showToast('Vous piochez une carte', 'info');
  };

  const handleResign = async () => {
    if (!userProfile || !gameRoom || !playerNumber) return;

    const winnerPlayerNumber = opponentPlayerNumber;
    const winnerUserId = participants.find(p => p.player_number === winnerPlayerNumber)?.user_id || null;
    
    const { error } = await supabase
      .from('game_rooms')
      .update({
        status: 'finished',
        winner_id: winnerUserId,
      })
      .eq('id', gameRoomId);

    if (error) {
      showToast('Erreur lors de l\'abandon');
      return;
    }

    if (winnerUserId && totalBetAmount > 0) {
      const { data: winnerProfile } = await supabase
        .from('profiles')
        .select('balance, games_played')
        .eq('id', winnerUserId)
        .single();

      if (winnerProfile) {
        await supabase
          .from('profiles')
          .update({ 
            balance: Number(winnerProfile.balance) + totalBetAmount,
            games_played: (winnerProfile.games_played || 0) + 1
          })
          .eq('id', winnerUserId);
      }

      const { data: loserProfile } = await supabase
        .from('profiles')
        .select('games_played')
        .eq('id', userProfile.id)
        .single();

      if (loserProfile) {
        await supabase
          .from('profiles')
          .update({ 
            games_played: (loserProfile.games_played || 0) + 1
          })
          .eq('id', userProfile.id);
      }
    }

    showToast('Vous avez abandonné la partie', 'info');
    setShowResignConfirm(false);
  };

  const handleGameFinish = (winnerId: string | null) => {
    if (!userProfile) return;

    const isWinner = winnerId === userProfile.id;
    const prizeAmount = isWinner ? totalBetAmount : 0;
    
    setShowGameResult({
      title: isWinner ? 'Victoire!' : 'Défaite',
      message: isWinner ? 'Félicitations! Vous avez gagné la partie!' : 'Votre adversaire a gagné la partie.',
      type: isWinner ? 'win' : 'lose',
      prize: isWinner ? prizeAmount : undefined,
    });

    if (isWinner && prizeAmount > 0) {
      supabase.rpc('update_user_balance', {
        user_id: userProfile.id,
        amount: prizeAmount,
      });
    }
  };

  const handleAfterGameAction = () => {
    setShowGameResult(null);
    router.push('/dashboard');
  };

  const renderOpponentCards = () => {
    const cardCount = opponentHand.length;
    
    if (cardCount > 4) {
      return (
        <div className="flex justify-center items-center gap-1">
          {opponentHand.slice(0, 3).map((_, i) => (
            <div key={i} className="w-12 h-16 bg-blue-900 rounded border border-white shadow"></div>
          ))}
          
          <div className="relative ml-2">
            <div className="w-10 h-14 bg-blue-800 rounded border border-white shadow-lg"></div>
            <div className="absolute -top-1 -right-1 w-10 h-14 bg-blue-700 rounded border border-white shadow-lg transform rotate-6"></div>
            <div className="absolute -top-2 -right-2 w-10 h-14 bg-blue-600 rounded border border-white shadow-lg transform rotate-12"></div>
            
            <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
              +{cardCount - 3}
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex justify-center gap-1 flex-wrap">
        {opponentHand.map((_, i) => (
          <div key={i} className="w-12 h-20 bg-blue-900 rounded border border-white shadow"></div>
        ))}
      </div>
    );
  };

  const renderPlayerHand = () => {
    return (
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {currentPlayerHand.map((card, i) => {
          const isPlayable =
            !gameState.demandedValue ||
            (playerNumber === gameState.demandingPlayer
              ? card.value === gameState.demandedValue || card.value === "8" || card.suit === "🃏"
              : card.value === gameState.demandedValue || card.value === "8" || card.suit === "🃏");

          return (
            <button
              key={i}
              onClick={() => toggleCardSelection(i)}
              disabled={!isMyTurn || gameState.gameOver || !isPlayable}
              className={`rounded-lg px-3 py-2 text-lg font-bold shadow-lg transition-all hover:scale-105 ${
                selectedCards.includes(i)
                  ? 'bg-yellow-400 border-4 border-yellow-600 text-black'
                  : !isPlayable
                  ? 'bg-gray-300 text-gray-500 opacity-40 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-100 text-black'
              } ${!isMyTurn || gameState.gameOver ? 'opacity-50 cursor-not-allowed' : ''} min-w-14 h-20`}
            >
              {card.value}{card.suit}
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-900 text-2xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm ${
            toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          } text-white px-6 py-3 rounded-lg shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 text-white hover:text-gray-200">
              ×
            </button>
          </div>
        </div>
      )}

      {showDemandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Vous avez joué un 8!</h3>
            <p className="text-sm sm:text-base text-gray-700 mb-2">Choisissez une valeur à demander:</p>
            <p className="text-xs text-red-600 mb-4 font-semibold">⚠️ Attention: Si votre adversaire pioche, vous devrez jouer cette carte!</p>
            <div className="grid grid-cols-4 gap-2">
              {values.filter(v => v !== "8").map(value => (
                <button
                  key={value}
                  onClick={() => handleDemandSelection(value)}
                  className="bg-blue-500 text-white py-2 sm:py-3 px-2 sm:px-4 rounded-lg hover:bg-blue-600 active:bg-blue-700 font-bold text-base sm:text-lg"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showGameResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-lg p-6 sm:p-8 max-w-md w-full text-center ${
            showGameResult.type === 'win' ? 'border-4 border-yellow-400' : 'border-4 border-red-400'
          }`}>
            <div className={`text-5xl sm:text-7xl mb-4 ${
              showGameResult.type === 'win' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {showGameResult.type === 'win' ? '🎉' : '😔'}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">{showGameResult.title}</h2>
            <p className="text-lg sm:text-xl text-gray-700 mb-4">{showGameResult.message}</p>
            
            {showGameResult.prize && showGameResult.type === 'win' && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2 text-yellow-800">
                  <FaCoins className="text-lg sm:text-xl" />
                  <span className="text-base sm:text-lg font-semibold">
                    Vous avez gagné {showGameResult.prize} $!
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleAfterGameAction}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-sm sm:text-base w-full sm:w-auto"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )}

      {showResignConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full">
            <h3 className="text-base sm:text-lg font-semibold mb-4 text-gray-900">Confirmation d'abandon</h3>
            <p className="text-sm sm:text-base text-gray-700 mb-4">Êtes-vous sûr de vouloir abandonner? Votre adversaire gagnera la partie.</p>
            <div className="flex gap-2">
              <button
                onClick={handleResign}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 text-sm sm:text-base"
              >
                Confirmer
              </button>
              <button
                onClick={() => setShowResignConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 text-sm sm:text-base"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-4 sm:mb-6">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-yellow-600 backdrop-blur-sm p-2 rounded-lg">
                  <TbPlayCardStar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate max-w-[150px] sm:max-w-none">
                    {gameRoom?.name || 'Jeux d\'Inter'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Mise: {gameRoom?.bet_amount || 0}$ • Pot: {totalBetAmount}$
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-yellow-600 backdrop-blur-sm hover:bg-white/30 text-white p-2 sm:p-2.5 rounded-lg transition-all"
                title="Retour"
              >
                <FaHome className="text-base sm:text-lg" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 sm:p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    gameRoom?.status === 'playing' 
                      ? isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      : gameRoom?.status === 'waiting' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-xs text-gray-600 font-medium">Statut</span>
                </div>
                <p className="text-sm sm:text-base font-bold text-gray-900">
                  {gameRoom?.status === 'playing' ? (
                    isMyTurn ? 'À vous de jouer' : "Tour adversaire"
                  ) : gameRoom?.status === 'waiting' ? (
                    `En attente (${participants.filter(p => p.is_ready).length}/2)`
                  ) : (
                    'Partie terminée'
                  )}
                </p>
              </div>

              {gameRoom?.status === 'playing' && (
                <div className={`rounded-xl p-3 sm:p-4 border-2 ${
                  isMyTurn 
                    ? timeLeft <= 10 
                      ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-300 animate-pulse' 
                      : 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className={`h-4 w-4 ${
                      isMyTurn && timeLeft <= 10 ? 'text-red-600' : isMyTurn ? 'text-green-600' : 'text-gray-600'
                    }`} />
                    <span className="text-xs text-gray-600 font-medium">Temps restant</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className={`text-2xl sm:text-3xl font-bold ${
                      isMyTurn && timeLeft <= 10 ? 'text-red-600' : isMyTurn ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {timeLeft}
                    </p>
                    <span className="text-sm text-gray-600">sec</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-1000 ${
                        timeLeft <= 10 ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(timeLeft / 60) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {userProfile && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-xl p-3 sm:p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <FaCoins className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-800 font-medium">Votre solde</span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-yellow-900">
                    {userProfile.balance?.toFixed(2) || '0.00'} $
                  </p>
                </div>
              )}

              <div className="bg-gradient-to-br from-purple-50 to-indigo-100 rounded-xl p-3 sm:p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-purple-800 font-medium">Prix total</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-purple-900">
                  {totalBetAmount} $
                </p>
              </div>
            </div>

            {gameRoom?.status === 'waiting' && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border-2 border-yellow-300">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <strong className="text-yellow-900 text-sm sm:text-base">En attente des joueurs</strong>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-yellow-800">
                          <Users className="h-4 w-4" />
                          <span className="font-semibold">{participants.filter(p => p.is_ready).length}/2 joueurs prêts</span>
                        </div>
                        {!isSpectator && (
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <span className="text-lg">{isReady ? '✅' : '⏳'}</span>
                            <span className={isReady ? 'text-green-700 font-semibold' : 'text-yellow-700'}>
                              {isReady ? 'Vous êtes prêt!' : 'Cliquez sur "Je suis prêt"'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      {!isSpectator && !isReady && (
                        <button
                          onClick={markAsReady}
                          className="flex-1 sm:flex-initial bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:from-yellow-600 hover:to-amber-600 transition-all font-semibold shadow-lg shadow-yellow-500/25 flex items-center justify-center gap-2"
                        >
                          <span className="text-lg">✓</span>
                          <span>Je suis prêt</span>
                        </button>
                      )}
                      
                      {!isSpectator && isReady && (
                        <div className="flex-1 sm:flex-initial bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 border-2 border-green-400">
                          <span className="text-lg">✅</span>
                          <span>Prêt!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <div className="bg-green-900 rounded-2xl p-6 shadow-lg mb-6">
              <div className="text-center mb-8">
                <div className="text-white text-sm mb-2">
                  {participants.find(p => p.player_number === opponentPlayerNumber)?.profiles?.username || `Joueur ${opponentPlayerNumber}`} - {opponentHand.length} cartes
                </div>
                {renderOpponentCards()}
              </div>
              
              <div className="text-center my-8">
                <div className="text-white text-xl mb-4">Carte actuelle</div>
                <div className="flex justify-center items-center">
                  <div className="relative">
                    <div className="bg-white rounded-xl w-24 h-32 flex items-center justify-center shadow-2xl border-4 border-yellow-400 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                      <div className="text-center">
                        {gameState.currentCard ? (
                          <>
                            <div className="text-3xl font-bold text-gray-900 leading-tight">
                              {gameState.currentCard.value}
                            </div>
                            <div className="text-4xl mt-1">
                              {gameState.currentCard.suit}
                            </div>
                          </>
                        ) : (
                          <div className="text-4xl text-gray-400">—</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full opacity-60"></div>
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full opacity-60"></div>
                  </div>
                </div>
                {gameState.demandedValue && (
                  <div className="mt-4">
                    <div className="text-yellow-300 text-lg font-semibold bg-black/30 rounded-full py-2 px-6 inline-block">
                      🎯 Demande: {gameState.demandedValue}
                    </div>
                    {gameState.demandingPlayer && (
                      <div className="text-white text-sm mt-2">
                        Par Joueur {gameState.demandingPlayer}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-center text-white text-lg mb-8 min-h-8 bg-black/30 rounded-lg py-3">
                {gameState.status}
              </div>

              <div className="text-center">
                <div className="text-white text-sm mb-2">
                  Votre main ({currentPlayerHand.length} cartes) - {participants.find(p => p.player_number === playerNumber)?.profiles?.username || `Joueur ${playerNumber}`}
                </div>
                
                {gameState.demandedValue && isMyTurn && (
                  <div className="bg-red-500 text-white px-4 py-2 rounded-lg mb-3 font-bold animate-pulse">
                    {playerNumber === gameState.demandingPlayer ? (
                      <>⚠️ Vous devez jouer: {gameState.demandedValue}, 8, ou Joker (si vous n'avez pas, vous piochez automatiquement)</>
                    ) : (
                      <>⚠️ Vous devez jouer: {gameState.demandedValue}, 8, ou Joker, sinon piocher</>
                    )}
                  </div>
                )}
                
                {renderPlayerHand()}

                {gameRoom?.status === 'playing' && !isSpectator && (
                  <div className="flex justify-center gap-4 flex-wrap">
                    <button
                      onClick={playSelectedCards}
                      disabled={!isMyTurn || gameState.gameOver || selectedCards.length === 0}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Jouer ({selectedCards.length})
                    </button>
                    <button
                      onClick={handleDraw}
                      disabled={!isMyTurn || gameState.gameOver}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Piocher une carte"
                    >
                      Piocher
                    </button>
                    <button
                      onClick={() => setShowResignConfirm(true)}
                      disabled={gameState.gameOver}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                    >
                      Abandonner
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg">
              <h3 className="font-bold text-lg mb-3 text-gray-900">Règles du Jeux d'Inter:</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <ul className="space-y-2">
                    <li><strong>2:</strong> Adversaire pioche 2 cartes × nombre de 2 joués</li>
                    <li><strong>10:</strong> Adversaire pioche 4 cartes × nombre de 10 joués</li>
                    <li><strong>Joker:</strong> Adversaire pioche 5 cartes × nombre de Jokers (Reset)</li>
                    <li><strong>As:</strong> Adversaire passe son tour</li>
                  </ul>
                </div>
                <div>
                  <ul className="space-y-2">
                    <li><strong>8 (Inter-demande):</strong> Demandez une valeur</li>
                    <li><strong>Réponse à un 8:</strong> Jouez la valeur demandée, un 8, ou un Joker, ou piochez 1 carte</li>
                    <li><strong>Si adversaire pioche:</strong> Vous devez jouer la carte demandée (ou piochez si vous ne l'avez pas)</li>
                    <li><strong>8 vs 8:</strong> Un 8 annule un autre 8 - nouvelle demande!</li>
                    <li><strong>Multi-cartes:</strong> Multipliez les effets!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaCrown className="mr-2" />
                Détails de la partie
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-900">Statut:</span>
                  <span className={`font-semibold ${
                    gameRoom?.status === 'playing' ? 'text-green-600' :
                    gameRoom?.status === 'finished' ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {gameRoom?.status === 'playing' ? 'En cours' :
                     gameRoom?.status === 'finished' ? 'Terminé' : 'En attente'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-900">Votre rôle:</span>
                  <span className="font-semibold text-gray-900">
                    {isSpectator ? 'Spectateur' : `Joueur ${playerNumber}`}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-900">Tour actuel:</span>
                  <span className="font-semibold text-gray-900">
                    Joueur {gameState.playerTurn}
                    {isMyTurn && ' (Vous)'}
                  </span>
                </div>
                
                {gameRoom?.status === 'playing' && isMyTurn && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Temps restant:</span>
                    <span className={`font-semibold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                      {timeLeft}s
                    </span>
                  </div>
                )}
                
                <div className="pt-3 mt-3 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-semibold">Mise totale:</span>
                    <span className="text-lg font-bold text-gray-900">{totalBetAmount} $</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 text-right">
                    Le gagnant remporte {totalBetAmount} $
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/90 rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaUserFriends className="mr-2" />
                Participants
              </h3>
              
              <div className="space-y-3">
                {participants.map(participant => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      participant.user_id === userProfile?.id 
                        ? 'bg-blue-500/20 border border-blue-300' 
                        : 'bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow ${
                        participant.player_number === 1 ? 'bg-gradient-to-br from-red-500 to-red-600' : 
                        'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        {participant.player_number}
                      </div>
                      
                      <div>
                        <div className="font-semibold text-gray-900">
                          {participant.profiles?.username || `Joueur ${participant.player_number}`}
                        </div>
                        <div className="text-xs text-gray-600">
                          {participant.is_ready ? 'Prêt ✓' : 'En attente'}
                        </div>
                      </div>
                    </div>
                    
                    {participant.user_id === userProfile?.id && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">Vous</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}