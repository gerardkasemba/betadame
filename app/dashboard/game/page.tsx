// app/dashboard/game/page.tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import QuickGame from './components/quick-game'
import TournamentCreation from './components/tournament-creation'
import GameInvitation from './components/game-invitation'
import ActiveGames from './components/active-games'
import { Sword, Users, Trophy, Mail } from 'lucide-react'
import { fr } from '@/lib/i18n'

export default function GamePage() {
  const [activeTab, setActiveTab] = useState('quick')

  return (
    <div className="space-y-8">
      {/* <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground font-heading mb-2">
          Zone de Jeu
        </h1>
        <p className="text-gray-600">
          Choisissez votre mode de jeu : partie rapide, tournoi ou invitation
        </p>
      </div> */}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" storageKey="game-page-tab">
        <TabsList className="w-full">
          <TabsTrigger value="quick" className="flex items-center space-x-2">
            <Sword className="h-4 w-4" />
            <span>Partie Rapide</span>
          </TabsTrigger>
          {/* <TabsTrigger value="tournament" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>Tournoi</span>
          </TabsTrigger>
          <TabsTrigger value="invite" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Invitation</span>
          </TabsTrigger> */}
          <TabsTrigger value="active" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Parties Actives</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick">
          <QuickGame />
        </TabsContent>

        {/* <TabsContent value="tournament">
          <TournamentCreation />
        </TabsContent>

        <TabsContent value="invite">
          <GameInvitation />
        </TabsContent> */}

        <TabsContent value="active">
          <ActiveGames />
        </TabsContent>
      </Tabs>
    </div>
  )
}