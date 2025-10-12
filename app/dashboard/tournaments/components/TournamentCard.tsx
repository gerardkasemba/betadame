import { Tournament } from './types';
import { getStatusColor, getTypeColor, translations } from './types';
import { getStatusIcon } from './utils'
import { FaCrown, FaCoins, FaUsers, FaCalendar, FaMapMarkerAlt, FaUserCheck, FaUserPlus, FaEye } from 'react-icons/fa';

interface TournamentCardProps {
  tournament: Tournament;
  isUserRegistered: boolean;
  canJoinTournament: boolean;
  onJoin: (tournament: Tournament) => void;
  onLeave: (tournament: Tournament) => void;
  onViewDetails: (tournament: Tournament) => void;
  joining: boolean;
   hasActiveTournaments: boolean; // Add this new prop
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  isUserRegistered,
  canJoinTournament,
  onJoin,
  onLeave,
  onViewDetails,
  joining
}) => {
  return (
    <div className="w-full bg-gradient-to-br from-white to-gray-50 rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-200 hover:border-emerald-300 group -mx-4 sm:-mx-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 gap-3 sm:gap-0">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors flex-1 min-w-0">
              {tournament.name}
            </h3>
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-white flex-shrink-0">
              <FaCrown className="inline mr-1 text-xs" />
              Premium
            </span>
          </div>
          <p className="text-gray-600 text-sm line-clamp-2">
            {tournament.description || 'Tournoi premium avec mise organisateur'}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 sm:gap-2 self-start">
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tournament.status)}`}>
            {getStatusIcon(tournament.status)} {tournament.status}
          </span>
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(tournament.type)}`}>
            {tournament.type}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
        <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg sm:rounded-xl border border-amber-200">
          <FaCoins className="text-amber-600 text-base sm:text-lg mx-auto mb-1" />
          <div className="font-bold text-amber-700 text-sm sm:text-base">{tournament.bet_amount} €</div>
          <div className="text-xs text-amber-600">Mise</div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl border border-blue-200">
          <FaUsers className="text-blue-600 text-base sm:text-lg mx-auto mb-1" />
          <div className="font-bold text-blue-700 text-sm sm:text-base">{tournament.current_players}/{tournament.max_players}</div>
          <div className="text-xs text-blue-600">Joueurs</div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg sm:rounded-xl border border-emerald-200">
          <FaCalendar className="text-emerald-600 text-base sm:text-lg mx-auto mb-1" />
          <div className="font-bold text-emerald-700 text-xs sm:text-sm">
            {new Date(tournament.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </div>
          <div className="text-xs text-emerald-600">Début</div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl border border-purple-200">
          <FaMapMarkerAlt className="text-purple-600 text-base sm:text-lg mx-auto mb-1" />
          <div className="font-bold text-purple-700 text-xs sm:text-sm truncate">{tournament.region || 'Global'}</div>
          <div className="text-xs text-purple-600">Région</div>
        </div>
      </div>

      {/* Free Entry Badge */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center mb-3 sm:mb-4 flex-wrap gap-1">
        <FaUserCheck className="mr-1 sm:mr-2 text-xs sm:text-sm flex-shrink-0" />
        <span>{translations.freeEntry} • {translations.competeForPrize}</span>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-3 sm:pt-4 border-t border-gray-200 gap-3 sm:gap-0">
        <div className="flex items-center text-xs sm:text-sm text-gray-500">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 sm:mr-2 flex-shrink-0">
            {tournament.creator_profile?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="truncate">Par {tournament.creator_profile?.username || 'Organisateur'}</span>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {canJoinTournament && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoin(tournament);
              }}
              disabled={joining}
              className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md sm:shadow-lg hover:shadow-xl flex items-center"
            >
              <FaUserPlus className="inline mr-1 text-xs sm:text-sm" />
              Rejoindre
            </button>
          )}
          {isUserRegistered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLeave(tournament);
              }}
              disabled={joining}
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:from-red-600 hover:to-pink-600 disabled:opacity-50 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md sm:shadow-lg flex items-center"
            >
              Quitter
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(tournament);
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 font-semibold text-xs sm:text-sm transition-all duration-200 shadow-md sm:shadow-lg flex items-center"
          >
            <FaEye className="inline mr-1 text-xs sm:text-sm" />
            Voir Détails
          </button>
        </div>
      </div>
    </div>
  );
};