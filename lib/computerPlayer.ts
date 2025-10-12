// lib/computerPlayer.ts

import { ProfessionalCheckersGame, type GameState, type Move, type Position } from './games';

export interface ComputerPlayerConfig {
  userId: string;
  email: string;
  username: string;
  difficulty: 'beginner' | 'intermediate' | 'professional';
  maxThinkTime: number; // in milliseconds
}

export class ComputerPlayer {
  private config: ComputerPlayerConfig;

  constructor(config: ComputerPlayerConfig) {
    this.config = config;
  }

  async findBestMove(gameState: GameState): Promise<Move | null> {
    const validMoves = ProfessionalCheckersGame.findAllValidMoves(gameState);
    
    if (validMoves.length === 0) {
      return null;
    }

    // Add thinking delay based on difficulty
    await this.think();

    // Different strategies based on difficulty
    switch (this.config.difficulty) {
      case 'beginner':
        return this.findBeginnerMove(validMoves, gameState);
      case 'intermediate':
        return this.findIntermediateMove(validMoves, gameState);
      case 'professional':
        return this.findProfessionalMove(validMoves, gameState);
      default:
        return this.findIntermediateMove(validMoves, gameState);
    }
  }

  private async think(): Promise<void> {
    // Simulate thinking time based on difficulty
    const thinkTimes = {
      beginner: Math.random() * 1000 + 500, // 0.5-1.5 seconds
      intermediate: Math.random() * 2000 + 1000, // 1-3 seconds
      professional: Math.random() * 3000 + 2000, // 2-5 seconds
    };

    await new Promise(resolve => setTimeout(resolve, thinkTimes[this.config.difficulty]));
  }

  private findBeginnerMove(validMoves: Move[], gameState: GameState): Move {
    // Beginner: Random moves, but prefer captures
    const captureMoves = validMoves.filter(move => move.isCapture);
    if (captureMoves.length > 0) {
      return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    }
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  private findIntermediateMove(validMoves: Move[], gameState: GameState): Move {
    // Intermediate: Prefer captures and moves that create kings
    const scoredMoves = validMoves.map(move => {
      let score = 0;

      // High priority for captures
      if (move.isCapture) {
        score += move.captures.length * 10;
      }

      // Priority for king promotion
      const piece = gameState.board[move.from.row][move.from.col];
      if (piece && !piece.isKing) {
        const willPromote = (piece.player === ProfessionalCheckersGame.PLAYER1 && move.to.row === 9) ||
                           (piece.player === ProfessionalCheckersGame.PLAYER2 && move.to.row === 0);
        if (willPromote) {
          score += 8;
        }
      }

      // Prefer center control
      const centerDistance = Math.abs(move.to.col - 4.5) + Math.abs(move.to.row - 4.5);
      score += (9 - centerDistance) * 0.1;

      // Avoid edges
      if (move.to.col === 0 || move.to.col === 9) {
        score -= 0.5;
      }

      return { move, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0].move;
  }

  private findProfessionalMove(validMoves: Move[], gameState: GameState): Move {
    // Professional: Mini-max like evaluation with lookahead
    const scoredMoves = validMoves.map(move => {
      let score = this.evaluateMove(move, gameState);

      // Look 1 move ahead for captures
      if (move.isCapture) {
        try {
          const newState = ProfessionalCheckersGame.makeMove(gameState, move);
          const followUpMoves = ProfessionalCheckersGame.findAllValidMoves(newState);
          const followUpCaptures = followUpMoves.filter(m => m.isCapture);
          
          if (followUpCaptures.length > 0) {
            score += 5; // Bonus for multiple jumps
          }
        } catch (error) {
          console.error('Error in lookahead:', error);
        }
      }

      return { move, score };
    });

    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Sometimes make a suboptimal move to seem more human (10% chance)
    if (Math.random() < 0.1 && scoredMoves.length > 1) {
      return scoredMoves[1].move;
    }

    return scoredMoves[0].move;
  }

  private evaluateMove(move: Move, gameState: GameState): number {
    let score = 0;

    // Material advantage
    if (move.isCapture) {
      score += move.captures.length * 15;
    }

    // King promotion
    const piece = gameState.board[move.from.row][move.from.col];
    if (piece && !piece.isKing) {
      const willPromote = (piece.player === ProfessionalCheckersGame.PLAYER1 && move.to.row === 9) ||
                         (piece.player === ProfessionalCheckersGame.PLAYER2 && move.to.row === 0);
      if (willPromote) {
        score += 12;
      }
    }

    // Position evaluation
    score += this.evaluatePosition(move.to, gameState.currentPlayer);

    // Defense: protect back row pieces
    if ((gameState.currentPlayer === ProfessionalCheckersGame.PLAYER1 && move.from.row === 0) ||
        (gameState.currentPlayer === ProfessionalCheckersGame.PLAYER2 && move.from.row === 9)) {
      score += 2;
    }

    // Aggression: move forward
    const rowProgress = gameState.currentPlayer === ProfessionalCheckersGame.PLAYER1 
      ? move.to.row - move.from.row 
      : move.from.row - move.to.row;
    score += rowProgress * 0.5;

    return score;
  }

  private evaluatePosition(position: Position, player: number): number {
    let score = 0;

    // Center control
    const centerDistance = Math.abs(position.col - 4.5) + Math.abs(position.row - 4.5);
    score += (9 - centerDistance) * 0.2;

    // King row positions are valuable
    if ((player === ProfessionalCheckersGame.PLAYER1 && position.row === 9) ||
        (player === ProfessionalCheckersGame.PLAYER2 && position.row === 0)) {
      score += 1;
    }

    // Avoid edges
    if (position.col === 0 || position.col === 9) {
      score -= 1;
    }

    // Double corner positions (safer)
    if ((position.row === 0 || position.row === 9) && (position.col === 1 || position.col === 8)) {
      score += 0.5;
    }

    return score;
  }

  getConfig(): ComputerPlayerConfig {
    return this.config;
  }
}

// Create the admin computer player instance
export const ADMIN_COMPUTER_PLAYER = new ComputerPlayer({
  userId: '8a959eea-c0e6-4deb-a1d2-bc3e92b6b954',
  email: 'gerardkasemba@gmail.com',
  username: 'AI Opponent',
  difficulty: 'professional',
  maxThinkTime: 5000
});