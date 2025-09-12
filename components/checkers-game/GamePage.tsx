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
  const [waitingTime, setWaitingTime] = useState<number | undefined>(undefined); // For countdown

  // Fetch user and emails
  useEffect(() => {
    const fetchUserAndEmails = async () => {
      setIsLoading(true);

      // get logged in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      // collect both players' ids
      const playerIds = [gameData.player1_id, gameData.player2_id].filter(Boolean) as string[];

      if (playerIds.length > 0) {
        // query users table
        const { data } = await supabase
          .from("users")
          .select("id, email")
          .in("id", playerIds);

        if (data) {
          // ✅ no more "any"
          const emails = data.reduce<Record<string, string>>((acc, user) => {
            acc[user.id] = user.email ?? "";
            return acc;
          }, {});

          setPlayerEmails(emails);
        }
      }

      setIsLoading(false);
      initializeBoard();
    };

    fetchUserAndEmails();
  }, [supabase, gameData.player1_id, gameData.player2_id, initializeBoard]);


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
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
      }
    };
    updateTimer();
  }, [gameStatus, gameData.created_at, gameData.player2_id]);

  // Re-init board on gameData change (e.g., p2 join)
  useEffect(() => {
    if (!isLoading) initializeBoard();
  }, [gameData, initializeBoard, isLoading]);

  // Real-time subscription (unchanged, but triggers gameData update -> board refresh)
  useEffect(() => {
    const channel = supabase
      .channel(`game:${game.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` },
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
                  setPlayerEmails((prev) => ({ ...prev, [data.id]: data.email || '' }));
                  toast.info(
                    updatedGame.player2_id === 'a9f80596-2373-4343-bdfa-8b9c0eee84c4'
                      ? "Vous jouez contre l'ordinateur !"
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
              `Partie terminée ! ${
                updatedGame.winner_id === userId
                  ? 'Vous avez gagné !'
                  : 'Votre adversaire a gagné !'
              }`,
              { toastId: 'game-finished' }
            );
          }
        }
      )
      .subscribe();

    // ✅ Cleanup must return a sync function
    return () => {
      supabase.removeChannel(channel); // no await here
    };
  }, [supabase, game.id, gameData.player2_id, userId]);


  // Error/Opponent toasts (unchanged)
  useEffect(() => {
    if (error) {
      toast.error(error, { toastId: 'error' });
      const timer = setTimeout(() => toast.dismiss('error'), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (opponentActivity) {
      toast.info(opponentActivity, { toastId: 'opponent-activity' });
      const timer = setTimeout(() => toast.dismiss('opponent-activity'), 3000);
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
    ? (gameData.player2_id === 'a9f80596-2373-4343-bdfa-8b9c0eee84c4' ? 'Ordinateur' : playerEmails[gameData.player2_id || ''] || 'En attente')
    : playerEmails[gameData.player1_id] || 'Inconnu';
  const showJoinButton = gameStatus === 'open' && !gameData.player2_id && userId !== gameData.player1_id;

  if (isLoading) {
    return <div className="text-center text-lg">Chargement...</div>;
  }

  return (
    <div className="max-w-9xl flex flex-col items-center justify-center p-5">
      <Head>
        <title>Jeu de Dames Professionnel</title>
        <meta name="description" content="Un jeu de dames professionnel construit avec Next.js et Tailwind CSS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="bg-white w-full max-w-4xl">
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
        />

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
          {gameStatus !== 'active' && <GameOverlay gameStatus={gameStatus} />}
        </div>

        <Controls onReset={initializeBoard} onResign={resignGame} disabled={gameStatus !== 'active'} />
        <div className="mb-6" />
        <GameInfo currentPlayer={currentPlayer} redPieces={redPieces} blackPieces={blackPieces} gameStatus={gameStatus} />
      </main>
    </div>
  );
}