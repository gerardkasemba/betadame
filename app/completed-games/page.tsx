// pages/completed-games.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { FaCrown, FaCoins, FaUser, FaClock, FaEye } from 'react-icons/fa';
import type { Database } from '@/types/supabase';

type Game = Database['public']['Tables']['games']['Row'];

export default function CompletedGames() {
  const { supabase } = useSupabase();
  const [completedGames, setCompletedGames] = useState<Game[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [playerEmails, setPlayerEmails] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'finished')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);

      if (error || !games) return;

      setCompletedGames(games);

      // Fetch player emails
      const playerIds = games
        .flatMap(g => [g.player1_id, g.player2_id])
        .filter((id): id is string => !!id);

      if (playerIds.length > 0) {
        const { data: users } = await supabase
          .from('users') // make sure this table exists in your schema
          .select('id, email')
          .in('id', playerIds);

        if (users) {
          const mapped = users.reduce((acc, { id, email }) => {
            acc[id] = email || '';
            return acc;
          }, {} as { [key: string]: string });
          setPlayerEmails(mapped);
        }
      }
    };

    fetchData();
  }, [supabase]);

  return (
    <div className="space-y-8 p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-yellow-500">Parties terminées</h1>

      {completedGames.length === 0 ? (
        <div className="bg-blue-50 p-6 rounded-2xl text-center border border-blue-100">
          <p className="text-blue-800">Aucune partie terminée.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {completedGames.map(game => (
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
                  Adversaire :{' '}
                  {game.player1_id === userId
                    ? playerEmails[game.player2_id || ''] || 'Inconnu'
                    : playerEmails[game.player1_id || ''] || 'Inconnu'}
                </p>

                <p className="text-white mt-2 flex items-center gap-2">
                  <FaCrown className="text-yellow-400" />
                  Gagnant :{' '}
                  {game.winner_id
                    ? playerEmails[game.winner_id] || 'Inconnu'
                    : 'Aucun'}{' '}
                  {game.winner_id === userId ? '🏆' : ''}
                </p>

                <p className="text-white mt-2 flex items-center gap-2">
                  <FaClock className="text-blue-200" />
                  Terminé le :{' '}
                  {game.created_at
                    ? new Date(game.created_at).toLocaleString('fr-CD')
                    : 'Date inconnue'}
                </p>
              </div>

              <Link
                href={`/game/${game.id}`}
                className="bg-yellow-400 text-blue-800 px-5 py-2.5 rounded-xl hover:bg-yellow-500 transition-all font-medium flex items-center gap-2"
              >
                <FaEye />
                Revoir
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
