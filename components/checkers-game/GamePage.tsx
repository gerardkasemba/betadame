// pages/GamePage.tsx
"use client";
import { useEffect, useState } from 'react';
import Head from 'next/head';
import GameInfo from '@/components/checkers-game/GameInfo';
import Controls from '@/components/checkers-game/Controls';
import { useCheckersGame } from '@/hooks/useCheckersGame';
import { useSupabase } from '@/lib/supabase-client';
import { toast } from 'react-toastify';
import { FaUser, FaClock, FaCoins, FaUserAlt, FaGamepad, FaUserCheck, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { Board, Position, Move, Game } from '@/types';

// CheckerBoard component
const CheckerBoard = ({
  board,
  selectedPiece,
  validMoves,
  onSquareClick,
  disabled,
  playerRole,
  lastPlayer2Move,
}: {
  board: Board;
  selectedPiece: Position | null;
  validMoves: Move[];
  onSquareClick: (row: number, col: number) => void;
  disabled: boolean;
  playerRole: 'black' | 'red' | 'spectator';
  lastPlayer2Move: { from: Position; to: Position } | null;
}) => {
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
                ${isFrom ? 'highlight-from' : ''}
                ${isTo ? 'highlight-to' : ''}
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
                    <div className="absolute inset-0 flex justify-center items-center text-yellow-300 text-2xl font-bold">
                      ♔
                    </div>
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
};

export default function GamePage({ game }: { game: Game }) {
  const { supabase } = useSupabase();
  const {
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
    // isComputerMode,
    lastPlayer2Move,
  } = useCheckersGame(game);
  const [userId, setUserId] = useState<string | null>(null);
  const [playerEmails, setPlayerEmails] = useState<{ [key: string]: string }>({});
  const [gameData, setGameData] = useState<Game>(game);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch user and initial player emails
  useEffect(() => {
    const fetchUserAndEmails = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      const playerIds = [gameData.player1_id, gameData.player2_id].filter(id => id) as string[];
      if (playerIds.length > 0) {
        const { data } = await supabase
          .from('users')
          .select('id, email')
          .in('id', playerIds);
        const emailMap = data?.reduce((acc, { id, email }) => ({ ...acc, [id]: email || '' }), {}) || {};
        setPlayerEmails(emailMap);
      }
      setIsLoading(false);
      initializeBoard();
    };
    fetchUserAndEmails();
  }, [supabase, gameData.player1_id, gameData.player2_id, initializeBoard]);

  // Real-time subscription for game updates
  useEffect(() => {
    const channel = supabase
      .channel(`game:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          const updatedGame = payload.new as Game;
          setGameData(updatedGame);
          if (updatedGame.player2_id && updatedGame.player2_id !== gameData.player2_id) {
            supabase
              .from('users')
              .select('id, email')
              .eq('id', updatedGame.player2_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setPlayerEmails(prev => ({ ...prev, [data.id]: data.email || '' }));
                  toast.info(
                    updatedGame.player2_id === 'a9f80596-2373-4343-bdfa-8b9c0eee84c4'
                      ? 'Vous jouez contre l\'ordinateur !'
                      : 'Votre adversaire a rejoint la partie !',
                    { toastId: 'join-success' }
                  );
                }
              });
            if (updatedGame.status === 'active') {
              toast.info('La partie est maintenant active !', { toastId: 'game-active' });
            }
          }
          if (updatedGame.status === 'finished') {
            toast.info(
              `Partie terminée ! ${updatedGame.winner_id === userId ? 'Vous avez gagné !' : 'Votre adversaire a gagné !'}`,
              { toastId: 'game-finished' }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, game.id, gameData.player2_id, userId]);

  // Handle errors and opponent activity
  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: 'error' });
      const timer = setTimeout(() => {
        toast.dismiss('error');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (opponentActivity) {
      toast.info(opponentActivity, { toastId: 'opponent-activity' });
      const timer = setTimeout(() => {
        toast.dismiss('opponent-activity');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [opponentActivity]);

  const handleJoinGame = async () => {
    if (!userId || gameData.player1_id === userId || gameData.player2_id) {
      toast.error('Vous ne pouvez pas rejoindre cette partie.', { toastId: 'join-error' });
      return;
    }
    if (gameStatus !== 'open') {
      toast.error('Cette partie n’est pas ouverte.', { toastId: 'join-error' });
      return;
    }

    try {
      await joinGame();
      toast.success('Partie rejointe avec succès !', { toastId: 'join-success' });
    } catch (error) {
      toast.error('Erreur lors de la jointure : ' + (error as Error).message, { toastId: 'join-error' });
    }
  };

  const isPlayer1 = userId === gameData.player1_id;
  const isPlayer2 = userId === gameData.player2_id;
  const isYourTurn = (isPlayer1 && currentPlayer === 'black') || (isPlayer2 && currentPlayer === 'red');
  const playerRole = isPlayer1 ? 'black' : isPlayer2 ? 'red' : 'spectator';
  const opponentEmail = isPlayer1
    ? gameData.player2_id === 'a9f80596-2373-4343-bdfa-8b9c0eee84c4'
      ? 'Ordinateur'
      : playerEmails[gameData.player2_id || ''] || 'En attente'
    : playerEmails[gameData.player1_id] || 'Inconnu';

  return (
    <div className="max-w-9xl min-h-screen flex flex-col items-center justify-center p-5">
      <Head>
        <title>Jeu de Dames Professionnel</title>
        <meta name="description" content="Un jeu de dames professionnel construit avec Next.js et Tailwind CSS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="bg-white w-full max-w-4xl">
        {isLoading ? (
          <div className="text-center text-lg">Chargement...</div>
        ) : (
          <>
            <div className="">
              {/* Desktop Version */}
              <div className="hidden md:block bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md p-6 shadow-sm border border-blue-100 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <FaUserAlt className="text-blue-600 text-lg" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Vous êtes</p>
                        <p className={`text-lg font-semibold ${playerRole === 'black' ? 'text-gray-900' : 'text-red-600'}`}>
                          {playerRole === 'black' ? 'Noir' : playerRole === 'red' ? 'Rouge' : 'Spectateur'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <FaUser className="text-purple-600 text-lg" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Adversaire</p>
                        <p className="text-lg font-medium text-gray-800">{opponentEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <FaGamepad className={`text-lg ${isYourTurn ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Tour actuel</p>
                        <p className={isYourTurn ? 'text-green-600 font-semibold text-lg' : 'text-gray-600 text-lg'}>
                          {isYourTurn ? 'Votre tour' : 'Tour adverse'}
                        </p>
                      </div>
                    </div>

                    {isYourTurn && (
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-full">
                          <FaClock className={`text-lg ${timeLeft <= 10 ? 'text-red-500' : 'text-orange-500'}`} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Temps restant</p>
                          <p className={timeLeft <= 10 ? 'text-red-500 font-semibold text-lg' : 'text-gray-800 text-lg'}>
                            {timeLeft} secondes
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 rounded-full">
                        <FaCoins className="text-amber-600 text-lg" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Mise</p>
                        <p className="text-lg font-medium text-gray-800">{gameData.stake} CDF</p>
                      </div>
                    </div>
                  </div>
                </div>

                {gameStatus === 'open' && !gameData.player2_id && userId !== gameData.player1_id && (
                  <div className="mt-6 pt-4 border-t border-blue-200 flex justify-center">
                    <button
                      onClick={handleJoinGame}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <FaUserCheck className="text-lg" />
                      <span>Rejoindre la partie</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Version */}
              <div className="md:hidden">
                <div
                  className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 shadow-lg z-20"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`p-1 rounded-full mr-2 ${isYourTurn ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <FaGamepad className={isYourTurn ? 'text-green-600' : 'text-gray-400'} size={16} />
                      </div>
                      <span className="text-sm font-medium">{isYourTurn ? 'Votre tour' : 'Tour adverse'}</span>
                    </div>

                    {isYourTurn && (
                      <div className="flex items-center">
                        <FaClock className={`mr-1 ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-600'}`} size={14} />
                        <span className={`text-sm font-medium ${timeLeft <= 10 ? 'text-red-500' : 'text-gray-700'}`}>
                          {timeLeft}s
                        </span>
                      </div>
                    )}

                    <div className="flex items-center">
                      <FaCoins className="text-amber-500 mr-1" size={14} />
                      <span className="text-sm font-medium">{gameData.stake} CDF</span>
                    </div>

                    <div className="ml-2">
                      {isExpanded ? (
                        <FaChevronDown className="text-gray-500" size={14} />
                      ) : (
                        <FaChevronUp className="text-gray-500" size={14} />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="fixed inset-0 bg-gray-800 bg-opacity-40 z-10" onClick={() => setIsExpanded(false)}>
                    <div
                      className="absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-5 animate-slide-up"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Détails de la partie</h3>
                        <button
                          onClick={() => setIsExpanded(false)}
                          className="p-1 rounded-full bg-gray-100"
                        >
                          <FaChevronDown className="text-gray-500" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Vous êtes:</span>
                          <span className={`font-semibold ${playerRole === 'black' ? 'text-gray-900' : 'text-red-600'}`}>
                            {playerRole === 'black' ? 'Noir' : playerRole === 'red' ? 'Rouge' : 'Spectateur'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Adversaire:</span>
                          <span className="font-medium">{opponentEmail}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Tour actuel:</span>
                          <span className={isYourTurn ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                            {isYourTurn ? 'Votre tour' : 'Tour adverse'}
                          </span>
                        </div>

                        {isYourTurn && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Temps restant:</span>
                            <span className={timeLeft <= 10 ? 'text-red-500 font-semibold' : 'text-gray-800'}>
                              {timeLeft} secondes
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Mise:</span>
                          <span className="font-medium">{gameData.stake} CDF</span>
                        </div>
                      </div>

                      {gameStatus === 'open' && !gameData.player2_id && userId !== gameData.player1_id && (
                        <button
                          onClick={handleJoinGame}
                          className="w-full mt-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-md"
                        >
                          <FaUserCheck className="text-lg" />
                          <span>Rejoindre la partie</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <CheckerBoard
                board={board}
                selectedPiece={selectedPiece}
                validMoves={validMoves}
                onSquareClick={handleSquareClick}
                disabled={gameStatus !== 'active' || !isYourTurn}
                playerRole={playerRole}
                lastPlayer2Move={lastPlayer2Move}
              />
              {gameStatus !== 'active' && (
                <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center">
                  <p className="text-white text-xl font-bold">
                    {gameStatus === 'open' ? 'En attente d’un adversaire' :
                     gameStatus === 'finished' ? 'Partie terminée' :
                     gameStatus === 'closed' ? 'Partie fermée' : 'Inactif'}
                  </p>
                </div>
              )}
            </div>

            <Controls onReset={initializeBoard} onResign={resignGame} disabled={gameStatus !== 'active'} />
            <div className="mb-6"></div>
            <GameInfo
              currentPlayer={currentPlayer}
              redPieces={redPieces}
              blackPieces={blackPieces}
              gameStatus={gameStatus}
            />
          </>
        )}
      </main>
    </div>
  );
};