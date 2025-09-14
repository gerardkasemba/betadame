"use client";
import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useCheckersGame } from '@/hooks/useCheckersGame';
import { useSupabase } from '@/lib/supabase-client';
import { toast } from 'react-toastify';
import CheckerBoard from '@/components/checkers-game/CheckerBoard';
import GameHeader from '@/components/checkers-game/GameHeader';
import GameOverlay from '@/components/checkers-game/GameOverlay';
import Controls from '@/components/checkers-game/Controls';
import GameInfo from '@/components/checkers-game/GameInfo';
import { Game } from '@/types';

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
    shareGame,
    error,
    opponentActivity,
    timeLeft,
    lastPlayer2Move,
    gameLink,
  } = useCheckersGame(game);

  const [userId, setUserId] = useState<string | null>(null);
  const [playerEmails, setPlayerEmails] = useState<{ [key: string]: string }>({});
  const [gameData, setGameData] = useState<Game>(game);
  const [isLoading, setIsLoading] = useState(true);
  const [waitingTime, setWaitingTime] = useState<number | undefined>(undefined);
  const [hasGameStarted, setHasGameStarted] = useState(game.status === 'active');

  // Fetch user and emails
  useEffect(() => {
    const fetchUserAndEmails = async () => {
      setIsLoading(true);

      // Get logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Collect both players' IDs
      const playerIds = [gameData.player1_id, gameData.player2_id].filter(
        Boolean
      ) as string[];

      if (playerIds.length > 0) {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, email')
          .in('id', playerIds);

        if (fetchError) {
          console.error('Error fetching player emails:', fetchError);
          toast.error('Failed to fetch player information', {
            toastId: 'fetch-emails-error',
            autoClose: 4000,
          });
        } else if (data) {
          const emails = data.reduce<Record<string, string>>((acc, user) => {
            acc[user.id] = user.email ?? '';
            return acc;
          }, {});
          setPlayerEmails(emails);
        }
      }

      setIsLoading(false);

      // Initialize board only if game is active
      if (gameData.status === 'active') {
        initializeBoard();
        setHasGameStarted(true);
      }
    };

    fetchUserAndEmails();
  }, [supabase, gameData.status, gameData.player1_id, gameData.player2_id, initializeBoard]);

  // Waiting Timer (24-hour countdown when open and no Player 2)
  useEffect(() => {
    if (gameStatus !== 'open' || gameData.player2_id) {
      setWaitingTime(undefined);
      return;
    }

    const createdAt = new Date(gameData.created_at).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = (now - createdAt) / 1000;
      const remaining = Math.max((24 * 60 * 60) - elapsed, 0); // 24 hours in seconds
      setWaitingTime(remaining);

      if (remaining > 0) {
        setTimeout(updateTimer, 1000);
      } else {
        // Game closes after 24 hours (handled by useCheckersGame)
        toast.info('Game closed: No opponent joined within 24 hours.', {
          toastId: 'game-closed',
          autoClose: 4000,
        });
      }
    };

    updateTimer();

    return () => {
      setWaitingTime(undefined);
    };
  }, [gameStatus, gameData.created_at, gameData.player2_id]);

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
        async (payload) => {
          const updatedGame = payload.new as Game;
          setGameData(updatedGame);

          // Handle player joining
          if (updatedGame.player2_id && updatedGame.player2_id !== gameData.player2_id) {
            // Fetch new player's email
            const { data, error } = await supabase
              .from('users')
              .select('id, email')
              .eq('id', updatedGame.player2_id)
              .single();

            if (error) {
              console.error('Error fetching new player email:', error);
              toast.error('Failed to fetch opponent information', {
                toastId: 'fetch-player-email-error',
                autoClose: 4000,
              });
            } else if (data) {
              setPlayerEmails((prev) => ({ ...prev, [data.id]: data.email || '' }));
              toast.info('An opponent has joined the game!', {
                toastId: 'player-join',
                autoClose: 4000,
              });
            }

            // Initialize board for both players when game becomes active
            if (updatedGame.status === 'active' && !hasGameStarted) {
              initializeBoard();
              setHasGameStarted(true);
              toast.info('The game has started!', {
                toastId: 'game-active',
                autoClose: 3000,
              });
            }
          }

          // Handle game completion
          if (updatedGame.status === 'finished') {
            let message = 'Game over! ';
            if (!updatedGame.winner_id) {
              message += 'It\'s a draw!';
            } else if (updatedGame.winner_id === userId) {
              message += 'You won!';
            } else {
              message += 'Your opponent won!';
            }
            toast.info(message, {
              toastId: 'game-finished',
              autoClose: 5000,
            });
          }

          // Handle game closure (no opponent joined within 24 hours)
          if (updatedGame.status === 'closed') {
            toast.info('Game closed: No opponent joined within 24 hours. Stake refunded.', {
              toastId: 'game-closed',
              autoClose: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, game.id, gameData.player2_id, gameData.status, userId, initializeBoard, hasGameStarted]);

  // Error notifications
  useEffect(() => {
    if (error) {
      toast.error(error, {
        toastId: 'error',
        autoClose: 5000,
      });
    }
  }, [error]);

  // Opponent activity notifications
  useEffect(() => {
    if (opponentActivity) {
      toast.info(opponentActivity, {
        toastId: 'opponent-activity',
        autoClose: 3000,
      });
    }
  }, [opponentActivity]);

  const handleJoinGame = useCallback(async () => {
    if (!userId || gameData.player1_id === userId || gameData.player2_id) {
      toast.error('You cannot join this game.', {
        toastId: 'join-error',
        autoClose: 4000,
      });
      return;
    }

    if (gameStatus !== 'open') {
      toast.error('This game is not open.', {
        toastId: 'join-error',
        autoClose: 4000,
      });
      return;
    }

    try {
      await joinGame();
      toast.success('You have joined the game!', {
        toastId: 'join-success',
        autoClose: 3000,
      });
      // Initialize board immediately after joining
      initializeBoard();
      setHasGameStarted(true);
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Error joining game: ${errorMessage}`, {
        toastId: 'join-error',
        autoClose: 5000,
      });
    }
  }, [userId, gameData.player1_id, gameData.player2_id, gameStatus, joinGame, initializeBoard]);

  const handleResignGame = useCallback(async () => {
    try {
      await resignGame();
      toast.info('You have resigned the game.', {
        toastId: 'resign-success',
        autoClose: 3000,
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Error resigning game: ${errorMessage}`, {
        toastId: 'resign-error',
        autoClose: 5000,
      });
    }
  }, [resignGame]);

  const handleShareGame = useCallback((platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => {
    try {
      shareGame(platform);
      if (platform === 'copy') {
        toast.success('Game link copied to clipboard!', {
          toastId: 'share-success',
          autoClose: 3000,
        });
      } else {
        toast.success('Game shared successfully!', {
          toastId: 'share-success',
          autoClose: 3000,
        });
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Error sharing game: ${errorMessage}`, {
        toastId: 'share-error',
        autoClose: 5000,
      });
    }
  }, [shareGame]);

  const isPlayer1 = userId === gameData.player1_id;
  const isPlayer2 = userId === gameData.player2_id;
  const isYourTurn = (isPlayer1 && currentPlayer === 'black') || (isPlayer2 && currentPlayer === 'red');
  const playerRole = isPlayer1 ? 'black' : isPlayer2 ? 'red' : 'spectator';
  const opponentEmail = isPlayer1
    ? playerEmails[gameData.player2_id || ''] || 'Waiting'
    : playerEmails[gameData.player1_id] || 'Unknown';
  const showJoinButton = gameStatus === 'open' && !gameData.player2_id && userId !== gameData.player1_id;
  const showResignButton = gameStatus === 'active' && (isPlayer1 || isPlayer2);
  const showShareButton = gameStatus === 'open' && isPlayer1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Head>
        <title>Professional Checkers Game</title>
        <meta name="description" content="A professional checkers game built with Next.js and Tailwind CSS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="w-full max-w-4xl p-6">
        <GameHeader
          playerRole={playerRole}
          opponentEmail={opponentEmail}
          isYourTurn={isYourTurn}
          timeLeft={timeLeft}
          stake={gameData.stake}
          waitingTime={waitingTime}
          onJoin={showJoinButton ? handleJoinGame : 'undefined'}
          showJoinButton={showJoinButton}
          showShareButton={showShareButton}
          onShare={handleShareGame}
          player1Id={gameData.player1_id}
          player2Id={gameData.player2_id}
          playerEmails={playerEmails}
          gameStatus={gameStatus}
          gameLink={gameLink}
        />

        <div className="relative my-6">
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
            <GameOverlay
              gameStatus={gameStatus}
              onJoin={showJoinButton ? handleJoinGame : undefined}
              waitingTime={waitingTime}
            />
          )}
        </div>

        <Controls
          onReset={initializeBoard}
          onResign={handleResignGame}
          disabled={gameStatus !== 'active' || (!isPlayer1 && !isPlayer2)}
          showResign={showResignButton}
        />

        <div className="mb-6" />

        <GameInfo
          currentPlayer={currentPlayer}
          redPieces={redPieces}
          blackPieces={blackPieces}
          gameStatus={gameStatus}
        />
      </main>
    </div>
  );
}