import { FaGamepad, FaMoneyBillWave, FaLock, FaTrophy, FaUsers, FaShieldAlt, FaRocket, FaMobileAlt, FaSync, FaCoins } from "react-icons/fa";
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import Image from "next/image";
import Header from "@/components/Header";
import HowItWorks from "@/components/HowItWorks";

export default async function HomePage() {
  const session = await getSession()

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Le Jeu de Dames
                <span className="block bg-blue-800 bg-clip-text text-transparent">
                  Réinventé
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl">
                Affrontez des joueurs du monde entier dans des parties stratégiques de dames 
                avec des <span className="font-semibold text-gray-900">mises réelles</span>. 
                Le gagnant rafle toute la mise instantanément.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {session ? (
                  <Link
                    href="/dashboard"
                    className="bg-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <FaGamepad className="text-xl" />
                    <span>Jouer Maintenant</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/register"
                      className="bg-blue-800 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                    >
                      <FaRocket className="text-xl" />
                      <span>Commencer</span>
                    </Link>
                    <Link
                      href="#how-it-works"
                      className="bg-white text-gray-900 border-2 border-gray-300 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2 hover:border-blue-500"
                    >
                      <span>Découvrir</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 mt-12 max-w-md mx-auto lg:mx-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">10K+</div>
                  <div className="text-sm text-gray-600">Joueurs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">50K+</div>
                  <div className="text-sm text-gray-600">Parties</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">$100K+</div>
                  <div className="text-sm text-gray-600">Gains</div>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative">
              <div className="bg-gradient-to-br bg-amber-800 rounded-3xl p-8 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-white rounded-2xl p-6 shadow-inner">
                  <div className="grid grid-cols-8 gap-1 mb-4">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded ${
                          Math.floor(i / 8) % 2 === i % 2 
                            ? 'bg-amber-100' 
                            : 'bg-amber-800'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <div className="w-6 h-6 bg-red-500 rounded-full shadow"></div>
                      <div className="w-6 h-6 bg-red-500 rounded-full shadow"></div>
                    </div>
                    <div className="text-sm font-semibold text-gray-600">Tour: Rouge</div>
                    <div className="flex space-x-2">
                      <div className="w-6 h-6 bg-black rounded-full shadow"></div>
                      <div className="w-6 h-6 bg-black rounded-full shadow"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                Mise: $10
              </div>
              <div className="absolute -bottom-4 -left-4 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                Gain: $20
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi Choisir <span className="bg-blue-800 bg-clip-text text-transparent">BetaDame</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Découvrez l'expérience de jeu ultime qui combine stratégie, compétition et récompenses réelles
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: FaGamepad,
                title: "Jeu Stratégique",
                description: "Maîtrisez l'art des dames avec des parties en temps réel contre des joueurs du monde entier",
                color: "from-blue-500 to-blue-600"
              },
              {
                icon: FaMoneyBillWave,
                title: "Mises Réelles",
                description: "Pariez de l'argent réel et remportez des gains instantanés à chaque victoire",
                color: "from-green-500 to-green-600"
              },
              {
                icon: FaTrophy,
                title: "Compétition Équilibrée",
                description: "Affrontez des adversaires de niveau similaire pour des parties équitables et passionnantes",
                color: "from-yellow-500 to-yellow-600"
              },
              {
                icon: FaShieldAlt,
                title: "100% Sécurisé",
                description: "Transactions cryptées et agents vérifiés pour une expérience de confiance totale",
                color: "from-purple-500 to-purple-600"
              }
            ].map((feature, index) => (
              <div key={index} className="group text-center p-8 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="text-3xl text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Electronic Wallet Section */}
      <section id="wallet" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Portefeuille <span className="bg-blue-800 bg-clip-text text-transparent">Électronique</span>
              </h2>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Gerez vos fonds en toute sécurité avec notre système de portefeuille électronique intégré. 
                Déposez, jouez, et retirez vos gains facilement.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: FaLock,
                    title: "Sécurité Maximale",
                    description: "Toutes les transactions sont cryptées et surveillées 24/7"
                  },
                  {
                    icon: FaSync,
                    title: "Transactions Instantanées",
                    description: "Dépôts et retraits traités en temps réel sans délai"
                  },
                  {
                    icon: FaUsers,
                    title: "Agents Certifiés",
                    description: "Réseau d'agents de confiance pour vos opérations de paiement"
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                      <feature.icon className="text-xl text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Wallet Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-inner">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-green-200 text-sm">Solde Disponible</div>
                      <div className="text-3xl font-bold">$250.00</div>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <FaCoins className="text-2xl" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button className="bg-white text-green-600 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors">
                      Déposer
                    </button>
                    <button className="bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800 transition-colors">
                      Retirer
                    </button>
                  </div>
                  
                  <div className="text-center text-green-200 text-sm">
                    Transactions Sécurisées • Support 24/7
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -left-4 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-semibold">En Ligne</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-800">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à <span className="text-yellow-300">Jouer</span> et <span className="text-yellow-300">Gagner</span>?
          </h2>
          
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Rejoignez des milliers de joueurs qui transforment leur passion pour les dames en gains réels
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <FaGamepad className="text-xl" />
                <span>Jouer Maintenant</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/register"
                  className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <FaRocket className="text-xl" />
                  <span>Commencer Gratuitement</span>
                </Link>
                <Link
                  href="/auth/login"
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <span>Se Connecter</span>
                </Link>
              </>
            )}
          </div>

          {/* Trust Badges */}
          <div className="mt-12 pt-8 border-t border-blue-500">
            <p className="text-blue-200 text-sm mb-6">Rejoignez une communauté de confiance</p>
            <div className="flex flex-wrap justify-center gap-8">
              {[
                { icon: "🔒", text: "Sécurisé" },
                { icon: "⚡", text: "Rapide" },
                { icon: "🏆", text: "Compétitif" },
                { icon: "💎", text: "Fiable" }
              ].map((badge, index) => (
                <div key={index} className="flex items-center space-x-2 text-blue-200">
                  <span className="text-xl">{badge.icon}</span>
                  <span className="text-sm font-medium">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}