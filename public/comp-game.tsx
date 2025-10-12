// app/dashboard/game/p/[id]/page.tsx - UPDATED FOR COMPUTER JOIN TIMER FOR ALL GAME TYPES
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaCoins, FaUserFriends, FaHome, FaArrowLeft } from 'react-icons/fa';
import { ProfessionalCheckersGame, type GameState, type Piece, type Position, type Move } from '@/lib/games';
import { createClient } from '@/lib/supabase/client';
import { GameAnalysis } from '@/lib/games';
import GameBoard from '../app/dashboard/game/components/GameBoard';
import { ADMIN_COMPUTER_PLAYER, ComputerPlayer } from '@/lib/computerPlayer';

interface GameRoom {
  id: string;
  name: string;
  board_state: any;
  current_player: number;
  status: string;
  winner_id: string | null;
  created_by: string;
  current_players: number;
  max_players: number;
  created_at: string;
  bet_amount: number;
  region: string;
  game_type: 'quick' | 'invitation';
  invitation_code?: string;
}

interface GameParticipant {
  id: string;
  user_id: string;
  player_number: number;
  is_ready: boolean;
  profiles?: {
    username: string;
    avatar_url: string;
    rating?: number;
  };
}

interface UserProfile {
  id: string;
  username: string;
  balance: number;
  avatar_url: string;
  rating?: number;
}

interface ExtendedGameState extends GameState {
  selectedPiece: Position | null;
  validMoves: Move[];
}

interface OpponentMove {
  from: Position;
  to: Position;
  timestamp: number;
}

interface GameResult {
  title: string; 
  message: string; 
  type: 'win' | 'lose' | 'draw';
  reason?: string;
  prize?: number;
}

const translations = {
  waitingForPlayers: "En attente des joueurs",
  playersReady: "joueurs prêts",
  imReady: "Je suis prêt",
  ready: "Prêt",
  startGame: "Commencer la partie",
  gameFinished: "Partie terminée",
  playerWins: "Joueur {player} gagne!",
  currentTurn: "Tour actuel: Joueur {player}",
  spectating: "En spectateur",
  yourTurn: "Votre tour",
  opponentTurn: "Tour de l'adversaire",
  timeRemaining: "Temps restant: {time}s",
  makeMove: "Faites votre mouvement!",
  waitingOpponent: "En attente de l'adversaire...",
  status: "Statut",
  waiting: "en attente",
  playing: "en cours",
  finished: "terminé",
  player: "Joueur",
  spectator: "Spectateur",
  markReady: "Marquer comme prêt",
  resign: "Abandonner",
  resignConfirmation: "Êtes-vous sûr de vouloir abandonner? Votre adversaire gagnera la partie.",
  confirm: "Confirmer",
  cancel: "Annuler",
  error: "Erreur",
  notYourPiece: "Ce n'est pas votre pièce",
  selectPiece: "Sélectionnez une de vos pièces",
  gameNotFound: "Salle de jeu non trouvée",
  pleaseSignIn: "Veuillez vous connecter",
  moveRecorded: "Mouvement enregistré avec succès!",
  gameStarted: "Partie commencée!",
  resignSuccess: "Vous avez abandonné la partie",
  participants: "Participants",
  yourRole: "Votre rôle",
  currentPlayer: "Joueur actuel",
  yourTimer: "Votre chrono",
  gameAnalysis: "Analyse de la partie",
  winProbability: "Probabilité de victoire",
  advantage: "Avantage",
  forcedWin: "Victoire forcée en {moves} coups",
  materialAdvantage: "Avantage matériel",
  positionalAdvantage: "Avantage positionnel",
  prizePool: "Mise totale",
  potentialWin: "Gain potentiel",
  winnerGets: "Le gagnant remporte",
  quickGame: "Partie rapide",
  invitationGame: "Partie sur invitation",
  victoryByCheckmate: "Victoire par échec et mat!",
  victoryByResignation: "Victoire par abandon!",
  victoryByTimeout: "Victoire par temps écoulé!",
  victoryByMaterial: "Victoire par avantage matériel!",
  draw: "Match nul!",
  yourVictory: "Votre victoire!",
  yourDefeat: "Défaite",
  opponentMove: "L'adversaire a déplacé de {from} à {to}",
  rating: "Classement",
  quickMatch: "Match rapide",
  inviteOnly: "Sur invitation",
  joinWithCode: "Rejoindre avec code",
  shareInvite: "Partager l'invitation",
  copyInviteLink: "Copier le lien d'invitation",
  inviteCopied: "Lien d'invitation copié!",
  waitingForOpponent: "En attente d'un adversaire...",
  youWon: "Vous avez gagné {amount} €!",
  youLost: "Vous avez perdu {amount} €",
  rematch: "Revanche",
  backToLobby: "Retour au lobby",
  backToDashboard: "Retour au tableau de bord",
  invalidMove: "Mouvement invalide",
  backwardMoveNotAllowed: "Les pièces régulières ne peuvent pas reculer sauf pour capturer",
  captureMandatory: "Une capture est obligatoire!",
  noMovesAvailable: "Aucun mouvement disponible pour cette pièce",
  pieceBlocked: "Pièce bloquée",
  selectValidPiece: "Sélectionnez une pièce valide",
};

const getTranslation = (key: keyof typeof translations, params?: Record<string, string>): string => {
  let translation = translations[key];
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(`{${param}}`, value);
    });
  }
  return translation;
};

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameRoomId = params.id as string;

  const [gameState, setGameState] = useState<ExtendedGameState>(() => {
    try {
      const baseState = ProfessionalCheckersGame.createGameState();
      return {
        ...baseState,
        selectedPiece: null,
        validMoves: [],
      };
    } catch (err) {
      console.error('Error initializing game state:', err);
      return {
        board: Array(10).fill(null).map(() => Array(10).fill(null)),
        currentPlayer: ProfessionalCheckersGame.PLAYER1,
        turnNumber: 1,
        status: 'active',
        winner: null,
        lastMove: null,
        moveHistory: [],
        capturedPieces: [
          { player: ProfessionalCheckersGame.PLAYER1, count: 0 },
          { player: ProfessionalCheckersGame.PLAYER2, count: 0 },
        ],
        gameType: 'standard',
        consecutiveNonCaptureMoves: 0,
        selectedPiece: null,
        validMoves: [],
      };
    }
  });
  const COMPUTER_JOIN_DELAY = 1 * 60 * 1000; // 1 minute in milliseconds

  const [gameAnalysis, setGameAnalysis] = useState<GameAnalysis | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [animatingPiece, setAnimatingPiece] = useState<{ piece: Piece; from: Position; to: Position } | null>(null);
  const [opponentMoves, setOpponentMoves] = useState<OpponentMove[]>([]);
  const [showGameResult, setShowGameResult] = useState<GameResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [opponentSelectedPiece, setOpponentSelectedPiece] = useState<Position | null>(null);
  const [opponentValidMoves, setOpponentValidMoves] = useState<Position[]>([]);

  // Computer joined the room
  const [computerJoinTimer, setComputerJoinTimer] = useState<NodeJS.Timeout | null>(null);
  const [isComputerOpponent, setIsComputerOpponent] = useState(false);
  const [computerPlayer, setComputerPlayer] = useState<ComputerPlayer | null>(null);
  const [computerJoinCountdown, setComputerJoinCountdown] = useState<number | null>(null);

  const supabase = createClient();

  const isMyTurn = playerNumber === gameState.currentPlayer;
  const isSpectator = playerNumber === null;
  const allPlayersReady = participants.length >= (gameRoom?.max_players || 2) && participants.every(p => p.is_ready);
  const isQuickGame = gameRoom?.game_type === 'quick';
  const isInvitationGame = gameRoom?.game_type === 'invitation';

  // Calculate total bet amount
  const totalBetAmount = useMemo(() => {
    if (!gameRoom) return 0;
    return (gameRoom.bet_amount || 0) * Math.max(participants.length, 2);
  }, [gameRoom, participants.length]);

  // Check if current user can start the game
  const canStartGame = userProfile?.id === gameRoom?.created_by;

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (gameRoomId) {
      fetchInitialData();
    } else {
      showToast(getTranslation('error'));
      setLoading(false);
    }
  }, [gameRoomId]);

  // Update game analysis after each move
  useEffect(() => {
    if (gameRoom?.status === 'playing') {
      try {
        const analysis = ProfessionalCheckersGame.analyzeGame(gameState);
        setGameAnalysis(analysis);
      } catch (err) {
        console.error('Error analyzing game:', err);
        setGameAnalysis(null);
      }
    }
  }, [gameState, gameRoom?.status]);

  useEffect(() => {
    if (gameRoom?.status !== 'playing' || gameState.status === 'finished') {
      setTimeLeft(30);
      return;
    }

    if (isMyTurn) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeLeft(30);
    }
  }, [isMyTurn, gameRoom?.status, gameState.status]);

  useEffect(() => {
    if (opponentMoves.length > 0) {
      const timer = setTimeout(() => {
        setOpponentMoves(prev => prev.slice(1));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [opponentMoves]);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type });
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!gameRoomId || !gameRoom) return;

    // Main game channel
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
        () => {
          console.log('Participants updated, refreshing...');
          fetchParticipants();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_room_id=eq.${gameRoomId}`,
        },
        (payload) => handleNewMove(payload.new as any)
      )
      .subscribe();

    // Separate channel for selections only
    const selectionChannel = supabase
      .channel(`game-selections-${gameRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'piece_selections',
          filter: `game_room_id=eq.${gameRoomId}`,
        },
        (payload) => {
          console.log('New selection:', payload);
          handleOpponentSelection(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'piece_selections',
          filter: `game_room_id=eq.${gameRoomId}`,
        },
        (payload) => {
          console.log('Selection deleted:', payload);
          setOpponentSelectedPiece(null);
          setOpponentValidMoves([]);
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from channels');
      gameChannel.unsubscribe();
      selectionChannel.unsubscribe();
    };
  }, [gameRoomId, gameRoom, userProfile]);

  // COMPUTER JOIN TIMER LOGIC - UPDATED FOR ALL GAME TYPES
  useEffect(() => {
    if (!gameRoomId || !gameRoom) return;

    console.log('🕒 Computer Join State Check:', {
      status: gameRoom.status,
      isQuickGame,
      isInvitationGame,
      participantsCount: participants.length,
      currentTimer: computerJoinTimer ? 'active' : 'inactive'
    });

    // Clear any existing timer first
    if (computerJoinTimer) {
      console.log('🔄 Clearing existing computer join timer');
      clearTimeout(computerJoinTimer);
      setComputerJoinTimer(null);
      setComputerJoinCountdown(null);
    }

    // Setup computer join timer for both quick games AND invitation games with 1 player in waiting state
    if (gameRoom.status === 'waiting' && participants.length === 1) {
      console.log('🕒 Setting up computer join timer for 1 minute');
      
      // Start countdown from 1 minute (60 seconds)
      let countdown = COMPUTER_JOIN_DELAY / 1000;
      setComputerJoinCountdown(countdown);

      // Update countdown every second
      const countdownInterval = setInterval(() => {
        setComputerJoinCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      const timer = setTimeout(async () => {
        console.log('⏰ Computer join timer expired - attempting to join computer');
        await joinComputerPlayer();
        setComputerJoinCountdown(null);
        clearInterval(countdownInterval);
      }, COMPUTER_JOIN_DELAY);

      setComputerJoinTimer(timer);

      // Cleanup function
      return () => {
        console.log('🧹 Cleaning up computer join timer and interval');
        clearTimeout(timer);
        clearInterval(countdownInterval);
        setComputerJoinCountdown(null);
      };
    } else {
      // Clear countdown if conditions are no longer met
      setComputerJoinCountdown(null);
    }
  }, [gameRoom?.status, participants.length, isQuickGame, isInvitationGame, gameRoomId, gameRoom]);

  // Separate useEffect for computer moves
  useEffect(() => {
    if (gameRoom?.status === 'playing' && isComputerOpponent && computerPlayer) {
      // Check if it's computer's turn
      const computerParticipant = participants.find(p => 
        p.user_id === ADMIN_COMPUTER_PLAYER.getConfig().userId
      );

      console.log('🤖 Computer Move Check:', {
        computerParticipant: computerParticipant?.player_number,
        currentPlayer: gameState.currentPlayer,
        gameStatus: gameRoom.status,
        isComputerTurn: computerParticipant?.player_number === gameState.currentPlayer
      });

      if (computerParticipant && computerParticipant.player_number === gameState.currentPlayer) {
        console.log('🤔 Computer is thinking...');
        
        // Small delay to make it feel more natural
        const timer = setTimeout(() => {
          makeComputerMove();
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [gameState.currentPlayer, gameRoom?.status, isComputerOpponent, participants, computerPlayer]);

  // Debug useEffect to monitor computer join state
  useEffect(() => {
    console.log('🔍 Computer Join Debug:', {
      hasGameRoom: !!gameRoom,
      gameRoomStatus: gameRoom?.status,
      isQuickGame,
      isInvitationGame,
      participantsCount: participants.length,
      computerJoinCountdown,
      isComputerOpponent,
      computerJoinTimer: !!computerJoinTimer,
      computerPlayer: !!computerPlayer
    });
  }, [gameRoom, isQuickGame, isInvitationGame, participants.length, computerJoinCountdown, isComputerOpponent, computerJoinTimer, computerPlayer]);

  const handleNewMove = async (move: any) => {
    if (!userProfile || move.user_id === userProfile.id) return;

    const convertToPosition = (pos: number): Position => {
      const row = Math.floor(pos / 8);
      const col = pos % 8;
      const scaledRow = Math.floor((row / 8) * 10);
      const scaledCol = Math.floor((col / 8) * 10);
      return { row: scaledRow, col: scaledCol };
    };

    const from = convertToPosition(move.from_position);
    const to = convertToPosition(move.to_position);

    setOpponentMoves(prev => [...prev, { from, to, timestamp: Date.now() }]);

    const fromNotation = `${String.fromCharCode(65 + from.col)}${10 - from.row}`;
    const toNotation = `${String.fromCharCode(65 + to.col)}${10 - to.row}`;
    showToast(getTranslation('opponentMove', { from: fromNotation, to: toNotation }), 'info');

    // Refresh game state when opponent moves
    await fetchGameRoom();
  };

  const convertPosition = (row: number, col: number): number => {
    const scaledRow = Math.floor((row / 10) * 8);
    const scaledCol = Math.floor((col / 10) * 8);
    const position = scaledRow * 8 + scaledCol;
    return Math.max(0, Math.min(63, position));
  };

  const broadcastPieceSelection = async (position: Position | null, validMoves: Position[]) => {
    if (!userProfile || !gameRoomId || !playerNumber) return;

    try {
      if (!position) {
        // Clear selection by deleting the record
        const { error } = await supabase
          .from('piece_selections')
          .delete()
          .eq('game_room_id', gameRoomId)
          .eq('user_id', userProfile.id);

        if (error) {
          console.error('Error deleting selection:', error);
          throw error;
        }
        return;
      }

      const dbPosition = convertPosition(position.row, position.col);

      // First delete any existing selection for this user
      await supabase
        .from('piece_selections')
        .delete()
        .eq('game_room_id', gameRoomId)
        .eq('user_id', userProfile.id);

      // Then insert the new selection
      const { error } = await supabase
        .from('piece_selections')
        .insert({
          game_room_id: gameRoomId,
          user_id: userProfile.id,
          player_number: playerNumber,
          position: dbPosition
        });

      if (error) {
        console.error('Error inserting selection:', error);
        throw error;
      }

      // Store valid moves in localStorage
      if (validMoves.length > 0) {
        const validMovesKey = `valid_moves_${gameRoomId}_${userProfile.id}`;
        const dbValidMoves = validMoves.map(pos => convertPosition(pos.row, pos.col));
        localStorage.setItem(validMovesKey, JSON.stringify(dbValidMoves));
      }

      console.log('✅ Selection broadcast successfully');

    } catch (err) {
      console.error('Error broadcasting selection:', err);
    }
  };

  // Updated handleOpponentSelection
  const handleOpponentSelection = async (selection: any) => {
    if (!userProfile || selection.user_id === userProfile.id) return;

    console.log('Received opponent selection:', selection);

    const convertToPosition = (pos: number): Position => {
      const row = Math.floor(pos / 8);
      const col = pos % 8;
      const scaledRow = Math.floor((row / 8) * 10);
      const scaledCol = Math.floor((col / 8) * 10);
      return { row: scaledRow, col: scaledCol };
    };

    if (selection.position !== null && selection.position !== undefined) {
      const selectedPos = convertToPosition(selection.position);
      setOpponentSelectedPiece(selectedPos);
      
      // Try to get valid moves from localStorage
      const validMovesKey = `valid_moves_${gameRoomId}_${selection.user_id}`;
      const storedValidMoves = localStorage.getItem(validMovesKey);
      
      if (storedValidMoves) {
        const dbValidMoves = JSON.parse(storedValidMoves);
        const validMoves = dbValidMoves.map((pos: number) => convertToPosition(pos));
        setOpponentValidMoves(validMoves);
      } else {
        setOpponentValidMoves([]);
      }
    } else {
      setOpponentSelectedPiece(null);
      setOpponentValidMoves([]);
    }
  };

  const handleTimeout = async () => {
    if (!userProfile || !gameRoom || gameState.status === 'finished') return;

    try {
      const timeoutWinner = ProfessionalCheckersGame.getOpponent(playerNumber!);
      
      const newGameState: GameState = {
        ...gameState,
        status: 'finished' as const,
        winner: timeoutWinner,
        lastMove: null
      };

      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'finished',
          winner_id: participants.find(p => p.player_number === timeoutWinner)?.user_id || null,
          board_state: ProfessionalCheckersGame.serializeGameState(newGameState),
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameRoomId);

      if (error) throw error;

      await handleGameFinish(timeoutWinner, 'timeout');
    } catch (err) {
      console.error('Error handling timeout:', err);
      showToast('Erreur lors du traitement du timeout');
    }
  };

  const showGameResultMessage = (reason: 'checkmate' | 'resignation' | 'timeout' | 'material' | 'draw', winner?: number) => {
    const isWinner = winner === playerNumber;
    const prizeAmount = isWinner ? totalBetAmount : 0;
    
    let title = '';
    let message = '';
    let type: 'win' | 'lose' | 'draw' = 'draw';

    switch (reason) {
      case 'checkmate':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = getTranslation('victoryByCheckmate');
        type = isWinner ? 'win' : 'lose';
        break;
      case 'resignation':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = getTranslation('victoryByResignation');
        type = isWinner ? 'win' : 'lose';
        break;
      case 'timeout':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = getTranslation('victoryByTimeout');
        type = isWinner ? 'win' : 'lose';
        break;
      case 'material':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = getTranslation('victoryByMaterial');
        type = isWinner ? 'win' : 'lose';
        break;
      case 'draw':
        title = getTranslation('draw');
        message = getTranslation('draw');
        type = 'draw';
        break;
    }

    setShowGameResult({ 
      title, 
      message, 
      type, 
      reason,
      prize: isWinner ? prizeAmount : undefined,
    });
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setToast(null);

      await checkGameRoomExists();
      await fetchUserProfile();
      await fetchParticipants();

      // Auto-join logic for games
      if (userProfile && playerNumber === null && gameRoom?.status === 'waiting') {
        console.log('Auto-joining user to game...');
        await joinGame();
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      showToast(`Erreur lors du chargement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const checkGameRoomExists = async () => {
    const { data, error } = await supabase
      .from('game_rooms')
      .select('id')
      .eq('id', gameRoomId)
      .maybeSingle();

    if (error) throw new Error(`Erreur base de données: ${error.message}`);
    if (!data) throw new Error(getTranslation('gameNotFound'));

    await fetchGameRoom();
  };

  // Add this function to refresh user balance
  const refreshUserBalance = async () => {
    if (!userProfile) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userProfile.id)
        .single();

      if (profile) {
        setUserProfile(prev => prev ? { ...prev, balance: profile.balance } : null);
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
  };

  // Function to load existing selections when page loads
  const loadInitialSelections = async () => {
    if (!userProfile || !gameRoomId) return;

    try {
      const { data: selections, error } = await supabase
        .from('piece_selections')
        .select('*')
        .eq('game_room_id', gameRoomId);

      if (error) throw error;

      if (selections && selections.length > 0) {
        selections.forEach(selection => {
          if (selection.user_id !== userProfile.id) {
            // This is the opponent's selection
            handleOpponentSelection(selection);
          }
        });
      }
    } catch (err) {
      console.error('Error loading initial selections:', err);
    }
  };

  // Add this function to save game results
  const saveGameResult = async (winnerId: string | null, gameData: any) => {
    if (!gameRoom || !userProfile) return;

    try {
      const gameResult = {
        game_room_id: gameRoomId,
        winner_id: winnerId,
        player1_id: participants.find(p => p.player_number === 1)?.user_id,
        player2_id: participants.find(p => p.player_number === 2)?.user_id,
        final_board_state: ProfessionalCheckersGame.serializeGameState(gameState),
        total_turns: gameState.turnNumber,
        total_moves: gameState.moveHistory.length,
        game_analysis: gameAnalysis,
        bet_amount: gameRoom.bet_amount,
        prize_distributed: totalBetAmount,
        game_duration: Math.floor((Date.now() - new Date(gameRoom.created_at).getTime()) / 1000), // in seconds
        end_reason: gameState.status === 'finished' ? 'checkmate' : 'resignation', // or 'timeout', 'draw'
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('game_results')
        .insert(gameResult);

      if (error) throw error;

      // Update player ratings
      await updatePlayerRatings(winnerId, participants);

      console.log('Game result saved successfully');

    } catch (err) {
      console.error('Error saving game result:', err);
    }
  };

  // Function to update player ratings
  const updatePlayerRatings = async (winnerId: string | null, participants: GameParticipant[]) => {
    try {
      const player1 = participants.find(p => p.player_number === 1);
      const player2 = participants.find(p => p.player_number === 2);

      if (!player1 || !player2) return;

      // Simple ELO rating calculation
      const K = 32; // ELO K-factor
      const expected1 = 1 / (1 + Math.pow(10, ((player2.profiles?.rating || 1200) - (player1.profiles?.rating || 1200)) / 400));
      const expected2 = 1 - expected1;

      const actual1 = winnerId === player1.user_id ? 1 : winnerId === player2.user_id ? 0 : 0.5;
      const actual2 = 1 - actual1;

      const newRating1 = Math.round((player1.profiles?.rating || 1200) + K * (actual1 - expected1));
      const newRating2 = Math.round((player2.profiles?.rating || 1200) + K * (actual2 - expected2));

      // Update ratings in database
      const updates = [
        supabase.from('profiles').update({ rating: newRating1 }).eq('id', player1.user_id),
        supabase.from('profiles').update({ rating: newRating2 }).eq('id', player2.user_id)
      ];

      await Promise.all(updates);

    } catch (err) {
      console.error('Error updating player ratings:', err);
    }
  };

  // Call this after fetching user profile and game room
  useEffect(() => {
    if (userProfile && gameRoomId) {
      loadInitialSelections();
    }
  }, [userProfile, gameRoomId]);

  // Call this after game finishes to get updated balance
  useEffect(() => {
    if (showGameResult) {
      refreshUserBalance();
    }
  }, [showGameResult]);

  // Clean up selections when component unmounts or game ends
  useEffect(() => {
    return () => {
      // Clear our selection when leaving the page
      if (userProfile && gameRoomId) {
        broadcastPieceSelection(null, []);
      }
    };
  }, [userProfile, gameRoomId]);

  // Also clean up when game ends
  useEffect(() => {
    if (gameState.status === 'finished') {
      broadcastPieceSelection(null, []);
    }
  }, [gameState.status]);

  const fetchGameRoom = async () => {
    const { data: room, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', gameRoomId)
      .single();

    if (error) throw new Error(`Erreur base de données: ${error.message}`);

    if (room) {
      handleGameRoomUpdate(room);
    }
  };

  const fetchUserProfile = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw new Error(getTranslation('pleaseSignIn'));

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
        await fetchPlayerNumber(user.id);
      }
    } else {
      throw new Error('Session utilisateur non trouvée');
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

  const fetchParticipants = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from('game_participants')
        .select('id, user_id, player_number, is_ready')
        .eq('game_room_id', gameRoomId)
        .order('player_number', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        setParticipants([]);
        return;
      }

      if (participantsData && participantsData.length > 0) {
        const participantsWithProfiles = await Promise.all(
          participantsData.map(async (participant) => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url, rating')
                .eq('id', participant.user_id)
                .single();

              return {
                id: participant.id,
                user_id: participant.user_id,
                player_number: participant.player_number,
                is_ready: participant.is_ready,
                profiles: profile || undefined,
              };
            } catch (profileError) {
              console.error(`Error fetching profile for user ${participant.user_id}:`, profileError);
              return {
                id: participant.id,
                user_id: participant.user_id,
                player_number: participant.player_number,
                is_ready: participant.is_ready,
                profiles: undefined,
              };
            }
          })
        );

        setParticipants(participantsWithProfiles);

        // Auto-start logic
        if (gameRoom?.status === 'waiting' && 
            participantsWithProfiles.length >= (gameRoom?.max_players || 2)) {
          
          const allReady = participantsWithProfiles.every(p => p.is_ready);
          console.log('Auto-start check:', { 
            allReady, 
            participants: participantsWithProfiles.length,
            maxPlayers: gameRoom.max_players,
            status: gameRoom.status 
          });

          if (allReady) {
            console.log('All players ready, starting game...');
            setTimeout(() => startGame(), 1000);
          }
        }
      } else {
        setParticipants([]);
      }
    } catch (err) {
      console.error('Unexpected error in fetchParticipants:', err);
      setParticipants([]);
    }
  };

  const joinGame = async () => {
    if (!userProfile) {
      showToast(getTranslation('pleaseSignIn'));
      return;
    }

    try {
      const { data: existingParticipant } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_room_id', gameRoomId)
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (existingParticipant) {
        console.log('User is already a participant');
        return;
      }

      const { data: currentParticipants } = await supabase
        .from('game_participants')
        .select('player_number')
        .eq('game_room_id', gameRoomId);

      const usedPlayerNumbers = currentParticipants?.map(p => p.player_number) || [];
      let playerNumber = 1;

      // Find next available player number
      while (usedPlayerNumbers.includes(playerNumber)) {
        playerNumber++;
      }

      const { error } = await supabase
        .from('game_participants')
        .insert({
          game_room_id: gameRoomId,
          user_id: userProfile.id,
          player_number: playerNumber,
          is_ready: false,
        });

      if (error) throw error;

      setPlayerNumber(playerNumber);
      setIsReady(false);
      showToast(`Vous avez rejoint la partie en tant que Joueur ${playerNumber}`, 'success');
      
      await updateParticipantsCount();
      await fetchParticipants();
    } catch (err) {
      console.error('Error joining game:', err);
      showToast('Erreur lors de la connexion à la partie');
    }
  };

  // COMPUTER LOGIC BEGINS HERE
  const makeComputerMove = async () => {
    if (!computerPlayer || !gameRoom || gameState.status !== 'active') {
      console.log('❌ Computer move prevented - invalid state:', {
        hasComputerPlayer: !!computerPlayer,
        hasGameRoom: !!gameRoom,
        gameStateStatus: gameState.status
      });
      return;
    }

    // Only make move if it's computer's turn
    const computerParticipant = participants.find(p => 
      p.user_id === ADMIN_COMPUTER_PLAYER.getConfig().userId
    );

    if (!computerParticipant || computerParticipant.player_number !== gameState.currentPlayer) {
      console.log('❌ Not computer turn:', {
        computerPlayerNumber: computerParticipant?.player_number,
        currentPlayer: gameState.currentPlayer
      });
      return;
    }

    try {
      console.log('🤔 Computer is thinking...');
      
      const bestMove = await computerPlayer.findBestMove(gameState);
      
      if (!bestMove) {
        console.log('❌ Computer has no valid moves');
        return;
      }

      console.log('✅ Computer making move:', bestMove);
      
      // Use the existing makeMove function but with computer user ID
      await makeMoveAsComputer(bestMove);

    } catch (error) {
      console.error('💥 Error in computer move:', error);
    }
  };

  const makeMoveAsComputer = async (move: Move) => {
    if (!gameRoom) return;

    try {
      const newGameState = ProfessionalCheckersGame.makeMove(gameState, move);

      // Use the helper function to check game state
      const gameStateCheck = checkCurrentGameState(newGameState);
      
      let finalGameState = newGameState;

      if (gameStateCheck.shouldEnd) {
        finalGameState = {
          ...newGameState,
          status: 'finished' as const,
          winner: gameStateCheck.winner
        };
      }

      // Get latest moves for turn numbering
      const { data: latestMoves } = await supabase
        .from('game_moves')
        .select('turn_number, move_number')
        .eq('game_room_id', gameRoomId)
        .order('created_at', { ascending: false })
        .limit(1);

      let turnNumber = 1;
      let moveNumber = 1;

      if (latestMoves && latestMoves.length > 0) {
        const lastMove = latestMoves[0];
        
        if (newGameState.currentPlayer === gameState.currentPlayer) {
          turnNumber = lastMove.turn_number;
          moveNumber = lastMove.move_number + 1;
        } else {
          turnNumber = lastMove.turn_number + 1;
          moveNumber = 1;
        }
      }

      const updateData: any = {
        board_state: ProfessionalCheckersGame.serializeGameState(finalGameState),
        current_player: finalGameState.currentPlayer,
        current_turn: turnNumber,
        updated_at: new Date().toISOString(),
      };

      if (finalGameState.status === 'finished' && finalGameState.winner) {
        updateData.status = 'finished';
        const winnerParticipant = participants.find(p => p.player_number === finalGameState.winner);
        updateData.winner_id = winnerParticipant?.user_id || null;
      } else if (finalGameState.status === 'finished') {
        updateData.status = 'finished';
        updateData.winner_id = null;
      }

      // Update game room
      const { error: roomError } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', gameRoomId);

      if (roomError) throw roomError;

      // Record computer move
      const fromPosition = convertPosition(move.from.row, move.from.col);
      const toPosition = convertPosition(move.to.row, move.to.col);
      const capturedPositions = move.captures?.map(pos => convertPosition(pos.row, pos.col)) || [];

      const moveData = {
        game_room_id: gameRoomId,
        user_id: ADMIN_COMPUTER_PLAYER.getConfig().userId,
        move_number: moveNumber,
        from_position: fromPosition,
        to_position: toPosition,
        turn_number: turnNumber,
        is_capture: move.isCapture || false,
        move_type: move.isCapture ? 'capture' : 'normal',
        captured_pieces: capturedPositions.length > 0 ? capturedPositions : null,
        created_at: new Date().toISOString(),
      };

      await supabase
        .from('game_moves')
        .insert(moveData);

      // Update local state
      setGameState(prev => ({
        ...finalGameState,
        selectedPiece: null,
        validMoves: [],
      }));

      setTimeLeft(30);

      if (finalGameState.status === 'finished') {
        if (finalGameState.winner) {
          await handleGameFinish(finalGameState.winner, gameStateCheck.reason as any);
        } else {
          showGameResultMessage('draw');
        }
      }

    } catch (error) {
      console.error('Error making computer move:', error);
    }
  };

  const startGameWithComputer = async () => {
    try {
      console.log('Auto-starting game with computer opponent...');

      const initialGameState = ProfessionalCheckersGame.createGameState();
      const serializedState = ProfessionalCheckersGame.serializeGameState(initialGameState);

      const updateData: any = {
        status: 'playing',
        current_player: ProfessionalCheckersGame.PLAYER1,
        board_state: serializedState,
        updated_at: new Date().toISOString(),
        current_turn: 1,
      };

      console.log('Starting game with computer opponent:', updateData);

      const { error } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', gameRoomId);

      if (error) {
        console.error('Supabase error starting game with computer:', error);
        showToast('Erreur: ' + error.message);
      } else {
        console.log('Game started successfully with computer opponent');
        showToast('Partie commencée avec un adversaire IA!', 'success');
        
        setGameState({
          ...initialGameState,
          selectedPiece: null,
          validMoves: [],
        });
        
        await fetchGameRoom();
      }
    } catch (err) {
      console.error('Error starting game with computer:', err);
      showToast('Erreur lors du démarrage de la partie avec IA: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  // Helper function to format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const joinComputerPlayer = useCallback(async () => {
    if (!gameRoom) {
      console.error('❌ No game room found for computer join');
      return;
    }

    try {
      console.log('🖥️ Attempting to join computer player...', {
        gameRoomId: gameRoom.id,
        status: gameRoom.status,
        participantsCount: participants.length
      });

      // Check if computer is already a participant
      const isComputerAlreadyJoined = participants.some(p => 
        p.user_id === ADMIN_COMPUTER_PLAYER.getConfig().userId
      );

      if (isComputerAlreadyJoined) {
        console.log('✅ Computer is already in the game');
        return;
      }

      // Check if admin has sufficient balance
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', ADMIN_COMPUTER_PLAYER.getConfig().userId)
        .single();

      if (adminError) {
        console.error('❌ Error fetching admin profile:', adminError);
        return;
      }

      if (!adminProfile) {
        console.error('❌ Admin profile not found');
        showToast('AI opponent unavailable - admin profile not found', 'info');
        return;
      }

      if (adminProfile.balance < gameRoom.bet_amount) {
        console.log('❌ Admin has insufficient balance for computer player:', {
          adminBalance: adminProfile.balance,
          requiredBet: gameRoom.bet_amount
        });
        showToast('AI opponent unavailable due to insufficient funds', 'info');
        return;
      }

      // Check if there's still an empty slot
      const { data: currentParticipants, error: participantsError } = await supabase
        .from('game_participants')
        .select('player_number')
        .eq('game_room_id', gameRoomId);

      if (participantsError) {
        console.error('❌ Error fetching participants:', participantsError);
        return;
      }

      console.log('👥 Current participants:', currentParticipants);

      if (!currentParticipants || currentParticipants.length >= 2) {
        console.log('❌ No empty slot for computer player - participants:', currentParticipants?.length);
        return;
      }

      const usedPlayerNumbers = currentParticipants.map(p => p.player_number);
      const computerPlayerNumber = usedPlayerNumbers.includes(1) ? 2 : 1;

      console.log('🎯 Joining computer as player:', computerPlayerNumber);

      // Join computer as participant
      const { error: joinError } = await supabase
        .from('game_participants')
        .insert({
          game_room_id: gameRoomId,
          user_id: ADMIN_COMPUTER_PLAYER.getConfig().userId,
          player_number: computerPlayerNumber,
          is_ready: true,
        });

      if (joinError) {
        console.error('❌ Error joining computer player:', joinError);
        showToast('Error joining AI opponent', 'error');
        return;
      }

      console.log('✅ Computer player joined successfully as player', computerPlayerNumber);
      
      // Set computer opponent state
      setIsComputerOpponent(true);
      setComputerPlayer(ADMIN_COMPUTER_PLAYER);

      // Refresh participants to include the computer
      await fetchParticipants();

      // Auto-start the game immediately after computer joins
      setTimeout(() => {
        startGameWithComputer();
      }, 1000);

    } catch (error) {
      console.error('💥 Error in joinComputerPlayer:', error);
      showToast('Error connecting AI opponent', 'error');
    }
  }, [gameRoom, gameRoomId, participants, fetchParticipants, supabase]);

  const updateParticipantsCount = async () => {
    if (!gameRoomId) return;

    try {
      const { count, error } = await supabase
        .from('game_participants')
        .select('*', { count: 'exact', head: true })
        .eq('game_room_id', gameRoomId);

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ current_players: count || 0 })
        .eq('id', gameRoomId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Error updating participants count:', err);
    }
  };

  const handleGameRoomUpdate = (room: GameRoom) => {
    console.log('Handling game room update:', {
      oldStatus: gameRoom?.status,
      newStatus: room.status,
      roomId: room.id
    });

    setGameRoom(room);

    let newGameState: GameState;
    try {
      if (room.board_state && typeof room.board_state === 'object') {
        newGameState = ProfessionalCheckersGame.deserializeGameState(room.board_state);
      } else {
        console.warn('No valid board state found, creating new game');
        newGameState = ProfessionalCheckersGame.createGameState();
      }
    } catch (err) {
      console.error('Error parsing game state:', err);
      newGameState = ProfessionalCheckersGame.createGameState();
    }

    if (room.status === 'playing' && gameRoom?.status === 'waiting') {
      console.log('Game started!');
      showToast('La partie a commencé!', 'success');
    }

    // Enhanced game finish detection
    if (room.status === 'finished' && gameRoom?.status !== 'finished') {
      console.log('Game finished!');
      
      // Determine the reason for game end
      let reason: 'checkmate' | 'resignation' | 'timeout' | 'material' | 'draw' = 'checkmate';
      const winnerParticipant = participants.find(p => p.user_id === room.winner_id);
      const winner = winnerParticipant?.player_number;
      
      if (!winner) {
        reason = 'draw';
      } else {
        // Check if the current player (loser) has any moves left
        const loser = ProfessionalCheckersGame.getOpponent(winner);
        const testState: GameState = {
          ...newGameState,
          currentPlayer: loser,
          status: 'active'
        };
        
        const validMoves = ProfessionalCheckersGame.findAllValidMoves(testState);
        if (validMoves.length === 0) {
          reason = 'checkmate';
        } else {
          reason = 'resignation'; // Or other reasons
        }
      }
      
      showGameResultMessage(reason, winner);
    }

    setGameState(prev => ({
      ...newGameState,
      selectedPiece: prev?.selectedPiece || null,
      validMoves: prev?.validMoves || [],
    }));

    setTimeLeft(30);
  };

  // Add a helper function to check game state more accurately:
  const markAsReady = async () => {
    if (!userProfile) return;

    try {
      const { error } = await supabase
        .from('game_participants')
        .update({ is_ready: true })
        .eq('game_room_id', gameRoomId)
        .eq('user_id', userProfile.id);

      if (error) {
        console.error('Error marking as ready:', error);
        showToast('Erreur: ' + error.message);
      } else {
        setIsReady(true);
        showToast(getTranslation('ready'), 'success');
        await fetchParticipants();
      }
    } catch (err) {
      console.error('Error marking as ready:', err);
      showToast('Erreur lors de la mise à jour du statut');
    }
  };

  const startGame = async () => {
    try {
      console.log('Starting game... Checking participants:', participants);
      
      const { data: currentParticipants, error: participantsError } = await supabase
        .from('game_participants')
        .select('is_ready')
        .eq('game_room_id', gameRoomId);

      if (participantsError) {
        throw new Error('Erreur lors de la vérification des participants: ' + participantsError.message);
      }

      const allReady = currentParticipants && 
                      currentParticipants.length >= (gameRoom?.max_players || 2) && 
                      currentParticipants.every(p => p.is_ready);

      if (!allReady) {
        showToast('Tous les joueurs ne sont pas prêts', 'error');
        return;
      }

      const initialGameState = ProfessionalCheckersGame.createGameState();
      const serializedState = ProfessionalCheckersGame.serializeGameState(initialGameState);

      const updateData: any = {
        status: 'playing',
        current_player: ProfessionalCheckersGame.PLAYER1,
        board_state: serializedState,
        updated_at: new Date().toISOString(),
        current_turn: 1,
      };

      console.log('Updating game room with data:', updateData);

      const { error } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', gameRoomId);

      if (error) {
        console.error('Supabase error starting game:', error);
        showToast('Erreur: ' + error.message);
      } else {
        console.log('Game started successfully in database');
        showToast(getTranslation('gameStarted'), 'success');
        
        setGameState({
          ...initialGameState,
          selectedPiece: null,
          validMoves: [],
        });
        
        await fetchGameRoom();
      }
    } catch (err) {
      console.error('Error starting game:', err);
      showToast('Erreur lors du démarrage de la partie: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
    }
  };

  const handleCellClick = async (row: number, col: number) => {
    console.log('🔍 Cell clicked:', { row, col, playerNumber, currentPlayer: gameState.currentPlayer });

    if (!userProfile) {
      showToast(getTranslation('pleaseSignIn'));
      return;
    }

    if (!gameRoom || gameRoom.status !== 'playing') {
      showToast(`La partie est ${getTranslation(gameRoom?.status as keyof typeof translations || 'waiting')}`);
      return;
    }

    if (gameState.status === 'finished') {
      showToast(getTranslation('gameFinished'));
      return;
    }

    if (playerNumber !== gameState.currentPlayer) {
      console.log('Not player turn:', { playerNumber, currentPlayer: gameState.currentPlayer });
      showToast("Ce n'est pas votre tour", 'info');
      return;
    }

    // If we have a selected piece and are trying to move it
    if (gameState.selectedPiece) {
      const move = gameState.validMoves.find((m: Move) => m.to.row === row && m.to.col === col);

      if (move) {
        console.log('✅ Making move:', move);
        // Clear selection before making move
        await broadcastPieceSelection(null, []);
        await makeMove(move);
        return;
      } else {
        console.log('❌ No valid move found for this position');
        console.log('📋 Available moves:', gameState.validMoves);
        console.log('🎯 Target position:', { row, col });
        
        // Clear selection if invalid move attempt
        setGameState(prev => ({
          ...prev,
          selectedPiece: null,
          validMoves: [],
        }));
        await broadcastPieceSelection(null, []);
      }
    }

    // If no piece selected, try to select a piece
    const piece = gameState.board[row][col];
    console.log('🧩 Piece at position:', piece);
    console.log('🎮 Current player:', gameState.currentPlayer);

    if (piece && piece.player === gameState.currentPlayer) {
      console.log('🔍 Calculating valid moves for piece at:', { row, col });
      console.log('👑 Is king piece:', piece.isKing);
      
      try {
        // Debug: log the board state around this piece
        console.log('📊 Board state around piece:');
        for (let r = Math.max(0, row-2); r <= Math.min(ProfessionalCheckersGame.BOARD_SIZE-1, row+2); r++) {
          const rowData = [];
          for (let c = Math.max(0, col-2); c <= Math.min(ProfessionalCheckersGame.BOARD_SIZE-1, col+2); c++) {
            const p = gameState.board[r][c];
            rowData.push(p ? `${p.player}${p.isKing ? 'K' : 'M'}` : '--');
          }
          console.log(`Row ${r}: [${rowData.join(' ')}]`);
        }

        const validMoves = ProfessionalCheckersGame.calculateValidMoves(gameState, { row, col });
        console.log('📋 Valid moves found:', validMoves.length);
        console.log('📍 Move details:', validMoves);

        if (validMoves.length === 0) {
          console.log('❌ No moves available for this piece');
          
          // For kings, let's manually check what's happening
          if (piece.isKing) {
            console.log('👑 King piece has no moves - checking manually:');
            
            // Check all diagonal directions
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            directions.forEach(([dr, dc]) => {
              const newRow = row + dr;
              const newCol = col + dc;
              if (ProfessionalCheckersGame.isValidPosition(newRow, newCol)) {
                const targetPiece = gameState.board[newRow][newCol];
                console.log(`Direction (${dr},${dc}): position (${newRow},${newCol}) - ${targetPiece ? 'BLOCKED' : 'FREE'}`);
              }
            });
          }
          
          showToast(getTranslation('pieceBlocked'), 'info');
          return;
        }

        setGameState(prev => ({
          ...prev,
          selectedPiece: { row, col },
          validMoves,
        }));
        
        // Broadcast this selection to opponent
        const movePositions = validMoves.map(move => move.to);
        await broadcastPieceSelection({ row, col }, movePositions);
        
        console.log('✅ Piece selected, moves shown');
      } catch (err) {
        console.error('💥 Error calculating moves:', err);
        showToast(getTranslation('invalidMove'), 'error');
      }
    } else {
      setGameState(prev => ({
        ...prev,
        selectedPiece: null,
        validMoves: [],
      }));
      
      // Clear selection broadcast
      await broadcastPieceSelection(null, []);
      
      if (piece) {
        console.log('❌ Not your piece:', { piecePlayer: piece.player, currentPlayer: gameState.currentPlayer });
        showToast(getTranslation('notYourPiece'));
      } else {
        console.log('❌ No piece at this position');
        showToast(getTranslation('selectValidPiece'));
      }
    }
  };

  const debugBoardState = () => {
    console.log('🎯 DEBUG BOARD STATE:');
    console.log('Current player:', gameState.currentPlayer);
    console.log('Board dimensions:', gameState.board.length, 'x', gameState.board[0]?.length);
    
    // Log the entire board
    gameState.board.forEach((row, rowIndex) => {
      const rowPieces = row.map((piece, colIndex) => {
        if (!piece) return '·';
        return piece.player === 1 ? (piece.isKing ? 'R' : 'r') : (piece.isKing ? 'B' : 'b');
      });
      console.log(`Row ${rowIndex}: [${rowPieces.join(' ')}]`);
    });
    
    // Count pieces
    const player1Pieces = gameState.board.flat().filter(p => p?.player === 1).length;
    const player2Pieces = gameState.board.flat().filter(p => p?.player === 2).length;
    console.log(`Piece count - Player 1: ${player1Pieces}, Player 2: ${player2Pieces}`);
  };

  // Call this in your useEffect when game starts
  useEffect(() => {
    if (gameRoom?.status === 'playing') {
      debugBoardState();
    }
  }, [gameRoom?.status]);

  const makeMove = async (move: Move) => {
    if (!userProfile || !gameRoom) return;

    try {
      console.log('Making move:', move);

      const piece = gameState.board[move.from.row][move.from.col];
      if (!piece) {
        throw new Error('No piece at starting position');
      }

      // Remove capture mandatory validation - allow any valid move
      const isValidMove = gameState.validMoves.some(
        (validMove: Move) => 
          validMove.from.row === move.from.row && 
          validMove.from.col === move.from.col &&
          validMove.to.row === move.to.row && 
          validMove.to.col === move.to.col
      );

      if (!isValidMove) {
        throw new Error('Move is not valid');
      }

      const newGameState = ProfessionalCheckersGame.makeMove(gameState, move);

      setAnimatingPiece({
        piece,
        from: move.from,
        to: move.to,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Use the helper function to check game state
      const gameStateCheck = checkCurrentGameState(newGameState);
      
      let finalGameState = newGameState;
      let gameWinner: number | null = null;

      if (gameStateCheck.shouldEnd) {
        finalGameState = {
          ...newGameState,
          status: 'finished' as const,
          winner: gameStateCheck.winner
        };
        console.log(`Game should end: ${gameStateCheck.reason}, Winner: ${gameStateCheck.winner}`);
      }

      // Get latest moves for turn numbering
      const { data: latestMoves, error: moveQueryError } = await supabase
        .from('game_moves')
        .select('turn_number, move_number')
        .eq('game_room_id', gameRoomId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (moveQueryError) {
        console.error('Error querying latest moves:', moveQueryError);
      }

      let turnNumber = 1;
      let moveNumber = 1;

      if (latestMoves && latestMoves.length > 0) {
        const lastMove = latestMoves[0];
        
        if (newGameState.currentPlayer === gameState.currentPlayer) {
          turnNumber = lastMove.turn_number;
          moveNumber = lastMove.move_number + 1;
        } else {
          turnNumber = lastMove.turn_number + 1;
          moveNumber = 1;
        }
      }

      const updateData: any = {
        board_state: ProfessionalCheckersGame.serializeGameState(finalGameState),
        current_player: finalGameState.currentPlayer,
        current_turn: turnNumber,
        updated_at: new Date().toISOString(),
      };

      if (finalGameState.status === 'finished' && finalGameState.winner) {
        updateData.status = 'finished';
        const winnerParticipant = participants.find(p => p.player_number === finalGameState.winner);
        updateData.winner_id = winnerParticipant?.user_id || null;
      } else if (finalGameState.status === 'finished') {
        updateData.status = 'finished';
        updateData.winner_id = null; // Draw
      }

      console.log('Updating game room with data:', updateData);

      const { error: roomError } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', gameRoomId);

      if (roomError) {
        console.error('Room update error:', roomError);
        throw roomError;
      }

      const fromPosition = convertPosition(move.from.row, move.from.col);
      const toPosition = convertPosition(move.to.row, move.to.col);
      const capturedPositions = move.captures?.map(pos => convertPosition(pos.row, pos.col)) || [];

      const moveData = {
        game_room_id: gameRoomId,
        user_id: userProfile.id,
        move_number: moveNumber,
        from_position: fromPosition,
        to_position: toPosition,
        turn_number: turnNumber,
        is_capture: move.isCapture || false,
        move_type: move.isCapture ? 'capture' : 'normal',
        captured_pieces: capturedPositions.length > 0 ? capturedPositions : null,
        created_at: new Date().toISOString(),
      };

      console.log('Inserting move with data:', moveData);

      const { error: moveError } = await supabase
        .from('game_moves')
        .insert(moveData);

      if (moveError) {
        console.error('Move insertion error:', moveError);
        throw moveError;
      }

      setGameState(prev => ({
        ...finalGameState,
        selectedPiece: null,
        validMoves: [],
      }));
      setAnimatingPiece(null);
      setTimeLeft(30);

      showToast(getTranslation('moveRecorded'), 'success');

      if (finalGameState.status === 'finished') {
        if (finalGameState.winner) {
          await handleGameFinish(finalGameState.winner, gameStateCheck.reason as any);
        } else {
          // Handle draw
          showGameResultMessage('draw');
        }
      }
    } catch (err) {
      console.error('Error making move:', err);
      setAnimatingPiece(null);
      setGameState(prev => ({
        ...prev,
        selectedPiece: null,
        validMoves: [],
      }));
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      // Show specific error messages for backward movement
      if (errorMessage.includes('cannot move backward')) {
        showToast(getTranslation('backwardMoveNotAllowed'), 'error');
      } else {
        showToast('Erreur: ' + errorMessage);
      }
    }
  };

  // Make sure the helper function is properly defined (add this near your other utility functions):
  const checkCurrentGameState = (state: GameState): { shouldEnd: boolean; winner: number | null; reason: string } => {
    // Check if current player has any valid moves
    const validMoves = ProfessionalCheckersGame.findAllValidMoves(state);
    
    if (validMoves.length === 0) {
      // Current player has no moves - opponent wins
      return {
        shouldEnd: true,
        winner: ProfessionalCheckersGame.getOpponent(state.currentPlayer),
        reason: 'checkmate'
      };
    }
    
    // Check other end conditions (draw, timeout, etc.)
    const shouldEnd = ProfessionalCheckersGame.checkGameEndConditions(
      state.board,
      state.currentPlayer,
      state.moveHistory.length,
      state.consecutiveNonCaptureMoves,
      state.moveHistory
    );
    
    if (shouldEnd) {
      return {
        shouldEnd: true,
        winner: null, // Draw or other non-win conditions
        reason: 'draw'
      };
    }
    
    return {
      shouldEnd: false,
      winner: null,
      reason: ''
    };
  };

  // Call this function when game ends - update the handleGameFinish function
  const handleGameFinish = async (winnerPlayerNumber: number, reason: 'checkmate' | 'resignation' | 'timeout' | 'material' | 'draw') => {
    if (!gameRoom || !userProfile) return;

    try {
      const winnerParticipant = participants.find(p => p.player_number === winnerPlayerNumber);
      const winnerId = winnerParticipant?.user_id || null;

      // Save game result to database
      await saveGameResult(winnerId, {
        gameState,
        gameAnalysis,
        participants
      });

      // Distribute prize money
      if (gameRoom.bet_amount && gameRoom.bet_amount > 0) {
        await distributePrizeMoney(winnerPlayerNumber);
      }

      showGameResultMessage(reason, winnerPlayerNumber);
    } catch (err) {
      console.error('Error handling game finish:', err);
    }
  };

  const handleRematchRequest = async () => {
    if (!userProfile || !gameRoom) return;

    try {
      // Check if user has enough balance for the rematch
      if (gameRoom.bet_amount > 0 && userProfile.balance < gameRoom.bet_amount) {
        showToast(`Solde insuffisant. Il vous faut ${gameRoom.bet_amount} € pour une revanche.`, 'error');
        return;
      }

      const { data: newGameRoomId, error } = await supabase.rpc('create_rematch', {
        p_original_game_room_id: gameRoomId,
        p_requesting_user_id: userProfile.id
      });

      if (error) {
        if (error.message?.includes('insufficient balance')) {
          showToast('Votre adversaire n\'a pas assez d\'argent pour une revanche', 'error');
        } else {
          throw error;
        }
        return;
      }

      router.push(`/dashboard/game/p/${newGameRoomId}`);
      showToast('Revanche créée! En attente de la confirmation de votre adversaire.', 'success');

    } catch (err: any) {
      console.error('Error creating rematch:', err);
      showToast('Erreur lors de la création de la revanche: ' + (err.message || 'Erreur inconnue'));
    }
  };

  const distributePrizeMoney = async (winnerPlayerNumber: number) => {
    if (!gameRoom || !userProfile) return;

    try {
      const winnerParticipant = participants.find(p => p.player_number === winnerPlayerNumber);
      if (!winnerParticipant) {
        console.warn('Winner participant not found');
        return;
      }

      const prizeAmount = totalBetAmount;
      const isComputerWinner = winnerParticipant.user_id === ADMIN_COMPUTER_PLAYER.getConfig().userId;
      const isComputerLoser = participants.some(p => 
        p.user_id === ADMIN_COMPUTER_PLAYER.getConfig().userId && p.player_number !== winnerPlayerNumber
      );

      if (isComputerWinner) {
        // Computer wins - add to admin balance
        const { error: winnerError } = await supabase.rpc('update_user_balance', {
          user_id: ADMIN_COMPUTER_PLAYER.getConfig().userId,
          amount: prizeAmount,
        });

        if (winnerError) throw winnerError;

      } else if (isComputerLoser) {
        // Computer loses - deduct from admin balance
        const { error: loserError } = await supabase.rpc('update_user_balance', {
          user_id: ADMIN_COMPUTER_PLAYER.getConfig().userId,
          amount: -prizeAmount,
        });

        if (loserError) throw loserError;
      } else {
        // Regular player win - use existing logic
        try {
          const { error: winnerError } = await supabase.rpc('update_user_balance', {
            user_id: winnerParticipant.user_id,
            amount: prizeAmount,
          });

          if (winnerError) throw winnerError;
        } catch (rpcError) {
          // Fallback to direct update
          const { data: winnerProfile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', winnerParticipant.user_id)
            .single();

          if (winnerProfile) {
            await supabase
              .from('profiles')
              .update({ balance: winnerProfile.balance + prizeAmount })
              .eq('id', winnerParticipant.user_id);
          }
        }
      }

      console.log(`Player ${winnerPlayerNumber} won ${prizeAmount} coins`);

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: winnerParticipant.user_id,
          type: 'game_win',
          amount: prizeAmount,
          status: 'completed',
          reference: `GAME-WIN-${gameRoom.id}`
        });

    } catch (err) {
      console.error('Error distributing prize money:', err);
    }
  };

  const resignGame = async () => {
    if (!userProfile || !gameRoom || gameState.status === 'finished') {
      setShowResignConfirm(false);
      return;
    }

    try {
      const winnerPlayerNumber = ProfessionalCheckersGame.getOpponent(playerNumber!);
      const winnerParticipant = participants.find(p => p.player_number === winnerPlayerNumber);
      
      if (!winnerParticipant) {
        throw new Error('Winner participant not found');
      }

      const { error } = await supabase
        .from('game_rooms')
        .update({
          status: 'finished',
          winner_id: winnerParticipant.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameRoomId);

      if (error) throw error;

      await handleGameFinish(winnerPlayerNumber, 'resignation');
      showToast(getTranslation('resignSuccess'), 'success');

      setShowResignConfirm(false);
    } catch (err: any) {
      console.error('Error resigning game:', err);
      
      if (err.message?.includes('insufficient balance')) {
        showToast('Votre adversaire n\'a pas assez d\'argent pour une revanche', 'error');
      } else {
        showToast('Erreur lors de l\'abandon: ' + (err.message || 'Erreur inconnue'));
      }
      
      setShowResignConfirm(false);
    }
  };

  // Enhanced invitation rematch with balance check
  const createRematchWithInvitation = async () => {
    if (!userProfile || !gameRoom) return;

    try {
      // Check if user has enough balance
      if (gameRoom.bet_amount > 0 && userProfile.balance < gameRoom.bet_amount) {
        showToast(`Solde insuffisant. Il vous faut ${gameRoom.bet_amount} € pour une revanche.`, 'error');
        return;
      }

      // Create new game room for rematch
      const { data: newGameRoom, error } = await supabase
        .from('game_rooms')
        .insert({
          name: `Revanche - ${gameRoom.name}`,
          game_type: 'invitation',
          bet_amount: gameRoom.bet_amount,
          max_players: gameRoom.max_players,
          region: gameRoom.region,
          created_by: userProfile.id,
          status: 'waiting',
          invitation_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          is_rematch: true,
          original_game_id: gameRoom.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join the requesting player
      await supabase
        .from('game_participants')
        .insert({
          game_room_id: newGameRoom.id,
          user_id: userProfile.id,
          player_number: 1,
          is_ready: true,
        });

      showToast('Revanche créée! Partagez le code d\'invitation avec votre adversaire.', 'success');
      
      // Set the new game room for invitation sharing
      setGameRoom(newGameRoom);
      setShowInviteModal(true);

    } catch (err) {
      console.error('Error creating rematch:', err);
      showToast('Erreur lors de la création de la revanche');
    }
  };

  const copyInviteLink = async () => {
    if (!gameRoom?.invitation_code) return;

    const inviteLink = `${window.location.origin}/dashboard/game/join/${gameRoom.invitation_code}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      showToast(getTranslation('inviteCopied'), 'success');
      setShowInviteModal(false);
    } catch (err) {
      showToast('Erreur lors de la copie du lien');
    }
  };

  const handleAfterGameAction = () => {
    if (showGameResult) {
      setShowGameResult(null);
      router.push('/dashboard');
    }
  };

  // Enhanced rematch creation with balance check
  const createRematch = async () => {
    if (!userProfile || !gameRoom) return;

    try {
      // Check if user has enough balance
      if (gameRoom.bet_amount > 0 && userProfile.balance < gameRoom.bet_amount) {
        showToast(`Solde insuffisant. Il vous faut ${gameRoom.bet_amount} € pour une revanche.`, 'error');
        return;
      }

      // Check if opponent has enough balance
      const opponent = participants.find(p => p.user_id !== userProfile.id);
      if (opponent && gameRoom.bet_amount > 0) {
        const { data: opponentProfile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', opponent.user_id)
          .single();

        if (!opponentProfile || opponentProfile.balance < gameRoom.bet_amount) {
          showToast('Votre adversaire n\'a pas assez d\'argent pour une revanche', 'error');
          return;
        }
      }

      const { data: newGameRoom, error } = await supabase
        .from('game_rooms')
        .insert({
          name: `Revanche - ${gameRoom.name}`,
          game_type: gameRoom.game_type,
          bet_amount: gameRoom.bet_amount,
          max_players: gameRoom.max_players,
          region: gameRoom.region,
          created_by: userProfile.id,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join both players
      await supabase
        .from('game_participants')
        .insert([
          {
            game_room_id: newGameRoom.id,
            user_id: userProfile.id,
            player_number: 1,
            is_ready: true,
          },
          {
            game_room_id: newGameRoom.id,
            user_id: participants.find(p => p.user_id !== userProfile.id)?.user_id,
            player_number: 2,
            is_ready: false,
          }
        ]);

      router.push(`/dashboard/game/p/${newGameRoom.id}`);
    } catch (err) {
      console.error('Error creating rematch:', err);
      showToast('Erreur lors de la création de la revanche');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center text-[#222]">
          <div className="text-xl mb-4">Chargement de la salle de jeu...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!gameRoom) {
    return (
      <div className="flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">{getTranslation('error')}</h2>
          <p className="text-gray-700 mb-4">{getTranslation('gameNotFound')}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {getTranslation('backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm ${
            toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
          } text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 animate-in slide-in-from-right`}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 text-white hover:text-gray-200">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Game Result Modal with Balance Info */}
      {showGameResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg p-8 max-w-md text-center transform transition-all duration-500 scale-100 ${
            showGameResult.type === 'win' ? 'border-4 border-yellow-400' : 
            showGameResult.type === 'lose' ? 'border-4 border-red-400' : 'border-4 border-gray-400'
          }`}>
            <div className={`text-6xl mb-4 ${
              showGameResult.type === 'win' ? 'text-yellow-500' : 
              showGameResult.type === 'lose' ? 'text-red-500' : 'text-gray-500'
            }`}>
              {showGameResult.type === 'win' ? '🎉' : showGameResult.type === 'lose' ? '😔' : '🤝'}
            </div>

            <h2 className="text-3xl font-bold mb-2">{showGameResult.title}</h2>
            <p className="text-xl text-gray-700 mb-4">{showGameResult.message}</p>
            
            {showGameResult.prize && showGameResult.type === 'win' && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center gap-2 text-yellow-800">
                  <FaCoins className="text-xl" />
                  <span className="text-lg font-semibold">
                    {getTranslation('youWon', { amount: showGameResult.prize.toString() })}
                  </span>
                </div>
              </div>
            )}

            {/* Balance Information */}
            {gameRoom.bet_amount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700">Votre solde:</span>
                  <span className="font-semibold text-blue-900">{userProfile?.balance || 0} €</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-blue-700">Mise requise:</span>
                  <span className="font-semibold text-blue-900">{gameRoom.bet_amount} €</span>
                </div>
                {userProfile && userProfile.balance < gameRoom.bet_amount && (
                  <div className="text-red-600 text-xs mt-2 font-semibold">
                    ❌ Solde insuffisant pour une revanche
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 justify-center">
              <button
                onClick={handleAfterGameAction}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                {getTranslation('backToDashboard')}
              </button>
              
              {/* Conditionally show rematch buttons based on balance */}
              {gameRoom.bet_amount === 0 || (userProfile && userProfile.balance >= gameRoom.bet_amount) ? (
                <>
                  <button
                    onClick={handleRematchRequest}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {getTranslation('rematch')} (Même mise: {gameRoom.bet_amount} €)
                  </button>
                  
                  <button
                    onClick={createRematchWithInvitation}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {getTranslation('rematch')} (Avec invitation)
                  </button>
                </>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">
                    Vous n'avez pas assez d'argent pour une revanche.
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/wallet')}
                    className="text-red-600 underline text-xs mt-1 hover:text-red-700"
                  >
                    Recharger mon solde
                  </button>
                </div>
              )}
            </div>

            {/* Rematch status message */}
            <div className="mt-4 text-sm text-gray-600">
              <p>Pour une revanche, les deux joueurs doivent avoir suffisamment d'argent.</p>
              {gameRoom.bet_amount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Mise requise: {gameRoom.bet_amount} € par joueur
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resign confirmation modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Confirmation d'abandon</h3>
            <p className="text-gray-700 mb-4">{getTranslation('resignConfirmation')}</p>
            <div className="flex gap-2">
              <button
                onClick={resignGame}
                className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700"
              >
                {getTranslation('confirm')}
              </button>
              <button
                onClick={() => setShowResignConfirm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
              >
                {getTranslation('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">{getTranslation('shareInvite')}</h3>
            <p className="text-gray-600 mb-4">
              Partagez ce lien avec vos amis pour qu'ils puissent rejoindre la partie:
            </p>
            <div className="bg-gray-100 p-3 rounded mb-4 break-all text-sm text-gray-500">
              {gameRoom?.invitation_code ? 
                `${window.location.origin}/dashboard/game/join/${gameRoom.invitation_code}` : 
                `${window.location.origin}/dashboard/game/p/${gameRoomId}`
              }
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyInviteLink}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
              >
                {getTranslation('copyInviteLink')}
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition-colors"
              >
                {getTranslation('cancel')}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Le lien sera automatiquement copié dans votre presse-papiers
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-2 md:px-0 md:px-0 py-0">
        {/* Header Section */}
        <div className="">
          {/* Main Header Card */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-heading">
                  {gameRoom?.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  Mise: {gameRoom?.bet_amount || 0}$
                  {gameRoom?.created_by && (
                    <> Créé par: {participants.find(p => p.user_id === gameRoom.created_by)?.profiles?.username || 'Utilisateur'}</>
                  )}
                  {isQuickGame ? ' • Partie rapide' : ' • Sur invitation'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-gray-900 font-semibold">
                  {gameRoom?.status === 'playing' ? (
                    <span className="flex items-center space-x-2 justify-end">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isMyTurn
                            ? 'bg-green-400 animate-pulse'
                            : 'bg-red-400'
                        }`}
                      ></div>
                      <span>
                        {isMyTurn
                          ? 'À votre tour'
                          : "Tour de l'adversaire"}
                      </span>
                    </span>
                  ) : gameRoom?.status === 'waiting' ? (
                    <span className="text-yellow-600">
                      En attente de joueurs ({participants.length}/{gameRoom?.max_players || 2})
                    </span>
                  ) : (
                    <span className="text-red-600">
                      Partie terminée
                    </span>
                  )}
                </div>
                {gameRoom?.status === 'playing' && isMyTurn && (
                  <div className="text-sm text-gray-600 mt-1">
                    Temps restant: {timeLeft}s
                  </div>
                )}
              </div>
            </div>

            {/* Integrated Waiting Room Section */}
            {gameRoom?.status === 'waiting' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                      <strong className="text-yellow-800">{getTranslation('waitingForPlayers')}</strong>
                    </div>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p>
                        {participants.filter(p => p.is_ready).length} {getTranslation('playersReady')} sur {gameRoom.max_players}
                      </p>
                      {isInvitationGame && participants.length < 2 && (
                        <p className="flex items-center gap-2">
                          <span>⏳</span>
                          {getTranslation('waitingForOpponent')}
                        </p>
                      )}
                      
                      {!isSpectator && (
                        <p className="flex items-center gap-2">
                          <span>{isReady ? '✅' : '⏳'}</span>
                          Votre statut: {isReady ? 'Prêt' : 'En attente'}
                        </p>
                      )}

                      {/* Computer Countdown Timer - UPDATED FOR ALL GAME TYPES */}
                      {(isQuickGame || isInvitationGame) && participants.length === 1 && computerJoinCountdown !== null && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          <span className="text-blue-700 text-xs">
                            Adversaire IA dans: <strong>{formatTime(computerJoinCountdown)}</strong>
                          </span>
                        </div>
                      )}

                      {isComputerOpponent && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-purple-50 rounded-lg">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-purple-700 text-xs font-medium">
                            🤖 Adversaire IA connecté - Niveau Professionnel
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-end">
                    {/* Share Link Button - Always visible in waiting state */}
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Partager le lien
                    </button>
                    
                    {isInvitationGame && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <FaUserFriends />
                        {getTranslation('shareInvite')}
                      </button>
                    )}
                    
                    {!isSpectator && !isReady && (
                      <button
                        onClick={markAsReady}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                      >
                        <span>✓</span>
                        {getTranslation('imReady')}
                      </button>
                    )}
                    
                    {!isSpectator && isReady && (
                      <span className="bg-green-100 text-green-800 border border-green-300 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                        <span>✅</span>
                        {getTranslation('ready')}
                      </span>
                    )}
                    
                    {canStartGame && participants.length >= (gameRoom?.max_players || 2) && (
                      <button
                        onClick={startGame}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!participants.every(p => p.is_ready)}
                      >
                        <span>🎮</span>
                        {getTranslation('startGame')}
                        {!participants.every(p => p.is_ready) && ' (En attente)'}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress indicator for waiting room */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-yellow-700 mb-1">
                    <span>Progression</span>
                    <span>{participants.filter(p => p.is_ready).length}/{gameRoom.max_players} prêts</span>
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(participants.filter(p => p.is_ready).length / gameRoom.max_players) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Enhanced Computer Countdown Section - UPDATED FOR ALL GAME TYPES */}
                {(isQuickGame || isInvitationGame) && participants.length === 1 && computerJoinCountdown !== null && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                        <div>
                          <div className="text-blue-800 font-semibold">
                            Recherche d'un adversaire en cours...
                          </div>
                          <div className="text-blue-600 text-sm">
                            Un adversaire IA rejoindra automatiquement dans:
                          </div>
                        </div>
                      </div>
                      <div className="text-blue-800 font-bold text-2xl bg-white px-3 py-2 rounded-lg shadow-sm">
                        {formatTime(computerJoinCountdown)}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000 ease-linear"
                        style={{ 
                          width: `${((COMPUTER_JOIN_DELAY / 1000 - computerJoinCountdown) / (COMPUTER_JOIN_DELAY / 1000)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    
                    <div className="mt-2 text-xs text-blue-600 text-center">
                      Si aucun joueur humain ne rejoint dans le temps imparti, un adversaire IA professionnel prendra sa place
                    </div>
                  </div>
                )}

                {/* Computer Connected Status */}
                {isComputerOpponent && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
                        <div>
                          <div className="text-purple-800 font-semibold">
                            🤖 Adversaire IA connecté
                          </div>
                          <div className="text-purple-600 text-sm">
                            Niveau: Professionnel - Prêt à jouer!
                          </div>
                        </div>
                      </div>
                      <div className="text-purple-800 font-bold text-lg">
                        En attente du début...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* In the participants section, show computer status */}
            {isComputerOpponent && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-2 text-purple-800">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-sm font-medium">Adversaire IA connecté</span>
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Niveau: Professionnel - Prêt à jouer!
                </div>
              </div>
            )}
          </div>

          {/* Spectator Join Section (if needed) */}
          {!isSpectator && playerNumber === null && gameRoom?.status === 'waiting' && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <strong>Rejoindre la partie</strong>
                  <p className="text-sm">Vous n'êtes pas encore dans cette partie. Voulez-vous rejoindre?</p>
                </div>
                <button
                  onClick={joinGame}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Rejoindre la partie
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Game Board Section */}
          <div className="xl:col-span-3">
            <div className="">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 bg-white rounded-lg p-6 shadow-lg gap-4">
                {/* Left Section - Game Info */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* Players Info */}
                  <div className="flex items-center space-x-2">
                    <FaUserFriends className="h-5 w-5 text-gray-400" />
                    <span className="text-[#222] font-medium">
                      {participants.length}/2
                    </span>
                  </div>
                  
                  {/* Turn Info */}
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[#222] font-medium">
                      Tour {gameState.turnNumber || 1}
                    </span>
                  </div>
                  
                  {/* Board Size */}
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    </svg>
                    <span className="text-[#222] font-medium">10×10</span>
                  </div>
                  
                  {/* Game Status */}
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      gameState.status === 'finished' 
                        ? 'bg-gray-400' 
                        : isMyTurn 
                          ? 'bg-green-400 animate-pulse' 
                          : 'bg-red-400'
                    }`}></div>
                    <span className="text-[#222] font-medium">
                      {gameState.status === 'finished' ? (
                        gameState.winner ? (
                          getTranslation('playerWins', { player: gameState.winner.toString() })
                        ) : (
                          getTranslation('gameFinished')
                        )
                      ) : isSpectator ? (
                        getTranslation('spectating')
                      ) : isMyTurn ? (
                        getTranslation('yourTurn')
                      ) : (
                        getTranslation('opponentTurn')
                      )}
                    </span>
                  </div>
                </div>

                {/* Right Section - Timer and Actions */}
                <div className="flex items-center gap-4">
                  {/* Timer - Always visible when game is playing */}
                  {gameRoom?.status === 'playing' && (
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold ${
                      isMyTurn 
                        ? timeLeft <= 10 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={`${isMyTurn && timeLeft <= 10 ? 'animate-pulse' : ''}`}>
                        {timeLeft}s
                      </span>
                      {isMyTurn && (
                        <span className="text-sm font-normal hidden sm:inline">
                          {getTranslation('timeRemaining').split(':')[0]}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Resign Button */}
                  {gameRoom?.status === 'playing' && !isSpectator && (
                    <button
                      onClick={() => setShowResignConfirm(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium whitespace-nowrap"
                    >
                      {getTranslation('resign')}
                    </button>
                  )}
                </div>
              </div>

              {/* Game Board Component */}
              <GameBoard
                gameState={gameState}
                animatingPiece={animatingPiece}
                opponentMoves={opponentMoves}
                isMyTurn={isMyTurn}
                gameRoom={gameRoom}
                onCellClick={handleCellClick}
                opponentSelectedPiece={opponentSelectedPiece}
                opponentValidMoves={opponentValidMoves}
              />
            </div>
            
            {gameAnalysis && gameRoom.status === 'playing' && (
              <div className="bg-white rounded-lg p-6 shadow-lg rounded-2xl mt-6">
                <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {getTranslation('gameAnalysis')}
                </h3>
                
                <div className="space-y-4">
                  {/* Win Probability */}
                  <div className="bg-white/50 rounded-xl p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-gray-900">{getTranslation('winProbability')}</span>
                      <div className="flex space-x-4 text-sm font-semibold">
                        <span className="text-red-600">J1: {(gameAnalysis.winProbability.player1 * 100).toFixed(1)}%</span>
                        <span className="text-blue-600">J2: {(gameAnalysis.winProbability.player2 * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${gameAnalysis.winProbability.player1 * 100}%` }}
                      />
                    </div>
                    
                    {/* Advantage Indicator */}
                    <div className="flex justify-between text-xs text-gray-600 mt-2">
                      <span>Avantage J1</span>
                      <span>Avantage J2</span>
                    </div>
                  </div>

                  {/* Position Evaluation */}
                  <div className="bg-white/50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Évaluation de la position</div>
                    <div className={`text-2xl font-bold text-center ${
                      gameAnalysis.evaluation > 0 ? 'text-green-600' : 
                      gameAnalysis.evaluation < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {gameAnalysis.evaluation > 0 ? '+' : ''}{gameAnalysis.evaluation.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-1">
                      {gameAnalysis.evaluation > 0 ? 'Avantage Joueur 1' : 
                      gameAnalysis.evaluation < 0 ? 'Avantage Joueur 2' : 'Position équilibrée'}
                    </div>
                  </div>

                  {/* Best Move Suggestion */}
                  {gameAnalysis.bestMove && (
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-semibold">Meilleur coup suggéré</span>
                      </div>
                      <div className="text-sm">
                        De {String.fromCharCode(65 + gameAnalysis.bestMove.from.col)}{10 - gameAnalysis.bestMove.from.row} 
                        {' → '}
                        {String.fromCharCode(65 + gameAnalysis.bestMove.to.col)}{10 - gameAnalysis.bestMove.to.row}
                        {gameAnalysis.bestMove.isCapture && ' (Capture)'}
                      </div>
                    </div>
                  )}

                  {/* Forced Win Alert */}
                  {gameAnalysis.winProbability.isForcedWin && gameAnalysis.winProbability.forcedWinInMoves && (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">
                          {getTranslation('forcedWin', { moves: gameAnalysis.winProbability.forcedWinInMoves.toString() })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Additional Analysis Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/50 rounded-lg p-3 text-center border border-gray-200">
                      <div className="text-gray-600 mb-1">Pièces restantes</div>
                      <div className="font-semibold text-[#222] text-lg">
                        {gameAnalysis.pieceCount?.player1 || 0} - {gameAnalysis.pieceCount?.player2 || 0}
                      </div>
                    </div>
                    
                    <div className="bg-white/50 rounded-lg p-3 text-center border border-gray-200">
                      <div className="text-gray-600 mb-1">Dames</div>
                      <div className="font-semibold text-[#222] text-lg">
                        {gameAnalysis.kingCount?.player1 || 0} - {gameAnalysis.kingCount?.player2 || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            <div className=" bg-white rounded-lg p-6 shadow-lg rounded-2xl">
              <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                Détails de la partie
              </h3>
              
              <div className="space-y-3 text-sm">
                {/* Status */}
                <div className="flex justify-between">
                  <span className="text-gray-900">Statut:</span>
                  <span className={`font-semibold ${
                    gameRoom.status === 'playing' ? 'text-green-600' :
                    gameRoom.status === 'finished' ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {gameRoom.status === 'playing' ? 'En cours' :
                    gameRoom.status === 'finished' ? 'Terminé' : 'En attente'}
                  </span>
                </div>
                
                {/* Bet Amount */}
                <div className="flex justify-between">
                  <span className="text-gray-900">Mise:</span>
                  <span className="font-semibold text-[#222]">{gameRoom.bet_amount || 0}€</span>
                </div>
                
                {/* Game Type */}
                <div className="flex justify-between">
                  <span className="text-gray-900">Type:</span>
                  <span className="font-semibold text-[#222]">
                    {isQuickGame ? 'Partie rapide' : 'Sur invitation'}
                  </span>
                </div>
                
                {/* Created By */}
                <div className="flex justify-between">
                  <span className="text-gray-900">Créée par:</span>
                  <span className="font-semibold text-[#222]">
                    {participants.find(p => p.user_id === gameRoom.created_by)?.profiles?.username || 'Utilisateur'}
                  </span>
                </div>
                
                {/* Your Role */}
                <div className="flex justify-between">
                  <span className="text-gray-900">Votre rôle:</span>
                  <span className="font-semibold text-[#222]">
                    {isSpectator ? 'Spectateur' : `Joueur ${playerNumber}`}
                    {!isSpectator && isReady && ' ✓'}
                  </span>
                </div>
                
                {/* Current Player (if playing) */}
                {gameRoom.status === 'playing' && (
                  <div className="flex justify-between">
                    <span className="text-gray-900">Tour actuel:</span>
                    <span className="font-semibold text-[#222]">
                      Joueur {gameState.currentPlayer}
                      {isMyTurn && ' (Vous)'}
                    </span>
                  </div>
                )}
                
                {/* Prize Pool */}
                <div className="pt-3 mt-3 border-t border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-semibold">Mise totale:</span>
                    <span className="text-lg font-bold text-[#222]">{totalBetAmount} €</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 text-right">
                    Le gagnant remporte {totalBetAmount} €
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg rounded-2xl">
              <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                {getTranslation('participants')}
              </h3>
              
              <div className="space-y-3">
                {participants.map(participant => {
                  const isComputer = participant.user_id === ADMIN_COMPUTER_PLAYER.getConfig().userId;
                  
                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        participant.user_id === userProfile?.id 
                          ? 'bg-blue-500/20 border border-blue-300' 
                          : isComputer
                            ? 'bg-purple-500/20 border border-purple-300'
                            : 'bg-white/50 border border-gray-200'
                      } backdrop-blur-sm`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                            participant.player_number === 1 
                              ? 'bg-gradient-to-br from-red-500 to-red-600' 
                              : 'bg-gradient-to-br from-blue-500 to-blue-600'
                          }`}
                        >
                          {participant.player_number}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <div className={`font-semibold text-[#222] truncate ${
                              participant.user_id === userProfile?.id ? 'text-blue-700' : 
                              isComputer ? 'text-purple-700' : ''
                            }`}>
                              {isComputer ? 'AI Opponent 🤖' : participant.profiles?.username || `Joueur ${participant.player_number}`}
                            </div>
                            {participant.user_id === userProfile?.id && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                                Vous
                              </span>
                            )}
                            {isComputer && (
                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                                AI
                              </span>
                            )}
                          </div>
                          
                          {!isComputer && participant.profiles?.rating && (
                            <div className="flex items-center space-x-1 text-sm text-gray-600 mt-1">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                              <span>Classement: {participant.profiles.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                        participant.is_ready 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}>
                        {participant.is_ready ? (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Prêt</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span>En attente</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Empty slots for waiting players */}
                {participants.length < (gameRoom?.max_players || 2) && (
                  Array.from({ length: (gameRoom?.max_players || 2) - participants.length }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-100/50 border border-gray-300 border-dashed backdrop-blur-sm"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold shadow-inner">
                          ?
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-500">En attente...</div>
                          <div className="text-sm text-gray-400">Joueur rejoint bientôt</div>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-gray-200 text-gray-500 text-sm font-medium">
                        Vide
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}