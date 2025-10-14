import React from 'react'
import Link from 'next/link'
import { Plus, Users, Trophy, Zap } from 'lucide-react'

const actions = [
  {
    title: 'Créer une Salle',
    description: 'Démarrer une partie immédiatement',
    icon: <Zap className="h-6 w-6" />,
    href: '/dashboard/game?quick=true',
    bgColor: 'bg-[#fecf6a]',
    iconColor: 'text-white',
  },
  // {
  //   title: 'Créer une Salle',
  //   description: 'Configurer une partie personnalisée',
  //   icon: <Plus className="h-6 w-6" />,
  //   href: '/dashboard/game?create=true',
  //   bgColor: 'bg-[#194a8d]',
  //   iconColor: 'text-white',
  // },
  // {
  //   title: 'Tournoi',
  //   description: 'Rejoindre un tournoi',
  //   icon: <Trophy className="h-6 w-6" />,
  //   href: '/dashboard/tournaments',
  //   bgColor: 'bg-[#df1c44]',
  //   iconColor: 'text-white',
  // },
  {
    title: 'Inviter des Amis',
    description: 'Jouer avec vos amis',
    icon: <Users className="h-6 w-6" />,
    href: '/dashboard/invite',
    bgColor: 'bg-[#194a8d]',
    iconColor: 'text-white',
  },
]

export default function QuickActions() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-[#194a8d] mb-4">Actions Rapides</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
          >
            <div className={`p-3 rounded-full mb-2 ${action.bgColor} flex items-center justify-center`}>
              {React.cloneElement(action.icon, { className: action.iconColor })}
            </div>
            <span className="text-sm font-medium text-[#194a8d]">{action.title}</span>
            <span className="text-xs text-gray-600">{action.description}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
