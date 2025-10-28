// components/MobileSportsFilters.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Search,
  ChevronUp,
  ChevronDown,
  X,
  SlidersHorizontal
} from 'lucide-react'
import { 
  FaFutbol, 
  FaBasketballBall, 
  FaFootballBall,
} from "react-icons/fa";
import { GiTennisRacket, GiHockey } from "react-icons/gi";

interface Sport {
  id: string
  name: string
  icon?: string
}

interface League {
  id: string
  name: string
}

interface MobileSportsFiltersProps {
  sports: Sport[]
  leagues: League[]
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedSport: string
  setSelectedSport: (sport: string) => void
  selectedLeague: string
  setSelectedLeague: (league: string) => void
  sortBy: string
  setSortBy: (sort: string) => void
  sortOptions: Array<{ value: string; label: string }>
}

export const sportIcons: { [key: string]: any } = {
  // Football (soccer)
  football: FaFutbol,
  soccer: FaFutbol,
  "football européen": FaFutbol,

  // Football américain
  "football américain": FaFootballBall,
  americanfootball: FaFootballBall,

  // Basket
  basketball: FaBasketballBall,
  basket: FaBasketballBall,

  // Tennis
  tennis: GiTennisRacket,

  // Hockey
  hockey: GiHockey,

  // Fallback
  default: FaFutbol
};

export default function MobileSportsFilters({
  sports,
  leagues,
  searchTerm,
  setSearchTerm,
  selectedSport,
  setSelectedSport,
  selectedLeague,
  setSelectedLeague,
  sortBy,
  setSortBy,
  sortOptions
}: MobileSportsFiltersProps) {
  const [showAllSports, setShowAllSports] = useState(false)
  const [showAllLeagues, setShowAllLeagues] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [activeFilterCount, setActiveFilterCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [leagueSearchTerm, setLeagueSearchTerm] = useState('')
  const [sportSearchTerm, setSportSearchTerm] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const allSports = [
    { id: 'all', name: 'All', icon: '🏆' },
    ...sports
  ]

  // Filter leagues based on search
  const filteredLeagues = leagueSearchTerm
    ? leagues.filter(league => 
        league.name.toLowerCase().includes(leagueSearchTerm.toLowerCase())
      )
    : leagues

  // Filter sports based on search (excluding 'all')
  const filteredSportsOnly = sportSearchTerm
    ? sports.filter(sport =>
        sport.name.toLowerCase().includes(sportSearchTerm.toLowerCase())
      )
    : sports

  const filteredAllSports = [
    { id: 'all', name: 'All', icon: '🏆' },
    ...filteredSportsOnly
  ]

  const visibleSports = showAllSports ? allSports : allSports.slice(0, 5)
  const visibleLeagues = showAllLeagues ? filteredLeagues : filteredLeagues.slice(0, 5)
  const visibleModalSports = sportSearchTerm ? filteredAllSports : filteredAllSports

  // Calculer le nombre de filtres actifs (memoized)
  useEffect(() => {
    let count = 0
    if (selectedSport !== 'all') count++
    if (selectedLeague !== 'all') count++
    if (searchTerm) count++
    if (sortBy !== 'volume') count++
    setActiveFilterCount(count)
  }, [selectedSport, selectedLeague, searchTerm, sortBy])

  // Smooth scroll behavior for sports chips
  useEffect(() => {
    if (scrollContainerRef.current && selectedSport) {
      const selectedElement = scrollContainerRef.current.querySelector(`[data-sport-id="${selectedSport}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'center'
        })
      }
    }
  }, [selectedSport])

  const getSportIcon = useCallback((sportName: string) => {
    const IconComponent = sportIcons[sportName.toLowerCase()] || sportIcons.default
    return <IconComponent className="h-4 w-4" />
  }, [])

  const clearAllFilters = useCallback(() => {
    setSelectedSport('all')
    setSelectedLeague('all')
    setSearchTerm('')
    setSortBy('volume')
  }, [setSelectedSport, setSelectedLeague, setSearchTerm, setSortBy])

  const openFilterModal = useCallback(() => {
    setShowFilterModal(true)
    setIsAnimating(true)
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
  }, [])

  const closeFilterModal = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => {
      setShowFilterModal(false)
      setLeagueSearchTerm('')
      setSportSearchTerm('')
      document.body.style.overflow = ''
    }, 200) // Match animation duration
  }, [])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFilterModal) {
        closeFilterModal()
      }
    }

    if (showFilterModal) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showFilterModal, closeFilterModal])

  return (
    <>
      {/* Barre de recherche mobile compacte */}
      <div className="bg-white border border-gray-200 rounded-md shadow-sm p-4 lg:hidden sticky top-0 z-0">
        <div className="flex items-center gap-3">
          {/* Champ de recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher un match..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>

          {/* Bouton filtre avec badge */}
          <button
            onClick={openFilterModal}
            className="relative p-3 bg-gray-50 rounded-xl hover:bg-gray-100 active:scale-95 transition-all duration-200"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
            {activeFilterCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-in zoom-in-50 duration-200">
                {activeFilterCount}
              </div>
            )}
          </button>
        </div>

        {/* Chips sports rapides avec scroll horizontal amélioré */}
        <div className="mt-3 -mx-4 px-4">
          <div 
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto pb-2"
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {visibleSports.map((sport) => (
              <button
                key={sport.id}
                data-sport-id={sport.id}
                onClick={() => setSelectedSport(sport.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 active:scale-95 ${
                  selectedSport === sport.id
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span className="text-xs">
                  {sport.id === 'all' ? '🏆' : getSportIcon(sport.name)}
                </span>
                <span>{sport.name}</span>
              </button>
            ))}
            
            {allSports.length > 5 && (
              <button 
                onClick={() => setShowAllSports(!showAllSports)}
                className="flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 transition-all duration-200 flex items-center gap-1 active:scale-95"
              >
                {showAllSports ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Plus
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal filtre mobile avec animations améliorées */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay avec fade in/out */}
          <div 
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
              isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeFilterModal}
          />
          
          {/* Panneau filtre avec slide up/down */}
          <div 
            ref={modalRef}
            className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col transition-transform duration-300 ease-out ${
              isAnimating ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            {/* Header modal */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">Filtres</h3>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-blue-500 font-medium hover:text-blue-600 active:text-blue-700 transition-colors"
                  >
                    Tout effacer
                  </button>
                )}
                <button
                  onClick={closeFilterModal}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Contenu filtre avec overflow scroll */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-4 space-y-6">
                {/* Filtre ligue */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Ligue
                  </label>
                  
                  {/* Search input for leagues */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher une ligue..."
                      value={leagueSearchTerm}
                      onChange={(e) => setLeagueSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                    />
                    {leagueSearchTerm && (
                      <button
                        onClick={() => setLeagueSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                        aria-label="Clear league search"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedLeague('all')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-95 ${
                        selectedLeague === 'all'
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`}
                    >
                      Toutes les ligues
                    </button>
                    {visibleLeagues.length > 0 ? (
                      <>
                        {visibleLeagues.map(league => (
                          <button
                            key={league.id}
                            onClick={() => setSelectedLeague(league.id)}
                            className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-95 ${
                              selectedLeague === league.id
                                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                            }`}
                          >
                            {league.name}
                          </button>
                        ))}
                        {!leagueSearchTerm && filteredLeagues.length > 5 && (
                          <button
                            onClick={() => setShowAllLeagues(!showAllLeagues)}
                            className="col-span-2 p-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
                          >
                            {showAllLeagues ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Voir moins
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Voir plus ({filteredLeagues.length - 5} autres)
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="col-span-2 p-6 text-center text-gray-500 text-sm">
                        Aucune ligue trouvée
                      </div>
                    )}
                  </div>
                </div>

                {/* Filtre tri */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Trier par
                  </label>
                  <div className="space-y-2">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSortBy(option.value)}
                        className={`w-full p-3 rounded-xl border text-left text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                          sortBy === option.value
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sports détaillés */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Sports
                  </label>
                  
                  {/* Search input for sports */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Rechercher un sport..."
                      value={sportSearchTerm}
                      onChange={(e) => setSportSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                    />
                    {sportSearchTerm && (
                      <button
                        onClick={() => setSportSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                        aria-label="Clear sport search"
                      >
                        <X className="h-3 w-3 text-gray-400" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {visibleModalSports.length > 0 ? (
                      visibleModalSports.map(sport => (
                        <button
                          key={sport.id}
                          onClick={() => setSelectedSport(sport.id)}
                          className={`p-3 rounded-xl border text-sm font-medium transition-all duration-200 flex flex-col items-center gap-2 active:scale-95 ${
                            selectedSport === sport.id
                              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                          }`}
                        >
                          <span className="text-lg">
                            {sport.id === 'all' ? '🏆' : getSportIcon(sport.name)}
                          </span>
                          <span className="text-xs leading-tight text-center">{sport.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-3 p-6 text-center text-gray-500 text-sm">
                        Aucun sport trouvé
                      </div>
                    )}
                  </div>
                </div>

                {/* Espace supplémentaire pour le scroll */}
                <div className="h-4" />
              </div>
            </div>

            {/* Bouton appliquer - sticky au bottom */}
            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
              <button
                onClick={closeFilterModal}
                className="w-full bg-blue-500 text-white py-4 rounded-xl font-semibold text-sm hover:bg-blue-600 active:bg-blue-700 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-200"
              >
                Show all results
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version desktop (cachée sur mobile) */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search sports markets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:border-gray-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* League Filter */}
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:border-gray-300"
          >
            <option value="all">All Leagues</option>
            {leagues.map(league => (
              <option key={league.id} value={league.id}>{league.name}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer hover:border-gray-300"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Sport Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {visibleSports.map(sport => (
            <button
              key={sport.id}
              onClick={() => setSelectedSport(sport.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 hover:scale-105 active:scale-95 ${
                selectedSport === sport.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
              }`}
            >
              <span>{sport.id === 'all' ? '🏆' : getSportIcon(sport.name)}</span>
              {sport.name}
            </button>
          ))}
          {allSports.length > 10 && (
            <button 
              onClick={() => setShowAllSports(!showAllSports)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-transparent transition-all duration-200 flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              {showAllSports ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  More +
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  )
}