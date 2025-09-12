"use client";
import { FaCrown } from 'react-icons/fa'; // For king icon (replaced ♔ for consistency)
import { Board, Position, Move } from '@/types';

interface CheckerBoardProps {
  board: Board;
  selectedPiece: Position | null;
  validMoves: Move[];
  onSquareClick: (row: number, col: number) => void;
  disabled: boolean;
  playerRole: 'black' | 'red' | 'spectator';
  lastPlayer2Move: { from: Position; to: Position } | null;
}

export default function CheckerBoard({
  board,
  selectedPiece,
  validMoves,
  onSquareClick,
  disabled,
  playerRole,
  lastPlayer2Move,
}: CheckerBoardProps) {
  const displayBoard = playerRole === 'red' ? [...board].reverse().map(row => [...row].reverse()) : board;

  return (
    <div
      className={`grid grid-cols-8 w-full max-w-[560px] aspect-square mx-auto border-8 border-amber-900 rounded shadow-lg overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {displayBoard.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const originalRow = playerRole === 'red' ? 7 - rowIndex : rowIndex;
          const originalCol = playerRole === 'red' ? 7 - colIndex : colIndex;
          const isDark = (rowIndex + colIndex) % 2 === 1;
          const isSelected = selectedPiece?.row === originalRow && selectedPiece?.col === originalCol;
          const isValidMove = validMoves.some(move => move.row === originalRow && move.col === originalCol);
          const isJumpMove = validMoves.find(move => move.row === originalRow && move.col === originalCol)?.isJump;
          const isFrom = lastPlayer2Move && 
            (playerRole === 'red'
              ? lastPlayer2Move.from.row === 7 - originalRow && lastPlayer2Move.from.col === 7 - originalCol
              : lastPlayer2Move.from.row === originalRow && lastPlayer2Move.from.col === originalCol);
          const isTo = lastPlayer2Move && 
            (playerRole === 'red'
              ? lastPlayer2Move.to.row === 7 - originalRow && lastPlayer2Move.to.col === 7 - originalCol
              : lastPlayer2Move.to.row === originalRow && lastPlayer2Move.to.col === originalCol);

          return (
            <div
              key={`${originalRow}-${originalCol}`}
              className={`flex justify-center items-center relative
                ${isDark ? 'bg-amber-800' : 'bg-amber-200'}
                ${isSelected ? 'bg-yellow-400 border-2 border-yellow-500' : ''}
                ${isValidMove ? (isJumpMove ? 'bg-red-300' : 'bg-green-300') : ''}
                ${isFrom ? 'ring-2 ring-blue-400' : ''}  // Tailwind for highlight-from
                ${isTo ? 'ring-2 ring-green-400' : ''}    // Tailwind for highlight-to
                ${disabled || !isDark ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => !disabled && isDark && onSquareClick(originalRow, originalCol)}
            >
              {piece && (
                <div
                  className={`w-4/5 h-4/5 rounded-full transition-transform duration-200 shadow-md
                    ${piece.player === 'red'
                      ? 'bg-gradient-to-br from-red-600 to-red-800'
                      : 'bg-gradient-to-br from-gray-700 to-gray-900'}
                    ${!disabled && isDark ? 'hover:scale-105 hover:shadow-lg cursor-pointer' : ''}`}
                >
                  {piece.isKing && (
                    <FaCrown className="absolute inset-0 text-yellow-300 text-xs" />
                  )}
                </div>
              )}
              {isValidMove && !piece && (
                <div
                  className={`absolute w-1/4 h-1/4 rounded-full
                    ${isJumpMove ? 'bg-red-500' : 'bg-green-500'}`}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}