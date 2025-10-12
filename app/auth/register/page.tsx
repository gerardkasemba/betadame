// app/auth/register/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Eye, EyeOff, User, Mail, MapPin, Phone, Lock, 
  Gamepad2, Wallet, Calendar, VenusAndMars, Globe, Bell, 
  Shield, Users,
} from 'lucide-react'
import { signUp } from '@/lib/auth-actions'
import Header from '@/components/Header'

// Country and state data
const countries = {
  'Congo Brazzaville': [
    'Brazzaville',
    'Bouenza',
    'Cuvette',
    'Cuvette-Ouest',
    'Kouilou',
    'Lékoumou',
    'Likouala',
    'Niari',
    'Plateaux',
    'Pool',
    'Sangha',
    'Pointe-Noire'
  ],
  'DR Congo': [
    'Kinshasa',
    'Kongo Central',
    'Kwango',
    'Kwilu',
    'Mai-Ndombe',
    'Équateur',
    'Mongala',
    'Nord-Ubangi',
    'Sud-Ubangi',
    'Tshuapa',
    'Tshopo',
    'Bas-Uele',
    'Haut-Uele',
    'Ituri',
    'Nord-Kivu',
    'Sud-Kivu',
    'Maniema',
    'Haut-Lomami',
    'Lualaba',
    'Haut-Katanga',
    'Tanganyika',
    'Lomami',
    'Sankuru',
    'Kasaï',
    'Kasaï Central',
    'Kasaï Oriental'
  ]
};

const languages = [
  { value: 'french', label: 'Français' },
  { value: 'english', label: 'English' },
];

const securityQuestions = [
  { value: 'mother_maiden_name', label: 'Nom de jeune fille de votre mère' },
  { value: 'first_pet', label: 'Nom de votre premier animal de compagnie' },
  { value: 'birth_city', label: 'Ville de naissance' },
  { value: 'first_school', label: 'Nom de votre première école' },
  { value: 'favorite_teacher', label: 'Nom de votre professeur préféré' },
  { value: 'childhood_nickname', label: 'Surnom d\'enfance' }
];

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [passwordsMatch, setPasswordsMatch] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [userType, setUserType] = useState<'player' | 'wallet' | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    repeatPassword: '',
    date_of_birth: '',
    gender: '',
    preferred_language: 'french',
    notification_preferences: {
      email: true,
      sms: true,
      push: true
    },
    security_question: '',
    security_answer: '',
    terms_accepted: false,
    privacy_policy_accepted: false
  })

  // Get referral code from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const ref = urlParams.get('ref')
      if (ref) {
        setReferralCode(ref)
      }
    }
  }, [])

  // Check password match
  useEffect(() => {
    if (formData.password && formData.repeatPassword) {
      setPasswordsMatch(formData.password === formData.repeatPassword)
    } else {
      setPasswordsMatch(true)
    }
  }, [formData.password, formData.repeatPassword])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNotificationChange = (type: keyof typeof formData.notification_preferences) => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [type]: !prev.notification_preferences[type]
      }
    }))
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  const validateStep1 = () => {
    const { username, email, phone_number, password, repeatPassword } = formData

    if (!username.trim()) {
      setError('Veuillez entrer un nom d\'utilisateur')
      return false
    }

    if (!passwordsMatch) {
      setError('Les mots de passe ne correspondent pas')
      return false
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return false
    }

    if (!userType) {
      setError('Veuillez sélectionner un type de compte')
      return false
    }

    if (!selectedCountry || !selectedState) {
      setError('Veuillez sélectionner votre pays et ville')
      return false
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores')
      return false
    }

    if (username.length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      return false
    }

    const phoneRegex = /^\+?[\d\s-()]{10,}$/
    if (!phoneRegex.test(phone_number)) {
      setError('Veuillez entrer un numéro de téléphone valide')
      return false
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Veuillez entrer une adresse e-mail valide')
      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (!formData.date_of_birth) {
      setError('Veuillez entrer votre date de naissance')
      return false
    }

    const age = calculateAge(formData.date_of_birth)
    if (age < 18) {
      setError('Vous devez avoir au moins 18 ans pour vous inscrire')
      return false
    }

    if (!formData.gender) {
      setError('Veuillez sélectionner votre genre')
      return false
    }

    if (!formData.security_question || !formData.security_answer) {
      setError('Veuillez sélectionner une question de sécurité et fournir une réponse')
      return false
    }

    if (formData.security_answer.length < 2) {
      setError('La réponse de sécurité doit contenir au moins 2 caractères')
      return false
    }

    return true
  }

  const validateStep3 = () => {
    if (!formData.terms_accepted || !formData.privacy_policy_accepted) {
      setError('Veuillez accepter les conditions d\'utilisation et la politique de confidentialité')
      return false
    }

    return true
  }

  const nextStep = () => {
    setError('')
    let isValid = true

    if (step === 1) {
      isValid = validateStep1()
    } else if (step === 2) {
      isValid = validateStep2()
    }

    if (isValid) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setError('')
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setIsLoading(true)

    // Re-validate all steps before submission
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      setIsLoading(false)
      return
    }

    try {
      // Prepare the data object
      const registrationData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.trim(),
        password: formData.password,
        country: selectedCountry,
        state: selectedState,
        user_type: userType,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        preferred_language: formData.preferred_language,
        region: 'Africa',
        notification_preferences: formData.notification_preferences,
        security_questions: formData.security_question && formData.security_answer 
          ? { [formData.security_question]: formData.security_answer.trim() }
          : null,
        referral_code: referralCode.trim() || null,
        terms_accepted: formData.terms_accepted,
        privacy_policy_accepted: formData.privacy_policy_accepted
      }

      console.log('Sending registration data:', registrationData)

      // Convert to FormData
      const formDataObj = new FormData()
      Object.entries(registrationData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            formDataObj.append(key, JSON.stringify(value))
          } else {
            formDataObj.append(key, value.toString())
          }
        }
      })

      // Call server action
      const result = await signUp(formDataObj)
      
      // Handle result
      if (result?.error) {
        console.error('Registration error response:', result.error)
        setError(result.error)
      } else if (result?.success) {
        console.log('Registration successful - redirecting to verification page')
        window.location.href = '/auth/verify-email'
      } else {
        console.log('Registration completed successfully')
        window.location.href = '/auth/verify-email'
      }

    } catch (err: any) {
      console.error('Full error in handleSubmit:', err)
      
      // Ignore NEXT_REDIRECT error
      if (err?.message?.includes('NEXT_REDIRECT') || err?.digest?.includes('NEXT_REDIRECT')) {
        console.log('Registration successful - redirect handled by Next.js')
        return
      }
      
      // Other unexpected errors
      setError(`Une erreur inattendue est survenue: ${err.message || 'Erreur inconnue'}. Veuillez réessayer.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value
    setSelectedCountry(country)
    setSelectedState('')
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Type de compte */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Que souhaitez-vous faire ? *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setUserType('player')}
            className={`p-4 border-2 rounded-lg text-center transition-all ${
              userType === 'player'
                ? 'border-[#fecf6a] bg-[#fecf6a] bg-opacity-10 text-[#194a8d]'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            <Gamepad2 className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Jouer</span>
          </button>
          <button
            type="button"
            onClick={() => setUserType('wallet')}
            className={`p-4 border-2 rounded-lg text-center transition-all ${
              userType === 'wallet'
                ? 'border-[#fecf6a] bg-[#fecf6a] bg-opacity-10 text-[#194a8d]'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            <Wallet className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Portefeuille Électronique</span>
          </button>
        </div>
      </div>

      {/* Nom d'utilisateur */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          Nom d'utilisateur *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            title="Lettres, chiffres et underscores uniquement"
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
            placeholder="Votre nom d'utilisateur"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          3-20 caractères, lettres, chiffres et underscores uniquement
        </p>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Adresse e-mail *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
            placeholder="votre@email.com"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
        </div>
      </div>

      {/* Téléphone */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
          Numéro de téléphone *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="phone_number"
            name="phone_number"
            type="tel"
            required
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
            placeholder="+242 06 123 4567"
            value={formData.phone_number}
            onChange={(e) => handleInputChange('phone_number', e.target.value)}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Format international accepté
        </p>
      </div>

      {/* Pays */}
      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
          Pays *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id="country"
            name="country"
            required
            value={selectedCountry}
            onChange={handleCountryChange}
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent appearance-none bg-white"
          >
            <option value="">Sélectionnez votre pays</option>
            <option value="Congo Brazzaville">Congo Brazzaville</option>
            <option value="DR Congo">République Démocratique du Congo</option>
          </select>
        </div>
      </div>

      {/* Ville */}
      {selectedCountry && (
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            Ville *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="state"
              name="state"
              required
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent appearance-none bg-white"
            >
              <option value="">Sélectionnez votre ville</option>
              {countries[selectedCountry as keyof typeof countries]?.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Mot de passe */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Mot de passe *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={6}
            className="relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
            placeholder="Au moins 6 caractères"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Répéter le mot de passe */}
      <div>
        <label htmlFor="repeatPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirmer le mot de passe *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="repeatPassword"
            name="repeatPassword"
            type={showRepeatPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={6}
            className={`relative block w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
              !passwordsMatch && formData.repeatPassword
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-[#fecf6a]'
            }`}
            placeholder="Répétez votre mot de passe"
            value={formData.repeatPassword}
            onChange={(e) => handleInputChange('repeatPassword', e.target.value)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowRepeatPassword(!showRepeatPassword)}
          >
            {showRepeatPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
        {!passwordsMatch && formData.repeatPassword && (
          <p className="text-xs text-red-600 mt-1">
            Les mots de passe ne correspondent pas
          </p>
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Date de naissance */}
      <div>
        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
          Date de naissance *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="date_of_birth"
            type="date"
            required
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
            value={formData.date_of_birth}
            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Vous devez avoir au moins 18 ans pour vous inscrire
        </p>
        {formData.date_of_birth && calculateAge(formData.date_of_birth) < 18 && (
          <p className="text-xs text-red-600 mt-1">
            Vous devez avoir au moins 18 ans
          </p>
        )}
      </div>

      {/* Genre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Genre *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['male', 'female', 'other', 'prefer_not_to_say'].map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => handleInputChange('gender', gender)}
              className={`p-3 border-2 rounded-lg text-center transition-all ${
                formData.gender === gender
                  ? 'border-[#fecf6a] bg-[#fecf6a] bg-opacity-10 text-[#194a8d]'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              <VenusAndMars className="h-5 w-5 mx-auto mb-1" />
              <span className="text-sm">
                {gender === 'male' ? 'Homme' : 
                 gender === 'female' ? 'Femme' : 
                 gender === 'other' ? 'Autre' : 'Préfère ne pas dire'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Langue préférée */}
      <div>
        <label htmlFor="preferred_language" className="block text-sm font-medium text-gray-700 mb-1">
          Langue préférée
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Globe className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id="preferred_language"
            value={formData.preferred_language}
            onChange={(e) => handleInputChange('preferred_language', e.target.value)}
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent appearance-none bg-white"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Préférences de notification */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Préférences de notification
        </label>
        <div className="space-y-2">
          {Object.entries(formData.notification_preferences).map(([key, value]) => (
            <label key={key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={value}
                onChange={() => handleNotificationChange(key as keyof typeof formData.notification_preferences)}
                className="rounded border-gray-300 text-[#fecf6a] focus:ring-[#fecf6a]"
              />
              <Bell className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                {key === 'email' ? 'Email' : key === 'sms' ? 'SMS' : 'Notifications push'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Question de sécurité */}
      <div>
        <label htmlFor="security_question" className="block text-sm font-medium text-gray-700 mb-1">
          Question de sécurité *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Shield className="h-5 w-5 text-gray-400" />
          </div>
          <select
            id="security_question"
            required
            value={formData.security_question}
            onChange={(e) => handleInputChange('security_question', e.target.value)}
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent appearance-none bg-white"
          >
            <option value="">Sélectionnez une question de sécurité</option>
            {securityQuestions.map((question) => (
              <option key={question.value} value={question.value}>
                {question.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Réponse de sécurité */}
      {formData.security_question && (
        <div>
          <label htmlFor="security_answer" className="block text-sm font-medium text-gray-700 mb-1">
            Réponse de sécurité *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Shield className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="security_answer"
              type="text"
              required
              minLength={2}
              value={formData.security_answer}
              onChange={(e) => handleInputChange('security_answer', e.target.value)}
              className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
              placeholder="Votre réponse"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Cette information vous aidera à récupérer votre compte si nécessaire
          </p>
        </div>
      )}

      {/* Code de parrainage */}
      <div>
        <label htmlFor="referral_code" className="block text-sm font-medium text-gray-700 mb-1">
          Code de parrainage (optionnel)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="referral_code"
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fecf6a] focus:border-transparent"
            placeholder="Entrez le code de parrainage"
          />
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      {/* Conditions d'utilisation */}
      <div>
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={formData.terms_accepted}
            onChange={(e) => handleInputChange('terms_accepted', e.target.checked)}
            className="mt-1 rounded border-gray-300 text-[#fecf6a] focus:ring-[#fecf6a]"
          />
          <div className="text-sm text-gray-700">
            <span className="font-medium">J'accepte les </span>
            <Link href="/terms" className="text-[#194a8d] hover:underline">
              conditions d'utilisation
            </Link>
            <span className="font-medium"> *</span>
          </div>
        </label>
      </div>

      {/* Politique de confidentialité */}
      <div>
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={formData.privacy_policy_accepted}
            onChange={(e) => handleInputChange('privacy_policy_accepted', e.target.checked)}
            className="mt-1 rounded border-gray-300 text-[#fecf6a] focus:ring-[#fecf6a]"
          />
          <div className="text-sm text-gray-700">
            <span className="font-medium">J'accepte la </span>
            <Link href="/privacy" className="text-[#194a8d] hover:underline">
              politique de confidentialité
            </Link>
            <span className="font-medium"> *</span>
          </div>
        </label>
      </div>

      {/* Récapitulatif */}
      {/* <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Récapitulatif de votre inscription</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Type de compte:</strong> {userType === 'player' ? 'Joueur' : 'Portefeuille Électronique'}</p>
          <p><strong>Pays:</strong> {selectedCountry}</p>
          <p><strong>Ville:</strong> {selectedState}</p>
          <p><strong>Langue:</strong> {languages.find(l => l.value === formData.preferred_language)?.label}</p>
          <p><strong>Âge:</strong> {formData.date_of_birth ? calculateAge(formData.date_of_birth) + ' ans' : 'Non spécifié'}</p>
        </div>
      </div> */}
    </div>
  )

  return (
    <div className="flex items-center justify-center bg-gray-50 py-24 px-4 sm:px-6 lg:px-8 min-h-screen">
      <Header />
      <div className="max-w-4xl w-full space-y-8 bg-white rounded-2xl shadow-2xl p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#194a8d]">
            Créez votre compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Étape {step} sur 3
          </p>
          
          {/* Progress bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#fecf6a] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Messages d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600 text-sm text-center font-medium">
                {error}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex space-x-3">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Précédent
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={isLoading}
                className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#fecf6a] hover:bg-[#df1c44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#fecf6a] hover:bg-[#df1c44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création du compte...
                  </div>
                ) : (
                  'Créer mon compte'
                )}
              </button>
            )}
          </div>

          {step === 1 && (
            <div className="text-center">
              <Link
                href="/auth/login"
                className="font-medium text-[#194a8d] hover:text-[#df1c44] transition-colors"
              >
                Vous avez déjà un compte ? Connectez-vous
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}