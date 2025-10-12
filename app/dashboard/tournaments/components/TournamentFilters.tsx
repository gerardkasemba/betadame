// import { translations } from './types';
import { FaFilter, FaSearch } from 'react-icons/fa';

interface TournamentFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  minAmount: number;
  setMinAmount: (amount: number) => void;
  maxAmount: number;
  setMaxAmount: (amount: number) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  tournamentSize: string;
  setTournamentSize: (size: string) => void;
  uniqueRegions: string[];
  onReset: () => void;
}

// In your types.ts or wherever translations is defined
const translations = {
  // ... existing properties
  tournaments: "Tournois",
  createTournament: "Créer un tournoi",
  tournamentDetails: "Détails du tournoi",
  freeEntry: "Entrée libre",
  competeForPrize: "Participez pour gagner",
  prizePool: "Cagnotte",
  maxPlayers: "Joueurs max",
  currentPlayers: "Joueurs actuels",
  startDate: "Date de début",
  // ... other existing properties
  
  // Add the missing size properties
  allSizes: "Toutes tailles",
  small: "Petit",
  medium: "Moyen", 
  large: "Grand",
  allRegions: "Toutes régions",
  filter: "Filtres",
  search: "Rechercher...",
  loading: "Chargement..."
} as const;

export const TournamentFilters: React.FC<TournamentFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedRegion,
  setSelectedRegion,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  startDate,
  setStartDate,
  tournamentSize,
  setTournamentSize,
  uniqueRegions,
  onReset
}) => {
  const sizeOptions = [
    { value: 'all', label: translations.allSizes },
    { value: 'small', label: translations.small },
    { value: 'medium', label: translations.medium },
    { value: 'large', label: translations.large }
  ];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-md sm:shadow-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FaFilter className="text-emerald-500" />
          {translations.filter}
        </h3>
        <button
          onClick={onReset}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          Réinitialiser
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Search Input */}
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder={translations.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Region Select */}
        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        >
          {uniqueRegions.map(region => (
            <option key={region} value={region}>
              {region === 'all' ? translations.allRegions : region}
            </option>
          ))}
        </select>

        {/* Amount Range */}
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min €"
            value={minAmount}
            onChange={(e) => setMinAmount(Number(e.target.value) || 0)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
          <input
            type="number"
            placeholder="Max €"
            value={maxAmount}
            onChange={(e) => setMaxAmount(Number(e.target.value) || 1000)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Start Date */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        />

        {/* Size Select */}
        <select
          value={tournamentSize}
          onChange={(e) => setTournamentSize(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        >
          {sizeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};