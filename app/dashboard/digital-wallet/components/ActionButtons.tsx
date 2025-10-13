// app/dashboard/digital-wallet/components/ActionButtons.tsx
'use client'

import Link from 'next/link'
import { ArrowDown, ArrowUp, HandCoins } from 'lucide-react'

interface ActionButtonsProps {
  onRequestFundsClick: () => void
  pendingRequestsCount: number
  hasNewRequest: boolean
}

export default function ActionButtons({ 
  onRequestFundsClick, 
  pendingRequestsCount, 
  hasNewRequest 
}: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {/* Deposit Button */}
      <Link
        href="/dashboard/deposit"
        className="group flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 hover:shadow-sm"
      >
        <div className="flex flex-col items-center space-y-1">
          <div className="p-1.5 bg-green-100 rounded-lg group-hover:bg-green-500 transition-colors">
            <ArrowDown className="h-4 w-4 text-green-600 group-hover:text-white" />
          </div>
          <span className="text-xs font-medium text-gray-700 group-hover:text-green-700">Déposer</span>
        </div>
      </Link>

      {/* Withdraw Button */}
      <Link
        href="/dashboard/withdraw"
        className="group flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 hover:shadow-sm"
      >
        <div className="flex flex-col items-center space-y-1">
          <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors">
            <ArrowUp className="h-4 w-4 text-blue-600 group-hover:text-white" />
          </div>
          <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">Retirer</span>
        </div>
      </Link>

      {/* Request Funds Button */}
      <button
        onClick={onRequestFundsClick}
        className="group relative flex items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 hover:shadow-sm"
      >
        <div className="flex flex-col items-center space-y-1">
          <div className="relative p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-500 transition-colors">
            <HandCoins className="h-4 w-4 text-purple-600 group-hover:text-white" />
            
            {/* Pending requests count badge */}
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center border-2 border-white font-medium shadow-sm">
                {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-gray-700 group-hover:text-purple-700">
            Demandes
          </span>
        </div>

        {/* New request notification pulse animation - positioned on the button corner */}
        {hasNewRequest && (
          <div className="absolute -top-1 -right-1 z-10">
            <div className="relative">
              {/* Outer pulse ring */}
              <div className="absolute -inset-1 animate-ping">
                <div className="w-3 h-3 bg-red-500 rounded-full opacity-75"></div>
              </div>
              {/* Inner solid dot */}
              <div className="relative w-3 h-3 bg-red-600 rounded-full border-2 border-white"></div>
            </div>
          </div>
        )}
      </button>
    </div>
  )
}