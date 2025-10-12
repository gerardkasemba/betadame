import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tournament, TournamentParticipant, TournamentMatch, UserProfile } from '@/app/dashboard/tournaments/components/types';

export const useTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add creator profiles logic
      const tournamentsWithCreators = await Promise.all(
        (tournamentsData || []).map(async (tournament: Tournament) => {
          if (tournament.created_by) {
            const { data: creatorProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', tournament.created_by)
              .single();

            return {
              ...tournament,
              creator_profile: creatorProfile || undefined,
            } as Tournament;
          }
          return tournament;
        })
      );

      setTournaments(tournamentsWithCreators);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return {
    tournaments,
    loading,
    fetchTournaments,
    setTournaments
  };
};