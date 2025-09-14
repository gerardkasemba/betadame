// hooks/useCheckersGame.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSupabase } from '@/lib/supabase-client';
import PartySocket from 'partysocket';
import { Game, Board, Position, Move } from '@/types';

const BOARD_SIZE = 8;

export const initialBoard: (string | null)[] = Array(32).fill(null).map((_, index) => {
  if (index < 12) return 'bp'; // Black pieces in rows 0-2
  if (index >= 20) return 'wp'; // Red pieces in rows 5-7
  return null; // Empty squares
});

// Convert Supabase 1D board to client 8x8 board
const supabaseToClientBoard = (supabaseBoard: (string | null)[]): Board => {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  let index = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        const piece = supabaseBoard[index];
        if (piece) {
          board[row][col] = {
            player: piece.startsWith('b') ? 'black' : 'red',
            isKing: piece.endsWith('k'),
          };
        }
        index++;
      }
    }
  }
  return board;
};

// Convert client 8x8 board to Supabase 1D board
const clientToSupabaseBoard = (board: Board): (string | null)[] => {
  const supabaseBoard: (string | null)[] = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        const piece = board[row][col];
        if (piece) {
          supabaseBoard.push(
            piece.player === 'black' ? (piece.isKing ? 'bk' : 'bp') : (piece.isKing ? 'wk' : 'wp')
          );
        } else {
          supabaseBoard.push(null);
        }
      }
    }
  }
  return supabaseBoard;
};

// Validate position
const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && (row + col) % 2 === 1;
};

// Get valid moves for a piece
const getValidMoves = (board: Board, position: Position, player: 'red' | 'black'): Move[] => {
  const { row, col } = position;
  const piece = board[row][col];
  if (!piece || piece.player !== player) return [];

  const moves: Move[] = [];
  const directions = piece.isKing
    ? [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ]
    : piece.player === 'black'
    ? [[1, -1], [1, 1]]
    : [[-1, -1], [-1, 1]];

  // Regular moves
  for (const [rowDir, colDir] of directions) {
    const newRow = row + rowDir;
    const newCol = col + colDir;
    if (isValidPosition(newRow, newCol) && !board[newRow][newCol]) {
      moves.push({ row: newRow, col: newCol, isJump: false, captured: undefined });
    }
  }

  // Jump moves
  for (const [rowDir, colDir] of directions) {
    const jumpRow = row + 2 * rowDir;
    const jumpCol = col + 2 * colDir;
    const midRow = row + rowDir;
    const midCol = col + colDir;
    if (
      isValidPosition(jumpRow, jumpCol) &&
      !board[jumpRow][jumpCol] &&
      board[midRow][midCol] &&
      board[midRow][midCol]!.player !== player
    ) {
      moves.push({ row: jumpRow, col: jumpCol, isJump: true, captured: [{ row: midRow, col: midCol }] });
    }
  }

  return moves;
};

// Check if a piece can jump again after a jump
const canJumpAgain = (board: Board, position: Position, player: 'red' | 'black'): Move[] => {
  const piece = board[position.row][position.col];
  if (!piece) return [];

  const directions = piece.isKing
    ? [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
      ]
    : piece.player === 'black'
    ? [[1, -1], [1, 1]]
    : [[-1, -1], [-1, 1]];

  const jumpMoves: Move[] = [];
  for (const [rowDir, colDir] of directions) {
    const jumpRow = position.row + 2 * rowDir;
    const jumpCol = position.col + 2 * colDir;
    const midRow = position.row + rowDir;
    const midCol = position.col + colDir;
    if (
      isValidPosition(jumpRow, jumpCol) &&
      !board[jumpRow][jumpCol] &&
      board[midRow][midCol] &&
      board[midRow][midCol]!.player !== player
    ) {
      jumpMoves.push({ row: jumpRow, col: jumpCol, isJump: true, captured: [{ row: midRow, col: midCol }] });
    }
  }
  return jumpMoves;
};

// Move a piece and update the board
const movePiece = (
  board: Board,
  from: Position,
  to: Position,
  isJump: boolean,
  captured?: Position[]
): { newBoard: Board; newRedPieces: number; newBlackPieces: number } => {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col]!;
  newBoard[to.row][to.col] = piece;
  newBoard[from.row][from.col] = null;

  if (isJump && captured) {
    captured.forEach(pos => {
      newBoard[pos.row][pos.col] = null;
    });
  }

  // Promote to king
  if (piece.player === 'black' && to.row === BOARD_SIZE - 1) {
    newBoard[to.row][to.col] = { ...piece, isKing: true };
  } else if (piece.player === 'red' && to.row === 0) {
    newBoard[to.row][to.col] = { ...piece, isKing: true };
  }

  const newRedPieces = newBoard.flat().filter(p => p && p.player === 'red').length;
  const newBlackPieces = newBoard.flat().filter(p => p && p.player === 'black').length;

  return { newBoard, newRedPieces, newBlackPieces };
};

// Check if the game is over
const checkGameOver = (board: Board, currentPlayer: 'red' | 'black'): 'red' | 'black' | null => {
  const opponent = currentPlayer === 'red' ? 'black' : 'red';
  const hasPieces = board.flat().some(p => p && p.player === opponent);
  if (!hasPieces) {
    return currentPlayer;
  }

  let hasMoves = false;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] && board[row][col]!.player === opponent) {
        const moves = getValidMoves(board, { row, col }, opponent);
        if (moves.length > 0) {
          hasMoves = true;
          break;
        }
      }
    }
    if (hasMoves) break;
  }

  return hasMoves ? null : currentPlayer;
};

// Remove computer player constants and logic
export const useCheckersGame = (initialGame?: Game) => {
  const { supabase } = useSupabase();
  const [board, setBoard] = useState<Board>(() => 
    initialGame ? supabaseToClientBoard(initialGame.board) : 
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'red' | 'black'>(
    initialGame?.current_player === 'white' ? 'red' : 'black'
  );
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [redPieces, setRedPieces] = useState<number>(
    initialGame ? initialGame.board.filter(p => p === 'wp' || p === 'wk').length : 12
  );
  const [blackPieces, setBlackPieces] = useState<number>(
    initialGame ? initialGame.board.filter(p => p === 'bp' || p === 'bk').length : 12
  );
  const [gameStatus, setGameStatus] = useState<'open' | 'active' | 'finished' | 'closed'>(
    initialGame?.status || 'open'
  );
  const [error, setError] = useState<string | null>(null);
  const [opponentActivity, setOpponentActivity] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [lastPlayer2Move, setLastPlayer2Move] = useState<{ from: Position; to: Position } | null>(null);
  const [gameLink, setGameLink] = useState<string>('');
  
  const socketRef = useRef<PartySocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameExpiryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Set isMountedRef to false on cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Get current user ID with caching
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }, [supabase]);

  // Check if current user is the active player
  const isCurrentPlayer = useCallback(async (): Promise<boolean> => {
    if (!initialGame) return false;
    
    const userId = await getCurrentUserId();
    if (!userId) return false;
    
    return (
      (userId === initialGame.player1_id && currentPlayer === 'black') ||
      (userId === initialGame.player2_id && currentPlayer === 'red')
    );
  }, [initialGame, currentPlayer, getCurrentUserId]);

  // Initialize or reset the game state
  const initializeBoard = useCallback(() => {
    if (!initialGame) return;
    
    const newBoard = supabaseToClientBoard(initialGame.board);
    setBoard(newBoard);
    setCurrentPlayer(initialGame.current_player === 'white' ? 'red' : 'black');
    setRedPieces(initialGame.board.filter(p => p === 'wp' || p === 'wk').length);
    setBlackPieces(initialGame.board.filter(p => p === 'bp' || p === 'bk').length);
    setGameStatus(initialGame.status);
    setSelectedPiece(null);
    setValidMoves([]);
    setError(null);
    setOpponentActivity(null);
    setLastPlayer2Move(null);
    
    // Generate game link for sharing
    if (typeof window !== 'undefined') {
      setGameLink(`${window.location.origin}/game/${initialGame.id}`);
    }
    
    // Calculate time left based on last move
    if (initialGame.status === 'active' && initialGame.last_move_at) {
      const lastMoveTime = new Date(initialGame.last_move_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - lastMoveTime) / 1000);
      const remaining = Math.max(30 - elapsed, 0);
      setTimeLeft(remaining);
    } else {
      setTimeLeft(30);
    }
  }, [initialGame]);

  // Update user balance with transaction safety
  const updateUserBalance = useCallback(async (userId: string, amount: number): Promise<number> => {
    try {
      console.log(`Attempting to update balance for user ${userId} by ${amount}`);
      
      // First get current balance
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .maybeSingle();
      
      if (fetchError) {
        console.error('Error fetching user balance:', fetchError);
        throw new Error(`Failed to fetch user balance: ${fetchError.message}`);
      }
      
      if (!userData) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Update balance using direct SQL operation
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ 
          balance: userData.balance + amount,
        })
        .eq('id', userId)
        .select('balance')
        .single();

      if (updateError) {
        console.error('Error updating user balance:', updateError);
        throw new Error(`Failed to update balance: ${updateError.message}`);
      }

      console.log(`Balance updated successfully. New balance: ${updatedUser.balance}`);
      return updatedUser.balance;
    } catch (error) {
      console.error('Error in updateUserBalance:', error);
      throw error;
    }
  }, [supabase]);

  // Handle game completion and stake distribution
  const handleGameCompletion = useCallback(async (winnerId: string | null) => {
    if (!initialGame || !winnerId) return;

    try {
      const stake = initialGame.stake;

      // Regular game between two players
      if (winnerId === initialGame.player1_id) {
        // Player 1 wins: gets both stakes
        await updateUserBalance(initialGame.player1_id, stake);
        if (initialGame.player2_id) {
          await updateUserBalance(initialGame.player2_id, -stake);
        }
      } else if (winnerId === initialGame.player2_id) {
        // Player 2 wins: gets both stakes
        await updateUserBalance(initialGame.player2_id, stake);
        await updateUserBalance(initialGame.player1_id, -stake);
      } else {
        // Draw - return stakes to both players
        if (initialGame.player1_id) {
          await updateUserBalance(initialGame.player1_id, 0); // No change
        }
        if (initialGame.player2_id) {
          await updateUserBalance(initialGame.player2_id, 0); // No change
        }
      }
    } catch (error) {
      console.error('Error handling game completion:', error);
      setError('Erreur lors de la distribution des gains');
      throw error;
    }
  }, [initialGame, updateUserBalance]);

  // Check for game expiry (24 hours without player2 joining)
  const checkGameExpiry = useCallback(async () => {
    if (!initialGame || initialGame.status !== 'open' || initialGame.player2_id) return;

    const createdAt = new Date(initialGame.created_at).getTime();
    const now = Date.now();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

    // Clear any existing timer
    if (gameExpiryTimerRef.current) {
      clearTimeout(gameExpiryTimerRef.current);
      gameExpiryTimerRef.current = null;
    }

    if (hoursSinceCreation >= 24) {
      // If already past 24 hours, close the game and refund immediately
      await closeExpiredGame();
    } else {
      // Set a timer for the remaining time
      const remainingHours = 24 - hoursSinceCreation;
      gameExpiryTimerRef.current = setTimeout(() => {
        closeExpiredGame();
      }, remainingHours * 60 * 60 * 1000);
    }
  }, [initialGame]);

  // Close expired game and refund player
  const closeExpiredGame = useCallback(async () => {
    if (!initialGame || initialGame.status !== 'open' || initialGame.player2_id) return;

    try {
      // Refund the stake to player1
      await updateUserBalance(initialGame.player1_id, initialGame.stake);

      // Update the game status to closed
      const { error } = await supabase
        .from('games')
        .update({
          status: 'closed',
          closes_at: new Date().toISOString(),
        })
        .eq('id', initialGame.id);

      if (error) {
        console.error('Error closing expired game:', error);
        throw error;
      }

      // Update local state
      if (isMountedRef.current) {
        setGameStatus('closed');
        setError('Partie fermée après 24 heures sans adversaire. Votre mise a été remboursée.');
      }
    } catch (error) {
      console.error('Error in closeExpiredGame:', error);
      if (isMountedRef.current) {
        setError('Erreur lors de la fermeture de la partie expirée');
      }
    }
  }, [initialGame, supabase, updateUserBalance]);

  // Share game on social media
  const shareGame = useCallback((platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => {
    if (!gameLink) return;

    const text = `Rejoins-moi dans une partie de dames! Mise: ${initialGame?.stake || 0} crédits.`;
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameLink)}&quote=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(gameLink)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${gameLink}`)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(`${text} ${gameLink}`)
          .then(() => setError('Lien copié dans le presse-papier!'))
          .catch(() => setError('Échec de la copie du lien'));
        break;
    }
  }, [gameLink, initialGame?.stake]);

  // Initialize game expiry check on component mount
  useEffect(() => {
    if (initialGame && initialGame.status === 'open' && !initialGame.player2_id) {
      checkGameExpiry();
    }
    
    return () => {
      if (gameExpiryTimerRef.current) {
        clearTimeout(gameExpiryTimerRef.current);
      }
    };
  }, [initialGame, checkGameExpiry]);

  // Handle timer countdown
  useEffect(() => {
    if (gameStatus !== 'active') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timeout handling - switch player
          const nextPlayer = currentPlayer === 'black' ? 'red' : 'black';
          
          if (socketRef.current && initialGame) {
            socketRef.current.send(
              JSON.stringify({
                type: 'timeout',
                game_id: initialGame.id,
                current_player: nextPlayer === 'red' ? 'white' : 'black',
                board: clientToSupabaseBoard(board),
                redPieces,
                blackPieces,
                status: gameStatus,
                last_move_at: new Date().toISOString(),
              })
            );
          }
          
          if (isMountedRef.current) {
            setCurrentPlayer(nextPlayer);
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus, currentPlayer, initialGame, board, redPieces, blackPieces]);

  // Handle joining a game
  const joinGame = useCallback(async () => {
    if (!initialGame || initialGame.status !== 'open' || initialGame.player2_id) {
      setError('Impossible de rejoindre cette partie');
      throw new Error('Impossible de rejoindre cette partie');
    }

    try {
      const userId = await getCurrentUserId();
      if (!userId || userId === initialGame.player1_id) {
        setError('Non autorisé à rejoindre cette partie');
        throw new Error('Non autorisé à rejoindre cette partie');
      }

      // Check user balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single();

      if (userError || !userData || userData.balance < initialGame.stake) {
        setError('Solde insuffisant pour rejoindre');
        throw new Error('Solde insuffisant pour rejoindre');
      }

      // Deduct stake from user first
      await updateUserBalance(userId, -initialGame.stake);

      // Then update game - stake becomes the sum of both players' stakes
      const { error: gameError } = await supabase
        .from('games')
        .update({
          player2_id: userId,
          status: 'active',
          closes_at: null,
          stake: initialGame.stake * 2, // Total stake is now player1 + player2
        })
        .eq('id', initialGame.id);

      if (gameError) {
        // If game update fails, refund the user
        await updateUserBalance(userId, initialGame.stake);
        throw gameError;
      }

      // Clear expiry timer
      if (gameExpiryTimerRef.current) {
        clearTimeout(gameExpiryTimerRef.current);
        gameExpiryTimerRef.current = null;
      }

      if (isMountedRef.current) {
        setGameStatus('active');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      if (isMountedRef.current) {
        setError('Erreur lors de la jointure : ' + (error as Error).message);
      }
      throw error;
    }
  }, [initialGame, supabase, getCurrentUserId, updateUserBalance]);

  // Handle resigning the game
  const resignGame = useCallback(async () => {
    if (!initialGame || gameStatus !== 'active') {
      setError('La partie n\'est pas active');
      return;
    }

    try {
      const userId = await getCurrentUserId();
      if (!userId || (userId !== initialGame.player1_id && userId !== initialGame.player2_id)) {
        setError('Non autorisé à abandonner');
        return;
      }

      // Determine winner based on who is resigning
      const winnerId = userId === initialGame.player1_id 
        ? initialGame.player2_id 
        : initialGame.player1_id;

      // Update the game status
      const updateData: Partial<Game> = {
        status: 'finished',
        winner_id: winnerId,
      };

      const { error: gameError } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', initialGame.id);

      if (gameError) {
        console.error('Error updating game status:', gameError);
        throw new Error(`Failed to update game status: ${gameError.message}`);
      }

      // Handle stake distribution
      await handleGameCompletion(winnerId);

      // Notify via socket
      if (socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: 'resign',
            player_id: userId,
            status: 'finished',
            winner_id: winnerId,
          })
        );
      }

      // Update local state only if component is still mounted
      if (isMountedRef.current) {
        setGameStatus('finished');
        setError('Vous avez abandonné la partie !');
      }
      
    } catch (error) {
      console.error('Error resigning game:', error);
      if (isMountedRef.current) {
        setError('Erreur lors de l\'abandon : ' + (error as Error).message);
      }
    }
  }, [initialGame, gameStatus, supabase, handleGameCompletion, getCurrentUserId]);

  // Real-time updates with PartyKit
  useEffect(() => {
    if (!initialGame) return;

    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTY_HOST || 'http://localhost:1999',
      room: `game:${initialGame.id}`,
    });
    socketRef.current = socket;

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, board: newSupabaseBoard, currentPlayer: newPlayer, redPieces, blackPieces, status, winner_id, player_id, last_move_at, moveDetails } = message;
        
        if (type === 'move' || type === 'timeout') {
          const newBoard = supabaseToClientBoard(newSupabaseBoard);
          
          // Only update state if component is still mounted
          if (isMountedRef.current) {
            setBoard(newBoard);
            setCurrentPlayer(newPlayer === 'white' ? 'red' : 'black');
            setRedPieces(redPieces);
            setBlackPieces(blackPieces);
            setGameStatus(status);
            setSelectedPiece(null);
            setValidMoves([]);

            const userId = await getCurrentUserId();
            if (userId && moveDetails && player_id !== userId && newPlayer === 'black') {
              const moveText = `L'adversaire a déplacé de (${moveDetails.from.row}, ${moveDetails.from.col}) à (${moveDetails.to.row}, ${moveDetails.to.col})`;
              setOpponentActivity(moveText);
              setLastPlayer2Move({ from: moveDetails.from, to: { row: moveDetails.to.row, col: moveDetails.to.col } });
            } else {
              setOpponentActivity(null);
              setLastPlayer2Move(null);
            }

            if (last_move_at) {
              const lastMoveTime = new Date(last_move_at).getTime();
              const now = Date.now();
              const elapsed = Math.floor((now - lastMoveTime) / 1000);
              const remaining = Math.max(30 - elapsed, 0);
              setTimeLeft(remaining);
            } else {
              setTimeLeft(30);
            }

            if (status === 'finished' && winner_id) {
              setError(`Partie terminée ! Gagnant : ${winner_id}`);
              setLastPlayer2Move(null);
              await handleGameCompletion(winner_id);
            }
          }
        } else if (type === 'opponent_active') {
          const userId = await getCurrentUserId();
          if (userId && player_id !== userId && isMountedRef.current) {
            const isPlayerTurn = await isCurrentPlayer();
            if (!isPlayerTurn) {
              setOpponentActivity('Votre adversaire réfléchit...');
            }
          }
        } else if (type === 'resign') {
          const userId = await getCurrentUserId();
          if (userId && isMountedRef.current) {
            setGameStatus('finished');
            setError(`Partie terminée ! ${player_id === userId ? 'Vous avez abandonné.' : 'Votre adversaire a abandonné.'}`);
            setTimeLeft(0);
            setLastPlayer2Move(null);
            
            const winnerId = player_id === userId
              ? (userId === initialGame.player1_id ? initialGame.player2_id : initialGame.player1_id)
              : userId;
              
            await handleGameCompletion(winnerId);
          }
        } else if (type === 'player_joined') {
          if (isMountedRef.current) {
            setGameStatus('active');
          }
        }
      } catch (error) {
        console.error('Error processing socket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('Socket error:', error);
      if (isMountedRef.current) {
        setError('Connexion au serveur de jeu échouée.');
      }
    };
    
    socket.onclose = () => {
      console.log('Socket closed');
      if (isMountedRef.current) {
        setError('Déconnecté du serveur de jeu.');
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [initialGame, supabase, handleGameCompletion, getCurrentUserId, isCurrentPlayer]);

  // Handle square click
  const handleSquareClick = useCallback(
    async (row: number, col: number) => {
      if (!initialGame || gameStatus !== 'active') {
        setError('La partie n\'est pas active');
        return;
      }

      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          setError('Veuillez vous connecter pour jouer');
          return;
        }

        const isPlayerTurn = await isCurrentPlayer();
        if (!isPlayerTurn) {
          setError('Ce n\'est pas votre tour');
          return;
        }

        if (selectedPiece) {
          const move = validMoves.find(m => m.row === row && m.col === col);
          if (move) {
            const { newBoard, newRedPieces, newBlackPieces } = movePiece(board, selectedPiece, { row, col }, move.isJump, move.captured);
            const nextPlayer = currentPlayer === 'black' ? 'red' : 'black';
            const jumpMoves = move.isJump ? canJumpAgain(newBoard, { row, col }, currentPlayer) : [];

            if (jumpMoves.length > 0 && move.isJump) {
              // Continue with jump sequence
              if (isMountedRef.current) {
                setBoard(newBoard);
                setSelectedPiece({ row, col });
                setValidMoves(jumpMoves);
                setRedPieces(newRedPieces);
                setBlackPieces(newBlackPieces);
                setTimeLeft(30);
              }
              
              if (socketRef.current) {
                socketRef.current.send(
                  JSON.stringify({
                    type: 'move',
                    board: clientToSupabaseBoard(newBoard),
                    currentPlayer: currentPlayer === 'black' ? 'black' : 'white',
                    redPieces: newRedPieces,
                    blackPieces: newBlackPieces,
                    status: 'active',
                    player_id: userId,
                    last_move_at: new Date().toISOString(),
                    moveDetails: {
                      from: selectedPiece,
                      to: { row, col },
                      isJump: move.isJump,
                    },
                  })
                );
              }
              
              if (currentPlayer === 'red' && isMountedRef.current) {
                setLastPlayer2Move({ from: selectedPiece, to: { row, col } });
              }
            } else {
              // Complete the move
              if (isMountedRef.current) {
                setBoard(newBoard);
                setSelectedPiece(null);
                setValidMoves([]);
                setRedPieces(newRedPieces);
                setBlackPieces(newBlackPieces);
                setTimeLeft(30);
                
                if (currentPlayer === 'red') {
                  setLastPlayer2Move({ from: selectedPiece, to: { row, col } });
                }
              }

              const winner = checkGameOver(newBoard, currentPlayer);
              const updateData: Partial<Game> = {
                board: clientToSupabaseBoard(newBoard),
                current_player: nextPlayer === 'black' ? 'black' : 'white',
                last_move_at: new Date().toISOString(),
              };

              if (winner) {
                updateData.status = 'finished';
                updateData.winner_id = winner === 'black' ? initialGame.player1_id : initialGame.player2_id;
              }

              const { error } = await supabase
                .from('games')
                .update(updateData)
                .eq('id', initialGame.id);

              if (error) throw error;

              if (socketRef.current) {
                socketRef.current.send(
                  JSON.stringify({
                    type: 'move',
                    board: clientToSupabaseBoard(newBoard),
                    currentPlayer: nextPlayer === 'black' ? 'black' : 'white',
                    redPieces: newRedPieces,
                    blackPieces: newBlackPieces,
                    status: winner ? 'finished' : 'active',
                    winner_id: winner
                      ? (winner === 'black' ? initialGame.player1_id : initialGame.player2_id)
                      : null,
                    player_id: userId,
                    last_move_at: new Date().toISOString(),
                    moveDetails: {
                      from: selectedPiece,
                      to: { row, col },
                      isJump: move.isJump,
                    },
                  })
                );
              }

              if (isMountedRef.current) {
                setCurrentPlayer(nextPlayer);
                if (winner) {
                  setGameStatus('finished');
                  setTimeLeft(0);
                  setLastPlayer2Move(null);
                  await handleGameCompletion(
                    winner === 'black' ? initialGame.player1_id : initialGame.player2_id
                  );
                }
              }
            }
          } else {
            if (isMountedRef.current) {
              setSelectedPiece(null);
              setValidMoves([]);
            }
          }
        } else {
          const piece = board[row][col];
          if (piece && piece.player === currentPlayer) {
            const moves = getValidMoves(board, { row, col }, currentPlayer);
            if (isMountedRef.current) {
              setSelectedPiece({ row, col });
              setValidMoves(moves);
            }
            
            if (socketRef.current) {
              socketRef.current.send(
                JSON.stringify({
                  type: 'opponent_active',
                  player_id: userId,
                })
              );
            }
          }
        }
      } catch (error) {
        console.error('Error in handleSquareClick:', error);
        if (isMountedRef.current) {
          setError('Erreur lors du mouvement : ' + (error as Error).message);
        }
      }
    },
    [board, currentPlayer, selectedPiece, validMoves, initialGame, gameStatus, supabase, handleGameCompletion, getCurrentUserId, isCurrentPlayer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      if (timerRef.current) clearInterval(timerRef.current);
      if (gameExpiryTimerRef.current) clearTimeout(gameExpiryTimerRef.current);
      
      // Close socket
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return {
    board,
    currentPlayer,
    selectedPiece,
    validMoves,
    redPieces,
    blackPieces,
    initializeBoard,
    handleSquareClick,
    gameStatus,
    joinGame,
    resignGame,
    error,
    opponentActivity,
    timeLeft,
    lastPlayer2Move,
    shareGame,
    gameLink,
  };
};