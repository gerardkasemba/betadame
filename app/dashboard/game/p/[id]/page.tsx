// app/dashboard/game/p/[id]/page.tsx - Updated with NO DRAWS
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaCoins, FaUserFriends } from 'react-icons/fa';
import { ProfessionalCheckersGame, type GameState, type Piece, type Position, type Move } from '@/lib/games';
import { createClient } from '@/lib/supabase/client';
import { GameAnalysis } from '@/lib/games';
import GameBoard from '../../components/GameBoard';
import { SupabasePushyNotifier } from '@/components/SupabasePushyNotifier';

const PositionConverter = {
  toDb: (row: number, col: number): number => {
    return row * 10 + col;
  },
  
  fromDb: (pos: number): Position => {
    const row = Math.floor(pos / 10);
    const col = pos % 10;
    return { row, col };
  },
  
  toNotation: (row: number, col: number): string => {
    return `${String.fromCharCode(65 + col)}${10 - row}`;
  }
};

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
  mustContinueJumpFrom?: Position;
  continuingJumpPosition?: Position;
}

interface OpponentMove {
  from: Position;
  to: Position;
  timestamp: number;
}

// UPDATED: Removed 'draw' type
interface GameResult {
  title: string; 
  message: string; 
  type: 'win' | 'lose';
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
  timeRemaining: "Temps restant",
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
  youWon: "Vous avez gagné {amount} $!",
  youLost: "Vous avez perdu {amount} $",
  rematch: "Revanche",
  backToLobby: "Retour au lobby",
  backToDashboard: "Retour au tableau de bord",
  invalidMove: "Mouvement invalide",
  backwardMoveNotAllowed: "Les pièces régulières ne peuvent pas reculer sauf pour capturer",
  captureMandatory: "Une capture est obligatoire!",
  noMovesAvailable: "Aucun mouvement disponible pour cette pièce",
  pieceBlocked: "Pièce bloquée",
  selectValidPiece: "Sélectionnez une pièce valide",
  mustContinueJump: "Vous devez continuer la capture avec cette pièce",
  networkError: "Erreur réseau - tentative de reconnexion...",
  promotedToKing: "Promu en dame!",
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

  const gameChannelRef = useRef<any>(null);
  const selectionChannelRef = useRef<any>(null);

  const [gameState, setGameState] = useState<ExtendedGameState>(() => {
    const baseState = ProfessionalCheckersGame.createGameState();
    return {
      ...baseState,
      selectedPiece: null,
      validMoves: [],
      mustContinueJumpFrom: undefined,
      continuingJumpPosition: undefined,
    };
  });
  
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
  const [isProcessingMove, setIsProcessingMove] = useState(false);

  const supabase = createClient();

  const isMyTurn = playerNumber === gameState.currentPlayer && !isProcessingMove;
  const isSpectator = playerNumber === null || playerNumber === undefined;
  const allPlayersReady = participants.length >= (gameRoom?.max_players || 2) && participants.every(p => p.is_ready);
  const isQuickGame = gameRoom?.game_type === 'quick';
  const isInvitationGame = gameRoom?.game_type === 'invitation';

  const totalBetAmount = useMemo(() => {
    if (!gameRoom) return 0;
    return (gameRoom.bet_amount || 0) * Math.max(participants.length, 2);
  }, [gameRoom, participants.length]);

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

  useEffect(() => {
    if (gameRoom?.status === 'playing' && gameState.status !== 'finished') {
      try {
        const analysis = ProfessionalCheckersGame.analyzeGame(gameState);
        setGameAnalysis(analysis);
      } catch (err) {
        setGameAnalysis(null);
      }
    }
  }, [gameState, gameRoom?.status]);

  useEffect(() => {
    if (!gameRoomId || !gameRoom) return;

    if (gameChannelRef.current) {
      gameChannelRef.current.unsubscribe();
    }
    if (selectionChannelRef.current) {
      selectionChannelRef.current.unsubscribe();
    }

    gameChannelRef.current = supabase
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

    selectionChannelRef.current = supabase
      .channel(`game-selections-${gameRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'piece_selections',
          filter: `game_room_id=eq.${gameRoomId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            handleOpponentSelection(payload.new);
          } else if (payload.eventType === 'DELETE') {
            if (payload.old && userProfile && payload.old.user_id !== userProfile.id) {
              setOpponentSelectedPiece(null);
              setOpponentValidMoves([]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (gameChannelRef.current) {
        gameChannelRef.current.unsubscribe();
      }
      if (selectionChannelRef.current) {
        selectionChannelRef.current.unsubscribe();
      }
    };
  }, [gameRoomId, gameRoom?.id, userProfile]);

  useEffect(() => {
    if (gameRoom?.status !== 'playing' || gameState.status === 'finished') {
      setTimeLeft(30);
      return;
    }

    if (isMyTurn && !isProcessingMove) {
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
    } else {
      setTimeLeft(30);
    }
  }, [isMyTurn, gameRoom?.status, gameState.status, gameState.currentPlayer, isProcessingMove]);

  useEffect(() => {
    if (opponentMoves.length > 0) {
      const timer = setTimeout(() => {
        setOpponentMoves(prev => prev.slice(1));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [opponentMoves]);

  useEffect(() => {
    if (userProfile && gameRoomId) {
      loadInitialSelections();
    }
  }, [userProfile, gameRoomId]);

  useEffect(() => {
    if (showGameResult) {
      refreshUserBalance();
    }
  }, [showGameResult]);

  useEffect(() => {
    return () => {
      if (userProfile && gameRoomId) {
        broadcastPieceSelection(null, []);
      }
    };
  }, [userProfile, gameRoomId]);

  useEffect(() => {
    if (gameState.status === 'finished') {
      broadcastPieceSelection(null, []);
      setOpponentSelectedPiece(null);
      setOpponentValidMoves([]);
    }
  }, [gameState.status]);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setToast({ message, type });
  }, []);

  const handleNewMove = useCallback(async (move: any) => {
    if (!userProfile || move.user_id === userProfile.id) return;

    const from = PositionConverter.fromDb(move.from_position);
    const to = PositionConverter.fromDb(move.to_position);

    setOpponentMoves(prev => [...prev, { from, to, timestamp: Date.now() }]);

    const fromNotation = PositionConverter.toNotation(from.row, from.col);
    const toNotation = PositionConverter.toNotation(to.row, to.col);
    showToast(getTranslation('opponentMove', { from: fromNotation, to: toNotation }), 'info');

    setOpponentSelectedPiece(null);
    setOpponentValidMoves([]);

    await fetchGameRoom();
  }, [userProfile, showToast]);

  const broadcastPieceSelection = useCallback(async (position: Position | null, validMoves: Position[]) => {
    if (!userProfile || !gameRoomId || !playerNumber) return;

    try {
      const { error: deleteError } = await supabase
        .from('piece_selections')
        .delete()
        .eq('game_room_id', gameRoomId)
        .eq('user_id', userProfile.id);

      if (deleteError) {
        console.error('Error deleting previous selection:', deleteError);
      }

      if (!position) return;

      const dbPosition = PositionConverter.toDb(position.row, position.col);
      const dbValidMoves = validMoves.map(pos => PositionConverter.toDb(pos.row, pos.col));

      const { error } = await supabase
        .from('piece_selections')
        .insert({
          game_room_id: gameRoomId,
          user_id: userProfile.id,
          player_number: playerNumber,
          position: dbPosition,
          valid_moves: dbValidMoves
        });

      if (error) {
        console.error('Error broadcasting selection:', error);
      }
    } catch (err) {
      console.error('Exception in broadcastPieceSelection:', err);
    }
  }, [userProfile, gameRoomId, playerNumber]);

  const handleOpponentSelection = useCallback(async (selection: any) => {
    if (!userProfile || selection.user_id === userProfile.id) {
      return;
    }

    if (selection.position !== null && selection.position !== undefined) {
      const selectedPos = PositionConverter.fromDb(selection.position);
      setOpponentSelectedPiece(selectedPos);
      
      if (selection.valid_moves && Array.isArray(selection.valid_moves)) {
        const validMoves = selection.valid_moves.map((pos: number) => PositionConverter.fromDb(pos));
        setOpponentValidMoves(validMoves);
      } else {
        setOpponentValidMoves([]);
      }
    } else {
      setOpponentSelectedPiece(null);
      setOpponentValidMoves([]);
    }
  }, [userProfile]);

  const handleTimeout = useCallback(async () => {
    if (!userProfile || !gameRoom || gameState.status === 'finished' || !playerNumber) return;

    try {
      const timeoutWinner = ProfessionalCheckersGame.getOpponent(playerNumber);
      
      const newGameState: GameState = {
        ...gameState,
        status: 'finished' as const,
        winner: timeoutWinner,
        lastMove: null
      };

      await supabase
        .from('game_rooms')
        .update({
          status: 'finished',
          winner_id: participants.find(p => p.player_number === timeoutWinner)?.user_id || null,
          board_state: ProfessionalCheckersGame.serializeGameState(newGameState),
        })
        .eq('id', gameRoomId);

      await handleGameFinish(timeoutWinner, 'timeout');
    } catch (err) {
      showToast('Erreur lors du traitement du timeout');
    }
  }, [userProfile, gameRoom, gameState, playerNumber, participants, gameRoomId]);

  // UPDATED: Removed draw case - always requires a winner
  const showGameResultMessage = useCallback((reason: 'checkmate' | 'resignation' | 'timeout' | 'material', winner: number) => {
    const isWinner = winner === playerNumber;
    const prizeAmount = isWinner ? totalBetAmount : 0;
    
    let title = '';
    let message = '';
    let type: 'win' | 'lose' = isWinner ? 'win' : 'lose';

    switch (reason) {
      case 'checkmate':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = getTranslation('victoryByCheckmate');
        break;
      case 'resignation':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = getTranslation('victoryByResignation');
        break;
      case 'timeout':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = getTranslation('victoryByTimeout');
        break;
      case 'material':
        title = isWinner ? getTranslation('yourVictory') : getTranslation('yourDefeat');
        message = 'Victoire par avantage positionnel!';
        break;
    }

    setShowGameResult({ 
      title, 
      message, 
      type, 
      reason,
      prize: isWinner ? prizeAmount : undefined,
    });
  }, [playerNumber, totalBetAmount]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setToast(null);

      await checkGameRoomExists();
      await fetchUserProfile();
      await fetchParticipants();
    } catch (err) {
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
      // Silent fail
    }
  };

  const loadInitialSelections = async () => {
    if (!userProfile || !gameRoomId) return;

    try {
      const { data: selections, error } = await supabase
        .from('piece_selections')
        .select('*')
        .eq('game_room_id', gameRoomId);

      if (error) {
        console.error('Error loading selections:', error);
        return;
      }

      if (selections && selections.length > 0) {
        selections.forEach(selection => {
          if (selection.user_id !== userProfile.id) {
            handleOpponentSelection(selection);
          }
        });
      }
    } catch (err) {
      console.error('Exception loading selections:', err);
    }
  };

  const saveGameResult = async (winnerId: string | null) => {
    if (!gameRoom || !userProfile) return;

    try {
      let finalAnalysis = gameAnalysis;
      if (!finalAnalysis) {
        try {
          finalAnalysis = ProfessionalCheckersGame.analyzeGame(gameState);
        } catch (err) {
          console.error('Failed to calculate final game analysis:', err);
          finalAnalysis = null;
        }
      }

      const gameResult = {
        game_room_id: gameRoomId,
        winner_id: winnerId,
        player1_id: participants.find(p => p.player_number === 1)?.user_id,
        player2_id: participants.find(p => p.player_number === 2)?.user_id,
        final_board_state: ProfessionalCheckersGame.serializeGameState(gameState),
        total_turns: gameState.turnNumber,
        total_moves: gameState.moveHistory.length,
        game_analysis: finalAnalysis,
        bet_amount: gameRoom.bet_amount,
        prize_distributed: totalBetAmount,
        game_duration: Math.floor((Date.now() - new Date(gameRoom.created_at).getTime()) / 1000),
        end_reason: gameState.status === 'finished' ? 'checkmate' : 'resignation',
      };

      await supabase.from('game_results').insert(gameResult);
      await updatePlayerRatings(winnerId, participants);
    } catch (err) {
      console.error('Error saving game result:', err);
    }
  };

  // UPDATED: Removed draw case (0.5 score)
  const updatePlayerRatings = async (winnerId: string | null, participants: GameParticipant[]) => {
    try {
      const player1 = participants.find(p => p.player_number === 1);
      const player2 = participants.find(p => p.player_number === 2);

      if (!player1 || !player2) return;

      const K = 32;
      const expected1 = 1 / (1 + Math.pow(10, ((player2.profiles?.rating || 1200) - (player1.profiles?.rating || 1200)) / 400));
      const expected2 = 1 - expected1;

      const actual1 = winnerId === player1.user_id ? 1 : 0;
      const actual2 = winnerId === player2.user_id ? 1 : 0;

      const newRating1 = Math.round((player1.profiles?.rating || 1200) + K * (actual1 - expected1));
      const newRating2 = Math.round((player2.profiles?.rating || 1200) + K * (actual2 - expected2));

      await Promise.all([
        supabase.from('profiles').update({ rating: newRating1 }).eq('id', player1.user_id),
        supabase.from('profiles').update({ rating: newRating2 }).eq('id', player2.user_id)
      ]);
    } catch (err) {
      // Silent fail
    }
  };

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
                ...participant,
                profiles: profile || undefined,
              };
            } catch {
              return {
                ...participant,
                profiles: undefined,
              };
            }
          })
        );

        setParticipants(participantsWithProfiles);

        if (gameRoom?.status === 'waiting' && 
            participantsWithProfiles.length >= (gameRoom?.max_players || 2)) {
          const allReady = participantsWithProfiles.every(p => p.is_ready);
          if (allReady) {
            setTimeout(() => startGame(), 1000);
          }
        }
      } else {
        setParticipants([]);
      }
    } catch {
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

      if (existingParticipant) return;

      const { data: currentParticipants } = await supabase
        .from('game_participants')
        .select('player_number')
        .eq('game_room_id', gameRoomId);

      const usedPlayerNumbers = currentParticipants?.map(p => p.player_number) || [];
      let playerNumber = 1;

      while (usedPlayerNumbers.includes(playerNumber)) {
        playerNumber++;
      }

      await supabase
        .from('game_participants')
        .insert({
          game_room_id: gameRoomId,
          user_id: userProfile.id,
          player_number: playerNumber,
          is_ready: false,
        });

      setPlayerNumber(playerNumber);
      setIsReady(false);
      showToast(`Vous avez rejoint la partie en tant que Joueur ${playerNumber}`, 'success');
      
      await updateParticipantsCount();
      await fetchParticipants();
    } catch (err) {
      showToast('Erreur lors de la connexion à la partie');
    }
  };

  const updateParticipantsCount = async () => {
    if (!gameRoomId) return;

    try {
      const { count } = await supabase
        .from('game_participants')
        .select('*', { count: 'exact', head: true })
        .eq('game_room_id', gameRoomId);

      await supabase
        .from('game_rooms')
        .update({ current_players: count || 0 })
        .eq('id', gameRoomId);
    } catch (err) {
      // Silent fail
    }
  };

  // UPDATED: Removed draw case - always expects a winner
  const handleGameRoomUpdate = useCallback((room: GameRoom) => {
    setGameRoom(room);

    let newGameState: GameState;
    try {
      if (room.board_state && typeof room.board_state === 'object') {
        newGameState = ProfessionalCheckersGame.deserializeGameState(room.board_state);
      } else {
        newGameState = ProfessionalCheckersGame.createGameState();
      }
    } catch (err) {
      newGameState = ProfessionalCheckersGame.createGameState();
    }

    if (room.status === 'playing' && gameRoom?.status === 'waiting') {
      showToast('La partie a commencé!', 'success');
    }

    if (room.status === 'finished' && gameRoom?.status !== 'finished') {
      const winnerParticipant = participants.find(p => p.user_id === room.winner_id);
      const winner = winnerParticipant?.player_number;
      
      if (!winner) {
        console.error('No winner found - this should not happen in no-draw mode!');
        return;
      }
      
      const loser = ProfessionalCheckersGame.getOpponent(winner);
      const testState: GameState = {
        ...newGameState,
        currentPlayer: loser,
        status: 'active'
      };
      
      const validMoves = ProfessionalCheckersGame.findAllValidMoves(testState);
      const reason = validMoves.length === 0 ? 'checkmate' : 'resignation';
      
      showGameResultMessage(reason, winner);
    }

    setGameState(prev => ({
      ...newGameState,
      selectedPiece: prev?.selectedPiece || null,
      validMoves: prev?.validMoves || [],
      mustContinueJumpFrom: newGameState.mustContinueJumpFrom,
      continuingJumpPosition: newGameState.mustContinueJumpFrom,
    }));

    setTimeLeft(30);
  }, [gameRoom, participants, showGameResultMessage, showToast]);

  const markAsReady = async () => {
    if (!userProfile) return;

    try {
      await supabase
        .from('game_participants')
        .update({ is_ready: true })
        .eq('game_room_id', gameRoomId)
        .eq('user_id', userProfile.id);

      setIsReady(true);
      showToast(getTranslation('ready'), 'success');
      await fetchParticipants();
    } catch (err) {
      showToast('Erreur lors de la mise à jour du statut');
    }
  };

  const startGame = async () => {
    try {
      const { data: currentParticipants } = await supabase
        .from('game_participants')
        .select('is_ready')
        .eq('game_room_id', gameRoomId);

      const allReady = currentParticipants && 
                      currentParticipants.length >= (gameRoom?.max_players || 2) && 
                      currentParticipants.every(p => p.is_ready);

      if (!allReady) {
        showToast('Tous les joueurs ne sont pas prêts', 'error');
        return;
      }

      const initialGameState = ProfessionalCheckersGame.createGameState();
      const serializedState = ProfessionalCheckersGame.serializeGameState(initialGameState);

      await supabase
        .from('game_rooms')
        .update({
          status: 'playing',
          current_player: ProfessionalCheckersGame.PLAYER1,
          board_state: serializedState,
          current_turn: 1,
        })
        .eq('id', gameRoomId);

      showToast(getTranslation('gameStarted'), 'success');
      
      setGameState({
        ...initialGameState,
        selectedPiece: null,
        validMoves: [],
        mustContinueJumpFrom: undefined,
        continuingJumpPosition: undefined,
      });
      
      await fetchGameRoom();
    } catch (err) {
      showToast('Erreur lors du démarrage de la partie');
    }
  };

  const handleCellClick = async (row: number, col: number) => {
    if (!userProfile || !gameRoom || gameRoom.status !== 'playing') {
      showToast(`La partie est ${gameRoom?.status || 'waiting'}`);
      return;
    }

    if (gameState.status === 'finished') {
      showToast(getTranslation('gameFinished'));
      return;
    }

    if (isSpectator) {
      showToast(getTranslation('spectating'), 'info');
      return;
    }

    if (!isMyTurn) {
      showToast("Ce n'est pas votre tour", 'info');
      return;
    }

    if (gameState.selectedPiece) {
      const move = gameState.validMoves.find((m: Move) => 
        m.from.row === gameState.selectedPiece!.row &&
        m.from.col === gameState.selectedPiece!.col &&
        m.to.row === row && 
        m.to.col === col
      );

      if (move) {
        await broadcastPieceSelection(null, []);
        await makeMove(move);
        return;
      } else {
        setGameState(prev => ({
          ...prev,
          selectedPiece: null,
          validMoves: [],
        }));
        await broadcastPieceSelection(null, []);
      }
    }

    const continuingJump = gameState.mustContinueJumpFrom || gameState.continuingJumpPosition;
    if (continuingJump) {
      if (row !== continuingJump.row || col !== continuingJump.col) {
        showToast(getTranslation('mustContinueJump'), 'error');
        return;
      }
    }

    const piece = gameState.board[row][col];

    if (piece && piece.player === gameState.currentPlayer) {
      try {
        const validMoves = ProfessionalCheckersGame.calculateValidMoves(gameState, { row, col });

        if (validMoves.length === 0) {
          showToast(getTranslation('pieceBlocked'), 'info');
          return;
        }

        setGameState(prev => ({
          ...prev,
          selectedPiece: { row, col },
          validMoves,
        }));
        
        const movePositions = validMoves.map(move => move.to);
        await broadcastPieceSelection({ row, col }, movePositions);
      } catch (err) {
        showToast(getTranslation('invalidMove'), 'error');
      }
    } else {
      setGameState(prev => ({
        ...prev,
        selectedPiece: null,
        validMoves: [],
      }));
      
      await broadcastPieceSelection(null, []);
      
      if (piece) {
        showToast(getTranslation('notYourPiece'));
      } else {
        showToast(getTranslation('selectValidPiece'));
      }
    }
  };

  const makeMove = async (move: Move) => {
    if (!userProfile || !gameRoom || isProcessingMove) return;

    setIsProcessingMove(true);
    let tempBoardState: ExtendedGameState | null = null;

    try {
      const piece = gameState.board[move.from.row][move.from.col];
      if (!piece) {
        throw new Error('No piece at starting position');
      }

      if (gameRoom.bet_amount > 0 && userProfile.balance < gameRoom.bet_amount) {
        throw new Error('Solde insuffisant');
      }

      const isValidMove = gameState.validMoves.some(
        (validMove: Move) => 
          validMove.from.row === move.from.row && 
          validMove.from.col === move.from.col &&
          validMove.to.row === move.to.row && 
          validMove.to.col === move.to.col &&
          piece.player === gameState.currentPlayer
      );

      if (!isValidMove) {
        throw new Error('Move is not valid');
      }

      if (move.captures && move.captures.length > 0) {
        for (const capturePos of move.captures) {
          const capturedPiece = gameState.board[capturePos.row][capturePos.col];
          if (!capturedPiece || capturedPiece.player === piece.player) {
            throw new Error('Invalid capture - piece does not exist or is own piece');
          }
        }
      }

      const newGameState: ExtendedGameState = {
        ...ProfessionalCheckersGame.makeMove(gameState, move),
        selectedPiece: null,
        validMoves: [],
      };
      tempBoardState = newGameState;

      if (move.promotedToKing) {
        showToast(getTranslation('promotedToKing'), 'success');
      }

      setAnimatingPiece({
        piece,
        from: move.from,
        to: move.to,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const gameStateCheck = checkCurrentGameState(newGameState);
      
      let finalGameState: ExtendedGameState = newGameState;

      if (gameStateCheck.shouldEnd) {
        finalGameState = {
          ...newGameState,
          status: 'finished' as const,
          winner: gameStateCheck.winner
        };
      }

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
        
        const isContinuingJump = finalGameState.mustContinueJumpFrom || finalGameState.continuingJumpPosition;
        
        if (isContinuingJump) {
          turnNumber = lastMove.turn_number;
          moveNumber = lastMove.move_number + 1;
        } else if (newGameState.currentPlayer === gameState.currentPlayer) {
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
      };

      if (finalGameState.status === 'finished') {
        updateData.status = 'finished';
        if (finalGameState.winner) {
          const winnerParticipant = participants.find(p => p.player_number === finalGameState.winner);
          updateData.winner_id = winnerParticipant?.user_id || null;
        } else {
          updateData.winner_id = null;
        }
      }

      let retryCount = 0;
      let roomUpdateSuccess = false;
      
      while (retryCount < 3 && !roomUpdateSuccess) {
        try {
          const { error: roomError } = await supabase
            .from('game_rooms')
            .update(updateData)
            .eq('id', gameRoomId);

          if (roomError) throw roomError;
          roomUpdateSuccess = true;
        } catch (err) {
          retryCount++;
          if (retryCount >= 3) throw err;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          showToast(getTranslation('networkError'), 'info');
        }
      }

      const fromPosition = PositionConverter.toDb(move.from.row, move.from.col);
      const toPosition = PositionConverter.toDb(move.to.row, move.to.col);
      const capturedPositions = move.captures?.map(pos => PositionConverter.toDb(pos.row, pos.col)) || [];

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
      };

      await supabase.from('game_moves').insert(moveData);

      setGameState({
        ...finalGameState,
        selectedPiece: null,
        validMoves: [],
        mustContinueJumpFrom: finalGameState.mustContinueJumpFrom,
        continuingJumpPosition: finalGameState.mustContinueJumpFrom,
      });
      setAnimatingPiece(null);
      setTimeLeft(30);

      showToast(getTranslation('moveRecorded'), 'success');

      if (finalGameState.status === 'finished') {
        if (finalGameState.winner) {
          await handleGameFinish(finalGameState.winner, gameStateCheck.reason as any);
        }
      }
    } catch (err) {
      setAnimatingPiece(null);
      
      if (tempBoardState === null) {
        setGameState(prev => ({
          ...prev,
          selectedPiece: null,
          validMoves: [],
        }));
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      
      if (errorMessage.includes('cannot move backward')) {
        showToast(getTranslation('backwardMoveNotAllowed'), 'error');
      } else if (errorMessage.includes('Solde insuffisant')) {
        showToast('Solde insuffisant pour continuer', 'error');
      } else {
        showToast('Erreur: ' + errorMessage);
      }
    } finally {
      setIsProcessingMove(false);
    }
  };

  // UPDATED: Always returns a winner - no null winner
  const checkCurrentGameState = (state: ExtendedGameState): { shouldEnd: boolean; winner: number; reason: string } => {
    const validMoves = ProfessionalCheckersGame.findAllValidMoves(state);
    
    if (validMoves.length === 0) {
      return {
        shouldEnd: true,
        winner: ProfessionalCheckersGame.getOpponent(state.currentPlayer),
        reason: 'checkmate'
      };
    }
    
    const shouldEnd = ProfessionalCheckersGame.checkGameEndConditions(
      state.board,
      state.currentPlayer
    );
    
    if (shouldEnd) {
      const winner = ProfessionalCheckersGame.determineWinnerByPosition(state.board);
      return {
        shouldEnd: true,
        winner: winner,
        reason: 'material'
      };
    }
    
    return {
      shouldEnd: false,
      winner: state.currentPlayer,
      reason: ''
    };
  };

  // UPDATED: Always requires a winner
  const handleGameFinish = async (winnerPlayerNumber: number, reason: 'checkmate' | 'resignation' | 'timeout' | 'material') => {
    if (!gameRoom || !userProfile) return;

    try {
      const winnerParticipant = participants.find(p => p.player_number === winnerPlayerNumber);
      const winnerId = winnerParticipant?.user_id || null;

      await saveGameResult(winnerId);

      if (gameRoom.bet_amount && gameRoom.bet_amount > 0) {
        await distributePrizeMoney(winnerPlayerNumber);
      }

      showGameResultMessage(reason, winnerPlayerNumber);
    } catch (err) {
      console.error('Error finishing game:', err);
    }
  };

  // UPDATED: No draw distribution - winner takes all
  const distributePrizeMoney = async (winnerPlayerNumber: number) => {
    if (!gameRoom || !userProfile) return;

    try {
      const winnerParticipant = participants.find(p => p.player_number === winnerPlayerNumber);
      if (!winnerParticipant) {
        console.error('Winner participant not found');
        return;
      }

      const prizeAmount = totalBetAmount;

      try {
        const { error: rpcError } = await supabase.rpc('update_user_balance', {
          user_id: winnerParticipant.user_id,
          amount: prizeAmount,
        });

        if (rpcError) {
          throw rpcError;
        }
      } catch (rpcErr) {
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

      await supabase
        .from('transactions')
        .insert({
          user_id: winnerParticipant.user_id,
          type: 'game_win',
          amount: prizeAmount,
          status: 'completed',
          reference: `GAME-WIN-${gameRoom.id}`,
          description: `Won checkers game - ${prizeAmount}$`,
        });

      console.log(`Prize of ${prizeAmount}$ awarded to player ${winnerPlayerNumber}`);
    } catch (err) {
      console.error('Error distributing prize money:', err);
    }
  };

  const resignGame = async () => {
    if (!userProfile || !gameRoom || gameState.status === 'finished' || !playerNumber) {
      setShowResignConfirm(false);
      return;
    }

    try {
      const winnerPlayerNumber = ProfessionalCheckersGame.getOpponent(playerNumber);
      const winnerParticipant = participants.find(p => p.player_number === winnerPlayerNumber);
      
      if (!winnerParticipant) {
        throw new Error('Winner participant not found');
      }

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          status: 'finished',
          winner_id: winnerParticipant.user_id,
          board_state: ProfessionalCheckersGame.serializeGameState({
            ...gameState,
            status: 'finished',
            winner: winnerPlayerNumber
          })
        })
        .eq('id', gameRoomId);

      if (updateError) {
        throw updateError;
      }

      await handleGameFinish(winnerPlayerNumber, 'resignation');
      
      showToast(getTranslation('resignSuccess'), 'success');
      setShowResignConfirm(false);
      
      await refreshUserBalance();
    } catch (err) {
      console.error('Error resigning game:', err);
      showToast('Erreur lors de l\'abandon');
      setShowResignConfirm(false);
    }
  };

  const handleRematchRequest = async () => {
    if (!userProfile || !gameRoom) return;

    try {
      if (gameRoom.bet_amount > 0 && userProfile.balance < gameRoom.bet_amount) {
        showToast(`Solde insuffisant. Il vous faut ${gameRoom.bet_amount} $ pour une revanche.`, 'error');
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
      showToast('Revanche créée!', 'success');
    } catch (err: any) {
      showToast('Erreur lors de la création de la revanche');
    }
  };

  const createRematchWithInvitation = async () => {
    if (!userProfile || !gameRoom) return;

    try {
      if (gameRoom.bet_amount > 0 && userProfile.balance < gameRoom.bet_amount) {
        showToast(`Solde insuffisant. Il vous faut ${gameRoom.bet_amount} $ pour une revanche.`, 'error');
        return;
      }

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

      await supabase
        .from('game_participants')
        .insert({
          game_room_id: newGameRoom.id,
          user_id: userProfile.id,
          player_number: 1,
          is_ready: true,
        });

      showToast('Revanche créée!', 'success');
      setGameRoom(newGameRoom);
      setShowInviteModal(true);
    } catch (err) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-[#222]">
          <div className="text-xl mb-4">Chargement de la salle de jeu...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!gameRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
    <SupabasePushyNotifier
      channel={gameChannelRef.current}
      tableName="game_rooms"
      userId={userProfile?.id}
      onUpdate={(payload) => {
        const room = payload.new;
        const oldRoom = payload.old;
        
        // Game started
        if (room.status === 'playing' && oldRoom.status === 'waiting') {
          return {
            title: '🎯 La partie commence!',
            message: 'C\'est parti!',
            url: `/dashboard/game/p/${room.id}`,
          };
        }
        
        // Your turn
        if (room.current_player === playerNumber && oldRoom.current_player !== playerNumber) {
          return {
            title: '⏰ C\'est votre tour!',
            message: 'Faites votre mouvement',
            url: `/dashboard/game/p/${room.id}`,
          };
        }
        
        // Game finished
        if (room.status === 'finished' && oldRoom.status !== 'finished') {
          const isWinner = room.winner_id === userProfile?.id;
          return {
            title: isWinner ? '🎉 Victoire!' : '😔 Défaite',
            message: isWinner ? `Vous avez gagné ${totalBetAmount}$!` : 'Partie terminée',
            url: `/dashboard/game/p/${room.id}`,
          };
        }
        
        return {
          title: '📢 Mise à jour',
          message: 'Changement dans la partie',
          url: `/dashboard/game/p/${room.id}`,
        };
      }}
    >
      <div className="">
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

        {/* UPDATED: No draw styling - only win/lose */}
        {showGameResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-lg p-8 max-w-md text-center ${
              showGameResult.type === 'win' ? 'border-4 border-yellow-400' : 'border-4 border-red-400'
            }`}>
              <div className={`text-6xl mb-4 ${
                showGameResult.type === 'win' ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {showGameResult.type === 'win' ? '🎉' : '😔'}
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

              {gameRoom.bet_amount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700">Votre solde:</span>
                    <span className="font-semibold text-blue-900">{userProfile?.balance || 0} $</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-blue-700">Mise requise:</span>
                    <span className="font-semibold text-blue-900">{gameRoom.bet_amount} $</span>
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
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                >
                  {getTranslation('backToDashboard')}
                </button>
                
                {(gameRoom.bet_amount === 0 || (userProfile && userProfile.balance >= gameRoom.bet_amount)) && (
                  <>
                    <button
                      onClick={handleRematchRequest}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                    >
                      {getTranslation('rematch')}
                    </button>
                    
                    <button
                      onClick={createRematchWithInvitation}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
                    >
                      {getTranslation('rematch')} (Avec invitation)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {getTranslation('copyInviteLink')}
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                >
                  {getTranslation('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-2 md:px-4 py-4">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {gameRoom?.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  Mise: {gameRoom?.bet_amount || 0}$
                  {isQuickGame ? ' • Partie rapide' : ' • Sur invitation'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-gray-900 font-semibold">
                  {gameRoom?.status === 'playing' ? (
                    <span className="flex items-center space-x-2 justify-end">
                      <div className={`w-3 h-3 rounded-full ${
                        isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                      }`}></div>
                      <span>{isMyTurn ? 'À votre tour' : "Tour de l'adversaire"}</span>
                    </span>
                  ) : gameRoom?.status === 'waiting' ? (
                    <span className="text-yellow-600">
                      En attente de joueurs ({participants.length}/{gameRoom?.max_players || 2})
                    </span>
                  ) : (
                    <span className="text-red-600">Partie terminée</span>
                  )}
                </div>
                {gameRoom?.status === 'playing' && isMyTurn && (
                  <div className="text-sm text-gray-600 mt-1">
                    {getTranslation('timeRemaining')}: {timeLeft}s
                  </div>
                )}
              </div>
            </div>

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
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Partager le lien
                    </button>
                    
                    {!isSpectator && !isReady && (
                      <button
                        onClick={markAsReady}
                        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                      >
                        <span>✓</span> {getTranslation('imReady')}
                      </button>
                    )}
                    
                    {!isSpectator && isReady && (
                      <span className="bg-green-100 text-green-800 border border-green-300 px-4 py-2 rounded-lg font-semibold">
                        <span>✅</span> {getTranslation('ready')}
                      </span>
                    )}
                    
                    {canStartGame && participants.length >= (gameRoom?.max_players || 2) && (
                      <button
                        onClick={startGame}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        disabled={!participants.every(p => p.is_ready)}
                      >
                        <span>🎮</span> {getTranslation('startGame')}
                      </button>
                    )}
                  </div>
                </div>
                
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
              </div>
            )}
          </div>

          {!isSpectator && playerNumber === null && gameRoom?.status === 'waiting' && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <strong>Rejoindre la partie</strong>
                  <p className="text-sm">Vous n'êtes pas encore dans cette partie.</p>
                </div>
                <button
                  onClick={joinGame}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Rejoindre
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 bg-white rounded-lg p-6 shadow-lg gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <FaUserFriends className="h-5 w-5 text-gray-400" />
                    <span className="text-[#222] font-medium">{participants.length}/2</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[#222] font-medium">Tour {gameState.turnNumber || 1}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    </svg>
                    <span className="text-[#222] font-medium">10×10</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      gameState.status === 'finished' ? 'bg-gray-400' : 
                      isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                    }`}></div>
                    <span className="text-[#222] font-medium">
                      {gameState.status === 'finished' ? (
                        gameState.winner ? 
                          getTranslation('playerWins', { player: gameState.winner.toString() }) : 
                          getTranslation('gameFinished')
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

                <div className="flex items-center gap-4">
                  {gameRoom?.status === 'playing' && (
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold ${
                      isMyTurn ? 
                        timeLeft <= 10 ? 'bg-red-100 text-red-700 border border-red-200' : 
                        'bg-green-100 text-green-700 border border-green-200' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={isMyTurn && timeLeft <= 10 ? 'animate-pulse' : ''}>{timeLeft}s</span>
                    </div>
                  )}

                  {gameRoom?.status === 'playing' && !isSpectator && (
                    <button
                      onClick={() => setShowResignConfirm(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      {getTranslation('resign')}
                    </button>
                  )}
                </div>
              </div>

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

              {gameAnalysis && gameRoom.status === 'playing' && (
                <div className="bg-white rounded-lg p-6 shadow-lg rounded-2xl mt-6">
                  <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {getTranslation('gameAnalysis')}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-white/50 rounded-xl p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-gray-900">{getTranslation('winProbability')}</span>
                        <div className="flex space-x-4 text-sm font-semibold">
                          <span className="text-red-600">J1: {(gameAnalysis.winProbability.player1 * 100).toFixed(1)}%</span>
                          <span className="text-blue-600">J2: {(gameAnalysis.winProbability.player2 * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${gameAnalysis.winProbability.player1 * 100}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-600 mt-2">
                        <span>Avantage J1</span>
                        <span>Avantage J2</span>
                      </div>
                    </div>

                    <div className="bg-white/50 rounded-lg p-4 border border-gray-200">
                      <div className="text-sm text-gray-600 mb-2">Évaluation de la position</div>
                      <div className={`text-2xl font-bold text-center ${
                        gameAnalysis.evaluation > 0 ? 'text-green-600' : 
                        gameAnalysis.evaluation < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {gameAnalysis.evaluation > 0 ? '+' : ''}{gameAnalysis.evaluation.toFixed(1)}
                      </div>
                    </div>

                    {gameAnalysis.bestMove && (
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl">
                        <div className="flex items-center space-x-2 mb-2">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="font-semibold">Meilleur coup suggéré</span>
                        </div>
                        <div className="text-sm">
                          De {PositionConverter.toNotation(gameAnalysis.bestMove.from.row, gameAnalysis.bestMove.from.col)} 
                          {' → '}
                          {PositionConverter.toNotation(gameAnalysis.bestMove.to.row, gameAnalysis.bestMove.to.col)}
                          {gameAnalysis.bestMove.isCapture && ' (Capture)'}
                        </div>
                      </div>
                    )}

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

            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-lg rounded-2xl">
                <h3 className="text-lg font-semibold text-[#222] mb-4 flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                  Détails de la partie
                </h3>
                
                <div className="space-y-3 text-sm">
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
                  
                  <div className="flex justify-between">
                    <span className="text-gray-900">Mise:</span>
                    <span className="font-semibold text-[#222]">{gameRoom.bet_amount || 0}$</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-900">Type:</span>
                    <span className="font-semibold text-[#222]">
                      {isQuickGame ? 'Partie rapide' : 'Sur invitation'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-900">Votre rôle:</span>
                    <span className="font-semibold text-[#222]">
                      {isSpectator ? 'Spectateur' : `Joueur ${playerNumber}`}
                      {!isSpectator && isReady && ' ✓'}
                    </span>
                  </div>
                  
                  {gameRoom.status === 'playing' && (
                    <div className="flex justify-between">
                      <span className="text-gray-900">Tour actuel:</span>
                      <span className="font-semibold text-[#222]">
                        Joueur {gameState.currentPlayer}
                        {isMyTurn && ' (Vous)'}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-3 mt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 font-semibold">Mise totale:</span>
                      <span className="text-lg font-bold text-[#222]">{totalBetAmount} $</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 text-right">
                      Le gagnant remporte {totalBetAmount} $ 💰
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
                  {participants.map(participant => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-4 rounded-xl ${
                        participant.user_id === userProfile?.id 
                          ? 'bg-blue-500/20 border border-blue-300' 
                          : 'bg-white/50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                          participant.player_number === 1 ? 'bg-gradient-to-br from-red-500 to-red-600' : 
                          'bg-gradient-to-br from-blue-500 to-blue-600'
                        }`}>
                          {participant.player_number}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <div className={`font-semibold text-[#222] truncate ${
                              participant.user_id === userProfile?.id ? 'text-blue-700' : ''
                            }`}>
                              {participant.profiles?.username || `Joueur ${participant.player_number}`}
                            </div>
                            {participant.user_id === userProfile?.id && (
                              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">Vous</span>
                            )}
                          </div>
                          
                          {participant.profiles?.rating && (
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
                        participant.is_ready ? 'bg-green-100 text-green-700 border border-green-200' : 
                        'bg-yellow-100 text-yellow-700 border border-yellow-200'
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
                  ))}
                  
                  {participants.length < (gameRoom?.max_players || 2) && (
                    Array.from({ length: (gameRoom?.max_players || 2) - participants.length }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-100/50 border border-gray-300 border-dashed"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold">
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
    </SupabasePushyNotifier>
  );
}