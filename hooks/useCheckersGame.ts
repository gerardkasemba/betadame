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
// Computer player constants
const COMPUTER_ID = 'a9f80596-2373-4343-bdfa-8b9c0eee84c4';
const COMPUTER_EMAIL = 'gerardkasemba@gmail.com';
const COMPUTER_MOVE_DELAY = 1000; // 1 second for computer moves
const COMPUTER_JOIN_DELAY = 60000; // 60 seconds before computer joins

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
  const [isComputerMode, setIsComputerMode] = useState<boolean>(
    initialGame ? !!initialGame.player2_id && initialGame.player2_id === COMPUTER_ID : false
  );
  const [error, setError] = useState<string | null>(null);
  const [opponentActivity, setOpponentActivity] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [lastPlayer2Move, setLastPlayer2Move] = useState<{ from: Position; to: Position } | null>(null);
  
  const socketRef = useRef<PartySocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const computerModeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const computerMoveTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    
    if (isComputerMode) {
      return userId === initialGame.player1_id && currentPlayer === 'black';
    }
    
    return (
      (userId === initialGame.player1_id && currentPlayer === 'black') ||
      (userId === initialGame.player2_id && currentPlayer === 'red')
    );
  }, [initialGame, currentPlayer, isComputerMode, getCurrentUserId]);

  // Initialize or reset the game state
  const initializeBoard = useCallback(() => {
    if (!initialGame) return;
    
    const newBoard = supabaseToClientBoard(initialGame.board);
    setBoard(newBoard);
    setCurrentPlayer(initialGame.current_player === 'white' ? 'red' : 'black');
    setRedPieces(initialGame.board.filter(p => p === 'wp' || p === 'wk').length);
    setBlackPieces(initialGame.board.filter(p => p === 'bp' || p === 'bk').length);
    setGameStatus(initialGame.status);
    setIsComputerMode(!!initialGame.player2_id && initialGame.player2_id === COMPUTER_ID);
    setSelectedPiece(null);
    setValidMoves([]);
    setError(null);
    setOpponentActivity(null);
    setLastPlayer2Move(null);
    
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
      // Use the database function for atomic balance updates
      const { data, error } = await supabase.rpc('update_user_balance', {
        user_id: userId,
        amount
      });

      if (error) {
        console.error('Error updating user balance:', error.message);
        throw new Error('Failed to update balance');
      }

      return data;
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

      if (isComputerMode) {
        // Computer mode: handle stake transfer between player and computer
        if (winnerId === COMPUTER_ID) {
          // Computer wins: transfer stake from player to computer
          await updateUserBalance(initialGame.player1_id, -stake);
          await updateUserBalance(COMPUTER_ID, stake);
        } else {
          // Player wins: transfer stake from computer to player
          await updateUserBalance(COMPUTER_ID, -stake);
          await updateUserBalance(initialGame.player1_id, stake);
        }
      } else {
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
      }
    } catch (error) {
      console.error('Error handling game completion:', error);
      setError('Erreur lors de la distribution des gains');
      throw error;
    }
  }, [initialGame, updateUserBalance, isComputerMode]);

  // Activate computer mode
  const activateComputerMode = useCallback(async () => {
    if (!initialGame || initialGame.player2_id || !isMountedRef.current) return;
    
    try {
      // First, deduct stake from computer account
      await updateUserBalance(COMPUTER_ID, -initialGame.stake);
      
      // Then update the game to include computer as player 2
      const { error } = await supabase
        .from('games')
        .update({
          status: 'active',
          player2_id: COMPUTER_ID,
          closes_at: null,
          stake: initialGame.stake * 1, // Total stake is now player1 + computer
        })
        .eq('id', initialGame.id);

      if (error) {
        // If game update fails, refund the computer
        await updateUserBalance(COMPUTER_ID, initialGame.stake);
        throw error;
      }

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsComputerMode(true);
        setGameStatus('active');
        setOpponentActivity('Vous jouez contre l\'ordinateur (mode difficile)');
      }
    } catch (error) {
      console.error('Error activating computer mode:', error);
      if (isMountedRef.current) {
        setError('Erreur lors de l\'activation du mode ordinateur');
      }
      throw error;
    }
  }, [initialGame, supabase, updateUserBalance]);

  // Check for computer mode activation
  useEffect(() => {
    if (!initialGame || initialGame.status !== 'open' || initialGame.player2_id) return;

    const createdAt = new Date(initialGame.created_at).getTime();
    const now = Date.now();
    const timeSinceCreation = (now - createdAt) / 1000;

    // Clear any existing timer
    if (computerModeTimerRef.current) {
      clearTimeout(computerModeTimerRef.current);
      computerModeTimerRef.current = null;
    }

    if (timeSinceCreation >= 60) {
      // If already past the time, activate computer mode immediately
      activateComputerMode().catch(console.error);
    } else {
      // Set a timer for the remaining time
      const remainingTime = 60 - timeSinceCreation;
      computerModeTimerRef.current = setTimeout(() => {
        activateComputerMode().catch(console.error);
      }, remainingTime * 1000);
    }

    return () => {
      if (computerModeTimerRef.current) {
        clearTimeout(computerModeTimerRef.current);
      }
    };
  }, [initialGame, activateComputerMode]);

  // Hard mode AI using minimax with alpha-beta pruning
  const minimax = useCallback(
    (board: Board, depth: number, isMaximizing: boolean, alpha: number, beta: number): { score: number; move: { from: Position; to: Move } | null } => {
      const winner = checkGameOver(board, isMaximizing ? 'red' : 'black');
      if (winner === 'red') return { score: 1000 - depth, move: null };
      if (winner === 'black') return { score: -1000 + depth, move: null };
      if (depth === 0) {
        return { score: evaluateBoard(board), move: null };
      }

      let bestMove: { from: Position; to: Move } | null = null;
      let bestScore = isMaximizing ? -Infinity : Infinity;
      const allMoves: { from: Position; to: Move }[] = [];

      // Precompute all possible moves
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const piece = board[row][col];
          if (piece && piece.player === (isMaximizing ? 'red' : 'black')) {
            const moves = getValidMoves(board, { row, col }, isMaximizing ? 'red' : 'black');
            moves.forEach((move) => allMoves.push({ from: { row, col }, to: move }));
          }
        }
      }

      if (allMoves.length === 0) {
        return { score: isMaximizing ? -1000 + depth : 1000 - depth, move: null };
      }

      // Sort moves for better alpha-beta pruning efficiency
      allMoves.sort((a, b) => {
        const scoreA = evaluateMove(board, a.from, a.to);
        const scoreB = evaluateMove(board, b.from, b.to);
        return isMaximizing ? scoreB - scoreA : scoreA - scoreB;
      });

      for (const { from, to } of allMoves) {
        const { newBoard } = movePiece(board, from, { row: to.row, col: to.col }, to.isJump, to.captured);
        const { score } = minimax(newBoard, depth - 1, !isMaximizing, alpha, beta);

        if (isMaximizing) {
          if (score > bestScore) {
            bestScore = score;
            bestMove = { from, to };
          }
          alpha = Math.max(alpha, bestScore);
          if (beta <= alpha) break;
        } else {
          if (score < bestScore) {
            bestScore = score;
            bestMove = { from, to };
          }
          beta = Math.min(beta, bestScore);
          if (beta <= alpha) break;
        }
      }

      return { score: bestScore, move: bestMove };
    },
    []
  );

  // Evaluate a single move for move ordering
  const evaluateMove = useCallback((board: Board, from: Position, to: Move): number => {
    let score = 0;
    
    // Prioritize captures
    if (to.isJump && to.captured) {
      score += 10;
    }
    
    // Prioritize king promotions
    const piece = board[from.row][from.col];
    if (piece && !piece.isKing) {
      if ((piece.player === 'red' && to.row === 0) || (piece.player === 'black' && to.row === BOARD_SIZE - 1)) {
        score += 5;
      }
    }
    
    // Center control
    const centerCol = Math.floor(BOARD_SIZE / 2);
    score -= Math.abs(to.col - centerCol) * 0.1;
    
    return score;
  }, []);

  // Evaluate board for minimax
  const evaluateBoard = useCallback((board: Board): number => {
    let score = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (!piece) continue;
        
        const value = piece.isKing ? 5 : 1;
        score += piece.player === 'red' ? value : -value;
        
        // Positional advantage
        if (piece.player === 'red') {
          score += (7 - row) * 0.1;
          // Back row defense bonus
          if (row === BOARD_SIZE - 1) score += 0.2;
        } else {
          score -= row * 0.1;
          // Back row defense bonus
          if (row === 0) score -= 0.2;
        }
        
        // Center control bonus
        const centerCol = Math.floor(BOARD_SIZE / 2);
        score += (piece.player === 'red' ? 1 : -1) * (0.1 / (Math.abs(col - centerCol) + 1));
      }
    }
    return score;
  }, []);

  // Computer move logic
  const makeComputerMove = useCallback(async () => {
    if (!isComputerMode || !initialGame || currentPlayer !== 'red' || gameStatus !== 'active' || !isMountedRef.current) return;

    try {
      const { move } = minimax(board, 4, true, -Infinity, Infinity);

      if (!move) {
        // No valid moves, player wins
        const updateData: Partial<Game> = {
          status: 'finished',
          winner_id: initialGame.player1_id,
        };
        
        const { error } = await supabase
          .from('games')
          .update(updateData)
          .eq('id', initialGame.id);
          
        if (error) throw error;
        
        if (isMountedRef.current) {
          setGameStatus('finished');
          setError('Partie terminée ! Vous avez gagné !');
        }
        await handleGameCompletion(initialGame.player1_id);
        return;
      }

      const { newBoard, newRedPieces, newBlackPieces } = movePiece(
        board,
        move.from,
        { row: move.to.row, col: move.to.col },
        move.to.isJump,
        move.to.captured
      );

      // Update state only if component is still mounted
      if (isMountedRef.current) {
        setBoard(newBoard);
        setRedPieces(newRedPieces);
        setBlackPieces(newBlackPieces);
        setTimeLeft(30);
        setOpponentActivity(`L'ordinateur a déplacé de (${move.from.row}, ${move.from.col}) à (${move.to.row}, ${move.to.col})`);
        setLastPlayer2Move({ from: move.from, to: { row: move.to.row, col: move.to.col } });
      }

      const winner = checkGameOver(newBoard, 'red');
      const updateData: Partial<Game> = {
        board: clientToSupabaseBoard(newBoard),
        current_player: 'black',
        last_move_at: new Date().toISOString(),
      };

      if (winner) {
        updateData.status = 'finished';
        updateData.winner_id = COMPUTER_ID;
      }

      const { error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', initialGame.id);

      if (error) {
        if (isMountedRef.current) {
          setError('Erreur lors du mouvement de l\'ordinateur : ' + error.message);
        }
        return;
      }

      if (socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: 'move',
            board: clientToSupabaseBoard(newBoard),
            currentPlayer: 'black',
            redPieces: newRedPieces,
            blackPieces: newBlackPieces,
            status: winner ? 'finished' : 'active',
            winner_id: winner ? COMPUTER_ID : null,
            last_move_at: new Date().toISOString(),
            moveDetails: {
              from: move.from,
              to: { row: move.to.row, col: move.to.col },
              isJump: move.to.isJump,
            },
          })
        );
      }

      if (isMountedRef.current) {
        setCurrentPlayer('black');
        if (winner) {
          setGameStatus('finished');
          setTimeLeft(0);
          await handleGameCompletion(COMPUTER_ID);
        }
      }
    } catch (error) {
      console.error('Error in makeComputerMove:', error);
      if (isMountedRef.current) {
        setError('Erreur lors du mouvement de l\'ordinateur');
      }
    }
  }, [isComputerMode, initialGame, currentPlayer, gameStatus, board, supabase, handleGameCompletion, minimax]);

  // Trigger computer move
  useEffect(() => {
    if (isComputerMode && currentPlayer === 'red' && gameStatus === 'active') {
      // Clear any existing timer
      if (computerMoveTimerRef.current) {
        clearTimeout(computerMoveTimerRef.current);
        computerMoveTimerRef.current = null;
      }
      
      computerMoveTimerRef.current = setTimeout(() => {
        makeComputerMove();
      }, COMPUTER_MOVE_DELAY);
      
      return () => {
        if (computerMoveTimerRef.current) {
          clearTimeout(computerMoveTimerRef.current);
        }
      };
    }
  }, [isComputerMode, currentPlayer, gameStatus, makeComputerMove]);

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
    if (!initialGame || initialGame.status !== 'open' || initialGame.player2_id || isComputerMode) {
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
          stake: initialGame.stake * 1, // Total stake is now player1 + player2
        })
        .eq('id', initialGame.id);

      if (gameError) {
        // If game update fails, refund the user
        await updateUserBalance(userId, initialGame.stake);
        throw gameError;
      }

      if (isMountedRef.current) {
        setGameStatus('active');
      }
      
      // Clear computer mode timer if it exists
      if (computerModeTimerRef.current) {
        clearTimeout(computerModeTimerRef.current);
        computerModeTimerRef.current = null;
      }
    } catch (error) {
      console.error('Error joining game:', error);
      if (isMountedRef.current) {
        setError('Erreur lors de la jointure : ' + (error as Error).message);
      }
      throw error;
    }
  }, [initialGame, supabase, isComputerMode, getCurrentUserId, updateUserBalance]);

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
      let winnerId: string | null = null;
      
      if (isComputerMode) {
        winnerId = COMPUTER_ID;
      } else {
        winnerId = userId === initialGame.player1_id 
          ? initialGame.player2_id 
          : initialGame.player1_id;
      }

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
  }, [initialGame, gameStatus, supabase, handleGameCompletion, isComputerMode, getCurrentUserId]);

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
              const moveText = isComputerMode
                ? `L'ordinateur a déplacé de (${moveDetails.from.row}, ${moveDetails.from.col}) à (${moveDetails.to.row}, ${moveDetails.to.col})`
                : `L'adversaire a déplacé de (${moveDetails.from.row}, ${moveDetails.from.col}) à (${moveDetails.to.row}, ${moveDetails.to.col})`;
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
          if (userId && player_id !== userId && !isComputerMode && isMountedRef.current) {
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
              ? (isComputerMode ? COMPUTER_ID : (userId === initialGame.player1_id ? initialGame.player2_id : initialGame.player1_id))
              : userId;
              
            await handleGameCompletion(winnerId);
          }
        } else if (type === 'player_joined') {
          // If a real player joins, cancel computer mode
          if (computerModeTimerRef.current) {
            clearTimeout(computerModeTimerRef.current);
            computerModeTimerRef.current = null;
          }
          if (isMountedRef.current) {
            setIsComputerMode(false);
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
  }, [initialGame, supabase, handleGameCompletion, isComputerMode, getCurrentUserId, isCurrentPlayer]);

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
                updateData.winner_id = isComputerMode && winner === 'red'
                  ? COMPUTER_ID
                  : (winner === 'black' ? initialGame.player1_id : initialGame.player2_id);
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
                      ? (isComputerMode && winner === 'red'
                          ? COMPUTER_ID
                          : (winner === 'black' ? initialGame.player1_id : initialGame.player2_id))
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
                    isComputerMode && winner === 'red'
                      ? COMPUTER_ID
                      : (winner === 'black' ? initialGame.player1_id : initialGame.player2_id)
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
    [board, currentPlayer, selectedPiece, validMoves, initialGame, gameStatus, supabase, handleGameCompletion, isComputerMode, getCurrentUserId, isCurrentPlayer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      if (timerRef.current) clearInterval(timerRef.current);
      if (computerModeTimerRef.current) clearTimeout(computerModeTimerRef.current);
      if (computerMoveTimerRef.current) clearTimeout(computerMoveTimerRef.current);
      
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
    isComputerMode,
    lastPlayer2Move,
  };
};