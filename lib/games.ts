export interface Piece {
  player: number;
  isKing: boolean;
  id: string;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures: Position[];
  isCapture: boolean;
  sequence?: number;
  promotedToKing?: boolean;
  isMultipleJump?: boolean;
  mustContinueFrom?: Position; // NEW: Track if this piece must continue jumping
}

export interface GameState {
  board: (Piece | null)[][];
  currentPlayer: number;
  turnNumber: number;
  status: 'waiting' | 'active' | 'finished' | 'resigned' | 'draw';
  winner: number | null;
  lastMove: Move | null;
  moveHistory: Move[];
  capturedPieces: { player: number; count: number }[];
  gameType: 'standard' | 'tournament' | 'timed';
  consecutiveNonCaptureMoves: number;
  mustContinueJumpFrom?: Position; // NEW: Position that must continue jumping
  continuingJumpPosition?: Position; // Alias for backward compatibility
  timeControls?: {
    initialTime: number;
    increment: number;
    playersTime: { [player: number]: number };
    lastMoveTime: { [player: number]: number };
  };
}

export interface WinProbability {
  player1: number;
  player2: number;
  draw: number;
  isForcedWin: boolean;
  forcedWinInMoves: number | null;
  reasons: string[];
}

export interface GameAnalysis {
  bestMove: Move | null;
  winProbability: WinProbability;
  evaluation: number;
  possibleOutcomes: {
    winInMoves: number | null;
    lossInMoves: number | null;
    drawingLines: number;
  };
  pieceCount?: {
    player1: number;
    player2: number;
  };
  kingCount?: {
    player1: number;
    player2: number;
  };
  positionEvaluation?: {
    advantage: number;
    control: number;
    mobility: number;
  };
}

export class ProfessionalCheckersGame {
  static readonly BOARD_SIZE = 10;
  static readonly PLAYER1 = 1;
  static readonly PLAYER2 = 2;
  static readonly EMPTY = 0;
  static readonly MAX_TURNS_WITHOUT_CAPTURE = 80; // Increased from 40
  static readonly MAX_SEQUENCE_MOVES = 200; // Increased from 50
  static readonly MAX_CONSECUTIVE_KING_MOVES = 25; // Increased from 15

  private static pieceCount(board: (Piece | null)[][], player: number): number {
    return board.flat().filter(piece => piece?.player === player).length;
  }

  private static kingCount(board: (Piece | null)[][], player: number): boolean {
    return board.flat().some(piece => piece?.player === player && piece.isKing);
  }

  static initializeBoard(gameType: 'standard' | 'tournament' = 'standard'): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(this.BOARD_SIZE)
      .fill(null)
      .map(() => Array(this.BOARD_SIZE).fill(null));

    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        if ((row + col) % 2 === 1) {
          if (row < 4) {
            board[row][col] = { 
              player: this.PLAYER1, 
              isKing: false,
              id: `p1-${row}-${col}`
            };
          } else if (row >= this.BOARD_SIZE - 4) {
            board[row][col] = { 
              player: this.PLAYER2, 
              isKing: false,
              id: `p2-${row}-${col}`
            };
          }
        }
      }
    }

    return board;
  }

  static debugPrintBoard(board: (Piece | null)[][]) {
    console.log('🎯 BOARD LAYOUT:');
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      const rowDisplay = [];
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (!piece) {
          rowDisplay.push('·');
        } else {
          const symbol = piece.player === this.PLAYER1 ? 
            (piece.isKing ? '♔' : '♙') : 
            (piece.isKing ? '♚' : '♟');
          rowDisplay.push(symbol);
        }
      }
      console.log(`Row ${row.toString().padStart(2)}: [${rowDisplay.join(' ')}]`);
    }
  }

  static createGameState(gameType: 'standard' | 'tournament' | 'timed' = 'standard'): GameState {
    const now = Date.now();
    return {
      board: this.initializeBoard(gameType === 'tournament' ? 'tournament' : 'standard'),
      currentPlayer: this.PLAYER1,
      turnNumber: 1,
      status: 'active',
      winner: null,
      lastMove: null,
      moveHistory: [],
      capturedPieces: [
        { player: this.PLAYER1, count: 0 },
        { player: this.PLAYER2, count: 0 }
      ],
      consecutiveNonCaptureMoves: 0,
      gameType,
      mustContinueJumpFrom: undefined,
      continuingJumpPosition: undefined, // Backward compatibility
      timeControls: gameType === 'timed' ? {
        initialTime: 600000,
        increment: 5000,
        playersTime: { [this.PLAYER1]: 600000, [this.PLAYER2]: 600000 },
        lastMoveTime: { [this.PLAYER1]: now, [this.PLAYER2]: now }
      } : undefined
    };
  }

  static calculateValidMoves(state: GameState, position: Position): Move[] {
    const piece = state.board[position.row][position.col];
    if (!piece || piece.player !== state.currentPlayer) {
      return [];
    }

    // FIXED: If must continue jump from a specific position, only allow moves from that position
    if (state.mustContinueJumpFrom) {
      if (state.mustContinueJumpFrom.row !== position.row || 
          state.mustContinueJumpFrom.col !== position.col) {
        return []; // Can only move the piece that must continue jumping
      }
    }

    const captureMoves = this.findCaptureMoves(state.board, position, piece.player, piece.isKing);
    
    // If must continue jumping, only return capture moves
    if (state.mustContinueJumpFrom) {
      return captureMoves;
    }

    const regularMoves = this.findRegularMoves(state.board, position, piece.player, piece.isKing);
    return [...captureMoves, ...regularMoves];
  }

  static findAllValidMoves(state: GameState): Move[] {
    const allMoves: Move[] = [];
    
    // FIXED: If must continue jump, only get moves from that position
    if (state.mustContinueJumpFrom) {
      return this.calculateValidMoves(state, state.mustContinueJumpFrom);
    }
    
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const piece = state.board[row][col];
        if (piece?.player === state.currentPlayer) {
          const moves = this.calculateValidMoves(state, { row, col });
          allMoves.push(...moves);
        }
      }
    }

    return allMoves;
  }

  private static findCaptureMoves(
    board: (Piece | null)[][],
    position: Position,
    player: number,
    isKing: boolean,
    path: Position[] = [],
    visited: Set<string> = new Set()
  ): Move[] {
    const moves: Move[] = [];
    
    if (isKing) {
      moves.push(...this.findKingCaptureMoves(board, position, player, path, visited));
    } else {
      moves.push(...this.findManCaptureMoves(board, position, player, path, visited));
    }

    return moves;
  }

  private static findKingCaptureMoves(
    board: (Piece | null)[][],
    position: Position,
    player: number,
    path: Position[] = [],
    visited: Set<string> = new Set()
  ): Move[] {
    const moves: Move[] = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      // FIXED: Allow capturing multiple pieces in the same diagonal
      let distance = 1;
      
      while (distance < this.BOARD_SIZE) {
        const checkRow = position.row + dr * distance;
        const checkCol = position.col + dc * distance;
        
        if (!this.isValidPosition(checkRow, checkCol)) break;

        const checkPiece = board[checkRow][checkCol];
        
        if (checkPiece?.player === player) {
          break; // Own piece blocks
        }
        
        if (checkPiece && checkPiece.player !== player) {
          const captureKey = `${checkRow},${checkCol}`;
          if (visited.has(captureKey)) {
            distance++;
            continue; // Already captured this piece in this sequence
          }

          // Look for landing positions beyond the opponent
          for (let landingDist = distance + 1; landingDist < this.BOARD_SIZE; landingDist++) {
            const landRow = position.row + dr * landingDist;
            const landCol = position.col + dc * landingDist;
            
            if (!this.isValidPosition(landRow, landCol)) break;
            
            const landingPiece = board[landRow][landCol];
            
            if (landingPiece !== null) break;

            const newVisited = new Set(visited);
            newVisited.add(captureKey);

            const captureMove: Move = {
              from: position,
              to: { row: landRow, col: landCol },
              captures: [...path, { row: checkRow, col: checkCol }],
              isCapture: true,
              sequence: path.length + 1,
              isMultipleJump: path.length > 0
            };

            moves.push(captureMove);

            // Try to continue capturing from new position
            const tempBoard = board.map(r => [...r]);
            tempBoard[landRow][landCol] = tempBoard[position.row][position.col];
            tempBoard[position.row][position.col] = null;
            tempBoard[checkRow][checkCol] = null;

            const additionalMoves = this.findKingCaptureMoves(
              tempBoard,
              { row: landRow, col: landCol },
              player,
              [...path, { row: checkRow, col: checkCol }],
              newVisited
            );

            moves.push(...additionalMoves);
          }
          break; // Only capture one piece per direction per jump
        }
        
        distance++;
      }
    }

    return moves;
  }

  private static findManCaptureMoves(
    board: (Piece | null)[][],
    position: Position,
    player: number,
    path: Position[] = [],
    visited: Set<string> = new Set()
  ): Move[] {
    const moves: Move[] = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      const jumpRow = position.row + dr;
      const jumpCol = position.col + dc;
      const landRow = position.row + 2 * dr;
      const landCol = position.col + 2 * dc;

      if (!this.isValidPosition(jumpRow, jumpCol) || !this.isValidPosition(landRow, landCol)) {
        continue;
      }

      const jumpPiece = board[jumpRow][jumpCol];
      const landingPiece = board[landRow][landCol];

      if (jumpPiece !== null &&
          jumpPiece.player !== player &&
          landingPiece === null) {

        const captureKey = `${jumpRow},${jumpCol}`;
        if (visited.has(captureKey)) {
          continue;
        }

        const newVisited = new Set(visited);
        newVisited.add(captureKey);

        const captureMove: Move = {
          from: position,
          to: { row: landRow, col: landCol },
          captures: [...path, { row: jumpRow, col: jumpCol }],
          isCapture: true,
          sequence: path.length + 1,
          isMultipleJump: path.length > 0
        };

        moves.push(captureMove);

        // Create temp board for recursive checking
        const tempBoard = board.map(r => [...r]);
        tempBoard[landRow][landCol] = tempBoard[position.row][position.col];
        tempBoard[position.row][position.col] = null;
        tempBoard[jumpRow][jumpCol] = null;

        const additionalMoves = this.findManCaptureMoves(
          tempBoard,
          { row: landRow, col: landCol },
          player,
          [...path, { row: jumpRow, col: jumpCol }],
          newVisited
        );

        moves.push(...additionalMoves);
      }
    }

    return moves;
  }

  private static findRegularMoves(
    board: (Piece | null)[][],
    position: Position,
    player: number,
    isKing: boolean
  ): Move[] {
    const moves: Move[] = [];
    
    if (isKing) {
      moves.push(...this.findKingRegularMoves(board, position, player));
    } else {
      moves.push(...this.findManRegularMoves(board, position, player));
    }

    return moves;
  }

  private static findKingRegularMoves(
    board: (Piece | null)[][],
    position: Position,
    player: number
  ): Move[] {
    const moves: Move[] = [];
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      for (let distance = 1; distance < this.BOARD_SIZE; distance++) {
        const newRow = position.row + dr * distance;
        const newCol = position.col + dc * distance;

        if (!this.isValidPosition(newRow, newCol)) break;

        const targetPiece = board[newRow][newCol];
        
        if (targetPiece !== null) break;
        
        moves.push({
          from: position,
          to: { row: newRow, col: newCol },
          captures: [],
          isCapture: false
        });
      }
    }

    return moves;
  }

  private static findManRegularMoves(
    board: (Piece | null)[][],
    position: Position,
    player: number
  ): Move[] {
    const moves: Move[] = [];
    const directions = player === this.PLAYER1 
      ? [[1, -1], [1, 1]]
      : [[-1, -1], [-1, 1]];

    for (const [dr, dc] of directions) {
      const newRow = position.row + dr;
      const newCol = position.col + dc;

      if (!this.isValidPosition(newRow, newCol)) continue;

      const targetPiece = board[newRow][newCol];
      
      if (targetPiece === null) {
        moves.push({
          from: position,
          to: { row: newRow, col: newCol },
          captures: [],
          isCapture: false
        });
      }
    }

    return moves;
  }

  static validateMove(state: GameState, move: Move): { isValid: boolean; error?: string } {
    const piece = state.board[move.from.row][move.from.col];
    
    if (!piece) {
      return { isValid: false, error: 'No piece at starting position' };
    }

    if (piece.player !== state.currentPlayer) {
      return { isValid: false, error: "It's not this player's turn" };
    }

    // FIXED: Enforce continuing jumps
    if (state.mustContinueJumpFrom) {
      if (state.mustContinueJumpFrom.row !== move.from.row || 
          state.mustContinueJumpFrom.col !== move.from.col) {
        return { isValid: false, error: 'Must continue jumping with the same piece' };
      }
      if (!move.isCapture) {
        return { isValid: false, error: 'Must continue capturing' };
      }
    }

    return { isValid: true };
  }

  static makeMove(state: GameState, move: Move): GameState {
    const validation = this.validateMove(state, move);
    if (!validation.isValid) {
      throw new Error(`Invalid move: ${validation.error}`);
    }

    const newBoard = state.board.map(row => [...row]);
    const piece = newBoard[move.from.row][move.from.col];

    if (!piece) {
      return state;
    }

    // Move the piece
    newBoard[move.to.row][move.to.col] = { ...piece };
    newBoard[move.from.row][move.from.col] = null;

    // Handle captures
    let captureCount = 0;
    move.captures.forEach(capture => {
      if (newBoard[capture.row][capture.col]) {
        captureCount++;
        newBoard[capture.row][capture.col] = null;
      }
    });

    // Check for promotion to king
    let promotedToKing = false;
    if (!piece.isKing) {
      const shouldPromote = (piece.player === this.PLAYER1 && move.to.row === this.BOARD_SIZE - 1) ||
                          (piece.player === this.PLAYER2 && move.to.row === 0);
      
      if (shouldPromote) {
        newBoard[move.to.row][move.to.col] = { 
          ...piece, 
          isKing: true
        };
        promotedToKing = true;
      }
    }

    // Update captured pieces count
    const capturedPieces = state.capturedPieces.map(cp => 
      cp.player !== state.currentPlayer 
        ? { ...cp, count: cp.count + captureCount }
        : cp
    );

    const newMove: Move = {
      ...move,
      promotedToKing
    };

    const consecutiveNonCaptureMoves = move.isCapture ? 0 : state.consecutiveNonCaptureMoves + 1;

    // FIXED: Check for additional captures properly
    const hasMoreJumps = move.isCapture && this.hasAdditionalCaptures(
      newBoard, 
      move.to, 
      piece.player, 
      piece.isKing || promotedToKing
    );

    // FIXED: Update time controls
    let updatedTimeControls = state.timeControls;
    if (state.timeControls) {
      const now = Date.now();
      const lastMoveTime = state.timeControls.lastMoveTime[state.currentPlayer];
      const elapsed = now - lastMoveTime;
      const newTime = Math.max(0, state.timeControls.playersTime[state.currentPlayer] - elapsed);
      
      updatedTimeControls = {
        ...state.timeControls,
        playersTime: {
          ...state.timeControls.playersTime,
          [state.currentPlayer]: newTime + (hasMoreJumps ? 0 : state.timeControls.increment)
        },
        lastMoveTime: {
          ...state.timeControls.lastMoveTime,
          [state.currentPlayer]: now
        }
      };

      // Check for timeout
      if (newTime <= 0) {
        return this.endGameByTimeout(state, state.currentPlayer);
      }
    }

    const nextPlayer = hasMoreJumps ? state.currentPlayer : this.getOpponent(state.currentPlayer);
    const mustContinueJumpFrom = hasMoreJumps ? move.to : undefined;
    const continuingJumpPosition = mustContinueJumpFrom; // Backward compatibility alias

    // FIXED: Only check game end if turn is complete and player has pieces
    let isGameOver = false;
    let winner: number | null = null;
    
    if (!hasMoreJumps) {
      // FIXED: Check if current player eliminated themselves (edge case)
      const currentPlayerPieces = this.pieceCount(newBoard, state.currentPlayer);
      if (currentPlayerPieces === 0) {
        isGameOver = true;
        winner = nextPlayer;
      } else {
        isGameOver = this.checkGameEndConditions(
          newBoard, 
          nextPlayer,
          state.moveHistory.length + 1,
          consecutiveNonCaptureMoves,
          [...state.moveHistory, newMove]
        );
        
        if (isGameOver) {
          winner = state.currentPlayer;
        }
      }
    }

    return {
      ...state,
      board: newBoard,
      currentPlayer: nextPlayer,
      turnNumber: isGameOver ? state.turnNumber : (nextPlayer === this.PLAYER1 ? state.turnNumber + 1 : state.turnNumber),
      status: isGameOver ? 'finished' : 'active',
      winner: winner,
      lastMove: newMove,
      moveHistory: [...state.moveHistory, newMove],
      capturedPieces,
      consecutiveNonCaptureMoves,
      mustContinueJumpFrom,
      continuingJumpPosition, // Backward compatibility
      timeControls: updatedTimeControls
    };
  }

  private static hasAdditionalCaptures(
    board: (Piece | null)[][],
    position: Position,
    player: number,
    isKing: boolean
  ): boolean {
    const piece = board[position.row][position.col];
    if (!piece) return false;

    const captureMoves = isKing 
      ? this.findKingCaptureMoves(board, position, player)
      : this.findManCaptureMoves(board, position, player);

    return captureMoves.length > 0;
  }

  static checkGameEndConditions(
    board: (Piece | null)[][], 
    player: number,
    totalMoves: number,
    consecutiveNonCaptureMoves: number,
    moveHistory: Move[]
  ): boolean {
    if (this.pieceCount(board, player) === 0) {
      console.log(`Player ${player} has no pieces left - game should end`);
      return true;
    }

    const testState: GameState = {
      board,
      currentPlayer: player,
      turnNumber: 0,
      status: 'active',
      winner: null,
      lastMove: null,
      moveHistory: [],
      capturedPieces: [],
      consecutiveNonCaptureMoves: 0,
      gameType: 'standard'
    };

    const validMoves = this.findAllValidMoves(testState);
    if (validMoves.length === 0) {
      console.log(`Player ${player} has no valid moves - game should end`);
      return true;
    }

    if (totalMoves >= this.MAX_SEQUENCE_MOVES) {
      console.log(`Max sequence moves reached: ${totalMoves}`);
      return true;
    }

    if (consecutiveNonCaptureMoves >= this.MAX_TURNS_WITHOUT_CAPTURE) {
      console.log(`Max non-capture moves reached: ${consecutiveNonCaptureMoves}`);
      return true;
    }

    if (this.hasRepetitiveKingMoves(board, moveHistory)) {
      console.log('Repetitive king moves detected - draw');
      return true;
    }

    return false;
  }

  // FIXED: Properly detect repetitive king moves with stricter criteria
  private static hasRepetitiveKingMoves(board: (Piece | null)[][], moveHistory: Move[]): boolean {
    if (moveHistory.length < this.MAX_CONSECUTIVE_KING_MOVES * 2) return false;

    const recentMoves = moveHistory.slice(-this.MAX_CONSECUTIVE_KING_MOVES * 2);
    
    let kingMoveCount = 0;
    let positionCounts = new Map<string, number>();
    
    for (const move of recentMoves) {
      if (move.captures.length > 0) continue; // Captures don't count
      
      // Check if the piece that moved was a king
      const pieceAtDestination = board[move.to.row][move.to.col];
      if (pieceAtDestination?.isKing || move.promotedToKing === false) {
        kingMoveCount++;
        
        // Track position repetition
        const posKey = `${move.to.row},${move.to.col}`;
        positionCounts.set(posKey, (positionCounts.get(posKey) || 0) + 1);
      }
    }

    // Only declare draw if there are MANY king moves AND position repetition
    if (kingMoveCount >= this.MAX_CONSECUTIVE_KING_MOVES) {
      // Check if any position was visited multiple times (indicating repetition)
      for (const count of positionCounts.values()) {
        if (count >= 3) {
          return true; // Position visited 3+ times = clear repetition
        }
      }
    }

    return false;
  }

  static calculateWinProbability(state: GameState): WinProbability {
    const player1Pieces = this.pieceCount(state.board, this.PLAYER1);
    const player2Pieces = this.pieceCount(state.board, this.PLAYER2);
    const player1HasKing = this.kingCount(state.board, this.PLAYER1);
    const player2HasKing = this.kingCount(state.board, this.PLAYER2);

    const materialDiff = player1Pieces - player2Pieces + (player1HasKing ? 1 : 0) - (player2HasKing ? 1 : 0);
    const positionalAdvantage = this.calculatePositionalAdvantage(state.board);

    const totalAdvantage = materialDiff + positionalAdvantage;

    const forcedWinAnalysis = this.analyzeForcedWin(state);
    
    if (forcedWinAnalysis.isForcedWin) {
      return {
        player1: forcedWinAnalysis.winner === this.PLAYER1 ? 1 : 0,
        player2: forcedWinAnalysis.winner === this.PLAYER2 ? 1 : 0,
        draw: 0,
        isForcedWin: true,
        forcedWinInMoves: forcedWinAnalysis.movesToWin || null,
        reasons: forcedWinAnalysis.reasons
      };
    }

    const baseProbability = 1 / (1 + Math.exp(-totalAdvantage * 0.3));
    
    return {
      player1: totalAdvantage > 0 ? baseProbability : 1 - baseProbability,
      player2: totalAdvantage > 0 ? 1 - baseProbability : baseProbability,
      draw: Math.max(0, 0.1 - Math.abs(totalAdvantage) * 0.05),
      isForcedWin: false,
      forcedWinInMoves: null,
      reasons: this.generateProbabilityReasons(state, materialDiff, positionalAdvantage)
    };
  }

  private static calculatePositionalAdvantage(board: (Piece | null)[][]): number {
    let advantage = 0;
    
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece) {
          const sign = piece.player === this.PLAYER1 ? 1 : -1;
          
          const distanceFromCenter = Math.abs(col - this.BOARD_SIZE / 2);
          advantage += sign * (1 - distanceFromCenter / (this.BOARD_SIZE / 2)) * 0.5;
          
          if (piece.isKing) advantage += sign * 1.5;
          
          if ((piece.player === this.PLAYER1 && row === 0) || 
              (piece.player === this.PLAYER2 && row === this.BOARD_SIZE - 1)) {
            advantage += sign * 0.2;
          }

          if (!piece.isKing) {
            const advancement = piece.player === this.PLAYER1 
              ? row / this.BOARD_SIZE 
              : (this.BOARD_SIZE - 1 - row) / this.BOARD_SIZE;
            advantage += sign * advancement * 0.3;
          }
        }
      }
    }
    
    return advantage;
  }

  private static analyzeForcedWin(state: GameState): { 
    isForcedWin: boolean; 
    winner: number | null; 
    movesToWin?: number; 
    reasons: string[] 
  } {
    const reasons: string[] = [];
    const player1Pieces = this.pieceCount(state.board, this.PLAYER1);
    const player2Pieces = this.pieceCount(state.board, this.PLAYER2);

    const opponent = this.getOpponent(state.currentPlayer);
    const opponentMoves = this.findAllValidMoves({
      ...state,
      currentPlayer: opponent
    });

    if (opponentMoves.length === 0) {
      reasons.push(`Player ${opponent} has no legal moves`);
      return { isForcedWin: true, winner: state.currentPlayer, movesToWin: 0, reasons };
    }

    return { isForcedWin: false, winner: null, reasons };
  }

  // NEW: Determine winner when game reaches max moves (no true draw)
  static determineWinnerByPosition(board: (Piece | null)[][]): number {
    const evaluation = this.evaluateBoard(board);
    const player1Pieces = this.pieceCount(board, this.PLAYER1);
    const player2Pieces = this.pieceCount(board, this.PLAYER2);
    
    // If one player has more pieces, they win
    if (player1Pieces > player2Pieces) return this.PLAYER1;
    if (player2Pieces > player1Pieces) return this.PLAYER2;
    
    // If equal pieces, use board evaluation
    if (evaluation > 0) return this.PLAYER1;
    if (evaluation < 0) return this.PLAYER2;
    
    // If completely equal, player with more advanced position wins
    const player1Advantage = this.calculatePositionalAdvantage(board);
    return player1Advantage >= 0 ? this.PLAYER1 : this.PLAYER2;
  }

  private static generateProbabilityReasons(
    state: GameState, 
    materialDiff: number, 
    positionalAdvantage: number
  ): string[] {
    const reasons: string[] = [];
    const player1HasKing = this.kingCount(state.board, this.PLAYER1);
    const player2HasKing = this.kingCount(state.board, this.PLAYER2);

    if (materialDiff > 3) reasons.push("Player 1 has significant material advantage");
    else if (materialDiff < -3) reasons.push("Player 2 has significant material advantage");
    else if (materialDiff > 0) reasons.push("Player 1 has slight material advantage");
    else if (materialDiff < 0) reasons.push("Player 2 has slight material advantage");
    else reasons.push("Material is balanced");

    if (player1HasKing && !player2HasKing) reasons.push("Player 1 has king advantage");
    else if (player2HasKing && !player1HasKing) reasons.push("Player 2 has king advantage");

    if (positionalAdvantage > 0.8) reasons.push("Player 1 has strong positional advantage");
    else if (positionalAdvantage < -0.8) reasons.push("Player 2 has strong positional advantage");

    return reasons;
  }

  static analyzeGame(state: GameState): GameAnalysis {
    const winProbability = this.calculateWinProbability(state);
    const bestMove = this.findBestMove(state);
    const evaluation = this.evaluateBoard(state.board);

    return {
      bestMove,
      winProbability,
      evaluation,
      possibleOutcomes: {
        winInMoves: winProbability.forcedWinInMoves,
        lossInMoves: null,
        drawingLines: this.countDrawingLines(state)
      },
      pieceCount: {
        player1: this.pieceCount(state.board, this.PLAYER1),
        player2: this.pieceCount(state.board, this.PLAYER2)
      },
      kingCount: {
        player1: this.kingCount(state.board, this.PLAYER1) ? 1 : 0,
        player2: this.kingCount(state.board, this.PLAYER2) ? 1 : 0
      },
      positionEvaluation: {
        advantage: evaluation,
        control: this.calculatePositionalAdvantage(state.board),
        mobility: this.findAllValidMoves(state).length
      }
    };
  }

  private static evaluateBoard(board: (Piece | null)[][]): number {
    let score = 0;
    
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece) {
          const value = piece.isKing ? 4 : 1;
          const sign = piece.player === this.PLAYER1 ? 1 : -1;
          score += value * sign;

          if (!piece.isKing) {
            const positionBonus = piece.player === this.PLAYER1 
              ? row * 0.1 
              : (this.BOARD_SIZE - 1 - row) * 0.1;
            score += positionBonus * sign;
          }
        }
      }
    }
    
    return score;
  }

  private static countDrawingLines(state: GameState): number {
    const player1HasKing = this.kingCount(state.board, this.PLAYER1);
    const player2HasKing = this.kingCount(state.board, this.PLAYER2);
    const totalPieces = this.pieceCount(state.board, this.PLAYER1) + this.pieceCount(state.board, this.PLAYER2);
    
    if (player1HasKing && player2HasKing && totalPieces <= 4) return 3;
    if (state.consecutiveNonCaptureMoves > 30) return 2;
    
    return 0;
  }

  private static findBestMove(state: GameState): Move | null {
    const validMoves = this.findAllValidMoves(state);
    if (validMoves.length === 0) return null;

    const scoredMoves = validMoves.map(move => ({
      move,
      score: this.evaluateMove(state, move)
    }));

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0]?.move || null;
  }

  private static evaluateMove(state: GameState, move: Move): number {
    let score = 0;

    if (move.isCapture) {
      score += move.captures.length * 10;
    }

    if (move.promotedToKing) {
      score += 8;
    }

    const center = this.BOARD_SIZE / 2;
    const distanceFromCenter = Math.abs(move.to.col - center);
    score += (center - distanceFromCenter) * 0.1;

    if (move.to.col === 0 || move.to.col === this.BOARD_SIZE - 1) {
      score -= 0.5;
    }

    return score;
  }

  static endGameByTimeout(gameState: GameState, timedOutPlayer: number): GameState {
    const winner = this.getOpponent(timedOutPlayer);
    
    return {
      ...gameState,
      status: 'finished',
      winner: winner,
      lastMove: null
    };
  }

  static resignGame(gameState: GameState, resigningPlayer: number): GameState {
    const winner = this.getOpponent(resigningPlayer);
    
    return {
      ...gameState,
      status: 'resigned',
      winner: winner,
      lastMove: null
    };
  }

  static offerDraw(state: GameState): GameState {
    return state;
  }

  static acceptDraw(state: GameState): GameState {
    return {
      ...state,
      status: 'draw',
      winner: null
    };
  }

  static createTournamentGameState(players: number[]): GameState {
    const state = this.createGameState('tournament');
    return state;
  }

  static isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < this.BOARD_SIZE && col >= 0 && col < this.BOARD_SIZE;
  }

  static getOpponent(player: number): number {
    return player === this.PLAYER1 ? this.PLAYER2 : this.PLAYER1;
  }

  // FIXED: Enhanced serialization with proper validation
  static serializeGameState(state: GameState): any {
    return {
      board: state.board.map(row => 
        row.map(cell => 
          cell ? { 
            player: cell.player, 
            isKing: cell.isKing,
            id: cell.id 
          } : null
        )
      ),
      currentPlayer: state.currentPlayer,
      turnNumber: state.turnNumber,
      status: state.status,
      winner: state.winner,
      lastMove: state.lastMove,
      moveHistory: state.moveHistory,
      capturedPieces: state.capturedPieces,
      consecutiveNonCaptureMoves: state.consecutiveNonCaptureMoves,
      gameType: state.gameType,
      mustContinueJumpFrom: state.mustContinueJumpFrom,
      continuingJumpPosition: state.mustContinueJumpFrom, // Backward compatibility
      timeControls: state.timeControls
    };
  }

  // FIXED: Enhanced deserialization with comprehensive validation
  static deserializeGameState(data: any): GameState {
    if (!data || !data.board || !Array.isArray(data.board)) {
      console.warn('Invalid game state data, using default board');
      return this.createGameState();
    }
    
    try {
      // Validate board dimensions
      if (data.board.length !== this.BOARD_SIZE) {
        throw new Error(`Invalid board size: expected ${this.BOARD_SIZE}, got ${data.board.length}`);
      }

      const board = data.board.map((row: any[], rowIndex: number) => {
        if (!Array.isArray(row) || row.length !== this.BOARD_SIZE) {
          throw new Error(`Invalid row ${rowIndex}: expected ${this.BOARD_SIZE} columns`);
        }
        
        return row.map((cell: any, colIndex: number) => {
          if (!cell) return null;
          
          // Validate player number
          if (cell.player !== this.PLAYER1 && cell.player !== this.PLAYER2) {
            throw new Error(`Invalid player number at [${rowIndex}, ${colIndex}]: ${cell.player}`);
          }
          
          // Validate piece is on valid square (dark square)
          if ((rowIndex + colIndex) % 2 === 0) {
            throw new Error(`Piece on invalid square at [${rowIndex}, ${colIndex}]`);
          }
          
          return {
            player: cell.player,
            isKing: Boolean(cell.isKing),
            id: cell.id || `p${cell.player}-${rowIndex}-${colIndex}-${Date.now()}`
          };
        });
      });

      // Validate current player
      const currentPlayer = (data.currentPlayer === this.PLAYER1 || data.currentPlayer === this.PLAYER2) 
        ? data.currentPlayer 
        : this.PLAYER1;

      // Validate status
      const validStatuses = ['waiting', 'active', 'finished', 'resigned', 'draw'];
      const status = validStatuses.includes(data.status) ? data.status : 'active';

      // Validate game type
      const validGameTypes = ['standard', 'tournament', 'timed'];
      const gameType = validGameTypes.includes(data.gameType) ? data.gameType : 'standard';

      // Validate captured pieces structure
      let capturedPieces = data.capturedPieces;
      if (!Array.isArray(capturedPieces) || capturedPieces.length !== 2) {
        capturedPieces = [
          { player: this.PLAYER1, count: 0 },
          { player: this.PLAYER2, count: 0 }
        ];
      }

      // Validate mustContinueJumpFrom if present
      let mustContinueJumpFrom = data.mustContinueJumpFrom || data.continuingJumpPosition; // Support both names
      if (mustContinueJumpFrom) {
        if (!this.isValidPosition(mustContinueJumpFrom.row, mustContinueJumpFrom.col)) {
          mustContinueJumpFrom = undefined;
        }
      }

      // Validate time controls if present
      let timeControls = data.timeControls;
      if (timeControls) {
        if (typeof timeControls.initialTime !== 'number' || 
            typeof timeControls.increment !== 'number' ||
            !timeControls.playersTime ||
            !timeControls.lastMoveTime) {
          timeControls = undefined;
        }
      }

      return {
        board,
        currentPlayer,
        turnNumber: Math.max(1, data.turnNumber || 1),
        status,
        winner: data.winner || null,
        lastMove: data.lastMove || null,
        moveHistory: Array.isArray(data.moveHistory) ? data.moveHistory : [],
        capturedPieces,
        consecutiveNonCaptureMoves: Math.max(0, data.consecutiveNonCaptureMoves || 0),
        gameType,
        mustContinueJumpFrom,
        continuingJumpPosition: mustContinueJumpFrom, // Backward compatibility
        timeControls
      };
    } catch (error) {
      console.error('Error deserializing game state:', error);
      return this.createGameState();
    }
  }
}

export class TournamentManager {
  static createTournamentBracket(players: number[], type: 'single-elimination' | 'double-elimination' | 'round-robin') {
    return {
      type,
      players,
      matches: this.generateBracket(players, type)
    };
  }

  private static generateBracket(players: number[], type: string) {
    const matches = [];
    const playerCount = players.length;

    if (type === 'single-elimination') {
      for (let i = 0; i < playerCount - 1; i += 2) {
        matches.push({
          player1: players[i],
          player2: players[i + 1],
          round: 1,
          status: 'scheduled'
        });
      }
    } else if (type === 'round-robin') {
      for (let i = 0; i < playerCount; i++) {
        for (let j = i + 1; j < playerCount; j++) {
          matches.push({
            player1: players[i],
            player2: players[j],
            round: 1,
            status: 'scheduled'
          });
        }
      }
    }

    return matches;
  }

  static calculateTournamentStandings(matches: any[]) {
    const standings: { [player: number]: { wins: number; losses: number; draws: number; points: number } } = {};

    matches.forEach(match => {
      if (match.winner) {
        const winner = match.winner;
        const loser = match.player1 === winner ? match.player2 : match.player1;

        if (!standings[winner]) standings[winner] = { wins: 0, losses: 0, draws: 0, points: 0 };
        if (!standings[loser]) standings[loser] = { wins: 0, losses: 0, draws: 0, points: 0 };

        standings[winner].wins++;
        standings[winner].points += 2;
        standings[loser].losses++;
      } else if (match.status === 'draw') {
        [match.player1, match.player2].forEach(player => {
          if (!standings[player]) standings[player] = { wins: 0, losses: 0, draws: 0, points: 0 };
          standings[player].draws++;
          standings[player].points += 1;
        });
      }
    });

    return standings;
  }
}