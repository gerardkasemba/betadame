'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import {
  FaTrophy,
  FaUsers,
  FaCalendar,
  FaMapMarkerAlt,
  FaCoins,
  FaClock,
  FaPlay,
  FaUserFriends,
  FaTable,
  FaTree,
  FaMedal,
  FaCrown,
  FaFire,
  FaArrowLeft,
  FaGamepad,
  FaUserCheck,
  FaUserClock,
  FaInfoCircle
} from 'react-icons/fa';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  type: 'public' | 'private' | 'regional';
  region: string | null;
  bet_amount: number;
  max_players: number;
  current_players: number;
  status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface TournamentParticipant {
  id: string;
  user_id: string;
  status: 'registered' | 'active' | 'eliminated' | 'winner';
  seed: number | null;
  group_number: number | null;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    region: string;
  };
}

interface TournamentMatch {
  id: string;
  round_type: 'group' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final';
  round_number: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  status: 'scheduled' | 'active' | 'completed';
  game_room_id: string | null;
  scheduled_time: string | null;
  player1_profile?: {
    username: string;
    avatar_url: string | null;
  };
  player2_profile?: {
    username: string;
    avatar_url: string | null;
  };
  winner_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Standing {
  participant: TournamentParticipant;
  wins: number;
  losses: number;
  matchesPlayed: number;
  points: number;
}

interface UserProfile {
  id: string;
  username: string;
  balance: number;
  avatar_url: string | null;
}

export default function TournamentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'bracket' | 'schedule' | 'standings'>('overview');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const tournamentId = params.id as string;

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentDetails();
      fetchUserProfile();
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;

    // Real-time subscription
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Tournament update:', payload);
          if (payload.new) {
            setTournament(payload.new as Tournament);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          console.log('Participants updated');
          fetchParticipants();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          console.log('Matches updated');
          fetchMatches();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tournamentId, supabase]);

  useEffect(() => {
    if (participants.length > 0 && matches.length > 0) {
      calculateStandings();
    }
  }, [participants, matches]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch tournament data
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;
      if (!tournamentData) {
        throw new Error('Tournament not found');
      }

      // Fetch creator profile
      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', tournamentData.created_by)
        .single();

      setTournament({
        ...tournamentData,
        creator_profile: creatorProfile || undefined
      });

      // Fetch participants and matches in parallel
      await Promise.all([
        fetchParticipants(),
        fetchMatches()
      ]);

    } catch (error) {
      console.error('Error fetching tournament details:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les détails du tournoi',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data: participantsData, error } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (participantsData && participantsData.length > 0) {
        const participantsWithProfiles = await Promise.all(
          participantsData.map(async (participant) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url, region')
              .eq('id', participant.user_id)
              .single();

            return {
              ...participant,
              profile: profile || undefined,
            } as TournamentParticipant;
          })
        );

        setParticipants(participantsWithProfiles);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data: matchesData, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;

      if (matchesData && matchesData.length > 0) {
        const matchesWithProfiles = await Promise.all(
          matchesData.map(async (match) => {
            const profiles: any = {};

            // Fetch player 1 profile
            if (match.player1_id) {
              const { data: player1Profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', match.player1_id)
                .single();
              profiles.player1_profile = player1Profile || null;
            }

            // Fetch player 2 profile
            if (match.player2_id) {
              const { data: player2Profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', match.player2_id)
                .single();
              profiles.player2_profile = player2Profile || null;
            }

            // Fetch winner profile
            if (match.winner_id) {
              const { data: winnerProfile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', match.winner_id)
                .single();
              profiles.winner_profile = winnerProfile || null;
            }

            return {
              ...match,
              ...profiles,
            } as TournamentMatch;
          })
        );

        setMatches(matchesWithProfiles);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      setMatches([]);
    }
  };

  const calculateStandings = () => {
    if (participants.length === 0) {
      setStandings([]);
      return;
    }

    const calculatedStandings = participants.map(participant => {
      const playerMatches = matches.filter(match => 
        (match.player1_id === participant.user_id || match.player2_id === participant.user_id) &&
        match.status === 'completed'
      );
      
      const wins = playerMatches.filter(match => match.winner_id === participant.user_id).length;
      const losses = playerMatches.filter(match => 
        match.winner_id && match.winner_id !== participant.user_id
      ).length;

      return {
        participant,
        wins,
        losses,
        matchesPlayed: wins + losses,
        points: wins * 3,
      };
    });

    const sortedStandings = calculatedStandings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

    setStandings(sortedStandings);
  };

  const joinTournament = async () => {
    if (!userProfile || !tournament) return;

    if (tournament.current_players >= tournament.max_players) {
      addToast({
        type: 'error',
        title: 'Tournoi Complet',
        message: 'Le tournoi a atteint son nombre maximum de participants',
        duration: 5000
      });
      return;
    }

    if (tournament.status !== 'registration' && tournament.status !== 'upcoming') {
      addToast({
        type: 'error',
        title: 'Inscriptions Fermées',
        message: 'Les inscriptions pour ce tournoi sont closes',
        duration: 5000
      });
      return;
    }

    try {
      setJoining(true);

      // Check if user is already registered
      const { data: existingParticipant } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('user_id', userProfile.id)
        .single();

      if (existingParticipant) {
        addToast({
          type: 'warning',
          title: 'Déjà Inscrit',
          message: 'Vous êtes déjà inscrit à ce tournoi',
          duration: 5000
        });
        return;
      }

      // Add participant
      const { error: participantError } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournament.id,
          user_id: userProfile.id,
          status: 'registered',
          seed: tournament.current_players + 1,
        });

      if (participantError) throw participantError;

      // Update tournament player count
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ current_players: tournament.current_players + 1 })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      addToast({
        type: 'success',
        title: 'Inscription Réussie! 🎉',
        message: `Vous êtes maintenant inscrit au tournoi "${tournament.name}"`,
        duration: 5000
      });

      // Refresh data
      await fetchTournamentDetails();

    } catch (error) {
      console.error('Error joining tournament:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de vous inscrire au tournoi',
        duration: 5000
      });
    } finally {
      setJoining(false);
    }
  };

  const leaveTournament = async () => {
    if (!userProfile || !tournament) return;

    try {
      setJoining(true);

      // Remove participant
      const { error: participantError } = await supabase
        .from('tournament_participants')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', userProfile.id);

      if (participantError) throw participantError;

      // Update tournament player count
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ current_players: Math.max(0, tournament.current_players - 1) })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      addToast({
        type: 'success',
        title: 'Désinscription',
        message: 'Vous avez quitté le tournoi',
        duration: 5000
      });

      // Refresh data
      await fetchTournamentDetails();

    } catch (error) {
      console.error('Error leaving tournament:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de quitter le tournoi',
        duration: 5000
      });
    } finally {
      setJoining(false);
    }
  };

  const isUserRegistered = () => {
    if (!userProfile) return false;
    return participants.some(p => p.user_id === userProfile.id);
  };

  const canJoinTournament = () => {
    if (!userProfile || !tournament) return false;
    if (isUserRegistered()) return false;
    if (tournament.status !== 'registration' && tournament.status !== 'upcoming') return false;
    if (tournament.current_players >= tournament.max_players) return false;
    return true;
  };

  const getRoundName = (roundType: string, roundNumber: number) => {
    switch (roundType) {
      case 'group': return `Groupe ${roundNumber}`;
      case 'round_of_16': return 'Huitièmes de Finale';
      case 'quarterfinal': return 'Quarts de Finale';
      case 'semifinal': return 'Demi-Finales';
      case 'final': return 'Finale';
      default: return `${roundType} ${roundNumber}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTournamentStatusColor = (status: Tournament['status']) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500 text-white';
      case 'registration': return 'bg-emerald-500 text-white';
      case 'active': return 'bg-amber-500 text-white';
      case 'completed': return 'bg-gray-600 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTournamentStatusIcon = (status: Tournament['status']) => {
    switch (status) {
      case 'upcoming': return <FaClock className="inline mr-2" />;
      case 'registration': return <FaUserFriends className="inline mr-2" />;
      case 'active': return <FaFire className="inline mr-2" />;
      case 'completed': return <FaTrophy className="inline mr-2" />;
      case 'cancelled': return <FaUserClock className="inline mr-2" />;
      default: return <FaClock className="inline mr-2" />;
    }
  };

  // Render bracket view
  const renderBracket = () => {
    const roundTypes = ['group', 'round_of_16', 'quarterfinal', 'semifinal', 'final'];
    
    return (
      <div className="space-y-8">
        {roundTypes.map((roundType) => {
          const roundMatches = matches.filter(match => match.round_type === roundType);
          if (roundMatches.length === 0) return null;

          return (
            <div key={roundType} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaTree />
                {getRoundName(roundType, roundMatches[0]?.round_number || 1)}
              </h3>
              <div className="grid gap-4">
                {roundMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-4 bg-white rounded-xl border border-gray-300 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm text-gray-500">
                        Match {match.match_number}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(match.status)}`}>
                        {match.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className={`font-medium ${
                          match.winner_id === match.player1_id ? 'text-green-600 font-bold' : 'text-gray-900'
                        }`}>
                          {match.player1_profile?.username || 'TBD'}
                        </div>
                        {match.winner_id === match.player1_id && (
                          <FaCrown className="text-amber-500 mx-auto mt-1" />
                        )}
                      </div>
                      
                      <div className="px-4">
                        <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-bold">
                          VS
                        </div>
                      </div>
                      
                      <div className="text-center flex-1">
                        <div className={`font-medium ${
                          match.winner_id === match.player2_id ? 'text-green-600 font-bold' : 'text-gray-900'
                        }`}>
                          {match.player2_profile?.username || 'TBD'}
                        </div>
                        {match.winner_id === match.player2_id && (
                          <FaCrown className="text-amber-500 mx-auto mt-1" />
                        )}
                      </div>
                    </div>
                    
                    {match.scheduled_time && (
                      <div className="text-center mt-3 text-sm text-gray-500">
                        <FaClock className="inline mr-1" />
                        {new Date(match.scheduled_time).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <div className="text-gray-600 mt-4">Chargement du tournoi...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <FaTrophy className="text-6xl text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">Tournoi non trouvé</h2>
            <button
              onClick={() => router.push('/dashboard/tournaments')}
              className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600"
            >
              Retour aux tournois
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/tournaments')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Retour aux tournois
          </button>

          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center">
                    <FaTrophy className="text-white text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {tournament.name}
                    </h1>
                    <p className="text-gray-600 text-lg">
                      {tournament.description || 'Tournoi premium avec mise organisateur'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full text-sm font-semibold">
                    <FaUserCheck className="inline mr-2" />
                    Entrée Gratuite
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getTournamentStatusColor(tournament.status)}`}>
                    {getTournamentStatusIcon(tournament.status)}
                    {tournament.status}
                  </span>
                  <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full text-sm font-semibold">
                    {tournament.type}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {canJoinTournament() && (
                  <button
                    onClick={joinTournament}
                    disabled={joining}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-8 py-3 rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    🎯 Rejoindre GRATUIT
                  </button>
                )}

                {isUserRegistered() && (
                  <button
                    onClick={leaveTournament}
                    disabled={joining}
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-3 rounded-xl hover:from-red-600 hover:to-pink-600 disabled:opacity-50 font-semibold shadow-lg transition-all duration-200"
                  >
                    Se désinscrire
                  </button>
                )}

                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-4 rounded-xl text-center text-white shadow-lg">
                  <div className="text-2xl font-bold mb-1">
                    {tournament.bet_amount} €
                  </div>
                  <div className="text-amber-100 text-sm">
                    Mise Totale
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-1 sm:p-2 mb-6 sm:mb-8 shadow-lg border border-gray-200">
        <div className="flex flex-nowrap overflow-x-auto scrollbar-hide sm:flex-wrap sm:space-x-1">
            {(['overview', 'bracket', 'schedule', 'standings'] as const).map((tab) => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-3 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 min-w-[80px] sm:min-w-0 sm:flex-1 ${
                activeTab === tab
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md sm:shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
                {tab === 'overview' && <FaUsers className="text-xs sm:text-sm" />}
                {tab === 'bracket' && <FaTree className="text-xs sm:text-sm" />}
                {tab === 'schedule' && <FaCalendar className="text-xs sm:text-sm" />}
                {tab === 'standings' && <FaTable className="text-xs sm:text-sm" />}
                <span className="hidden xs:inline">
                {tab === 'overview' && 'Aperçu'}
                {tab === 'bracket' && 'Arbre'}
                {tab === 'schedule' && 'Calendrier'}
                {tab === 'standings' && 'Classement'}
                </span>
                <span className="xs:hidden">
                {tab === 'overview' && 'Aperçu'}
                {tab === 'bracket' && 'Arbre'}
                {tab === 'schedule' && 'Cal.'}
                {tab === 'standings' && 'Class.'}
                </span>
            </button>
            ))}
        </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Tournament Info Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaInfoCircle />
                  Informations du Tournoi
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <FaUsers className="text-blue-600 text-lg mx-auto mb-2" />
                    <div className="font-bold text-blue-700 text-2xl">{tournament.current_players}/{tournament.max_players}</div>
                    <div className="text-sm text-blue-600">Joueurs Inscrits</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                    <FaCoins className="text-emerald-600 text-lg mx-auto mb-2" />
                    <div className="font-bold text-emerald-700 text-2xl">{tournament.bet_amount} €</div>
                    <div className="text-sm text-emerald-600">Mise Organisateur</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                    <FaCalendar className="text-amber-600 text-lg mx-auto mb-2" />
                    <div className="font-bold text-amber-700 text-sm">
                      {new Date(tournament.start_date).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-amber-600">Date de Début</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <FaMapMarkerAlt className="text-purple-600 text-lg mx-auto mb-2" />
                    <div className="font-bold text-purple-700 text-sm">{tournament.region || 'Global'}</div>
                    <div className="text-sm text-purple-600">Région</div>
                  </div>
                </div>
              </div>

              {/* Participants Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaUserFriends />
                  Participants ({participants.length})
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {participants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                      Aucun participant pour le moment
                    </div>
                  ) : (
                    participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {participant.profile?.username || `Joueur ${participant.user_id.slice(0, 8)}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {participant.profile?.region || 'N/A'}
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          participant.status === 'winner' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' :
                          participant.status === 'eliminated' ? 'bg-gradient-to-r from-red-400 to-red-500 text-white' :
                          participant.status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white' :
                          'bg-gradient-to-r from-blue-400 to-blue-500 text-white'
                        }`}>
                          {participant.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Schedule Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaCalendar />
                  Calendrier des Matchs
                </h3>
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {matches.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaGamepad className="text-4xl text-gray-300 mx-auto mb-3" />
                      Aucun match programmé pour le moment
                    </div>
                  ) : (
                    matches.map((match) => (
                      <div
                        key={match.id}
                        className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {getRoundName(match.round_type, match.round_number)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Match {match.match_number}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <div className={`font-medium ${
                              match.winner_id === match.player1_id ? 'text-green-600 font-bold' : 'text-gray-900'
                            }`}>
                              {match.player1_profile?.username || 'À déterminer'}
                            </div>
                            {match.winner_id === match.player1_id && (
                              <FaCrown className="text-amber-500 mx-auto mt-1" />
                            )}
                          </div>
                          
                          <div className="px-4">
                            <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-bold">
                              VS
                            </div>
                          </div>
                          
                          <div className="text-center flex-1">
                            <div className={`font-medium ${
                              match.winner_id === match.player2_id ? 'text-green-600 font-bold' : 'text-gray-900'
                            }`}>
                              {match.player2_profile?.username || 'À déterminer'}
                            </div>
                            {match.winner_id === match.player2_id && (
                              <FaCrown className="text-amber-500 mx-auto mt-1" />
                            )}
                          </div>
                        </div>
                        
                        {match.scheduled_time && (
                          <div className="text-center mt-3 text-sm text-gray-500">
                            <FaClock className="inline mr-1" />
                            {new Date(match.scheduled_time).toLocaleString('fr-FR')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Standings Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FaMedal />
                  Classement
                </h3>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {standings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FaTable className="text-4xl text-gray-300 mx-auto mb-3" />
                      Classement non disponible
                    </div>
                  ) : (
                    standings.map((standing, index) => (
                      <div
                        key={standing.participant.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-amber-300 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                            index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                            index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                            index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900' :
                            'bg-gradient-to-br from-blue-500 to-purple-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {standing.participant.profile?.username || `Joueur ${standing.participant.user_id.slice(0, 8)}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {standing.matchesPlayed} matchs
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold text-gray-900 text-lg">
                            {standing.points} pts
                          </div>
                          <div className="text-sm text-gray-500">
                            {standing.wins}V - {standing.losses}D
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bracket Tab */}
        {activeTab === 'bracket' && renderBracket()}

        {/* Schedule Tab - Same as overview but focused on matches */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaCalendar />
              Calendrier Complet des Matchs
            </h3>
            
            <div className="space-y-4">
              {matches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaGamepad className="text-5xl text-gray-300 mx-auto mb-4" />
                  <p className="text-lg">Aucun match programmé pour le moment</p>
                </div>
              ) : (
                matches.map((match) => (
                  <div
                    key={match.id}
                    className="p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">
                          {getRoundName(match.round_type, match.round_number)} - Match {match.match_number}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {match.scheduled_time ? (
                            <>
                              <FaClock className="inline mr-1" />
                              {new Date(match.scheduled_time).toLocaleString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </>
                          ) : 'Date à déterminer'}
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(match.status)}`}>
                        {match.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className={`text-lg font-medium ${
                          match.winner_id === match.player1_id ? 'text-green-600 font-bold' : 'text-gray-900'
                        }`}>
                          {match.player1_profile?.username || 'À déterminer'}
                        </div>
                        {match.winner_id === match.player1_id && (
                          <div className="flex items-center justify-center gap-1 mt-1 text-amber-600">
                            <FaCrown />
                            <span className="text-sm font-semibold">Vainqueur</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="px-6">
                        <div className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          VS
                        </div>
                      </div>
                      
                      <div className="text-center flex-1">
                        <div className={`text-lg font-medium ${
                          match.winner_id === match.player2_id ? 'text-green-600 font-bold' : 'text-gray-900'
                        }`}>
                          {match.player2_profile?.username || 'À déterminer'}
                        </div>
                        {match.winner_id === match.player2_id && (
                          <div className="flex items-center justify-center gap-1 mt-1 text-amber-600">
                            <FaCrown />
                            <span className="text-sm font-semibold">Vainqueur</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Standings Tab - Full page standings */}
        {activeTab === 'standings' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaMedal />
              Classement Complet
            </h3>
            
            <div className="space-y-4">
              {standings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaTable className="text-5xl text-gray-300 mx-auto mb-4" />
                  <p className="text-lg">Classement non disponible</p>
                </div>
              ) : (
                standings.map((standing, index) => (
                  <div
                    key={standing.participant.id}
                    className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center space-x-6">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg' :
                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg' :
                        index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900 shadow-lg' :
                        'bg-gradient-to-br from-blue-500 to-purple-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">
                          {standing.participant.profile?.username || `Joueur ${standing.participant.user_id.slice(0, 8)}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          {standing.participant.profile?.region || 'N/A'} • {standing.matchesPlayed} matchs joués
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-gray-900 text-2xl">
                        {standing.points} pts
                      </div>
                      <div className="text-sm text-gray-500">
                        {standing.wins} Victoires - {standing.losses} Défaites
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}