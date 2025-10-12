export type ActiveTab = 'details' | 'participants' | 'bracket' | 'standings' | 'my_matches';
export type SetActiveTab = (tab: ActiveTab) => void;

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'regional';
  region?: string;
  bet_amount: number;
  max_players: number;
  current_players: number;
  status: 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  creator_profile?: {
    username: string;
    avatar_url?: string;
  };
}

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  status: 'registered' | 'active' | 'eliminated' | 'winner';
  seed?: number;
  group_number?: number;
  created_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
    region?: string;
  };
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round_type: 'group' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final';
  round_number: number;
  match_number: number;
  player1_id?: string;
  player2_id?: string;
  winner_id?: string;
  status: 'scheduled' | 'active' | 'completed';
  game_room_id?: string;
  scheduled_time?: string;
  created_at: string;
  player1_profile?: {
    username: string;
    avatar_url?: string;
  };
  player2_profile?: {
    username: string;
    avatar_url?: string;
  };
  winner_profile?: {
    username: string;
    avatar_url?: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  region: string;
  phone_number: string;
  balance: number;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  games_played: number;
  tournaments_created: number;
  tournaments_won: number;
}

export interface RegistrationRecord {
  tournament_id: string;
  status: string;
}

// In your types file, add these interfaces
export interface UserMatch {
  match: TournamentMatch;
  isPlayerTurn: boolean;
  gameRoomUrl?: string;
}

export const translations = {
  tournaments: 'Tournois',
  createTournament: 'Créer un Tournoi',
  tournamentDetails: 'Détails du Tournoi',
  freeEntry: 'Entrée Gratuite',
  competeForPrize: 'Affrontez vos adversaires et gagnez le prix!',
  prizePool: 'Cagnotte',
  maxPlayers: 'Max Joueurs',
  currentPlayers: 'Joueurs Actuels',
  startDate: 'Début',
  endDate: 'Fin',
  region: 'Région',
  creator: 'Créateur',
  noParticipants: 'Aucun participant pour le moment',
  noMatches: 'Aucun match programmé',
  noTournaments: 'Aucun tournoi trouvé',
  loading: 'Chargement...',
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'registration': return 'bg-blue-100 text-blue-800';
    case 'active': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-yellow-100 text-yellow-800';
  }
};

export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'public': return 'bg-green-100 text-green-800';
    case 'private': return 'bg-purple-100 text-purple-800';
    case 'regional': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};