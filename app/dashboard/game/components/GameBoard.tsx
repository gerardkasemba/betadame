// components/game/GameBoard.tsx
import { FaCrown } from 'react-icons/fa';
import { ProfessionalCheckersGame } from '@/lib/games';
import type { GameState, Piece, Position, Move } from '@/lib/games';

interface AnimatedMove {
  from: Position;
  to: Position;
  piece: Piece;
  timestamp: number;
  player: string;
}

interface GameBoardProps {
  gameState: GameState & {
    selectedPiece: Position | null;
    validMoves: Move[];
  };
  animatedMoves: AnimatedMove[];
  isMyTurn: boolean;
  gameRoom: {
    status: string;
  };
  onCellClick: (row: number, col: number) => void;
  // Make currentPlayer optional
  currentPlayer?: string;
  opponentSelectedPiece: Position | null;
  opponentValidMoves: Position[];
}

export default function GameBoard({
  gameState,
  animatedMoves,
  isMyTurn,
  gameRoom,
  onCellClick,
  currentPlayer,
  opponentSelectedPiece,
  opponentValidMoves
}: GameBoardProps) {
  const posToNotation = (row: number, col: number): string => {
    return `${String.fromCharCode(65 + col)}${10 - row}`;
  };

  const currentAnimatedMove = animatedMoves.length > 0 ? animatedMoves[0] : null;
  
  // Handle undefined currentPlayer
  const isOpponentMove = currentAnimatedMove && currentPlayer && currentAnimatedMove.player !== currentPlayer;

  const getAnimationPosition = (row: number, col: number) => {
    if (!currentAnimatedMove) return null;
    
    const isFrom = currentAnimatedMove.from.row === row && currentAnimatedMove.from.col === col;
    const isTo = currentAnimatedMove.to.row === row && currentAnimatedMove.to.col === col;
    
    if (!isFrom && !isTo) return null;
    
    return { isFrom, isTo, move: currentAnimatedMove };
  };

  return (
    <div className="relative">
      {currentAnimatedMove && (
        <div className="absolute -top-16 left-0 right-0 z-50 flex justify-center">
          <div className={`
            text-white px-6 py-3 rounded-lg shadow-2xl animate-bounce
            ${isOpponentMove 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
              : 'bg-gradient-to-r from-green-600 to-emerald-600'
            }
          `}>
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div>
                <div className="font-bold text-lg">
                  {isOpponentMove ? 'Coup adverse' : 'Votre coup'}
                </div>
                <div className="text-sm">
                  {posToNotation(currentAnimatedMove.from.row, currentAnimatedMove.from.col)} 
                  {' → '} 
                  {posToNotation(currentAnimatedMove.to.row, currentAnimatedMove.to.col)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-10 gap-0 w-full max-w-2xl mx-auto border-4 border-gray-900 rounded-lg overflow-hidden shadow-2xl relative">
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

            const animPos = getAnimationPosition(rowIndex, colIndex);
            const isAnimatingFrom = animPos?.isFrom;
            const isAnimatingTo = animPos?.isTo;
            
            const hasStaticPiece = piece && !isAnimatingFrom;

            const isOpponentSelected = opponentSelectedPiece?.row === rowIndex && opponentSelectedPiece?.col === colIndex;
            const isOpponentValidMove = opponentValidMoves.some(
              (pos: Position) => pos.row === rowIndex && pos.col === colIndex
            );

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  aspect-square flex items-center justify-center relative
                  ${isDark ? 'bg-gray-800' : 'bg-white'}
                  ${isSelected ? 'ring-4 ring-yellow-400 ring-inset' : ''}
                  ${isOpponentSelected ? 'ring-4 ring-red-400 ring-inset' : ''}
                  ${isAnimatingFrom ? (isOpponentMove ? 'bg-blue-200' : 'bg-green-200') : ''}
                  ${isAnimatingTo ? (isOpponentMove ? 'bg-purple-200' : 'bg-emerald-200') : ''}
                  ${isMyTurn && gameRoom.status === 'playing' ? 'cursor-pointer hover:bg-amber-600' : 'cursor-default'}
                  transition-all duration-300
                `}
                onClick={() => gameRoom.status === 'playing' && onCellClick(rowIndex, colIndex)}
              >
                {(rowIndex === 0 || colIndex === 0) && (
                  <span className="absolute top-1 left-1 text-xs text-gray-500 font-bold z-10">
                    {rowIndex === 0 && colIndex === 0
                      ? '10'
                      : rowIndex === 0
                      ? String.fromCharCode(65 + colIndex)
                      : colIndex === 0
                      ? 10 - rowIndex
                      : ''}
                  </span>
                )}

                {hasStaticPiece && (
                  <div
                    className={`
                      w-4/5 h-4/5 rounded-full shadow-lg z-20
                      ${piece.player === ProfessionalCheckersGame.PLAYER1
                        ? 'bg-gradient-to-br from-red-500 to-red-700'
                        : 'bg-gradient-to-br from-blue-500 to-blue-700'
                      }
                      ${piece.isKing ? 'border-2 border-yellow-400' : ''}
                      ${isOpponentSelected ? 'ring-2 ring-red-500' : ''}
                      flex items-center justify-center
                      transition-all duration-300
                    `}
                  >
                    {piece.isKing && <FaCrown className="text-yellow-300 text-lg" />}
                  </div>
                )}

                {currentAnimatedMove && isAnimatingTo && (
                  <div
                    className="absolute w-4/5 h-4/5 rounded-full shadow-lg z-30 animate-move-piece"
                    style={{
                      background: currentAnimatedMove.piece.player === ProfessionalCheckersGame.PLAYER1
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                        : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    }}
                  >
                    {currentAnimatedMove.piece.isKing && (
                      <FaCrown className="text-yellow-300 text-lg absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    )}
                  </div>
                )}

                {isValidMove && isMyTurn && (
                  <div
                    className={`
                      absolute w-4 h-4 rounded-full border-2 z-20
                      ${isCaptureMove 
                        ? 'bg-red-500 border-red-700 animate-pulse' 
                        : 'bg-green-500 border-green-700'
                      }
                    `}
                  />
                )}

                {isOpponentValidMove && !isMyTurn && (
                  <div
                    className={`
                      absolute w-4 h-4 rounded-full border-2 z-20
                      bg-red-300 border-red-500 animate-pulse
                    `}
                  />
                )}

                {isAnimatingFrom && currentAnimatedMove && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className={`
                      text-white text-xs font-bold px-2 py-1 rounded shadow-lg animate-pulse
                      ${isOpponentMove ? 'bg-blue-600' : 'bg-green-600'}
                    `}>
                      DE
                    </div>
                  </div>
                )}
                
                {isAnimatingTo && currentAnimatedMove && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className={`
                      text-white text-xs font-bold px-2 py-1 rounded shadow-lg animate-pulse
                      ${isOpponentMove ? 'bg-purple-600' : 'bg-emerald-600'}
                    `}>
                      À
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {currentAnimatedMove && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill={isOpponentMove ? "#3b82f6" : "#10b981"} />
            </marker>
          </defs>
          
          <line
            x1={`${(currentAnimatedMove.from.col + 0.5) * 10}%`}
            y1={`${(currentAnimatedMove.from.row + 0.5) * 10}%`}
            x2={`${(currentAnimatedMove.to.col + 0.5) * 10}%`}
            y2={`${(currentAnimatedMove.to.row + 0.5) * 10}%`}
            stroke={isOpponentMove ? "#3b82f6" : "#10b981"}
            strokeWidth="4"
            markerEnd="url(#arrowhead)"
            className="animate-draw-line"
          />
        </svg>
      )}
    </div>
  );
}