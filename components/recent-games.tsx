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
    console.log('Game type:', gameType); // Debug log
    switch (gameType) {
      case 'checkers_ranked':
      case 'checkers':
        return <PiCheckerboardFill className="h-3 w-3" />
      case 'inter_demande':
        return <TbPlayCardStar className="h-3 w-3" />
      default:
        // If game_type is undefined or unknown, check the game name
        return <PiCheckerboardFill className="h-3 w-3" />
    }
  }

  const getGameTypeText = (gameType?: string) => {
    console.log('Game type for text:', gameType); // Debug log
    switch (gameType) {
      case 'checkers_ranked':
        return 'Dames Classées'
      case 'checkers':
        return 'Dames Rapides'
      case 'inter_demande':
        return 'Jeux d\'Inter'
      default:
        // If game_type is undefined or unknown, check the game name
        return 'Dames Rapides'
    }
  }

  const detectGameTypeFromName = (gameName: string, gameType?: string): string => {
    // If game_type is already set, use it
    if (gameType) return gameType;
    
    // Otherwise, try to detect from the game name
    const name = gameName.toLowerCase();
    if (name.includes('inter') || name.includes('carte') || name.includes('card')) {
      return 'inter_demande';
    }
    return 'checkers'; // Default to checkers
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    return date.toLocaleDateString('fr-FR')
  }

  const handleRejoinGame = (gameId: string, gameType?: string, gameName?: string) => {
    // Detect the actual game type
    const detectedGameType = detectGameTypeFromName(gameName || '', gameType);
    console.log('Rejoining game:', { gameId, gameType, detectedGameType, gameName }); // Debug log
    
    // Navigate to the appropriate game page based on detected game type
    const gamePath = detectedGameType === 'inter_demande' 
      ? `/dashboard/game/inter/${gameId}`
      : `/dashboard/game/p/${gameId}`
    
    console.log('Redirecting to:', gamePath); // Debug log
    window.location.href = gamePath
  }

  // Add debug logging to see what games we're receiving
  console.log('Recent games received:', games);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground text-gray-900 font-heading">
          {fr.dashboard.recentGames}
        </h3>
        <Link
          href="/dashboard/game"
          className="text-sm text-primary hover:text-blue-700 font-medium"
        >
          Voir tout
        </Link>
      </div>

      <div className="space-y-3">
        {games.length === 0 ? (
          <div className="text-center py-8">
            <Gamepad2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Aucune partie jouée pour le moment</p>
            <Link
              href="/dashboard/game"
              className="inline-block mt-2 text-primary hover:text-blue-700 font-medium"
            >
              Commencez votre première partie !
            </Link>
          </div>
        ) : (
          games.map((game) => {
            // Detect the actual game type for this specific game
            const detectedGameType = detectGameTypeFromName(game.name, game.game_type);
            const gameTypeText = getGameTypeText(detectedGameType);
            const gameTypeIcon = getGameTypeIcon(detectedGameType);
            
            return (
              <div key={game.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-2 rounded-full ${getStatusColor(game.status)}`}>
                    {getStatusIcon(game.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-gray-600 text-foreground truncate">{game.name}</p>
                      <span className="flex items-center space-x-1 px-2 py-1 bg-white rounded-full text-xs text-gray-600 border border-gray-300">
                        {gameTypeIcon}
                        <span>{gameTypeText}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <DollarSign className="h-3 w-3" />
                        <span>{game.bet_amount}</span>
                      </span>
                      {game.current_players && game.max_players && (
                        <span className="flex items-center space-x-1">
                          <Users className="h-3 w-3" />
                          <span>{game.current_players}/{game.max_players}</span>
                        </span>
                      )}
                      <span>{formatDate(game.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0 ml-4 flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(game.status)}`}>
                    {game.status === 'finished' ? 'Terminé' : 
                     game.status === 'playing' ? 'En cours' : 'En attente'}
                  </span>
                  
                  {/* Re-join button for active games */}
                  {(game.status === 'playing' || game.status === 'waiting') && (
                    <button
                      onClick={() => handleRejoinGame(game.id, game.game_type, game.name)}
                      className="inline-flex items-center px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Rejoindre
                    </button>
                  )}
                  
                  {game.winner_id && game.profiles && (
                    <p className="text-xs text-gray-600 truncate">
                      Gagnant: {game.profiles.username}
                    </p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}