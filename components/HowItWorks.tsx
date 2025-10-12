"use client"
import { FaMobileAlt, FaCoins, FaGamepad, FaArrowRight } from "react-icons/fa"
import { useState } from "react"

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      step: "01",
      icon: FaMobileAlt,
      title: "Créez Votre Compte",
      description:
        "Inscrivez-vous en 30 secondes et vérifiez votre profil pour commencer à jouer",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      details: [
        "Téléchargez l'application",
        "Remplissez votre profil",
        "Vérification instantanée"
      ]
    },
    {
      step: "02",
      icon: FaCoins,
      title: "Approvisionnez Votre Solde",
      description:
        "Ajoutez des fonds via nos agents certifiés ou méthodes de paiement sécurisées",
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      details: [
        "Agents certifiés près de chez vous",
        "Paiements mobiles sécurisés",
        "Rechargement instantané"
      ]
    },
    {
      step: "03",
      icon: FaGamepad,
      title: "Jouez et Gagnez",
      description:
        "Choisissez votre mise, trouvez un adversaire et remportez la partie pour gagner",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      details: [
        "Parties rapides ou tournois",
        "Adversaires en temps réel",
        "Gains instantanés"
      ]
    },
  ]

  const nextStep = () => {
    setActiveStep((prev) => (prev + 1) % steps.length)
  }

  const prevStep = () => {
    setActiveStep((prev) => (prev - 1 + steps.length) % steps.length)
  }

  return (
    <section
      id="how-it-works"
      className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gray-100"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-600 mb-4">
            Comment{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Ça Marche
            </span>
            ?
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            En quelques étapes simples, rejoignez l'arène et commencez à gagner
          </p>
        </div>

        {/* Desktop Steps */}
        <div className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative group"
            >
              {/* App Card */}
              <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 h-full">
                {/* Step Indicator */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:scale-110 transition-transform`}>
                  <step.icon className="text-3xl text-white" />
                </div>

                {/* Step Number */}
                <div className="text-center mb-4">
                  <span className="inline-block px-4 py-2 rounded-full bg-gray-700 text-gray-300 text-sm font-semibold">
                    Étape {step.step}
                  </span>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed mb-6">
                    {step.description}
                  </p>
                  
                  {/* Details List */}
                  <ul className="space-y-2">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center text-sm text-gray-300">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color} mr-3`}></div>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Connector Arrow */}
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 right-0 translate-x-1/2 items-center justify-center w-16 h-16">
                  <div className="w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <FaArrowRight className="text-blue-400 -ml-4 text-lg" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile App Overlay */}
        <div className="lg:hidden">
          {/* App Frame */}
          <div className="max-w-sm mx-auto bg-gray-900 rounded-3xl p-6 border-2 border-gray-700 shadow-2xl relative">
            {/* App Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <div className="text-white text-sm font-medium">
                BetaDame
              </div>
              <div className="w-6"></div>
            </div>

            {/* Current Step Display */}
            <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                {(() => {
                const IconComponent = steps[activeStep].icon;
                return <IconComponent className="text-2xl text-white" />;
                })()}
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-gray-800 text-gray-300 text-xs font-semibold">
                Étape {steps[activeStep].step}
            </span>
            </div>

            {/* Step Content */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white mb-3">
                {steps[activeStep].title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                {steps[activeStep].description}
              </p>
              
              {/* Progress Dots */}
              <div className="flex justify-center space-x-2 mb-4">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === activeStep 
                        ? `bg-gradient-to-r ${steps[activeStep].color} w-6` 
                        : 'bg-gray-600'
                    }`}
                  ></div>
                ))}
              </div>

              {/* Details List */}
              <ul className="space-y-2 text-left">
                {steps[activeStep].details.map((detail, i) => (
                  <li key={i} className="flex items-center text-xs text-gray-300">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${steps[activeStep].color} mr-3`}></div>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={prevStep}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Précédent
              </button>
              
              <div className="text-xs text-gray-500">
                {activeStep + 1} / {steps.length}
              </div>
              
              <button
                onClick={nextStep}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium hover:shadow-lg transition-all"
              >
                {activeStep === steps.length - 1 ? 'Commencer' : 'Suivant'}
              </button>
            </div>
          </div>

          {/* Swipe Hint */}
          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              👆 Glissez pour naviguer
            </p>
          </div>
        </div>

        {/* CTA Section */}
        {/* <div className="text-center mt-16">
          <div className="inline-flex flex-col sm:flex-row gap-4">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105">
              Télécharger l'App
            </button>
            <button className="px-8 py-4 bg-gray-800 text-white rounded-xl font-semibold border border-gray-600 hover:bg-gray-700 transition-all duration-300">
              Voir la Démo
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            Disponible sur iOS et Android
          </p>
        </div> */}
      </div>
    </section>
  )
}