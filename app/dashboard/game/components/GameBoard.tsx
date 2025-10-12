// components/game/GameBoard.tsx
import { FaCrown } from 'react-icons/fa';
import { ProfessionalCheckersGame } from '@/lib/games';
import type { GameState, Piece, Position, Move } from '@/lib/games';

interface OpponentMove {
  from: Position;
  to: Position;
  timestamp: number;
}

interface GameBoardProps {
  gameState: GameState & {
    selectedPiece: Position | null;
    validMoves: Move[];
  };
  animatingPiece: {
    piece: Piece;
    from: Position;
    to: Position;
  } | null;
  opponentMoves: OpponentMove[];
  isMyTurn: boolean;
  gameRoom: {
    status: string;
  };
  onCellClick: (row: number, col: number) => void;
  // New props for opponent selection
  opponentSelectedPiece: Position | null;
  opponentValidMoves: Position[];
}

export default function GameBoard({
  gameState,
  animatingPiece,
  opponentMoves,
  isMyTurn,
  gameRoom,
  onCellClick,
  opponentSelectedPiece,
  opponentValidMoves
}: GameBoardProps) {
  return (
    <div className="grid grid-cols-10 gap-0 w-full max-w-2xl mx-auto border-4 border-amber-900 rounded-lg overflow-hidden shadow-2xl relative">
      {gameState.board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isDark = (rowIndex + colIndex) % 2 === 1;
          const isSelected = gameState.selectedPiece?.row === rowIndex && gameState.selectedPiece?.col === colIndex;
          const isValidMove = gameState.validMoves.some(
            (m: Move) => m.to.row === rowIndex && m.to.col === colIndex
          );
          const isCaptureMove = gameState.validMoves.some(
            (m: Move) => m.to.row === rowIndex && m.to.col === colIndex && m.isCapture
          );

          // Check if this cell is part of the animation
          const isAnimating = animatingPiece && 
            ((animatingPiece.from.row === rowIndex && animatingPiece.from.col === colIndex) ||
             (animatingPiece.to.row === rowIndex && animatingPiece.to.col === colIndex));

          // NEW: Check if this is opponent's selected piece
          const isOpponentSelected = opponentSelectedPiece?.row === rowIndex && opponentSelectedPiece?.col === colIndex;
          
          // NEW: Check if this is a valid move for opponent
          const isOpponentValidMove = opponentValidMoves.some(
            (pos: Position) => pos.row === rowIndex && pos.col === colIndex
          );

          // NEW: Check if this cell is part of an opponent move preview
          const isOpponentMovePreview = opponentMoves.some(move => 
            (move.from.row === rowIndex && move.from.col === colIndex) || 
            (move.to.row === rowIndex && move.to.col === colIndex)
          );

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                aspect-square flex items-center justify-center relative
                ${isDark ? 'bg-amber-800' : 'bg-amber-100'}
                ${isSelected ? 'ring-4 ring-yellow-400 ring-inset' : ''}
                ${isOpponentSelected ? 'ring-4 ring-red-400 ring-inset' : ''}
                ${isAnimating ? 'bg-green-200' : ''}
                ${isOpponentMovePreview ? 'bg-red-100' : ''}
                ${isMyTurn && gameRoom.status === 'playing' ? 'cursor-pointer hover:bg-amber-600' : 'cursor-default'}
                transition-all duration-200
              `}
              onClick={() => gameRoom.status === 'playing' && onCellClick(rowIndex, colIndex)}
            >
              {/* Cell coordinates */}
              {(rowIndex === 0 || colIndex === 0) && (
                <span className="absolute top-1 left-1 text-xs text-gray-700 font-bold z-10">
                  {rowIndex === 0 && colIndex === 0
                    ? '10'
                    : rowIndex === 0
                    ? String.fromCharCode(65 + colIndex)
                    : colIndex === 0
                    ? 10 - rowIndex
                    : ''}
                </span>
              )}

              {/* Piece */}
              {piece && (
                <div
                  className={`
                    w-4/5 h-4/5 rounded-full shadow-lg z-20
                    ${piece.player === ProfessionalCheckersGame.PLAYER1
                      ? 'bg-gradient-to-br from-red-500 to-red-700'
                      : 'bg-gradient-to-br from-blue-500 to-blue-700'
                    }
                    ${piece.isKing ? 'border-2 border-yellow-400' : ''}
                    ${isAnimating ? 'animate-pulse' : ''}
                    ${isOpponentSelected ? 'ring-2 ring-red-500' : ''}
                    flex items-center justify-center
                    transition-all duration-300
                  `}
                >
                  {piece.isKing && <FaCrown className="text-yellow-300 text-lg" />}
                </div>
              )}

              {/* Valid move indicators - YOUR moves */}
              {isValidMove && isMyTurn && (
                <div
                  className={`
                    absolute w-4 h-4 rounded-full border-2 z-20
                    ${isCaptureMove ? 'bg-red-500 border-red-700 animate-pulse' : 'bg-green-500 border-green-700'}
                  `}
                />
              )}

              {/* NEW: Valid move indicators - OPPONENT's moves */}
              {isOpponentValidMove && !isMyTurn && (
                <div
                  className={`
                    absolute w-4 h-4 rounded-full border-2 z-20
                    bg-red-300 border-red-500 animate-pulse
                  `}
                />
              )}

              {/* NEW: Opponent move preview indicators */}
              {isOpponentMovePreview && (
                <div className="absolute inset-0 z-10">
                  {opponentMoves[0]?.from.row === rowIndex && opponentMoves[0]?.from.col === colIndex && (
                    <div className="absolute inset-0 border-4 border-red-500 rounded-lg animate-pulse"></div>
                  )}
                  {opponentMoves[0]?.to.row === rowIndex && opponentMoves[0]?.to.col === colIndex && (
                    <div className="absolute inset-0 border-4 border-green-500 rounded-lg animate-pulse"></div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}