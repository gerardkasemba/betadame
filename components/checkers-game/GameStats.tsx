"use client";
import { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase-client';
import { FaTrophy } from 'react-icons/fa';

interface GameStatsProps {
  player1Id: string;
  player2Id: string | null;
  playerEmails: { [key: string]: string };
  gameStatus: string;
}

export default function GameStats({ player1Id, player2Id, playerEmails, gameStatus }: GameStatsProps) {
  const { supabase } = useSupabase();
  const [wins, setWins] = useState<{ player1: number; player2: number }>({ player1: 0, player2: 0 });

  useEffect(() => {
    const fetchWins = async () => {
      // Fetch Player 1 wins
      const { data: p1Wins } = await supabase
        .from('games')
        .select('id', { count: 'exact' })
        .eq('winner_id', player1Id)
        .eq('status', 'finished');
      setWins((prev) => ({ ...prev, player1: p1Wins?.length || 0 }));

      // Fetch Player 2 wins if player2Id exists
      if (player2Id) {
        const { data: p2Wins } = await supabase
          .from('games')
          .select('id', { count: 'exact' })
          .eq('winner_id', player2Id)
          .eq('status', 'finished');
        setWins((prev) => ({ ...prev, player2: p2Wins?.length || 0 }));
      }
    };
    fetchWins();
  }, [supabase, player1Id, player2Id]);

  const renderTrophies = (count: number, color: string) => {
    const shown = Math.min(count, 5);
    return (
      <>
        {Array.from({ length: shown }, (_, i) => (
          <FaTrophy key={i} className={`text-${color}-500 text-xl`} />
        ))}
        {count > 5 && <span className="text-sm font-bold">+{count - 5}</span>}
      </>
    );
  };

  const player1Name = playerEmails[player1Id] || 'Joueur 1';
  const player2Name = player2Id ? playerEmails[player2Id] || 'Joueur 2' : 'En attente';

  return (
    <div className="flex justify-between items-center mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="font-semibold text-gray-800">{player1Name} (Noir)</span>
        {renderTrophies(wins.player1, 'yellow')}
      </div>
      <div className="flex items-center space-x-2">
        <span className="font-semibold text-gray-800">{player2Name} (Rouge)</span>
        {renderTrophies(wins.player2, 'yellow')}
      </div>
    </div>
  );
}