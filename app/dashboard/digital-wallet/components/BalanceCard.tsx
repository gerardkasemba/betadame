// app/dashboard/digital-wallet/components/BalanceCard.tsx
'use client'

interface BalanceCardProps {
  currentUser: {
    balance: number
  } | null
  sendAmount: number
}

export default function BalanceCard({ currentUser, sendAmount }: BalanceCardProps) {
  if (!currentUser) return null

  return (
    <div className="bg-gradient-to-r from-primary to-secondary rounded-xl shadow-lg border border-gray-200 p-6 mb-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-white/90">Votre solde actuel</p>
            <p className="text-2xl font-bold text-white">
              {currentUser.balance.toFixed(2)}$
            </p>
            <p className="text-xs text-white/70 mt-1">
              Mise à jour en temps réel
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border ${
            currentUser.balance > 0 
              ? 'bg-white/20 text-white border-white/30' 
              : 'bg-white text-red-500 border-red-300'
          }`}>
            {currentUser.balance > 0 ? 'Disponible' : 'Solde épuisé'}
          </div>
        </div>
        
        {sendAmount > 0 && (
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/90">Solde après transfert:</span>
              <span className={`font-semibold backdrop-blur-sm px-4 py-2 rounded border ${
                (currentUser.balance - sendAmount) >= 0 
                    ? 'bg-yellow-400/80 text-white border-yellow-500' 
                    : 'bg-white text-red-500 border-red-400'
              }`}>
                {(currentUser.balance - sendAmount).toFixed(2)}$
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}