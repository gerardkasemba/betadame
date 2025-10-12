import { 
  FaTrophy, 
  FaUsers, 
  FaTree, 
  FaTable, 
  FaInfoCircle, 
  FaCrown,
  FaUserCheck,
  FaEye,
  FaClock,
  FaPlay,
  FaExclamationTriangle,
  FaGift,
  FaDollarSign
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { getStatusColor, getTypeColor, translations } from './types';
import { getStatusIcon } from './utils'

import { Tournament, TournamentParticipant, TournamentMatch, ActiveTab, UserMatch } from './types';

interface TournamentDetailsSidebarProps {
  tournament: Tournament | null;
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isUserRegistered: boolean;
  canJoinTournament: boolean;
  onJoin: (tournament: Tournament) => void;
  onLeave: (tournament: Tournament) => void;
  onViewFullDetails: (tournament: Tournament) => void;
  joining: boolean;
  hasActiveTournaments: boolean;
  userMatches?: UserMatch[];
}

export const TournamentDetailsSidebar: React.FC<TournamentDetailsSidebarProps> = ({
  tournament,
  participants,
  matches,
  activeTab,
  setActiveTab,
  isUserRegistered,
  canJoinTournament,
  onJoin,
  onLeave,
  onViewFullDetails,
  joining,
  hasActiveTournaments,
  userMatches = []
}) => {
  const router = useRouter();

  // Function to get user's current matches
  const getUserMatches = () => {
    if (userMatches && userMatches.length > 0) {
      return userMatches;
    }
    
    if (!tournament || matches.length === 0) return [];
    
    return matches
      .filter(match => 
        match.tournament_id === tournament.id && 
        match.status === 'scheduled'
      )
      .map(match => ({
        match,
        isPlayerTurn: true,
        gameRoomUrl: match.game_room_id ? `/dashboard/game/p/${match.game_room_id}` : `/game/new?match=${match.id}`
      }));
  };

  const calculateStandings = () => {
    const standings = participants.map(participant => {
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

    return standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });
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

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programmé';
      case 'active': return 'En cours';
      case 'completed': return 'Terminé';
      default: return status;
    }
  };

  const getParticipantStatusText = (status: string) => {
    switch (status) {
      case 'registered': return 'Inscrit';
      case 'active': return 'Actif';
      case 'eliminated': return 'Éliminé';
      case 'winner': return 'Vainqueur';
      default: return status;
    }
  };

  const currentUserMatches = getUserMatches();
  const standings = calculateStandings();

  // Get prize pool - using bet_amount field
  const getPrizePool = () => {
    if (!tournament) return 0;
    return tournament.bet_amount || 0;
  };

  if (!tournament) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center shadow-lg sm:shadow-xl border border-gray-200">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <FaTrophy className="text-white text-xl sm:text-2xl" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
          {translations.tournamentDetails}
        </h3>
        <p className="text-gray-500 text-sm">
          Sélectionnez un tournoi pour voir les détails en temps réel
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg sm:shadow-xl border border-gray-200 xl:sticky xl:top-6 xl:max-h-screen xl:overflow-y-auto">
      {/* Tournament Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <FaTrophy className="text-white text-lg sm:text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-2">
              {tournament.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">Tournoi Gratuit</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tournament.status)}`}>
            {getStatusIcon(tournament.status)} {tournament.status === 'registration' ? 'Inscriptions' : 
             tournament.status === 'active' ? 'En cours' : 
             tournament.status === 'completed' ? 'Terminé' : tournament.status}
          </span>
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(tournament.type)}`}>
            {tournament.type === 'public' ? 'Public' : 'Privé'}
          </span>
        </div>
        
        {/* Free entry notice */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center text-emerald-800 mb-1.5 sm:mb-2 text-sm">
            <FaGift className="text-emerald-600 mr-2 flex-shrink-0 text-base" />
            <span className="font-semibold">Participation Gratuite</span>
          </div>
          <p className="text-emerald-700 text-xs sm:text-sm">
            Jouez gratuitement et tentez de remporter le prix!
          </p>
        </div>

        {/* Prize Pool Information */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-yellow-800 text-sm">
              <FaTrophy className="text-yellow-600 mr-2 flex-shrink-0 text-base" />
              <span className="font-semibold">Prix à gagner:</span>
            </div>
            <span className="font-bold text-yellow-900">{getPrizePool()}€</span>
          </div>
          <p className="text-yellow-700 text-xs mt-2">
            Le gagnant remporte la totalité du prix!
          </p>
        </div>

        {/* Active Tournaments Warning */}
        {hasActiveTournaments && tournament.status === 'registration' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 text-xs font-semibold mb-1">
                  Tournoi en cours détecté
                </p>
                <p className="text-amber-700 text-xs">
                  Vous ne pouvez participer qu'à un seul tournoi à la fois.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tournament full warning */}
        {tournament.current_players >= tournament.max_players && tournament.status === 'registration' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="flex items-start">
              <FaInfoCircle className="text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-800 text-xs font-semibold mb-1">
                  Tournoi complet
                </p>
                <p className="text-blue-700 text-xs">
                  Ce tournoi a atteint le nombre maximum de participants.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-nowrap overflow-x-auto scrollbar-hide sm:space-x-1 mb-4 sm:mb-6 bg-gray-100 rounded-lg sm:rounded-xl p-1 sm:p-1 -mx-1 sm:-mx-0">
        {(['details', 'participants', 'bracket', 'standings', 'my_matches'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md sm:rounded-lg transition-all duration-200 whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'details' && <FaInfoCircle className="inline mr-1 text-xs sm:text-sm" />}
            {tab === 'participants' && <FaUsers className="inline mr-1 text-xs sm:text-sm" />}
            {tab === 'bracket' && <FaTree className="inline mr-1 text-xs sm:text-sm" />}
            {tab === 'standings' && <FaTable className="inline mr-1 text-xs sm:text-sm" />}
            {tab === 'my_matches' && <FaPlay className="inline mr-1 text-xs sm:text-sm" />}
            <span className="hidden sm:inline">
              {tab === 'details' && 'Détails'}
              {tab === 'participants' && 'Joueurs'}
              {tab === 'bracket' && 'Arbre'}
              {tab === 'standings' && 'Classement'}
              {tab === 'my_matches' && 'Mes Matchs'}
            </span>
            <span className="sm:hidden">
              {tab === 'details' && 'D'}
              {tab === 'participants' && 'J'}
              {tab === 'bracket' && 'A'}
              {tab === 'standings' && 'C'}
              {tab === 'my_matches' && 'M'}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="max-h-72 sm:max-h-96 lg:max-h-[calc(100vh-12rem)] overflow-y-auto space-y-3 sm:space-y-4">
        {activeTab === 'details' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Prize Pool */}
            <div className="bg-gradient-to-br from-yellow-500 to-amber-500 p-3 sm:p-4 rounded-lg sm:rounded-xl text-center text-white shadow-md sm:shadow-lg">
              <div className="text-xl sm:text-2xl font-bold mb-1 flex items-center justify-center">
                <FaTrophy className="mr-2 text-amber-200" />
                {getPrizePool()} €
              </div>
              <div className="text-amber-100 text-xs sm:text-sm">
                PRIX À GAGNER
              </div>
              <div className="text-amber-200 text-xs mt-1">
                Participation 100% gratuite
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 sm:p-3 rounded-lg text-center border border-blue-200">
                <div className="font-bold text-blue-900 text-sm sm:text-base">{tournament.max_players}</div>
                <div className="text-xs text-blue-700">Places max</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-2 sm:p-3 rounded-lg text-center border border-green-200">
                <div className="font-bold text-green-900 text-sm sm:text-base">{tournament.current_players}</div>
                <div className="text-xs text-green-700">Inscrits</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 sm:p-3 rounded-lg text-center border border-purple-200">
                <div className="font-bold text-purple-900 text-xs sm:text-sm">
                  {new Date(tournament.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
                <div className="text-xs text-purple-700">Début</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-2 sm:p-3 rounded-lg text-center border border-red-200">
                <div className="font-bold text-red-900 text-xs sm:text-sm">
                  {new Date(tournament.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
                <div className="text-xs text-red-700">Fin</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progression des inscriptions:</span>
                <span>{tournament.current_players}/{tournament.max_players}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(tournament.current_players / tournament.max_players) * 100}%` }}
                ></div>
              </div>
              {tournament.current_players === tournament.max_players && (
                <p className="text-green-600 text-xs text-center mt-2 font-semibold">
                  🎉 Tournoi complet! Démarrage imminent...
                </p>
              )}
            </div>

            {/* Additional Info */}
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-gray-700">Région</div>
                  <div className="text-gray-600">{tournament.region || 'Global'}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700">Créateur</div>
                  <div className="text-gray-600">{tournament.creator_profile?.username || 'Organisateur'}</div>
                </div>
              </div>
              {tournament.description && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="font-semibold text-gray-700 text-sm mb-1">Description</div>
                  <div className="text-gray-600 text-xs line-clamp-3">{tournament.description}</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canJoinTournament && !hasActiveTournaments && (
              <button
                onClick={() => onJoin(tournament)}
                disabled={joining}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 font-semibold text-sm sm:text-base shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
              >
                {joining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    🎯 Rejoindre GRATUITEMENT
                  </>
                )}
              </button>
            )}

            {isUserRegistered && tournament.status === 'registration' && (
              <button
                onClick={() => onLeave(tournament)}
                disabled={joining}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:from-red-600 hover:to-pink-600 disabled:opacity-50 font-semibold text-sm sm:text-base shadow-md sm:shadow-lg transition-all duration-200 flex items-center justify-center"
              >
                {joining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    Se désinscrire
                  </>
                )}
              </button>
            )}

            {isUserRegistered && tournament.status === 'active' && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-blue-800 text-sm font-semibold">✅ Vous êtes inscrit</p>
                <p className="text-blue-700 text-xs mt-1">Attendez vos matchs ou consultez l'onglet "Mes Matchs"</p>
              </div>
            )}

            {/* View Full Details Button */}
            <button
              onClick={() => onViewFullDetails(tournament)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:from-blue-600 hover:to-purple-600 font-semibold text-sm sm:text-base shadow-md sm:shadow-lg transition-all duration-200 flex items-center justify-center"
            >
              <FaEye className="mr-2 text-sm sm:text-base" />
              Voir tous les détails
            </button>
          </div>
        )}

        {activeTab === 'my_matches' && (
          <div className="space-y-3 sm:space-y-4">
            {currentUserMatches.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <FaPlay className="text-3xl sm:text-4xl text-gray-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-gray-500 text-sm sm:text-base">
                  {tournament.status === 'active' 
                    ? 'Aucun match programmé pour le moment' 
                    : tournament.status === 'registration'
                    ? 'Le tournoi n\'a pas encore commencé'
                    : 'Aucun match en cours'
                  }
                </p>
                {tournament.status === 'registration' && (
                  <p className="text-blue-600 text-xs mt-2">
                    Le tournoi débutera lorsque {tournament.max_players} joueurs seront inscrits
                    ({tournament.current_players}/{tournament.max_players})
                  </p>
                )}
              </div>
            ) : (
              currentUserMatches.map(({ match, isPlayerTurn, gameRoomUrl }) => (
                <div
                  key={match.id}
                  className="p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-semibold text-gray-700">
                      {getRoundName(match.round_type, match.round_number)}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getMatchStatusColor(match.status)}`}>
                      {getMatchStatusText(match.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-center flex-1">
                      <div className={`font-medium text-sm truncate ${
                        match.player1_id === userMatches[0]?.match.player1_id ? 'text-blue-600 font-semibold' : ''
                      }`}>
                        {match.player1_profile?.username || 'TBD'}
                      </div>
                      {match.winner_id === match.player1_id && (
                        <FaCrown className="text-amber-500 mx-auto mt-1 text-xs" />
                      )}
                    </div>
                    
                    <div className="px-2">
                      <div className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-bold">
                        VS
                      </div>
                    </div>
                    
                    <div className="text-center flex-1">
                      <div className={`font-medium text-sm truncate ${
                        match.player2_id === userMatches[0]?.match.player2_id ? 'text-blue-600 font-semibold' : ''
                      }`}>
                        {match.player2_profile?.username || 'TBD'}
                      </div>
                      {match.winner_id === match.player2_id && (
                        <FaCrown className="text-amber-500 mx-auto mt-1 text-xs" />
                      )}
                    </div>
                  </div>

                  {match.scheduled_time && (
                    <div className="text-xs text-gray-500 text-center mb-3 flex items-center justify-center">
                      <FaClock className="inline mr-1" />
                      {new Date(match.scheduled_time).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}

                  {isPlayerTurn && gameRoomUrl && (
                    <button
                      onClick={() => router.push(gameRoomUrl)}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-lg font-semibold text-sm shadow-md hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center justify-center"
                    >
                      <FaPlay className="mr-2 text-xs" />
                      Jouer Gratuitement
                    </button>
                  )}

                  {match.status === 'completed' && (
                    <div className="text-center text-xs text-gray-500 mt-2">
                      {match.winner_id ? 'Match terminé' : 'Match terminé - Résultat en attente'}
                    </div>
                  )}

                  {!isPlayerTurn && match.status === 'scheduled' && (
                    <div className="text-center text-xs text-blue-600 mt-2">
                      En attente de l'adversaire...
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-2 sm:space-y-3">
            {participants.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <FaUsers className="text-3xl sm:text-4xl text-gray-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-gray-500 text-sm sm:text-base">{translations.noParticipants}</p>
              </div>
            ) : (
              participants.slice(0, 5).map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                        {participant.profile?.username || `Joueur ${participant.user_id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {participant.profile?.region || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium ${
                    participant.status === 'winner' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white' :
                    participant.status === 'eliminated' ? 'bg-gradient-to-r from-red-400 to-red-500 text-white' :
                    participant.status === 'active' ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white' :
                    'bg-gradient-to-r from-blue-400 to-blue-500 text-white'
                  }`}>
                    {getParticipantStatusText(participant.status)}
                  </span>
                </div>
              ))
            )}
            {participants.length > 5 && (
              <button
                onClick={() => onViewFullDetails(tournament)}
                className="w-full text-center text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Voir les {participants.length - 5} autres participants →
              </button>
            )}
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="space-y-2 sm:space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <FaTree className="text-3xl sm:text-4xl text-gray-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-gray-500 text-sm sm:text-base">{translations.noMatches}</p>
              </div>
            ) : (
              matches.slice(0, 3).map((match) => (
                <div
                  key={match.id}
                  className="p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                    <div className="text-xs font-semibold text-gray-700 truncate flex-1 mr-2">
                      {getRoundName(match.round_type, match.round_number)}
                    </div>
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium ${getMatchStatusColor(match.status)} flex-shrink-0`}>
                      {getMatchStatusText(match.status)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="text-center flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {match.player1_profile?.username || 'TBD'}
                      </div>
                      {match.winner_id === match.player1_id && (
                        <FaCrown className="text-amber-500 mx-auto mt-1 text-xs" />
                      )}
                    </div>
                    
                    <div className="px-1 sm:px-2 flex-shrink-0">
                      <div className="bg-gray-200 text-gray-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold">
                        VS
                      </div>
                    </div>
                    
                    <div className="text-center flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {match.player2_profile?.username || 'TBD'}
                      </div>
                      {match.winner_id === match.player2_id && (
                        <FaCrown className="text-amber-500 mx-auto mt-1 text-xs" />
                      )}
                    </div>
                  </div>

                  {match.scheduled_time && (
                    <div className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center">
                      <FaClock className="inline mr-1" />
                      {new Date(match.scheduled_time).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
            {matches.length > 3 && (
              <button
                onClick={() => onViewFullDetails(tournament)}
                className="w-full text-center text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Voir tous les {matches.length} matchs →
              </button>
            )}
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-2 sm:space-y-3">
            {standings.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <FaTable className="text-3xl sm:text-4xl text-gray-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-gray-500 text-sm sm:text-base">Classement non disponible</p>
                <p className="text-gray-400 text-xs mt-1">
                  Le classement sera disponible après le début du tournoi
                </p>
              </div>
            ) : (
              standings.slice(0, 5).map((standing, index) => (
                <div
                  key={standing.participant.id}
                  className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      index === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' :
                      index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                      index === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-900' :
                      'bg-gradient-to-br from-blue-500 to-purple-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 text-xs sm:text-sm truncate">
                        {standing.participant.profile?.username || `Joueur ${standing.participant.user_id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {standing.matchesPlayed} matchs
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-900 text-xs sm:text-sm">
                      {standing.points} pts
                    </div>
                    <div className="text-xs text-gray-500">
                      {standing.wins}V - {standing.losses}D
                    </div>
                  </div>
                </div>
              ))
            )}
            {standings.length > 5 && (
              <button
                onClick={() => onViewFullDetails(tournament)}
                className="w-full text-center text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Voir le classement complet →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};