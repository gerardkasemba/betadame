// app/dashboard/tournaments/page.tsx - FIXED DECLARATION ORDER
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TournamentCard } from './components/TournamentCard';
import { TournamentFilters } from './components/TournamentFilters';
import { TournamentDetailsSidebar } from './components/TournamentDetailsSidebar';
import { 
  Tournament, 
  TournamentParticipant, 
  TournamentMatch, 
  UserProfile, 
  RegistrationRecord,
  translations,
  ActiveTab,
  UserMatch
} from './components/types';
import { 
  FaTrophy, 
  FaClock, 
  FaFire, 
  FaStar,
  FaPlay,
  FaUser,
  FaUsers,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
  FaGift
} from 'react-icons/fa';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
  title?: string;
  duration?: number;
}

export default function TournamentsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast system
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, toast.duration || 5000);
  }, []);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set());
  const [activeTournaments, setActiveTournaments] = useState<Set<string>>(new Set());
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(1000);
  const [startDate, setStartDate] = useState<string>('');
  const [tournamentSize, setTournamentSize] = useState('all');

  // Tournament configuration - UPDATED FOR FREE ENTRY
  const TOURNAMENT_CONFIG = {
    maxActiveTournaments: 1,
    minPrize: 0, // Free tournaments
    maxPrize: 1000,
    allowedRegions: ['EUROPE', 'ASIA', 'AMERICA', 'AFRICA']
  };

  // Helper functions that don't depend on other functions - DECLARED FIRST
  const initializeBoard = () => {
    const board = Array(64).fill(null)
    for (let i = 0; i < 24; i++) {
      if (i < 12) board[i] = { type: 'piece', color: 'red', king: false }
      else if (i >= 20) board[i] = { type: 'piece', color: 'yellow', king: false }
    }
    return board
  }

  // Enhanced player joining with comprehensive checks - DECLARED EARLY
  const joinPlayerToGameRoom = useCallback(async (match: TournamentMatch, userId: string, gameRoomId: string, playerNumber: number, betAmount: number) => {
    try {
      // NO BALANCE CHECK for free tournament games

      // Join the game
      const { error: joinError } = await supabase
        .from('game_participants')
        .insert({
          game_room_id: gameRoomId,
          user_id: userId,
          player_number: playerNumber,
          is_ready: true
        });

      if (joinError) {
        console.error('Error joining player to game:', joinError);
        throw joinError;
      }

      // Update game room player count
      await supabase.rpc('increment_game_players', {
        p_game_room_id: gameRoomId
      });

      console.log(`Player ${userId} successfully joined FREE tournament game ${gameRoomId}`);

    } catch (error) {
      console.error('Error in joinPlayerToGameRoom:', error);
      throw error;
    }
  }, [supabase]);

  // Enhanced game room creation for tournament matches - DECLARED EARLY
  const createGameRoomForMatch = useCallback(async (match: TournamentMatch) => {
    try {
      let gameRoomName = `Tournament Match ${match.match_number}`;
      let betAmount = 0; // Free games for tournament matches

      // Fetch tournament details
      try {
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('name, bet_amount')
          .eq('id', match.tournament_id)
          .single();

        if (tournament) {
          gameRoomName = `${tournament.name} - Match ${match.match_number}`;
        }
      } catch (tournamentError) {
        console.warn('Could not fetch tournament details, using defaults:', tournamentError);
      }

      console.log(`Creating FREE game room for tournament match: ${gameRoomName}`);

      // Create the game room with 0 bet amount
      const { data: gameRoom, error: gameRoomError } = await supabase
        .from('game_rooms')
        .insert([
          {
            name: gameRoomName,
            bet_amount: 0, // Free games
            max_players: 2,
            current_players: 0,
            status: 'playing',
            board_state: JSON.stringify(initializeBoard()),
            current_turn: 0,
            current_player: 1,
            region: 'tournament',
            tournament_match_id: match.id,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (gameRoomError) {
        console.error('Game room creation error:', gameRoomError);
        throw gameRoomError;
      }

      console.log(`Game room ${gameRoom.id} created successfully for match ${match.id}`);

      // Update match with game room ID
      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update({ game_room_id: gameRoom.id })
        .eq('id', match.id);

      if (updateError) {
        console.error('Match update error:', updateError);
        throw updateError;
      }

      // Auto-join players to the game room - NO BALANCE CHECKS FOR FREE GAMES
      if (match.player1_id) {
        await joinPlayerToGameRoom(match, match.player1_id, gameRoom.id, 1, 0);
      }
      
      if (match.player2_id) {
        await joinPlayerToGameRoom(match, match.player2_id, gameRoom.id, 2, 0);
      }

      return gameRoom;
    } catch (error) {
      console.error('Failed to create game room for match:', match.id, error);
      return null;
    }
  }, [supabase, joinPlayerToGameRoom]);

  // Data fetching functions - DECLARED AFTER functions they depend on
  const fetchTournaments = useCallback(async () => {
    try {
      console.log('Fetching tournaments...');
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les tournois',
        duration: 5000
      });
    }
  }, [supabase, addToast]);

  const fetchUserProfile = useCallback(async () => {
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
  }, [supabase]);

  const fetchUserRegistrations = useCallback(async () => {
    if (!userProfile) return;
    
    try {
      const { data: registrations } = await supabase
        .from('tournament_participants')
        .select('tournament_id, status')
        .eq('user_id', userProfile.id);

      if (registrations) {
        setUserRegistrations(new Set(registrations.map(r => r.tournament_id)));
        
        const activeTournamentIds = registrations
          .filter(r => r.status === 'registered' || r.status === 'active')
          .map(r => r.tournament_id);
        setActiveTournaments(new Set(activeTournamentIds));
      }
    } catch (error) {
      console.error('Error fetching user registrations:', error);
    }
  }, [supabase, userProfile]);

  const fetchTournamentDetails = useCallback(async (tournamentId: string) => {
    if (!tournamentId) return;
    
    try {
      const [participantsResponse, matchesResponse] = await Promise.all([
        supabase
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('created_at', { ascending: true }),
        supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true })
      ]);

      if (participantsResponse.error) throw participantsResponse.error;
      if (matchesResponse.error) throw matchesResponse.error;

      // Process participants with profiles
      const participantsWithProfiles = await Promise.all(
        (participantsResponse.data || []).map(async (participant: TournamentParticipant) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, region')
            .eq('id', participant.user_id)
            .single();

          return {
            ...participant,
            profile: profile || undefined,
          };
        })
      );

      // Process matches with profiles
      const matchesWithProfiles = await Promise.all(
        (matchesResponse.data || []).map(async (match: TournamentMatch) => {
          const profiles: any = {};

          if (match.player1_id) {
            const { data: player1Profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', match.player1_id)
              .single();
            profiles.player1_profile = player1Profile;
          }

          if (match.player2_id) {
            const { data: player2Profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', match.player2_id)
              .single();
            profiles.player2_profile = player2Profile;
          }

          if (match.winner_id) {
            const { data: winnerProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', match.winner_id)
              .single();
            profiles.winner_profile = winnerProfile;
          }

          return {
            ...match,
            ...profiles,
          };
        })
      );

      // Create game rooms for scheduled matches that don't have them
      if (matchesResponse.data) {
        for (const match of matchesResponse.data) {
          if (match.status === 'scheduled' && !match.game_room_id) {
            try {
              await createGameRoomForMatch(match);
            } catch (error) {
              console.error(`Failed to create game room for match ${match.id}:`, error);
            }
          }
        }
      }

      setParticipants(participantsWithProfiles);
      setMatches(matchesWithProfiles);

    } catch (error) {
      console.error('Error fetching tournament details:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de charger les détails du tournoi',
        duration: 5000
      });
    }
  }, [supabase, addToast, createGameRoomForMatch]);

  // Enhanced match generation function - DECLARED AFTER fetchTournamentDetails
  const checkAndGenerateMatches = useCallback(async (tournament: Tournament) => {
    try {
      // Check if tournament is full and still in registration status
      if (tournament.current_players === tournament.max_players && tournament.status === 'registration') {
        console.log(`Tournament ${tournament.id} is full, checking for existing matches...`);
        
        // First, check if matches already exist for this tournament
        const { data: existingMatches, error: checkError } = await supabase
          .from('tournament_matches')
          .select('id')
          .eq('tournament_id', tournament.id)
          .limit(1);

        if (checkError) {
          console.error('Error checking existing matches:', checkError);
          return;
        }

        // If matches already exist, don't generate new ones
        if (existingMatches && existingMatches.length > 0) {
          console.log('Matches already exist for this tournament, skipping generation');
          
          // Just update the tournament status to active
          const { error: updateError } = await supabase
            .from('tournaments')
            .update({ status: 'active' })
            .eq('id', tournament.id);

          if (updateError) {
            console.error('Error updating tournament status:', updateError);
          }
          return;
        }

        console.log(`Generating matches for tournament ${tournament.id}...`);
        
        const { error } = await supabase.rpc('generate_tournament_matches', {
          p_tournament_id: tournament.id
        });

        if (error) {
          console.error('Error generating matches:', error);
          addToast({
            type: 'error',
            title: 'Erreur',
            message: 'Erreur lors de la génération des matchs',
            duration: 5000
          });
        } else {
          console.log('Matches generated successfully');
          addToast({
            type: 'success',
            title: 'Tournoi prêt!',
            message: 'Les matchs ont été générés, le tournoi commence!',
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error('Error in match generation check:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Erreur lors du démarrage du tournoi',
        duration: 5000
      });
    }
  }, [supabase, addToast]);

  // Enhanced validation function for tournament joining
  const validateTournamentJoin = useCallback(async (tournamentId: string, userId: string) => {
    try {
      const [
        { data: tournament, error: tournamentError },
        { data: profile, error: profileError },
        { data: existingParticipant, error: participantError }
      ] = await Promise.all([
        supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single(),
        supabase
          .from('profiles')
          .select('balance, tournaments_created, tournaments_won')
          .eq('id', userId)
          .single(),
        supabase
          .from('tournament_participants')
          .select('id, status')
          .eq('tournament_id', tournamentId)
          .eq('user_id', userId)
          .single()
      ]);

      if (tournamentError) throw new Error('Tournoi non trouvé');
      if (profileError) throw new Error('Profil utilisateur non trouvé');

      return { 
        tournament, 
        profile, 
        existingParticipant: existingParticipant && !participantError 
      };
    } catch (error) {
      console.error('Validation error:', error);
      throw error;
    }
  }, [supabase]);

  // Enhanced join tournament function with comprehensive checks
  const joinTournament = useCallback(async (tournament: Tournament) => {
    if (!userProfile) {
      addToast({
        type: 'error',
        title: 'Connexion requise',
        message: 'Vous devez être connecté pour rejoindre un tournoi',
        duration: 5000
      });
      return;
    }

    setJoining(true);

    try {
      // Validate tournament and user
      const validation = await validateTournamentJoin(tournament.id, userProfile.id);
      
      if (!validation.tournament || !validation.profile) {
        addToast({
          type: 'error',
          title: 'Erreur',
          message: 'Tournoi ou profil non trouvé',
          duration: 5000
        });
        return;
      }

      const { tournament: currentTournament, profile, existingParticipant } = validation;

      // Check if user is already registered
      if (existingParticipant) {
        addToast({
          type: 'warning',
          title: 'Déjà inscrit',
          message: 'Vous êtes déjà inscrit à ce tournoi',
          duration: 5000
        });
        
        // If already registered, redirect to tournament details
        if (currentTournament.status === 'active' || currentTournament.status === 'upcoming') {
          router.push(`/dashboard/tournaments/${tournament.id}`);
        }
        return;
      }

      // Check tournament status
      if (currentTournament.status !== 'registration' && currentTournament.status !== 'upcoming') {
        addToast({
          type: 'error',
          title: 'Inscriptions fermées',
          message: 'Les inscriptions pour ce tournoi sont fermées',
          duration: 5000
        });
        return;
      }

      // Check if tournament is full
      if (currentTournament.current_players >= currentTournament.max_players) {
        addToast({
          type: 'error',
          title: 'Tournoi complet',
          message: 'Ce tournoi a atteint le nombre maximum de participants',
          duration: 5000
        });
        return;
      }

      // Check user's active tournaments
      if (activeTournaments.size >= TOURNAMENT_CONFIG.maxActiveTournaments) {
        addToast({
          type: 'error',
          title: 'Tournoi en cours',
          message: `Vous ne pouvez participer qu'à ${TOURNAMENT_CONFIG.maxActiveTournaments} tournoi(s) à la fois`,
          duration: 5000
        });
        return;
      }

      // REMOVED: No balance check for free tournaments

      // Use transaction for atomic operations - UPDATED FOR FREE ENTRY
      const { error: joinError } = await supabase.rpc('join_tournament_free', {
        p_tournament_id: tournament.id,
        p_user_id: userProfile.id
      });

      if (joinError) {
        console.error('Join transaction error:', joinError);
        
        // Fallback to individual operations if RPC fails
        await joinTournamentFallback(currentTournament, userProfile.id);
        return;
      }

      // Success - UPDATED MESSAGE
      addToast({
        type: 'success',
        title: 'Inscription réussie!',
        message: `Vous avez rejoint le tournoi "${tournament.name}" gratuitement!`,
        duration: 5000
      });

      // Refresh all data
      await Promise.all([
        fetchTournaments(),
        fetchUserRegistrations(),
        fetchUserProfile()
      ]);

      // Check if tournament should start (if full)
      if (currentTournament.current_players + 1 >= currentTournament.max_players) {
        await checkAndGenerateMatches({ 
          ...currentTournament, 
          current_players: currentTournament.current_players + 1 
        });
      }

      // Update selected tournament if it's the one we joined
      if (selectedTournament && selectedTournament.id === tournament.id) {
        await fetchTournamentDetails(tournament.id);
      }

    } catch (error: any) {
      console.error('Error joining tournament:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible de rejoindre le tournoi',
        duration: 5000
      });
    } finally {
      setJoining(false);
    }
  }, [
    userProfile, 
    supabase, 
    addToast, 
    fetchTournaments, 
    fetchUserRegistrations, 
    fetchUserProfile, 
    selectedTournament, 
    fetchTournamentDetails, 
    activeTournaments, 
    validateTournamentJoin,
    checkAndGenerateMatches
  ]);

  // Fallback join function if RPC is not available - UPDATED FOR FREE ENTRY
  const joinTournamentFallback = async (tournament: Tournament, userId: string) => {
    try {
      // Start transaction manually - NO BALANCE DEDUCTION
      const { data: participant, error: participantError } = await supabase
        .from('tournament_participants')
        .insert([
          {
            tournament_id: tournament.id,
            user_id: userId,
            status: 'registered',
            seed: Math.floor(Math.random() * 1000) + 1
          }
        ])
        .select()
        .single();

      if (participantError) {
        if (participantError.code === '23505') {
          throw new Error('Vous êtes déjà inscrit à ce tournoi');
        }
        throw participantError;
      }

      // REMOVED: No balance deduction for free tournaments
      // REMOVED: No transaction recording for free tournaments

      // Update tournament player count
      const { error: updateError } = await supabase.rpc('increment_tournament_players', {
        p_tournament_id: tournament.id
      });

      if (updateError) {
        console.error('Error updating player count:', updateError);
        // Continue anyway as the participant was added successfully
      }

    } catch (error) {
      console.error('Fallback join error:', error);
      throw error;
    }
  };

  // Enhanced leave tournament function - UPDATED FOR FREE ENTRY
  const leaveTournament = useCallback(async (tournament: Tournament) => {
    if (!userProfile) {
      addToast({
        type: 'error',
        title: 'Connexion requise',
        message: 'Vous devez être connecté pour quitter un tournoi',
        duration: 5000
      });
      return;
    }

    if (!userRegistrations.has(tournament.id)) {
      addToast({
        type: 'error',
        title: 'Non inscrit',
        message: 'Vous n\'êtes pas inscrit à ce tournoi',
        duration: 5000
      });
      return;
    }

    // Check if tournament has already started
    if (tournament.status === 'active') {
      addToast({
        type: 'error',
        title: 'Tournoi commencé',
        message: 'Vous ne pouvez pas quitter un tournoi déjà commencé',
        duration: 5000
      });
      return;
    }

    setJoining(true);

    try {
      // Use transaction for leaving tournament - UPDATED FOR FREE ENTRY
      const { error: leaveError } = await supabase.rpc('leave_tournament_free', {
        p_tournament_id: tournament.id,
        p_user_id: userProfile.id
      });

      if (leaveError) {
        console.error('Leave transaction error:', leaveError);
        throw new Error(leaveError.message);
      }

      addToast({
        type: 'success',
        title: 'Désinscription réussie',
        message: `Vous avez quitté le tournoi "${tournament.name}"`,
        duration: 5000
      });

      // Refresh data
      await Promise.all([
        fetchTournaments(),
        fetchUserRegistrations(),
        fetchUserProfile()
      ]);

      if (selectedTournament && selectedTournament.id === tournament.id) {
        await fetchTournamentDetails(tournament.id);
      }

    } catch (error: any) {
      console.error('Error leaving tournament:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible de quitter le tournoi',
        duration: 5000
      });
    } finally {
      setJoining(false);
    }
  }, [userProfile, supabase, addToast, fetchTournaments, fetchUserRegistrations, fetchUserProfile, selectedTournament, fetchTournamentDetails, userRegistrations]);

  // Create tournament function - UPDATED TO USE bet_amount INSTEAD OF prize_pool
  const createTournament = useCallback(async () => {
    if (!userProfile) {
      addToast({
        type: 'error',
        title: 'Connexion requise',
        message: 'Vous devez être connecté pour créer un tournoi',
        duration: 5000
      });
      return;
    }

    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .insert([
          {
            name: `Tournoi de ${userProfile.username}`,
            description: 'Un tournoi passionnant créé par notre communauté',
            type: 'public',
            region: userProfile.region,
            bet_amount: 50.00, // Organizer sets the prize pool using bet_amount field
            max_players: 8,
            current_players: 0,
            status: 'registration',
            start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            end_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
            created_by: userProfile.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Tournoi créé',
        message: 'Votre tournoi a été créé avec succès!',
        duration: 5000
      });

      // Update user profile tournaments_created count
      const { error: profileError } = await supabase.rpc('increment_tournaments_created', {
        user_id: userProfile.id
      });

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Refresh tournaments and user profile
      await fetchTournaments();
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.id)
        .single();
      
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

    } catch (error) {
      console.error('Error creating tournament:', error);
      addToast({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de créer le tournoi',
        duration: 5000
      });
    }
  }, [userProfile, supabase, addToast, setUserProfile, fetchTournaments]);

  // Enhanced helper functions - UPDATED FOR FREE ENTRY
  const isUserRegistered = useCallback((tournamentId: string) => {
    return userRegistrations.has(tournamentId);
  }, [userRegistrations]);

  const canJoinTournament = useCallback((tournament: Tournament) => {
    if (!userProfile) return false;
    if (isUserRegistered(tournament.id)) return false;
    if (tournament.status !== 'registration' && tournament.status !== 'upcoming') return false;
    if (tournament.current_players >= tournament.max_players) return false;
    if (activeTournaments.size >= TOURNAMENT_CONFIG.maxActiveTournaments) return false;
    // REMOVED: No balance check for free tournaments
    return true;
  }, [userProfile, isUserRegistered, activeTournaments, TOURNAMENT_CONFIG.maxActiveTournaments]);

  // Function to determine if it's player's turn
  const determinePlayerTurn = useCallback((match: TournamentMatch, userId: string): boolean => {
    return match.status === 'scheduled' && 
           (match.player1_id === userId || match.player2_id === userId) &&
           match.game_room_id !== null;
  }, []);

  // Function to get user's matches with play status
  const getUserMatches = useCallback((): UserMatch[] => {
    if (!userProfile || !matches) return [];

    return matches
      .filter(match => 
        (match.player1_id === userProfile.id || match.player2_id === userProfile.id) &&
        match.status === 'scheduled'
      )
      .map(match => {
        const isPlayerTurn = determinePlayerTurn(match, userProfile.id);
        const gameRoomUrl = match.game_room_id ? `/dashboard/game/p/${match.game_room_id}` : undefined;
        
        return {
          match,
          isPlayerTurn,
          gameRoomUrl
        };
      });
  }, [matches, userProfile, determinePlayerTurn]);

  // Update user matches when matches change
  useEffect(() => {
    if (matches && userProfile) {
      setUserMatches(getUserMatches());
    }
  }, [matches, userProfile, getUserMatches]);

  // Quick Play Component for user's current matches - UPDATED MESSAGING
  const QuickPlaySection = () => {
    if (!userProfile || userMatches.length === 0) return null;

    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">Vos Matchs à Jouer</h2>
            <p className="text-green-100">
              Vous avez {userMatches.length} match(s) en attente - Gratuit!
            </p>
          </div>
          <FaPlay className="text-2xl" />
        </div>
        
        <div className="mt-4 space-y-3">
          {userMatches.slice(0, 3).map(({ match, isPlayerTurn, gameRoomUrl }) => (
            <div key={match.id} className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <img 
                      src={match.player1_profile?.avatar_url || '/default-avatar.png'} 
                      alt={match.player1_profile?.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium text-sm">{match.player1_profile?.username || 'Joueur 1'}</span>
                  </div>
                  <span className="text-green-200">vs</span>
                  <div className="flex items-center space-x-2">
                    <img 
                      src={match.player2_profile?.avatar_url || '/default-avatar.png'} 
                      alt={match.player2_profile?.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-medium text-sm">{match.player2_profile?.username || 'Joueur 2'}</span>
                  </div>
                </div>
                
                {isPlayerTurn && gameRoomUrl && (
                  <button
                    onClick={() => router.push(gameRoomUrl)}
                    className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-50 transition-colors flex items-center gap-2"
                  >
                    <FaPlay className="text-xs" />
                    Jouer Gratuitement
                  </button>
                )}
              </div>
              {match.scheduled_time && (
                <div className="text-green-100 text-xs mt-2">
                  {new Date(match.scheduled_time).toLocaleDateString()} à{' '}
                  {new Date(match.scheduled_time).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {userMatches.length > 3 && (
          <button
            onClick={() => setSelectedTournament(userMatches[0]?.match.tournament_id ? tournaments.find(t => t.id === userMatches[0].match.tournament_id) || null : null)}
            className="text-white text-sm underline mt-3 hover:text-green-200"
          >
            Voir tous vos matchs ({userMatches.length})
          </button>
        )}
      </div>
    );
  };

  // Toast Container
  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg border-l-4 min-w-80 ${
            toast.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-800'
              : toast.type === 'warning'
              ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
              : 'bg-red-50 border-red-500 text-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.type === 'success' && <FaCheck className="h-5 w-5 text-green-500 mt-0.5" />}
            {toast.type === 'warning' && <FaExclamationTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />}
            {toast.type === 'error' && <FaTimes className="h-5 w-5 text-red-500 mt-0.5" />}
            <div className="flex-1">
              <div className="font-semibold text-sm">{toast.title}</div>
              <div className="text-sm mt-1">{toast.message}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          fetchTournaments(),
          fetchUserProfile()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    initializeData();
  }, [fetchTournaments, fetchUserProfile]);

  // Fetch user registrations after user profile is loaded
  useEffect(() => {
    if (userProfile) {
      fetchUserRegistrations();
    }
  }, [userProfile, fetchUserRegistrations]);

  // Fetch tournament details when selected tournament changes
  useEffect(() => {
    if (selectedTournament) {
      fetchTournamentDetails(selectedTournament.id);
    }
  }, [selectedTournament, fetchTournamentDetails]);

  // Check for tournaments that need match generation
  useEffect(() => {
    if (!initialLoad && tournaments.length > 0) {
      tournaments.forEach(tournament => {
        if (tournament.current_players === tournament.max_players && tournament.status === 'registration') {
          checkAndGenerateMatches(tournament);
        }
      });
    }
  }, [initialLoad, tournaments, checkAndGenerateMatches]);

  // Real-time subscriptions
  useEffect(() => {
    if (initialLoad) return;

    const tournamentChannel = supabase
      .channel('tournaments-real-time')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournaments'
        },
        async (payload) => {
          fetchTournaments();
          if (selectedTournament && payload.new && (payload.new as Tournament).id === selectedTournament.id) {
            setSelectedTournament(payload.new as Tournament);
            await fetchTournamentDetails(selectedTournament.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants'
        },
        (payload) => {
          if (selectedTournament) {
            fetchTournamentDetails(selectedTournament.id);
          }
          fetchUserRegistrations();
        }
      )
      .subscribe();

    return () => {
      tournamentChannel.unsubscribe();
    };
  }, [supabase, selectedTournament, fetchTournaments, fetchTournamentDetails, fetchUserRegistrations, initialLoad]);

  // Filter logic - UPDATED TO USE bet_amount INSTEAD OF prize_pool
  const uniqueRegions = useMemo(() => {
    return ['all', ...new Set(tournaments.map(t => t.region).filter(Boolean) as string[])];
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter(tournament => {
      let passes = true;
      switch (filter) {
        case 'upcoming': passes = tournament.status === 'upcoming' || tournament.status === 'registration'; break;
        case 'active': passes = tournament.status === 'active'; break;
        case 'completed': passes = tournament.status === 'completed'; break;
        default: passes = true; break;
      }

      const searchLower = searchTerm.toLowerCase();
      const nameMatch = tournament.name.toLowerCase().includes(searchLower);
      const descMatch = tournament.description?.toLowerCase().includes(searchLower) || false;
      if (searchTerm && !nameMatch && !descMatch) passes = false;

      if (selectedRegion !== 'all' && tournament.region !== selectedRegion) passes = false;
      // Updated to use bet_amount instead of prize_pool
      const prizeAmount = tournament.bet_amount || 0;
      if (prizeAmount < minAmount || prizeAmount > maxAmount) passes = false;
      if (startDate && new Date(tournament.start_date) < new Date(startDate)) passes = false;

      if (tournamentSize !== 'all') {
        let sizeRange: { min: number; max: number } | null = null;
        switch (tournamentSize) {
          case 'small': sizeRange = { min: 1, max: 8 }; break;
          case 'medium': sizeRange = { min: 9, max: 32 }; break;
          case 'large': sizeRange = { min: 33, max: Infinity }; break;
        }
        if (sizeRange && (tournament.max_players < sizeRange.min || tournament.max_players > sizeRange.max)) passes = false;
      }

      return passes;
    });
  }, [tournaments, filter, searchTerm, selectedRegion, minAmount, maxAmount, startDate, tournamentSize]);

  if (loading && initialLoad) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <div className="text-gray-600 mt-4">{translations.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-0 lg:px-0 py-8">
      <ToastContainer />
      
      {/* Header - UPDATED MESSAGING */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {translations.tournaments}
          </h1>
          <p className="text-gray-600 text-lg">
            Rejoignez des tournois gratuits et gagnez des prix!
          </p>
          {activeTournaments.size > 0 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-800 text-sm">
                ⚠️ Vous participez actuellement à {activeTournaments.size} tournoi(s). 
                Vous devez les terminer avant de pouvoir en rejoindre un nouveau.
              </p>
            </div>
          )}
        </div>
        <button
          onClick={createTournament}
          className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 sm:px-8 py-3 rounded-xl hover:from-emerald-600 hover:to-green-600 font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 w-full lg:w-auto"
        >
          <FaTrophy className="text-xl" />
          {translations.createTournament}
        </button>
      </div>

      <QuickPlaySection />

      <TournamentFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        minAmount={minAmount}
        setMinAmount={setMinAmount}
        maxAmount={maxAmount}
        setMaxAmount={setMaxAmount}
        startDate={startDate}
        setStartDate={setStartDate}
        tournamentSize={tournamentSize}
        setTournamentSize={setTournamentSize}
        uniqueRegions={uniqueRegions}
        onReset={() => {
          setSearchTerm('');
          setSelectedRegion('all');
          setMinAmount(0);
          setMaxAmount(1000);
          setStartDate('');
          setTournamentSize('all');
        }}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 sm:gap-8">
        {/* Tournament List */}
        <div className="order-1 xl:order-none">
          {/* Status Filter Tabs */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-md sm:shadow-lg border border-gray-200">
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-center xl:justify-start">
              {(['all', 'upcoming', 'active', 'completed'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-none min-w-[120px] sm:min-w-0 ${
                    filter === filterType
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md sm:shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                  }`}
                >
                  {filterType === 'upcoming' && <FaClock className="text-sm sm:text-base" />}
                  {filterType === 'active' && <FaFire className="text-sm sm:text-base" />}
                  {filterType === 'completed' && <FaTrophy className="text-sm sm:text-base" />}
                  {filterType === 'all' && <FaStar className="text-sm sm:text-base" />}
                  <span className="whitespace-nowrap text-xs sm:text-sm">
                    {filterType === 'upcoming' && 'À venir'}
                    {filterType === 'active' && 'En cours'}
                    {filterType === 'completed' && 'Terminés'}
                    {filterType === 'all' && 'Tous'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tournament Grid */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 sm:gap-6 w-full">
            {filteredTournaments.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center shadow-md sm:shadow-lg border border-gray-200">
                <FaTrophy className="text-4xl sm:text-6xl text-gray-300 mx-auto mb-4 sm:mb-6" />
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-600 mb-3 sm:mb-4">
                  {translations.noTournaments}
                </h3>
                <p className="text-gray-500 text-base sm:text-lg mb-4 sm:mb-6">
                  Aucun tournoi ne correspond aux critères sélectionnés.
                </p>
                <button
                  onClick={createTournament}
                  className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:from-emerald-600 hover:to-green-600 font-semibold text-base sm:text-lg shadow-md sm:shadow-lg"
                >
                  Créer le premier tournoi
                </button>
              </div>
            ) : (
              filteredTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  isUserRegistered={isUserRegistered(tournament.id)}
                  canJoinTournament={canJoinTournament(tournament)}
                  onJoin={joinTournament}
                  onLeave={leaveTournament}
                  onViewDetails={setSelectedTournament}
                  joining={joining}
                  hasActiveTournaments={activeTournaments.size > 0}
                />
              ))
            )}
          </div>
        </div>

        {/* Tournament Details Sidebar */}
        <div className="order-2 xl:order-none">
          <TournamentDetailsSidebar
            tournament={selectedTournament}
            participants={participants}
            matches={matches}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isUserRegistered={selectedTournament ? isUserRegistered(selectedTournament.id) : false}
            canJoinTournament={selectedTournament ? canJoinTournament(selectedTournament) : false}
            onJoin={joinTournament}
            onLeave={leaveTournament}
            onViewFullDetails={(tournament) => router.push(`/dashboard/tournaments/${tournament.id}`)}
            joining={joining}
            hasActiveTournaments={activeTournaments.size > 0}
            userMatches={userMatches}
          />
        </div>
      </div>
    </div>
  );
}