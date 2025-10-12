// app/dashboard/become-agent/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  MapPin, 
  IdCard, 
  CheckCircle, 
  XCircle,
  Shield,
  DollarSign,
  Building,
  CreditCard,
  Plus,
  Trash2,
  Globe
} from 'lucide-react'
import { fr } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

// Countries data
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

interface AgentForm {
  name: string
  country: string
  state: string
  has_bank_account: boolean
  terms_accepted: boolean
  paypal_email?: string
  paypal_account_name?: string
}

interface PaymentAccount {
  payment_method_id: string
  account_number: string
  account_name: string
  is_primary: boolean
  payment_method_name?: string
}

interface PaymentMethod {
  id: string
  name: string
  code: string
}

export default function BecomeAgentPage() {
  const [formData, setFormData] = useState<AgentForm>({
    name: '',
    country: '',
    state: '',
    has_bank_account: false,
    terms_accepted: false,
    paypal_email: '',
    paypal_account_name: ''
  })
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [existingAgent, setExistingAgent] = useState<any>(null)
  const [availableStates, setAvailableStates] = useState<string[]>([])

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUserAndAgent()
    loadPaymentMethods()
  }, [])

  useEffect(() => {
    // Update available states when country changes
    if (formData.country && countries[formData.country as keyof typeof countries]) {
      setAvailableStates(countries[formData.country as keyof typeof countries])
      // Reset state when country changes
      setFormData(prev => ({ ...prev, state: '' }))
    } else {
      setAvailableStates([])
    }
  }, [formData.country])

  const loadPaymentMethods = async () => {
    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
    if (data) setPaymentMethods(data)
  }

  const checkUserAndAgent = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (agent) {
        setExistingAgent(agent)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, country, state, phone_number')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserProfile(profile)
        setFormData(prev => ({
          ...prev,
          name: profile.username || '',
          country: profile.country || '',
          state: profile.state || ''
        }))
      }

    } catch (error) {
      console.error('Error checking user:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la vérification du compte' })
    } finally {
      setIsLoading(false)
    }
  }

  const addPaymentAccount = () => {
    setPaymentAccounts(prev => [...prev, {
      payment_method_id: '',
      account_number: '',
      account_name: '',
      is_primary: prev.length === 0
    }])
  }

  const removePaymentAccount = (index: number) => {
    setPaymentAccounts(prev => prev.filter((_, i) => i !== index))
  }

  const updatePaymentAccount = (index: number, field: keyof PaymentAccount, value: any) => {
    setPaymentAccounts(prev => prev.map((account, i) => {
      if (i === index) {
        const updatedAccount = { ...account, [field]: value }
        
        // If payment method is selected, set the payment method name
        if (field === 'payment_method_id' && value) {
          const method = paymentMethods.find(m => m.id === value)
          if (method) {
            updatedAccount.payment_method_name = method.name
          }
        }
        
        return updatedAccount
      }
      // If setting one as primary, others become not primary
      if (field === 'is_primary' && value) {
        return { ...account, is_primary: false }
      }
      return account
    }))
  }

  const validatePaymentAccounts = () => {
    if (paymentAccounts.length === 0) {
      return 'Vous devez ajouter au moins un moyen de paiement'
    }

    for (const account of paymentAccounts) {
      if (!account.payment_method_id) {
        return 'Veuillez sélectionner un type de paiement pour tous les comptes'
      }
      if (!account.account_number.trim()) {
        return 'Veuillez saisir le numéro de compte pour tous les moyens de paiement'
      }
      
      // PayPal validation
      if (account.payment_method_name === 'PayPal') {
        if (!account.account_number.includes('@')) {
          return 'L\'adresse PayPal doit être une adresse email valide'
        }
        if (account.account_number.trim().length < 5) {
          return 'L\'adresse PayPal doit contenir au moins 5 caractères'
        }
      } else {
        // Other payment methods
        if (account.account_number.trim().length < 5) {
          return 'Le numéro de compte doit contenir au moins 5 caractères'
        }
      }
    }

    const primaryExists = paymentAccounts.some(acc => acc.is_primary)
    if (!primaryExists) {
      return 'Veuillez sélectionner un moyen de paiement principal'
    }

    return null
  }

  const generateAgentCode = () => {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 6)
    return `AGT-${timestamp}-${random}`.toUpperCase()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Validate form
      if (formData.name.length < 3) {
        setMessage({ type: 'error', text: 'Le nom doit contenir au moins 3 caractères' })
        return
      }

      if (!formData.country) {
        setMessage({ type: 'error', text: 'Veuillez sélectionner votre pays' })
        return
      }

      if (!formData.state) {
        setMessage({ type: 'error', text: 'Veuillez sélectionner votre état/province' })
        return
      }

      if (!formData.has_bank_account) {
        setMessage({ type: 'error', text: 'Vous devez confirmer avoir un compte bancaire pour devenir agent' })
        return
      }

      // Validate PayPal information if bank account is confirmed
      if (formData.has_bank_account) {
        if (!formData.paypal_email) {
          setMessage({ type: 'error', text: 'Veuillez saisir votre adresse PayPal' })
          return
        }
        
        if (!formData.paypal_email.includes('@')) {
          setMessage({ type: 'error', text: 'Veuillez saisir une adresse PayPal valide' })
          return
        }

        if (formData.paypal_email.trim().length < 5) {
          setMessage({ type: 'error', text: 'L\'adresse PayPal doit contenir au moins 5 caractères' })
          return
        }
      }

      if (!formData.terms_accepted) {
        setMessage({ type: 'error', text: 'Vous devez accepter les conditions pour devenir agent' })
        return
      }

      const paymentValidationError = validatePaymentAccounts()
      if (paymentValidationError) {
        setMessage({ type: 'error', text: paymentValidationError })
        return
      }

      // Update user profile with country and state
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          country: formData.country,
          state: formData.state,
          username: formData.name
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Generate unique agent code
      const agentCode = generateAgentCode()

      // Create agent record - Set currency to USD for all agents
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .insert({
          user_id: user.id,
          code: agentCode,
          name: formData.name,
          region: `${formData.country} - ${formData.state}`,
          country: formData.country,
          state: formData.state,
          balance: 0.00,
          available_balance: 0.00,
          platform_balance: 0.00,
          has_bank_account: formData.has_bank_account,
          bank_account_verified: false,
          verification_status: 'pending',
          is_active: true,
          currency_code: 'USD' // Always set to US Dollars
        })
        .select()
        .single()

      if (agentError) throw agentError

      // Create payment accounts from the payment accounts array
      if (paymentAccounts.length > 0) {
        const { error: paymentError } = await supabase
          .from('agent_payment_accounts')
          .insert(
            paymentAccounts.map(account => ({
              agent_id: agent.id,
              payment_method_id: account.payment_method_id,
              account_number: account.account_number.trim(),
              account_name: account.account_name.trim() || formData.name,
              is_primary: account.is_primary,
              current_balance: 0.00,
              // is_verified: false
              is_verified: true
            }))
          )

        if (paymentError) throw paymentError
      }

      // Also add PayPal as a payment method if bank account is confirmed and PayPal email is provided
      if (formData.has_bank_account && formData.paypal_email) {
        const paypalMethod = paymentMethods.find(m => m.code === 'paypal')
        if (paypalMethod) {
          // Check if PayPal is already in paymentAccounts to avoid duplicates
          const hasPayPalAlready = paymentAccounts.some(account => 
            account.payment_method_id === paypalMethod.id
          )

          if (!hasPayPalAlready) {
            const { error: paypalError } = await supabase
              .from('agent_payment_accounts')
              .insert({
                agent_id: agent.id,
                payment_method_id: paypalMethod.id,
                account_number: formData.paypal_email.trim(),
                account_name: formData.paypal_account_name?.trim() || formData.name,
                is_primary: paymentAccounts.length === 0, // Set as primary if no other payment methods
                current_balance: 0.00,
                is_verified: false
              })

            if (paypalError) throw paypalError
          }
        }
      }

      setMessage({ 
        type: 'success', 
        text: `Félicitations ! Votre demande d'agent a été soumise avec succès. Votre code agent est: ${agentCode}. Vous serez redirigé vers votre tableau de bord agent dans quelques secondes.` 
      })

      // Update user type to agent in profiles
      await supabase
        .from('profiles')
        .update({ user_type: 'agent' })
        .eq('id', user.id)

      setTimeout(() => {
        router.push('/dashboard/agent')
      }, 3000)

    } catch (error: any) {
      console.error('Error creating agent:', error)
      
      if (error.code === '23505') {
        setMessage({ type: 'error', text: 'Vous avez déjà un compte agent. Veuillez vérifier votre tableau de bord.' })
      } else if (error.code === '42501') {
        setMessage({ type: 'error', text: 'Erreur de permission. Veuillez vous reconnecter et réessayer.' })
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setMessage({ type: 'error', text: 'Erreur de connexion. Veuillez vérifier votre internet et réessayer.' })
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la création du compte agent: ' + (error.message || 'Erreur inconnue') })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Vérification de votre compte...</p>
        </div>
      </div>
    )
  }

  if (existingAgent) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground font-heading mb-4">
              Vous êtes déjà Agent !
            </h1>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">Informations de votre compte agent</h3>
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-green-700">Nom:</span>
                  <span className="font-medium">{existingAgent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Code Agent:</span>
                  <span className="font-mono font-bold text-green-800">{existingAgent.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Pays:</span>
                  <span className="font-medium">{existingAgent.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">État/Province:</span>
                  <span className="font-medium">{existingAgent.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Statut:</span>
                  <span className={`font-medium ${existingAgent.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {existingAgent.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Solde:</span>
                  <span className="font-bold text-green-800">{existingAgent.balance}$</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard/agent')}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Tableau de bord Agent
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Building className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            Devenir Agent Betadame
          </h1>
          <p className="text-gray-600 mt-2">
            Rejoignez notre réseau d'agents et gagnez des commissions
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Avantages d'être agent Betadame
          </h3>
          <ul className="space-y-2 text-blue-700">
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Commission sur chaque transaction
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Accès à l'interface agent dédiée
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Support prioritaire
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Croissance avec la plateforme
            </li>
          </ul>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Agent Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Nom de l'agent *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Votre nom complet"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                minLength={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ce nom sera visible par les utilisateurs
              </p>
            </div>

            {/* Country and State */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="h-4 w-4 inline mr-2" />
                  Pays *
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="">Sélectionnez votre pays</option>
                  {Object.keys(countries).map(country => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  État/Province *
                </label>
                <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                  disabled={!formData.country}
                >
                  <option value="">Sélectionnez votre état/province</option>
                  {availableStates.map(state => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {!formData.country && (
                  <p className="text-xs text-gray-500 mt-1">
                    Veuillez d'abord sélectionner un pays
                  </p>
                )}
              </div>
            </div>

<div className="space-y-4">
  {/* Bank Account Verification */}
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <input
        type="checkbox"
        id="has_bank_account"
        name="has_bank_account"
        checked={formData.has_bank_account}
        onChange={handleInputChange}
        className="mt-1 text-primary focus:ring-primary"
        required
      />
      <div>
        <label htmlFor="has_bank_account" className="font-medium text-foreground">
          <CreditCard className="h-4 w-4 inline mr-2" />
          Je confirme avoir un compte bancaire actif
        </label>
        <p className="text-sm text-gray-600 mt-1">
          La possession d'un compte bancaire est obligatoire pour devenir agent Betadame. 
          Ce compte sera utilisé pour le versement de vos commissions.
        </p>
      </div>
    </div>
  </div>

  {/* PayPal Information - Only show if has_bank_account is checked */}
  {formData.has_bank_account && (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
      <h3 className="font-medium text-blue-800 mb-4 flex items-center">
        <CreditCard className="h-5 w-5 mr-2" />
        Informations PayPal pour les paiements
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="paypal_email" className="block text-sm font-medium text-gray-700 mb-2">
            Adresse PayPal *
          </label>
          <input
            type="email"
            id="paypal_email"
            name="paypal_email"
            value={formData.paypal_email || ''}
            onChange={handleInputChange}
            placeholder="votre@email.paypal.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            required={formData.has_bank_account}
          />
          <p className="text-xs text-gray-500 mt-1">
            Votre adresse email associée à PayPal
          </p>
        </div>

        <div>
          <label htmlFor="paypal_account_name" className="block text-sm font-medium text-gray-700 mb-2">
            Nom sur le compte PayPal
          </label>
          <input
            type="text"
            id="paypal_account_name"
            name="paypal_account_name"
            value={formData.paypal_account_name || ''}
            onChange={handleInputChange}
            placeholder="Nom tel qu'affiché sur PayPal"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Le nom associé à votre compte PayPal
          </p>
        </div>
      </div>

      <div className="mt-3 p-3 bg-blue-100 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Important:</strong> Assurez-vous que votre compte PayPal est vérifié et actif. 
          Tous les paiements de commissions seront envoyés à cette adresse PayPal.
        </p>
      </div>
    </div>
  )}

  {/* Terms and Conditions */}
  <div className="border border-gray-200 rounded-lg p-4">
    <div className="flex items-start space-x-3">
      <input
        type="checkbox"
        id="terms_accepted"
        name="terms_accepted"
        checked={formData.terms_accepted}
        onChange={handleInputChange}
        className="mt-1 text-primary focus:ring-primary"
        required
      />
      <div>
        <label htmlFor="terms_accepted" className="font-medium text-foreground">
          J'accepte les conditions d'agent Betadame
        </label>
        <p className="text-sm text-gray-600 mt-1">
          En cochant cette case, je certifie que j'ai lu et accepté le{' '}
          <a 
            href="/terms/agent-contract" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            contrat d'agent
          </a>
          {' '}et la{' '}
          <a 
            href="/privacy-policy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            politique de confidentialité
          </a>
          . Je m'engage à respecter les règles de la plateforme.
        </p>
      </div>
    </div>
  </div>
</div>

            {/* Payment Methods */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">
                  <CreditCard className="h-4 w-4 inline mr-2" />
                  Ces informations permettent à vos clients de savoir comment vous pouvez traiter leurs demandes de transaction.
                </h3>
                <button
                  type="button"
                  onClick={addPaymentAccount}
                  className="flex items-center space-x-2 text-primary hover:text-blue-700 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter un moyen</span>
                </button>
              </div>

              <div className="space-y-4">
                {paymentAccounts.map((account, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Moyen de paiement #{index + 1}</h4>
                      {paymentAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePaymentAccount(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type de paiement *
                        </label>
                        <select
                          value={account.payment_method_id}
                          onChange={(e) => updatePaymentAccount(index, 'payment_method_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                          required
                        >
                          <option value="">Sélectionnez...</option>
                          {paymentMethods.map(method => (
                            <option key={method.id} value={method.id}>
                              {method.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {account.payment_method_name === 'PayPal' ? 'Adresse PayPal *' : 'Numéro de compte *'}
                        </label>
                        <input
                          type={account.payment_method_name === 'PayPal' ? 'email' : 'text'}
                          value={account.account_number}
                          onChange={(e) => updatePaymentAccount(index, 'account_number', e.target.value)}
                          placeholder={
                            account.payment_method_name === 'PayPal' 
                              ? 'votre@email.paypal.com' 
                              : account.payment_method_name === 'Mobile Money' 
                                ? '06XXXXXXXX' 
                                : 'Numéro de compte'
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                          required
                          minLength={5}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nom sur le compte
                        </label>
                        <input
                          type="text"
                          value={account.account_name}
                          onChange={(e) => updatePaymentAccount(index, 'account_name', e.target.value)}
                          placeholder="Nom associé au compte"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`primary-${index}`}
                          checked={account.is_primary}
                          onChange={(e) => updatePaymentAccount(index, 'is_primary', e.target.checked)}
                          className="mr-2 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`primary-${index}`} className="text-sm text-gray-700">
                          Moyen de paiement principal
                        </label>
                      </div>
                    </div>

                    {account.payment_method_name === 'PayPal' && (
                      <div className="mt-2 p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-700">
                          💡 Assurez-vous que votre adresse PayPal est correcte et vérifiée. 
                          Les paiements seront envoyés à cette adresse.
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {paymentAccounts.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Aucun moyen de paiement ajouté</p>
                    <button
                      type="button"
                      onClick={addPaymentAccount}
                      className="mt-2 text-primary hover:text-blue-700 font-medium"
                    >
                      Ajouter votre premier moyen de paiement
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Ces informations seront utilisées pour vous verser vos commissions. 
                Pour PayPal, utilisez votre adresse email associée à votre compte PayPal.
                Vous pourrez modifier ces informations depuis votre tableau de bord agent.
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="terms_accepted"
                  name="terms_accepted"
                  checked={formData.terms_accepted}
                  onChange={handleInputChange}
                  className="mt-1 text-primary focus:ring-primary"
                  required
                />
                <div>
                  <label htmlFor="terms_accepted" className="font-medium text-foreground">
                    J'accepte les conditions d'agent Betadame
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    En cochant cette case, je certifie que j'ai lu et accepté le{' '}
                    <button type="button" className="text-primary hover:underline">
                      contrat d'agent
                    </button>
                    {' '}et la{' '}
                    <button type="button" className="text-primary hover:underline">
                      politique de confidentialité
                    </button>
                    . Je m'engage à respecter les règles de la plateforme.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Commission Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Structure de commission
            </h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Dépôts: 2% du montant déposé</li>
              <li>• Retraits: 1% du montant retiré</li>
              <li>• Paiements effectués tous les vendredis</li>
              <li>• Solde minimum de retrait: 10$</li>
            </ul>
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                {message.text}
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center space-x-2 bg-secondary text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IdCard className="h-4 w-4" />
              <span>{isSubmitting ? 'Inscription...' : 'Devenir Agent'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>

        {/* Requirements */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="font-semibold text-foreground mb-4">Conditions requises</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Être majeur (18 ans ou plus)
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Résider au Congo (Brazzaville ou RDC)
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Avoir une pièce d'identité valide
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Disposer d'un compte bancaire actif (obligatoire)
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Avoir au moins un moyen de paiement configuré (PayPal, Mobile Money, etc.)
            </li>
            <li className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Aucun antécédent judiciaire
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}