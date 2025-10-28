// components/AfricanHeroSection.tsx
'use client'

import { Trophy, Users, TrendingUp, Star } from 'lucide-react'

interface AfricanHeroSectionProps {
  marketCount: number
  totalVolume: number
  activeTraders: number
}

export default function AfricanHeroSection({ 
  marketCount, 
  totalVolume, 
  activeTraders 
}: AfricanHeroSectionProps) {
  return (
    <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white py-16 lg:py-24 overflow-hidden">
      {/* SVG Background Pattern Africain */}
      <div className="absolute inset-0 opacity-10">
        <AfricanPatternSVG />
      </div>
      
      {/* Éléments décoratifs */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-16 h-16 bg-green-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-red-400 rounded-full opacity-20 animate-pulse delay-500"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Texte Principal */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge Nouveau */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Star className="h-4 w-4 text-yellow-300" />
              <span className="text-sm font-semibold">NOUVEAU • PLATEFORME AFRICAINE</span>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold mb-4 leading-tight">
              <span className="block">Pariez sur</span>
              <span className="block text-yellow-300">vos Sports</span>
              <span className="block">Préférés</span>
            </h1>

            <p className="text-xl lg:text-2xl text-white/90 mb-8 max-w-2xl leading-relaxed">
              Rejoignez la première plateforme de trading sportif{' '}
              <span className="text-yellow-300 font-semibold">100% africaine</span>. 
              Prédisez, tradez et gagnez sur les plus grands événements sportifs.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3">
                <Trophy className="h-6 w-6" />
                Commencer à Trader
              </button>
              <button className="border-2 border-white/30 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                Voir les Matchs en Direct
              </button>
            </div>

            {/* Stats Mobile */}
            <div className="flex lg:hidden justify-center gap-6 mt-8">
              <div className="text-center">
                <div className="text-2xl font-bold">{marketCount}</div>
                <div className="text-white/80 text-sm">Marchés Actifs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${totalVolume.toFixed(0)}
                </div>
                <div className="text-white/80 text-sm">Volume Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{activeTraders}</div>
                <div className="text-white/80 text-sm">Traders Actifs</div>
              </div>
            </div>
          </div>

          {/* Stats Desktop */}
          <div className="hidden lg:flex flex-col gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{marketCount}</div>
              <div className="text-white/80">Marchés Actifs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                ${totalVolume.toFixed(0)}
              </div>
              <div className="text-white/80">Volume Total</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{activeTraders}</div>
              <div className="text-white/80">Traders Actifs</div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-yellow-300">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">+15% cette semaine</span>
            </div>
          </div>
        </div>

        {/* Bannière de confiance */}
        <div className="mt-12 bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="flex flex-wrap justify-center items-center gap-8 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span>Paiements Instantanés</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon />
              <span>Sécurité Garantie</span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneIcon />
              <span>Support 24h/24</span>
            </div>
            <div className="flex items-center gap-2">
              <GlobeIcon />
              <span>Disponible Partout en Afrique</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// SVG Pattern Africain Personnalisé
function AfricanPatternSVG() {
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 1200 800" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Fond gradient */}
      <defs>
        <radialGradient id="africanSun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0.1" />
        </radialGradient>
        
        <pattern id="africanPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
          {/* Motifs Adinkra simplifiés */}
          <circle cx="50" cy="50" r="8" fill="#F59E0B" opacity="0.3"/>
          <rect x="45" y="20" width="10" height="60" fill="#059669" opacity="0.3" rx="2"/>
          <rect x="20" y="45" width="60" height="10" fill="#059669" opacity="0.3" rx="2"/>
          <path d="M30 30 L70 70 M70 30 L30 70" stroke="#DC2626" strokeWidth="2" opacity="0.3"/>
        </pattern>
      </defs>
      
      {/* Soleil Africain */}
      <circle cx="600" cy="400" r="300" fill="url(#africanSun)" />
      
      {/* Pattern de fond */}
      <rect width="100%" height="100%" fill="url(#africanPattern)" />
      
      {/* Éléments décoratifs */}
      <g opacity="0.2">
        {/* Triangles symboliques */}
        <polygon points="100,100 150,50 200,100" fill="#F59E0B" />
        <polygon points="1000,700 1050,650 1100,700" fill="#059669" />
        <polygon points="150,650 200,600 250,650" fill="#DC2626" />
        
        {/* Lignes organiques */}
        <path d="M50 500 Q200 450 350 550 T650 500 T950 550" stroke="#F59E0B" strokeWidth="3" fill="none"/>
        <path d="M1200 200 Q1000 250 800 150 T400 200 T100 150" stroke="#059669" strokeWidth="3" fill="none"/>
      </g>
    </svg>
  )
}

// Icônes supplémentaires
function ShieldCheckIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
    </svg>
  )
}