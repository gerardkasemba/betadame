// app/dashboard/components/recent-games.tsx
'use client'

import Link from 'next/link'
import { Gamepad2, Trophy, Clock, Users, DollarSign, RotateCcw, Crown } from 'lucide-react'
import { TbPlayCardStar } from "react-icons/tb";
import { PiCheckerboardFill } from "react-icons/pi";
import { fr } from '@/lib/i18n'

interface Game {
  id: string
  name: string
  bet_amount: number
  status: string
  created_at: string
  winner_id: string | null
  current_players?: number
  max_players?: number
  game_type?: string
  profiles?: {
    username: string
  }
}

interface RecentGamesProps {
  games: Game[]
}

export default function RecentGames({ games }: RecentGamesProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finished':
        return 'bg-green-100 text-green-800'
      case 'playing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'finished':
        return <Trophy className="h-4 w-4" />
      case 'playing':
        return <Clock className="h-4 w-4" />
      default:
        return <Gamepad2 className="h-4 w-4" />
    }
  }

  const getGameTypeIcon = (gameType?: string) => {
    console.log('Game type:', gameType);
    switch (gameType) {
      case 'checkers_ranked':
      case 'checkers':
        return <PiCheckerboardFill className="h-3 w-3" />
      case 'inter_demande':
        return <TbPlayCardStar className="h-3 w-3" />
      default:
        return <PiCheckerboardFill className="h-3 w-3" />
    }
  }

  const getGameTypeText = (gameType?: string) => {
    console.log('Game type for text:', gameType);
    switch (gameType) {
      case 'checkers_ranked':
        return 'Classées'
      case 'checkers':
        return 'Rapides'
      case 'inter_demande':
        return 'Inter'
      default:
        return 'Rapides'
    }
  }

  const detectGameTypeFromName = (gameName: string, gameType?: string): string => {
    if (gameType) return gameType;
    
    const name = gameName.toLowerCase();
    if (name.includes('inter') || name.includes('carte') || name.includes('card')) {
      return 'inter_demande';
    }
    return 'checkers';
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  const handleRejoinGame = (gameId: string, gameType?: string, gameName?: string) => {
    const detectedGameType = detectGameTypeFromName(gameName || '', gameType);
    console.log('Rejoining game:', { gameId, gameType, detectedGameType, gameName });
    
    const gamePath = detectedGameType === 'inter_demande' 
      ? `/dashboard/game/inter/${gameId}`
      : `/dashboard/game/p/${gameId}`
    
    console.log('Redirecting to:', gamePath);
    window.location.href = gamePath
  }

  console.log('Recent games received:', games);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-lg font-semibold text-gray-900 font-heading">
          {fr.dashboard.recentGames}
        </h3>
        <Link
          href="/dashboard/game"
          className="text-sm text-primary hover:text-blue-700 font-medium whitespace-nowrap"
        >
          Voir tout
        </Link>
      </div>

      <div className="space-y-3">
        {games.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <Gamepad2 className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">Aucune partie jouée pour le moment</p>
            <Link
              href="/dashboard/game"
              className="inline-block mt-2 text-primary hover:text-blue-700 font-medium text-sm sm:text-base"
            >
              Commencez votre première partie !
            </Link>
          </div>
        ) : (
          games.map((game) => {
            const detectedGameType = detectGameTypeFromName(game.name, game.game_type);
            const gameTypeText = getGameTypeText(detectedGameType);
            const gameTypeIcon = getGameTypeIcon(detectedGameType);
            
            return (
              <div 
                key={game.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-3 sm:gap-4"
              >
                {/* Left Section - Game Info */}
                <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className={`p-2 rounded-full ${getStatusColor(game.status)} flex-shrink-0`}>
                    {getStatusIcon(game.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Game Name and Type - Stack on mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                        {game.name}
                      </p>
                      <span className="flex items-center space-x-1 px-2 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-300 w-fit">
                        {gameTypeIcon}
                        <span className="hidden xs:inline">{gameTypeText}</span>
                      </span>
                    </div>
                    
                    {/* Game Details - Horizontal on desktop, vertical on mobile */}
                    <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 text-xs text-gray-600">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3 flex-shrink-0" />
                        <span>{game.bet_amount}$</span>
                      </span>
                      
                      {game.current_players && game.max_players && (
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3 flex-shrink-0" />
                          <span>{game.current_players}/{game.max_players}</span>
                        </span>
                      )}
                      
                      <span className="text-xs">{formatDate(game.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Section - Status and Actions */}
                <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-end sm:items-end gap-2 sm:gap-2 w-full sm:w-auto">
                  {/* Status Badge */}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(game.status)} whitespace-nowrap`}>
                    {game.status === 'finished' ? 'Terminé' : 
                     game.status === 'playing' ? 'En cours' : 'En attente'}
                  </span>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Re-join button for active games */}
                    {(game.status === 'playing' || game.status === 'waiting') && (
                      <button
                        onClick={() => handleRejoinGame(game.id, game.game_type, game.name)}
                        className="inline-flex items-center px-2.5 sm:px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        <RotateCcw className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="hidden xs:inline">Rejoindre</span>
                        <span className="xs:hidden">Rejoindre</span>
                      </button>
                    )}
                    
                    {/* Winner info - only show on desktop for finished games */}
                    {game.winner_id && game.profiles && (
                      <div className="hidden sm:block">
                        <p className="text-xs text-gray-600 truncate max-w-[120px]">
                          Gagnant: {game.profiles.username}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Winner info for mobile - show below actions */}
                  {game.winner_id && game.profiles && (
                    <div className="sm:hidden w-full text-center">
                      <p className="text-xs text-gray-600 truncate">
                        Gagnant: {game.profiles.username}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Mobile-specific enhancements */}
      <style jsx>{`
        @media (max-width: 640px) {
          /* Ensure text doesn't overflow on very small screens */
          .recent-games-item {
            min-height: 100px;
          }
        }
        
        @media (max-width: 475px) {
          /* Stack everything vertically on very small screens */
          .recent-games-item {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  )
}