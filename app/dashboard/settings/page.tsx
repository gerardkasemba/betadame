// app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Mail, 
  MapPin, 
  Phone, 
  Camera, 
  Save, 
  Shield,
  Bell,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { fr } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  username: string
  email: string
  region: string
  phone_number: string
  avatar_url: string | null
  is_verified: boolean
  created_at: string
  updated_at: string
}

interface SettingsForm {
  username: string
  email: string
  region: string
  phone_number: string
  current_password: string
  new_password: string
  confirm_password: string
  notifications: {
    game_invites: boolean
    game_updates: boolean
    promotions: boolean
    security_alerts: boolean
  }
  privacy: {
    profile_public: boolean
    show_online_status: boolean
    allow_friend_requests: boolean
  }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState<SettingsForm>({
    username: '',
    email: '',
    region: 'brazzaville',
    phone_number: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
    notifications: {
      game_invites: true,
      game_updates: true,
      promotions: false,
      security_alerts: true
    },
    privacy: {
      profile_public: true,
      show_online_status: true,
      allow_friend_requests: true
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'privacy'>('profile')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfile(profile)
        setFormData(prev => ({
          ...prev,
          username: profile.username,
          email: profile.email,
          region: profile.region,
          phone_number: profile.phone_number
        }))
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement du profil' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    if (name.startsWith('notifications.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [field]: checked
        }
      }))
    } else if (name.startsWith('privacy.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        privacy: {
          ...prev.privacy,
          [field]: checked
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Validate username
      if (formData.username.length < 3) {
        setMessage({ type: 'error', text: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' })
        return
      }

      // Validate phone number (Congo format)
      const phoneRegex = /^(?:\+242|0)[0-9]{9}$/
      if (!phoneRegex.test(formData.phone_number)) {
        setMessage({ type: 'error', text: 'Numéro de téléphone invalide. Format: +242XXXXXXXXX ou 0XXXXXXXXX' })
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          region: formData.region,
          phone_number: formData.phone_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès' })
      fetchProfile() // Refresh profile data
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      if (formData.new_password !== formData.confirm_password) {
        setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' })
        return
      }

      if (formData.new_password.length < 6) {
        setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' })
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.new_password
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès' })
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }))
    } catch (error) {
      console.error('Error changing password:', error)
      setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      // Save notification and privacy settings to localStorage or your backend
      localStorage.setItem('notification_settings', JSON.stringify(formData.notifications))
      localStorage.setItem('privacy_settings', JSON.stringify(formData.privacy))

      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' })
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde des paramètres' })
    } finally {
      setIsSaving(false)
    }
  }

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const regions = [
    { value: 'brazzaville', label: 'Brazzaville' },
    { value: 'pointe_noire', label: 'Pointe-Noire' },
    { value: 'dolisie', label: 'Dolisie' },
    { value: 'nkayi', label: 'Nkayi' },
    { value: 'other', label: 'Autre' }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Chargement de vos paramètres...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-foreground font-heading">
              Paramètres du Compte
            </h1>
            <p className="text-gray-600 mt-2">
              Gérez vos informations personnelles et vos préférences
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6">
            <nav className="flex space-x-8">
              {[
                { id: 'profile', label: 'Profil', icon: User },
                { id: 'security', label: 'Sécurité', icon: Shield },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'privacy', label: 'Confidentialité', icon: Eye }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
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

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-2" />
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Adresse email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    L'adresse email ne peut pas être modifiée
                  </p>
                </div>

                {/* Region */}
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Région
                  </label>
                  <select
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {regions.map(region => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="h-4 w-4 inline mr-2" />
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="+242XXXXXXXXX"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: +242XXXXXXXXX ou 0XXXXXXXXX
                  </p>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Informations du compte</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Statut de vérification:</span>
                    <span className={`ml-2 font-medium ${profile?.is_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {profile?.is_verified ? 'Vérifié' : 'En attente'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Membre depuis:</span>
                    <span className="ml-2 font-medium">
                      {profile ? new Date(profile.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-primary text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                {/* New Password */}
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? "text" : "password"}
                      id="new_password"
                      name="new_password"
                      value={formData.new_password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      id="confirm_password"
                      name="confirm_password"
                      value={formData.confirm_password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Conseils de sécurité</h4>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Utilisez au moins 6 caractères</li>
                  <li>Combinez lettres, chiffres et symboles</li>
                  <li>N'utilisez pas de mots de passe courants</li>
                  <li>Changez votre mot de passe régulièrement</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-primary text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shield className="h-4 w-4" />
                  <span>{isSaving ? 'Modification...' : 'Changer le mot de passe'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Préférences de notification</h3>
                
                {[
                  { id: 'game_invites', label: 'Invitations à des parties', description: 'Recevoir des notifications lorsqu\'on vous invite à une partie' },
                  { id: 'game_updates', label: 'Mises à jour de parties', description: 'Recevoir des notifications sur le statut de vos parties en cours' },
                  { id: 'promotions', label: 'Offres promotionnelles', description: 'Recevoir des offres spéciales et des promotions' },
                  { id: 'security_alerts', label: 'Alertes de sécurité', description: 'Recevoir des alertes importantes concernant la sécurité de votre compte' }
                ].map((setting) => (
                  <div key={setting.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id={setting.id}
                      name={`notifications.${setting.id}`}
                      checked={formData.notifications[setting.id as keyof typeof formData.notifications]}
                      onChange={handleInputChange}
                      className="mt-1 text-primary focus:ring-primary"
                    />
                    <div>
                      <label htmlFor={setting.id} className="font-medium text-foreground">
                        {setting.label}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                ))}

              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-primary text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder les préférences'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Paramètres de confidentialité</h3>
                
                {[
                  { id: 'profile_public', label: 'Profil public', description: 'Permettre à d\'autres joueurs de voir votre profil et vos statistiques' },
                  { id: 'show_online_status', label: 'Statut en ligne', description: 'Afficher votre statut en ligne aux autres joueurs' },
                  { id: 'allow_friend_requests', label: 'Demandes d\'ami', description: 'Autoriser les autres joueurs à vous envoyer des demandes d\'ami' }
                ].map((setting) => (
                  <div key={setting.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id={setting.id}
                      name={`privacy.${setting.id}`}
                      checked={formData.privacy[setting.id as keyof typeof formData.privacy]}
                      onChange={handleInputChange}
                      className="mt-1 text-primary focus:ring-primary"
                    />
                    <div>
                      <label htmlFor={setting.id} className="font-medium text-foreground">
                        {setting.label}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Respect de votre vie privée</h4>
                <p className="text-sm text-blue-700">
                  Nous nous engageons à protéger vos données personnelles. Vos informations ne seront jamais 
                  partagées avec des tiers sans votre consentement explicite.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 bg-primary text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}