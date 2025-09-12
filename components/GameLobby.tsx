'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '../lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Database } from '@/types/supabase';
import { toast } from 'react-toastify';
import PartySocket from 'partysocket';
import { initialBoard } from '@/hooks/useCheckersGame';
import { FaCoins, FaUser, FaClock, FaCrown, FaPlus, FaPlay, FaEye, FaSignInAlt, FaUserCircle, FaExclamationTriangle } from 'react-icons/fa';

// Type definitions
type Game = Database['public']['Tables']['games']['Row'];
// type User = Database['public']['Tables']['users']['Row'];

interface GameLobbyProps {
  games: Game[];
}

export function GameLobby({ games: initialGames }: GameLobbyProps) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [openGames, setOpenGames] = useState<Game[]>(initialGames);
  const [ongoingGames, setOngoingGames] = useState<Game[]>([]);
  const [completedGames, setCompletedGames] = useState<Game[]>([]);
  const [winCount, setWinCount] = useState<number>(0);
  const [stakeAmount, setStakeAmount] = useState<number>(500); // Default stake in CDF
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [playerEmails, setPlayerEmails] = useState<{ [key: string]: string }>({});
  const [opponentActivity, setOpponentActivity] = useState<{ [gameId: string]: string | null }>({});

  // Fetch user data, balance, and win count
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        toast.error('Veuillez vous connecter pour accéder au lobby.', { toastId: 'auth-error' });
        setError('Veuillez vous connecter pour accéder au lobby.');
        return;
      }
      if (user) {
        setUserId(user.id);
        // Ensure user record exists
        const { data: userData, error: balanceError } = await supabase
          .from('users')
          .select('balance')
          .eq('id', user.id)
          .single();
        if (balanceError || !userData) {
          // Create user record if missing
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              preferred_payment_method: 'orange_money',
            });
          if (insertError) {
            toast.error('Veuillez ajouter des fonds à votre portefeuille en visitant votre profile.', {
              toastId: 'balance-error',
            });
            setError('Veuillez ajouter des fonds à votre portefeuille en visitant votre profil.');
            return;
          }
          setUserBalance(0); // New user has 0 balance
        } else {
          setUserBalance(userData.balance || 0);
        }

        // Fetch win count
        const { data: winData, error: winError } = await supabase
          .rpc('count_user_wins', { user_id: user.id });
        if (winError) {
          toast.error('Erreur lors de la récupération des victoires : ' + winError.message, { toastId: 'win-error' });
          setError('Erreur lors de la récupération des victoires : ' + winError.message);
          return;
        }
        setWinCount(winData || 0);
      }
    };
    fetchUserData();
  }, [supabase]);

  // Fetch player emails
  useEffect(() => {
    const fetchEmails = async () => {
      const playerIds = [...openGames, ...ongoingGames, ...completedGames]
        .flatMap(game => [game.player1_id, game.player2_id])
        .filter(id => id) as string[];
      if (playerIds.length > 0) {
        const { data, error } = await supabase
          .from('users')
          .select('id, email')
          .in('id', playerIds);
        if (error) {
          toast.error('Erreur lors de la récupération des emails : ' + error.message, { toastId: 'email-error' });
          setError('Erreur lors de la récupération des emails : ' + error.message);
          return;
        }
        const emailMap = data?.reduce((acc, { id, email }) => ({ ...acc, [id]: email || '' }), {}) || {};
        setPlayerEmails(emailMap);
      }
    };
    fetchEmails();
  }, [openGames, ongoingGames, completedGames, supabase]);

  // Fetch ongoing and completed games
  useEffect(() => {
    const fetchUserGames = async () => {
      if (!userId) return;
      const { data: activeGames, error: activeError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);
      if (activeError) {
        toast.error('Erreur lors de la récupération des parties en cours : ' + activeError.message, { toastId: 'active-games-error' });
        setError('Erreur lors de la récupération des parties en cours : ' + activeError.message);
        return;
      }
      setOngoingGames(activeGames || []);

      const { data: finishedGames, error: finishedError } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'finished')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`);
      if (finishedError) {
        toast.error('Erreur lors de la récupération des parties terminées : ' + finishedError.message, { toastId: 'finished-games-error' });
        setError('Erreur lors de la récupération des parties terminées : ' + finishedError.message);
        return;
      }
      setCompletedGames(finishedGames || []);
    };
    fetchUserGames();
  }, [userId, supabase]);

  // Subscribe to real-time game updates
  useEffect(() => {
    const channel = supabase
      .channel('games')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: 'status=in.(open,active,finished)' },
        payload => {
          const newGame = payload.new as Game;
          const oldGame = payload.old as Game;
          if (payload.eventType === 'INSERT') {
            if (newGame.status === 'open') {
              setOpenGames(prev => [...prev, newGame]);
            } else if (newGame.status === 'active' && (newGame.player1_id === userId || newGame.player2_id === userId)) {
              setOngoingGames(prev => [...prev, newGame]);
            } else if (newGame.status === 'finished' && (newGame.player1_id === userId || newGame.player2_id === userId)) {
              setCompletedGames(prev => [...prev, newGame]);
              if (newGame.winner_id === userId) {
                setWinCount(prev => prev + 1);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            if (newGame.status === 'open') {
              setOpenGames(prev =>
                prev
                  .map(game => (game.id === newGame.id ? newGame : game))
                  .filter(game => newGame.closes_at ? new Date(game.closes_at!) > new Date() : true)
              );
            } else if (newGame.status === 'active' && (newGame.player1_id === userId || newGame.player2_id === userId)) {
              setOngoingGames(prev =>
                prev.map(game => (game.id === newGame.id ? newGame : game))
              );
              setOpenGames(prev => prev.filter(game => game.id !== newGame.id));
              setCompletedGames(prev => prev.filter(game => game.id !== newGame.id));
            } else if (newGame.status === 'finished' && (newGame.player1_id === userId || newGame.player2_id === userId)) {
              setCompletedGames(prev =>
                prev.map(game => (game.id === newGame.id ? newGame : game))
              );
              setOpenGames(prev => prev.filter(game => game.id !== newGame.id));
              setOngoingGames(prev => prev.filter(game => game.id !== newGame.id));
              if (newGame.winner_id === userId && oldGame.winner_id !== userId) {
                setWinCount(prev => prev + 1);
              }
            } else {
              setOpenGames(prev => prev.filter(game => game.id !== newGame.id));
              setOngoingGames(prev => prev.filter(game => game.id !== newGame.id));
              setCompletedGames(prev => prev.filter(game => game.id !== newGame.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setOpenGames(prev => prev.filter(game => game.id !== oldGame.id));
            setOngoingGames(prev => prev.filter(game => game.id !== oldGame.id));
            setCompletedGames(prev => prev.filter(game => game.id !== oldGame.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  // Subscribe to PartyKit for opponent activity
  useEffect(() => {
    if (!userId) return;

    const sockets: PartySocket[] = [];
    ongoingGames.forEach(game => {
    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTY_HOST || 'http://localhost:1999', 
      room: `game:${game.id}`,
    });

      socket.onmessage = async event => {
        const { type, player_id } = JSON.parse(event.data);
        
        if (type === 'opponent_active' && player_id !== userId) {
          try {
            // Fetch the latest game state to get the current player
            const { data: currentGame, error } = await supabase
              .from('games')
              .select('current_player')
              .eq('id', game.id)
              .single();
            
            if (error) {
              console.error('Error fetching game state:', error);
              return;
            }
            
            // Determine if the current user is the one waiting (not the current player)
            const isPlayer1 = userId === game.player1_id;
            const isPlayer2 = userId === game.player2_id;
            
            // Check if it's NOT the current user's turn
            // Note: In the database, 'white' corresponds to 'red' in the UI and 'black' corresponds to 'black'
            const isWaiting = (
              (isPlayer1 && currentGame.current_player === 'white') || // Player1 (black) is waiting when current player is white (red)
              (isPlayer2 && currentGame.current_player === 'black')    // Player2 (red) is waiting when current player is black
            );
            
            if (isWaiting) {
              setOpponentActivity(prev => ({ ...prev, [game.id]: 'Votre adversaire réfléchit...' }));
              setTimeout(() => {
                setOpponentActivity(prev => ({ ...prev, [game.id]: null }));
              }, 3000);
            }
          } catch (error) {
            console.error('Error processing opponent activity:', error);
          }
        }
      };

      sockets.push(socket);
    });

    return () => {
      sockets.forEach(socket => socket.close());
    };
  }, [ongoingGames, userId, supabase]);

  // Format time left
  const formatTimeLeft = (closesAt: string | null): string => {
    if (!closesAt) return 'Pas de limite';
    const timeDiff = new Date(closesAt).getTime() - new Date().getTime();
    if (timeDiff <= 0) return 'Expiré';
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    return `Temps restant : ${days > 0 ? `${days} jour${days > 1 ? 's' : ''} ` : ''}${hours} heure${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  // Handle joining a game
  const handleJoinGame = async (gameId: string, stake: number) => {
    if (userBalance < stake) {
      toast.error('Solde insuffisant ! Veuillez ajouter des fonds à votre portefeuille en visitant votre profil', {
        toastId: 'join-error',
      });
      setError('Solde insuffisant ! Veuillez ajouter des fonds à votre portefeuille en visitant votre profil.');
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error('Veuillez vous connecter pour rejoindre une partie.', { toastId: 'join-error' });
      setError('Veuillez vous connecter pour rejoindre une partie.');
      return;
    }

    const { error } = await supabase
      .from('games')
      .update({ player2_id: user.id, status: 'active', closes_at: null })
      .eq('id', gameId);

    if (error) {
      toast.error('Erreur lors de la jointure de la partie : ' + error.message, { toastId: 'join-error' });
      setError('Erreur lors de la jointure de la partie : ' + error.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: userBalance - stake })
      .eq('id', user.id);

    if (updateError) {
      toast.error('Erreur lors de la mise à jour du solde : ' + updateError.message, { toastId: 'join-error' });
      setError('Erreur lors de la mise à jour du solde : ' + updateError.message);
      return;
    }

    router.push(`/game/${gameId}`);
  };

  // Handle creating a new game
  const handleCreateGame = async () => {
    if (userBalance < stakeAmount) {
      toast.error('Solde insuffisant pour créer une partie ! Veuillez ajouter des fonds à votre portefeuille en visitant votre profil.', {
        toastId: 'create-error',
      });
      setError('Solde insuffisant pour créer une partie ! Veuillez ajouter des fonds à votre portefeuille en visitant votre profil.');
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      toast.error('Veuillez vous connecter pour créer une partie.', { toastId: 'create-error' });
      setError('Veuillez vous connecter pour créer une partie.');
      return;
    }

    const { data, error } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        stake: stakeAmount,
        status: 'open',
        board: initialBoard,
        closes_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
        current_player: 'black',
      })
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la création de la partie : ' + error.message, { toastId: 'create-error' });
      setError('Erreur lors de la création de la partie : ' + error.message);
      return;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: userBalance - stakeAmount })
      .eq('id', user.id);

    if (updateError) {
      toast.error('Erreur lors de la mise à jour du solde : ' + updateError.message, { toastId: 'create-error' });
      setError('Erreur lors de la mise à jour du solde : ' + updateError.message);
      return;
    }

    router.push(`/game/${data!.id}`);
  };

  // Render trophies based on win count
  const renderTrophies = () => {
    const trophies = [];
    for (let i = 0; i < winCount; i++) {
      trophies.push(<FaCrown key={i} className="text-yellow-400 text-2xl" />);
    }
    return trophies;
  };

  return (
    <div className="space-y-8 p-0 md:p-4 max-w-4xl mx-auto">
      {/* Error Message */}
      {error && (
        <div className="bg-red-600 p-4 rounded-xl text-white flex items-center gap-3 shadow-lg">
          <FaExclamationTriangle className="text-xl" />
          <span dangerouslySetInnerHTML={{ __html: error }} />
        </div>
      )}

      {/* Create New Game */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl shadow-xl border border-blue-500">
        <h2 className="text-2xl font-bold mb-5 text-yellow-400 flex items-center gap-2">
          <FaPlus className="text-yellow-400" />
          Créer une nouvelle partie
        </h2>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <FaCoins className="text-blue-800" />
            </div>
            <input
              type="number"
              value={stakeAmount}
              onChange={e => setStakeAmount(Number(e.target.value))}
              min="100"
              step="100"
              placeholder="Mise en CDF"
              className="pl-10 p-3 rounded-xl bg-white text-blue-900 w-full border border-blue-300 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              aria-label="Mise en CDF"
            />
          </div>
          <button
            onClick={handleCreateGame}
            className="bg-yellow-400 text-blue-800 px-6 py-3 rounded-xl hover:bg-yellow-500 transition-all font-semibold flex items-center gap-2 shadow-md"
          >
            <FaPlus />
            Créer
          </button>
        </div>
        <p className="mt-4 text-blue-100 flex items-center gap-2">
          <FaCoins className="text-yellow-400" />
          Votre solde : {userBalance} CDF
        </p>
      </div>

      {/* Ongoing Games List */}
      <div>
        <h2 className="text-2xl font-bold mb-5 text-yellow-500 flex items-center gap-2">
          <FaPlay className="text-yellow-500" />
          Mes parties en cours
        </h2>
        {ongoingGames.length === 0 ? (
          <div className="bg-blue-50 p-6 rounded-2xl text-center border border-blue-100">
            <p className="text-blue-800">Aucune partie en cours.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {ongoingGames.map(game => (
              <div
                key={game.id}
                className={`bg-gradient-to-r from-blue-600 to-blue-700 p-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4
                  ${opponentActivity[game.id] ? 'animate-pulse ring-2 ring-yellow-400' : ''}`}
              >
                <div className="flex-1">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <FaCoins className="text-yellow-400" />
                    Mise : {game.stake} CDF
                  </p>
                  <p className="text-white mt-2 flex items-center gap-2">
                    <FaUser className="text-blue-200" />
                    Adversaire : {game.player1_id === userId ? playerEmails[game.player2_id || ''] || 'En attente' : playerEmails[game.player1_id] || 'Inconnu'}
                  </p>
                  <p className="text-white mt-2 flex items-center gap-2">
                    <FaClock className="text-blue-200" />
                    {formatTimeLeft(game.closes_at)}
                  </p>
                </div>
                <Link
                  href={`/game/${game.id}`}
                  className="bg-yellow-400 text-blue-800 px-5 py-2.5 rounded-xl hover:bg-yellow-500 transition-all font-medium flex items-center gap-2 self-stretch md:self-auto justify-center"
                >
                  <FaPlay />
                  Reprendre
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Games (Trophy Display) */}
      <div>
        <h2 className="text-2xl font-bold mb-5 text-yellow-500 flex items-center gap-2">
          <FaCrown className="text-yellow-500" />
          Mes victoires
        </h2>
        {winCount === 0 ? (
          <div className="bg-blue-50 p-6 rounded-2xl text-center border border-blue-100">
            <p className="text-blue-800">Aucune victoire pour le moment.</p>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-2xl shadow-md border border-blue-500">
            <p className="text-white text-lg font-semibold flex items-center gap-2">
              <FaCrown className="text-yellow-400" />
              Vous avez gagné {winCount} partie{winCount > 1 ? 's' : ''} !
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {renderTrophies()}
            </div>
            <Link
              href="/completed-games"
              className="mt-4 inline-block bg-yellow-400 text-blue-800 px-5 py-2.5 rounded-xl hover:bg-yellow-500 transition-all font-medium flex items-center gap-2"
            >
              <FaEye />
              Voir toutes les parties terminées
            </Link>
          </div>
        )}
      </div>

      {/* Open Games List */}
      <div>
        <h2 className="text-2xl font-bold mb-5 text-yellow-500 flex items-center gap-2">
          <FaSignInAlt className="text-yellow-500" />
          Parties ouvertes
        </h2>
        {openGames.length === 0 ? (
          <div className="bg-blue-50 p-6 rounded-2xl text-center border border-blue-100">
            <p className="text-blue-800">Aucune partie ouverte pour le moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {openGames
              .filter(game => game.status === 'open' && (game.closes_at ? new Date(game.closes_at) > new Date() : true))
              .map(game => (
                <div
                  key={game.id}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-white flex items-center gap-2">
                      <FaCoins className="text-yellow-400" />
                      Mise : {game.stake} CDF
                    </p>
                    <p className="text-white mt-2 flex items-center gap-2">
                      <FaUser className="text-blue-200" />
                      Créateur : {playerEmails[game.player1_id] || 'Inconnu'}
                    </p>
                    <p className="text-white mt-2 flex items-center gap-2">
                      <FaClock className="text-blue-200" />
                      Expire : {new Date(game.closes_at!).toLocaleString('fr-CD')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinGame(game.id.toString(), game.stake)}
                    className="bg-yellow-400 text-blue-800 px-5 py-2.5 rounded-xl hover:bg-yellow-500 transition-all font-medium flex items-center gap-2 self-stretch md:self-auto justify-center"
                  >
                    <FaSignInAlt />
                    Rejoindre
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Link to Profile */}
      <Link
        href="/profile"
        className="block text-center bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-all font-medium shadow-md flex items-center justify-center gap-2"
      >
        <FaUserCircle className="text-xl" />
        Voir votre profil
      </Link>
    </div>
  );
}