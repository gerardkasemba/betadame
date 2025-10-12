import { 
  BarChart3, 
  Clock, 
  CreditCard, 
  Wallet, 
  ShoppingCart, 
  Smartphone, 
  History, 
  Banknote,
  Download,
  Upload,
  Menu,
  X
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface AgentTabsProps {
  activeTab: string
  onTabChange: (tab: any) => void
  pendingRequests: number
  pendingWithdrawalRequests: number
}

const tabs = [
  { 
    id: 'overview', 
    label: 'Aperçu', 
    icon: BarChart3,
    description: 'Tableau de bord principal'
  },
  { 
    id: 'requests', 
    label: 'Dépôts en Attente', 
    icon: Clock, 
    badge: 'pendingRequests',
    description: 'Demandes à traiter'
  },
  { 
    id: 'deposit', 
    label: 'Dépôt Direct', 
    icon: Upload,
    description: 'Déposer vers un utilisateur'
  },
  { 
    id: 'withdrawal', 
    label: 'Retrait Client', 
    icon: Download,
    description: 'Traiter un retrait'
  },
  { 
    id: 'buy_balance', 
    label: 'Acheter Solde', 
    icon: ShoppingCart,
    description: 'Recharger le solde plateforme'
  },
  { 
    id: 'withdraw_platform', 
    label: 'Retirer Commission', 
    icon: Banknote, 
    badge: 'pendingWithdrawalRequests',
    description: 'Retirer vos gains'
  },
  { 
    id: 'payments', 
    label: 'Comptes', 
    icon: Smartphone,
    description: 'Gérer les comptes'
  },
  { 
    id: 'transactions', 
    label: 'Historique', 
    icon: History,
    description: 'Voir les transactions'
  }
]

export function AgentTabs({ 
  activeTab, 
  onTabChange, 
  pendingRequests, 
  pendingWithdrawalRequests 
}: AgentTabsProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const getBadgeCount = (tabId: string, badgeType?: string) => {
    if (!badgeType) return 0
    
    switch (badgeType) {
      case 'pendingRequests':
        return pendingRequests
      case 'pendingWithdrawalRequests':
        return pendingWithdrawalRequests
      default:
        return 0
    }
  }

  const getBadgeColor = (badgeType?: string) => {
    switch (badgeType) {
      case 'pendingRequests':
        return 'bg-red-500 text-white'
      case 'pendingWithdrawalRequests':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getActiveTabInfo = () => {
    return tabs.find(tab => tab.id === activeTab) || tabs[0]
  }

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId)
    setIsMobileMenuOpen(false)
  }

  const MobileTabButton = ({ tab, badgeCount, badgeColor, isActive }: any) => {
    const Icon = tab.icon
    return (
      <button
        onClick={() => handleTabChange(tab.id)}
        className={`flex items-center space-x-3 w-full p-4 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-primary text-white shadow-lg shadow-primary/25'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
        }`}
      >
        <div className="relative">
          <Icon className="h-5 w-5" />
          {badgeCount > 0 && (
            <span className={`absolute -top-2 -right-2 ${badgeColor} text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] border-2 border-white`}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-sm">{tab.label}</div>
          <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
            {tab.description}
          </div>
        </div>
        {isActive && (
          <div className="w-2 h-2 bg-white rounded-full" />
        )}
      </button>
    )
  }

  const DesktopTabButton = ({ tab, badgeCount, badgeColor, isActive }: any) => {
    const Icon = tab.icon
    return (
      <button
        onClick={() => handleTabChange(tab.id)}
        className={`group relative flex flex-col items-center p-3 rounded-2xl transition-all duration-200 min-w-[80px] ${
          isActive
            ? 'bg-primary text-white shadow-lg shadow-primary/25'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <div className="relative mb-2">
          <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${
            isActive ? 'text-white' : 'text-gray-400'
          }`} />
          {badgeCount > 0 && (
            <span className={`absolute -top-2 -right-2 ${badgeColor} text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] border-2 ${
              isActive ? 'border-primary' : 'border-white'
            }`}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-center leading-tight">
          {tab.label}
        </span>
        
        {/* Active indicator */}
        {isActive && (
          <div className="absolute -bottom-1 w-6 h-1 bg-white rounded-full" />
        )}
      </button>
    )
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 text-gray-600" />
                ) : (
                  <Menu className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">
                  {getActiveTabInfo().label}
                </h2>
                <p className="text-xs text-gray-500">
                  {getActiveTabInfo().description}
                </p>
              </div>
            </div>
            
            {/* Badge for current tab if any */}
            {(() => {
              const currentTab = getActiveTabInfo()
              const badgeCount = getBadgeCount(currentTab.id, currentTab.badge)
              if (badgeCount > 0) {
                return (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(currentTab.badge)}`}>
                    {badgeCount}
                  </span>
                )
              }
              return null
            })()}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
            <div className="absolute top-0 left-0 right-0 bg-white rounded-b-3xl shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Navigation</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>

              {/* Tabs Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 gap-3">
                  {tabs.map((tab) => {
                    const badgeCount = getBadgeCount(tab.id, tab.badge)
                    const badgeColor = getBadgeColor(tab.badge)
                    const isActive = activeTab === tab.id
                    
                    return (
                      <MobileTabButton
                        key={tab.id}
                        tab={tab}
                        badgeCount={badgeCount}
                        badgeColor={badgeColor}
                        isActive={isActive}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Stats Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-3xl">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">En Attente</div>
                    <div className="text-lg font-bold text-red-600">{pendingRequests}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Retraits</div>
                    <div className="text-lg font-bold text-blue-600">{pendingWithdrawalRequests}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

// Desktop View - Alternative with grid layout
return (
  <div className="hidden lg:block bg-white rounded-tl-lg rounded-tr-lg border-b border-gray-200 sticky top-0 z-30">
    <div className="w-full">
      {/* Desktop Tabs - Full Width Grid */}
      <div className="flex items-center w-full">
        {/* Main tabs area - takes most of the width */}
        <div className="flex-1 flex items-center justify-between px-6">
          {/* Tabs distributed evenly across full width */}
          <div className="flex-1 grid grid-cols-8 gap-1 py-4">
            {tabs.map((tab) => {
              const badgeCount = getBadgeCount(tab.id, tab.badge)
              const badgeColor = getBadgeColor(tab.badge)
              const isActive = activeTab === tab.id
              
              return (
                <div key={tab.id} className="flex justify-center">
                  <DesktopTabButton
                    tab={tab}
                    badgeCount={badgeCount}
                    badgeColor={badgeColor}
                    isActive={isActive}
                  />
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Quick Stats - Fixed on the right */}
        <div className="flex items-center space-x-4 pl-6 border-l border-gray-200 py-4 pr-6 bg-gray-50">
          {(pendingRequests > 0 || pendingWithdrawalRequests > 0) && (
            <div className="flex items-center space-x-3">
              {pendingRequests > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">
                    {pendingRequests} en attente
                  </span>
                </div>
              )}
              {pendingWithdrawalRequests > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">
                    {pendingWithdrawalRequests} retraits
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)
}