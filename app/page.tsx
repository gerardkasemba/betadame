import Link from 'next/link';
import { FaChessBoard, FaCoins, FaTrophy, FaPlay, FaShieldAlt, FaCrown } from 'react-icons/fa';

export default function Home() {
  return (
    <div className="flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
      {/* Header Section */}
      <header className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 text-center">
          {/* Main Motto */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
              <FaCrown className="text-yellow-500 mr-2" />
              <span className="text-sm font-semibold text-gray-700">LE JEU DE DAMES ULTIME</span>
            </div>
          </div>

          {/* Catchy Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Stratégie
            <span className="text-blue-600 block">Tradition</span>
            <span className="text-green-600 block">Victoire</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed">
            Où la <span className="font-semibold text-blue-600">sagesse ancestrale</span> rencontre 
            {' '}<span className="font-semibold text-green-600">l&apos;excitation moderne</span> des paris
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center text-sm text-gray-600">
              <FaShieldAlt className="text-blue-500 mr-2" />
              Sécurisé et équitable
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <FaCoins className="text-yellow-500 mr-2" />
              Paiements instantanés
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <FaTrophy className="text-purple-500 mr-2" />
              Classement compétitif
            </div>
          </div>

          {/* CTA Button */}
          <Link 
            href="/lobby" 
            className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105 text-lg font-semibold"
          >
            <FaPlay className="mr-3" />
            Jouer Maintenant - C&apos;est Gratuit
          </Link>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">10K+</div>
              <div className="text-sm text-gray-600">Joueurs Actifs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">50K+</div>
              <div className="text-sm text-gray-600">Parties Jouées</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">100K+</div>
              <div className="text-sm text-gray-600">Francs Gagnés</div>
            </div>
          </div>
        </div>
      </header>
        {/* Logo/Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg">
            <FaChessBoard className="text-4xl text-blue-600" />
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl font-light text-gray-800 mb-6">
          Dames Congolaises
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Jouez aux dames traditionnelles, misez de l&apos;argent et gagnez gros dans une expérience de jeu authentique
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FaChessBoard className="text-2xl text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Jeu Traditionnel</h3>
            <p className="text-gray-600 text-sm">Découvrez les règles authentiques des dames congolaises</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FaCoins className="text-2xl text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Mises Excitées</h3>
            <p className="text-gray-600 text-sm">Ajoutez du thrill avec des paris compétitifs</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <FaTrophy className="text-2xl text-yellow-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Gains Garantis</h3>
            <p className="text-gray-600 text-sm">Gagnez des récompenses réelles pour vos victoires</p>
          </div>
        </div>

        {/* CTA Button */}
        <Link 
          href="/lobby" 
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <FaPlay className="mr-3" />
          Commencer à Jouer
        </Link>

        {/* Footer Note */}
        <p className="mt-12 text-sm text-gray-500">
          Jeu réservé aux adultes. Jouez responsablement.
        </p>
      </div>
    </div>
  );
}