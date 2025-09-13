"use client";
import { useEffect, useState } from 'react';
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
    error,
    opponentActivity,
    timeLeft,
    isComputerMode,
    lastPlayer2Move,
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

      // Get logged in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // Collect both players' ids
      const playerIds = [gameData.player1_id, gameData.player2_id].filter(Boolean) as string[];

      if (playerIds.length > 0) {
        // Query users table
        const { data } = await supabase
          .from("users")
          .select("id, email")
          .in("id", playerIds);

        if (data) {
          const emails = data.reduce<Record<string, string>>((acc, user) => {
            acc[user.id] = user.email ?? "";
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

  // Waiting Timer (60s countdown when open and no p2)
  useEffect(() => {
    if (gameStatus !== 'open' || gameData.player2_id) {
      setWaitingTime(undefined);
      return;
    }

    const createdAt = new Date(gameData.created_at).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = (now - createdAt) / 1000;
      const remaining = Math.max(60 - elapsed, 0);
      setWaitingTime(remaining);

      if (remaining > 0) {
        setTimeout(updateTimer, 1000);
      }
    };
    updateTimer();
  }, [gameStatus, gameData.created_at, gameData.player2_id]);

  // Initialize board when game becomes active
  useEffect(() => {
    if (gameData.status === 'active' && !hasGameStarted) {
      initializeBoard();
      setHasGameStarted(true);
      
      // Show game started notification
      if (userId && (userId === gameData.player1_id || userId === gameData.player2_id)) {
        toast.info('La partie a commencé !', { 
          toastId: 'game-started',
          autoClose: 3000
        });
      }
    }
  }, [gameData.status, initializeBoard, hasGameStarted, userId, gameData.player1_id, gameData.player2_id]);

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
          filter: `id=eq.${game.id}` 
        },
        (payload) => {
          const updatedGame = payload.new as Game;
          setGameData(updatedGame);

          // Handle player joining
          if (updatedGame.player2_id && updatedGame.player2_id !== gameData.player2_id) {
            // Fetch new player's email
            supabase
              .from('users')
              .select('id, email')
              .eq('id', updatedGame.player2_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  setPlayerEmails((prev) => ({ ...prev, [data.id]: data.email || '' }));
                  
                  // Show appropriate join message
                  if (updatedGame.player2_id === 'a9f80596-2373-4343-bdfa-8b9c0eee84c4') {
                    toast.info("Vous jouez contre l'ordinateur !", { 
                      toastId: 'computer-join',
                      autoClose: 4000
                    });
                  } else {
                    toast.info('Un adversaire a rejoint la partie !', { 
                      toastId: 'player-join',
                      autoClose: 4000
                    });
                  }
                }
              });

            // If game becomes active after player join
            if (updatedGame.status === 'active') {
              toast.info('La partie commence maintenant !', { 
                toastId: 'game-active',
                autoClose: 3000
              });
            }
          }

          // Handle game completion
          if (updatedGame.status === 'finished') {
            let message = 'Partie terminée ! ';
            
            if (!updatedGame.winner_id) {
              message += 'Match nul !';
            } else if (updatedGame.winner_id === userId) {
              message += 'Vous avez gagné !';
            } else {
              message += 'Votre adversaire a gagné !';
            }
            
            toast.info(message, { 
              toastId: 'game-finished',
              autoClose: 5000
            });
          }

          // Handle game status changes
          if (updatedGame.status !== gameData.status) {
            if (updatedGame.status === 'active') {
              toast.info('La partie est maintenant active !', { 
                toastId: 'game-status-active',
                autoClose: 3000
              });
            } else if (updatedGame.status === 'finished') {
              toast.info('La partie est terminée.', { 
                toastId: 'game-status-finished',
                autoClose: 3000
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, game.id, gameData.player2_id, gameData.status, userId]);

  // Error notifications
  useEffect(() => {
    if (error) {
      toast.error(error, { 
        toastId: 'error',
        autoClose: 5000
      });
    }
  }, [error]);

  // Opponent activity notifications
  useEffect(() => {
    if (opponentActivity) {
      toast.info(opponentActivity, { 
        toastId: 'opponent-activity',
        autoClose: 3000
      });
    }
  }, [opponentActivity]);

  const handleJoinGame = async () => {
    if (!userId || gameData.player1_id === userId || gameData.player2_id) {
      toast.error('Vous ne pouvez pas rejoindre cette partie.', { 
        toastId: 'join-error',
        autoClose: 4000
      });
      return;
    }
    
    if (gameStatus !== 'open') {
      toast.error('Cette partie n\'est pas ouverte.', { 
        toastId: 'join-error',
        autoClose: 4000
      });
      return;
    }

    try {
      await joinGame();
      toast.success('Vous avez rejoint la partie !', { 
        toastId: 'join-success',
        autoClose: 3000
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Erreur lors de la jointure: ${errorMessage}`, { 
        toastId: 'join-error',
        autoClose: 5000
      });
    }
  };

  const isPlayer1 = userId === gameData.player1_id;
  const isPlayer2 = userId === gameData.player2_id;
  const isYourTurn = (isPlayer1 && currentPlayer === 'black') || (isPlayer2 && currentPlayer === 'red');
  const playerRole = isPlayer1 ? 'black' : isPlayer2 ? 'red' : 'spectator';
  
  const opponentEmail = isPlayer1
    ? (gameData.player2_id === 'a9f80596-2373-4343-bdfa-8b9c0eee84c4' 
        ? 'Ordinateur' 
        : playerEmails[gameData.player2_id || ''] || 'En attente')
    : playerEmails[gameData.player1_id] || 'Inconnu';
  
  const showJoinButton = gameStatus === 'open' && !gameData.player2_id && userId !== gameData.player1_id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg">Chargement de la partie...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Head>
        <title>Jeu de Dames Professionnel</title>
        <meta name="description" content="Un jeu de dames professionnel construit avec Next.js et Tailwind CSS" />
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
          onJoin={handleJoinGame}
          showJoinButton={showJoinButton}
          player1Id={gameData.player1_id}
          player2Id={gameData.player2_id}
          playerEmails={playerEmails}
          isComputerMode={isComputerMode}
          gameStatus={gameStatus}
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
            />
          )}
        </div>

        <Controls 
          onReset={initializeBoard} 
          onResign={resignGame} 
          disabled={gameStatus !== 'active' || !isPlayer1 && !isPlayer2}
          showResign={gameStatus === 'active' && (isPlayer1 || isPlayer2)}
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