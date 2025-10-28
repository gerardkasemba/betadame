'use client'

import { useState, useEffect } from 'react'
import { 
  X,
  Upload,
  Image as ImageIcon,
  Plus,
  Trophy,
  Users as TeamIcon,
  AlertCircle,
  Calculator
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Interfaces
interface Country {
  id: string
  code: string
  name: string
  flag_emoji: string
}

interface Category {
  id: string
  name: string
  icon: string
}

interface SportType {
  id: string
  name: string
  icon: string
}

interface League {
  id: string
  sport_type_id: string
  name: string
  country_code: string | null
  level: string
}

interface Team {
  id: string
  name: string
  short_name: string | null
  country_code: string
  sport_type_id: string
  logo_url: string | null
  team_type: 'club' | 'national'
}

interface MatchType {
  id: string
  name: string
  description: string | null
}

interface MarketOutcome {
  title: string
  description: string
  image_url?: string
  yes_price: number
  no_price: number
  total_yes_shares: number
  total_no_shares: number
}

interface MarketTeam {
  team_id: string
  team_type: 'home' | 'away'
}

interface MarketForm {
  title: string
  description: string
  category_id: string
  market_type: 'binary' | 'multiple' | 'sports'
  image_url: string
  start_date: string
  end_date: string
  resolution_date: string
  initial_liquidity: number
  min_bet_amount: number
  max_bet_amount: number
  outcomes: MarketOutcome[]
  country_id: string
  sport_type_id: string
  league_id: string
  match_type_id: string
  game_date: string
  teams: MarketTeam[]
}

interface CreateMarketModalProps {
  isOpen: boolean
  onClose: () => void
  onMarketCreated: () => void
  countries: Country[]
  categories: Category[]
  sportTypes: SportType[]
  leagues: League[]
  teams: Team[]
  matchTypes: MatchType[]
}

const marketTypes = [
  { value: 'binary', label: 'Binaire (Oui/Non)', description: 'Question simple Oui/Non' },
  { value: 'multiple', label: 'Choix Multiple', description: 'Plusieurs options avec Oui/Non pour chacune' },
  { value: 'sports', label: 'Sports', description: 'Événements sportifs avec options multiples' }
]

export default function CreateMarketModal({
  isOpen,
  onClose,
  onMarketCreated,
  countries,
  categories,
  sportTypes,
  leagues,
  teams,
  matchTypes
}: CreateMarketModalProps) {
  const [marketForm, setMarketForm] = useState<MarketForm>({
    title: '',
    description: '',
    category_id: '',
    market_type: 'binary', // Start with binary to avoid confusion
    image_url: '',
    start_date: '',
    end_date: '',
    resolution_date: '',
    initial_liquidity: 100,
    min_bet_amount: 1,
    max_bet_amount: 10000,
    outcomes: [],
    country_id: '',
    sport_type_id: '',
    league_id: '',
    match_type_id: '',
    game_date: '',
    teams: [
      { team_id: '', team_type: 'home' },
      { team_id: '', team_type: 'away' }
    ]
  })

  const [isUploading, setIsUploading] = useState(false)
  const [uploadingOutcomeIndex, setUploadingOutcomeIndex] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  
  const [filteredLeagues, setFilteredLeagues] = useState<League[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])

  const supabase = createClient()

  // Initialize form with defaults
  useEffect(() => {
    if (isOpen && categories.length > 0 && countries.length > 0) {
      const generalCategory = categories.find(c => c.name === 'General' || c.name === 'Général') || categories[0]
      const drcCountry = countries.find(c => c.code === 'CD') || countries[0]
      
      setMarketForm(prev => ({
        ...prev,
        category_id: generalCategory?.id || '',
        country_id: drcCountry?.id || ''
      }))
    }
  }, [isOpen, categories, countries])

  // Filter leagues when sport type changes
  useEffect(() => {
    if (marketForm.sport_type_id) {
      const filtered = leagues.filter(league => league.sport_type_id === marketForm.sport_type_id)
      setFilteredLeagues(filtered)
      setMarketForm(prev => ({ ...prev, league_id: '' }))
    } else {
      setFilteredLeagues([])
    }
  }, [marketForm.sport_type_id, leagues])

  // Filter teams when sport type changes
  useEffect(() => {
    if (marketForm.sport_type_id) {
      const filtered = teams.filter(team => team.sport_type_id === marketForm.sport_type_id)
      setFilteredTeams(filtered)
      // Reset team selections when sport changes
      setMarketForm(prev => ({
        ...prev,
        teams: [
          { team_id: '', team_type: 'home' },
          { team_id: '', team_type: 'away' }
        ]
      }))
    } else {
      setFilteredTeams([])
    }
  }, [marketForm.sport_type_id, teams])

  // FIXED: Proper market type change handler with auto-sync
  const handleMarketTypeChange = (newMarketType: 'binary' | 'multiple' | 'sports') => {
    let newCategoryId = marketForm.category_id;
    
    // Auto-sync category with market type
    if (newMarketType === 'sports') {
      const sportsCategory = categories.find(c => c.name === 'Sports')
      newCategoryId = sportsCategory?.id || marketForm.category_id;
    } else if (newMarketType === 'binary' && marketForm.category_id === getCategoryIdByName('Sports')) {
      // If changing from sports to binary, set to general category
      const generalCategory = categories.find(c => c.name === 'General' || c.name === 'Général') || categories[0]
      newCategoryId = generalCategory?.id || '';
    }
    
    setMarketForm(prev => ({
      ...prev,
      market_type: newMarketType,
      category_id: newCategoryId
    }));
  };

  // FIXED: Separate effects for different market types
  useEffect(() => {
    // Only initialize outcomes when market type changes AND outcomes are empty
    // This prevents overwriting user-added options
    
    if (marketForm.market_type === 'binary' && marketForm.outcomes.length === 0) {
      setMarketForm(prev => ({
        ...prev,
        outcomes: [
          { 
            title: 'Oui', 
            description: 'L\'événement se produira', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          },
          { 
            title: 'Non', 
            description: 'L\'événement ne se produira pas', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          }
        ]
      }))
    } else if (marketForm.market_type === 'multiple' && marketForm.outcomes.length === 0) {
      // Start with 2 options, but user can add infinite more using the "Add Option" button
      setMarketForm(prev => ({
        ...prev,
        outcomes: [
          { 
            title: 'Option 1', 
            description: '', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          },
          { 
            title: 'Option 2', 
            description: '', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          }
        ]
      }))
    } else if (marketForm.market_type === 'binary' && marketForm.outcomes.length !== 2) {
      // If switching to binary and have wrong number of outcomes, reset to 2
      setMarketForm(prev => ({
        ...prev,
        outcomes: [
          { 
            title: 'Oui', 
            description: 'L\'événement se produira', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          },
          { 
            title: 'Non', 
            description: 'L\'événement ne se produira pas', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          }
        ]
      }))
    } else if (marketForm.market_type === 'multiple' && marketForm.outcomes.length < 2) {
      // If switching to multiple and have less than 2 options, reset to 2
      setMarketForm(prev => ({
        ...prev,
        outcomes: [
          { 
            title: 'Option 1', 
            description: '', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          },
          { 
            title: 'Option 2', 
            description: '', 
            yes_price: 0.5, 
            no_price: 0.5, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          }
        ]
      }))
    }
    // Note: For 'multiple', if outcomes.length >= 2, we don't reset - user can have as many as they want
  }, [marketForm.market_type]) // Only depend on market_type

  // FIXED: Separate effect for sports markets
  useEffect(() => {
    if (marketForm.market_type === 'sports') {
      const homeTeam = getTeamByType('home')
      const awayTeam = getTeamByType('away')
      
      setMarketForm(prev => ({
        ...prev,
        outcomes: [
          { 
            title: homeTeam ? `${homeTeam.name} Gagne` : 'Équipe Domicile Gagne', 
            description: homeTeam ? `${homeTeam.name} remporte le match` : 'L\'équipe domicile remporte le match', 
            yes_price: 0.33, 
            no_price: 0.67, 
            total_yes_shares: 0, 
            total_no_shares: 0,
            image_url: homeTeam?.logo_url || ''
          },
          { 
            title: 'Match Nul', 
            description: 'Le match se termine par une égalité', 
            yes_price: 0.33, 
            no_price: 0.67, 
            total_yes_shares: 0, 
            total_no_shares: 0 
          },
          { 
            title: awayTeam ? `${awayTeam.name} Gagne` : 'Équipe Extérieure Gagne', 
            description: awayTeam ? `${awayTeam.name} remporte le match` : 'L\'équipe extérieure remporte le match', 
            yes_price: 0.34, 
            no_price: 0.66, 
            total_yes_shares: 0, 
            total_no_shares: 0,
            image_url: awayTeam?.logo_url || ''
          }
        ]
      }))
    }
  }, [marketForm.market_type, marketForm.teams, filteredTeams]) // Only for sports markets

  // Auto-calculate financial parameters
  useEffect(() => {
    const calculateMarketValues = async () => {
      if (!marketForm.market_type || !marketForm.category_id) return;

      setIsCalculating(true);
      
      const category = categories.find(c => c.id === marketForm.category_id);
      const sportType = sportTypes.find(s => s.id === marketForm.sport_type_id);
      const league = leagues.find(l => l.id === marketForm.league_id);

      try {
        const { data: calculatedParams, error } = await supabase
          .rpc('calculate_market_parameters', {
            p_market_type: marketForm.market_type,
            p_category_name: category?.name || null,
            p_sport_type: sportType?.name || null,
            p_league: league?.name || null,
            p_expected_popularity: 'medium'
          });

        if (!error && calculatedParams && calculatedParams.length > 0) {
          const params = calculatedParams[0];
          setMarketForm(prev => ({
            ...prev,
            initial_liquidity: params.initial_liquidity,
            min_bet_amount: params.min_bet_amount,
            max_bet_amount: params.max_bet_amount
          }));
        }
      } catch (error) {
        console.log('Using default values for market parameters');
      } finally {
        setIsCalculating(false);
      }
    };

    calculateMarketValues();
  }, [marketForm.market_type, marketForm.category_id, marketForm.sport_type_id, marketForm.league_id, categories, sportTypes, leagues, supabase]);

  // Helper functions
  const getCategoryIdByName = (name: string): string => {
    const category = categories.find(c => c.name === name)
    return category?.id || ''
  }

  const getTeamByType = (teamType: 'home' | 'away'): Team | undefined => {
    const teamId = marketForm.teams.find(t => t.team_type === teamType)?.team_id
    return filteredTeams.find(t => t.id === teamId)
  }

  const updateTeam = (teamType: 'home' | 'away', teamId: string) => {
    setMarketForm(prev => ({
      ...prev,
      teams: prev.teams.map(t => 
        t.team_type === teamType ? { ...t, team_id: teamId } : t
      )
    }))
  }

  const addOutcome = () => {
    if (marketForm.market_type !== 'multiple') return;
    
    setMarketForm(prev => ({
      ...prev,
      outcomes: [
        ...prev.outcomes,
        { 
          title: `Option ${prev.outcomes.length + 1}`, 
          description: '', 
          yes_price: 0.5, 
          no_price: 0.5, 
          total_yes_shares: 0, 
          total_no_shares: 0 
        }
      ]
    }))
  }

const updateOutcome = (index: number, field: keyof MarketOutcome, value: any) => {
  setMarketForm(prev => ({
    ...prev,
    outcomes: prev.outcomes.map((outcome, i) => 
      i === index ? { ...outcome, [field]: value } : outcome
    )
  }))
}

const removeOutcome = (index: number) => {
  if (marketForm.market_type !== 'multiple') {
    showMessage('error', 'Suppression non autorisée pour ce type de marché')
    return;
  }
  
  if (marketForm.outcomes.length <= 2) {
    showMessage('error', 'Au moins deux options sont requises')
    return
  }
  
  setMarketForm(prev => ({
    ...prev,
    outcomes: prev.outcomes.filter((_, i) => i !== index)
  }))
}

  // Auto-calculate No price when Yes price changes
const updateYesPrice = (index: number, yesPrice: number) => {
  // Remove the sports market restriction or make it optional
  // if (marketForm.market_type === 'sports') {
  //   showMessage('error', 'Les prix des marchés sportifs sont calculés automatiquement')
  //   return;
  // }
  
  const noPrice = Math.max(0, Math.min(1, 1 - yesPrice))
  setMarketForm(prev => ({
    ...prev,
    outcomes: prev.outcomes.map((outcome, i) => 
      i === index ? { 
        ...outcome, 
        yes_price: yesPrice,
        no_price: noPrice
      } : outcome
    )
  }))
}

  // Upload functions
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `market-images/${fileName}`

      const { data, error } = await supabase.storage
        .from('transaction-proofs')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('transaction-proofs')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      showMessage('error', 'Erreur lors du téléchargement de l\'image')
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const uploadOutcomeImage = async (file: File, outcomeIndex: number): Promise<string | null> => {
    try {
      setUploadingOutcomeIndex(outcomeIndex)
      const fileExt = file.name.split('.').pop()
      const fileName = `outcome-${Date.now()}-${outcomeIndex}.${fileExt}`
      const filePath = `outcome-images/${fileName}`

      const { data, error } = await supabase.storage
        .from('transaction-proofs')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('transaction-proofs')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading outcome image:', error)
      showMessage('error', 'Erreur lors du téléchargement de l\'image')
      return null
    } finally {
      setUploadingOutcomeIndex(null)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Veuillez sélectionner un fichier image valide')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'L\'image ne doit pas dépasser 5MB')
      return
    }

    const imageUrl = await uploadImage(file)
    if (imageUrl) {
      setMarketForm(prev => ({ ...prev, image_url: imageUrl }))
      showMessage('success', 'Image téléchargée avec succès!')
    }
  }

  const handleOutcomeImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, outcomeIndex: number) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'Veuillez sélectionner un fichier image valide')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', 'L\'image ne doit pas dépasser 5MB')
      return
    }

    const imageUrl = await uploadOutcomeImage(file, outcomeIndex)
    if (imageUrl) {
      updateOutcome(outcomeIndex, 'image_url', imageUrl)
      showMessage('success', 'Image d\'option téléchargée avec succès!')
    }
  }

  // Main create market function
  const createMarket = async () => {
    try {
      setIsSubmitting(true)

      if (!marketForm.title.trim()) {
        showMessage('error', 'Le titre est requis')
        return
      }

      if (!marketForm.end_date) {
        showMessage('error', 'La date de fin est requise')
        return
      }

      // Validate sports-specific fields
      const isSportsMarket = marketForm.market_type === 'sports'
      if (isSportsMarket) {
        const homeTeam = marketForm.teams.find(t => t.team_type === 'home')
        const awayTeam = marketForm.teams.find(t => t.team_type === 'away')
        
        if (!homeTeam?.team_id || !awayTeam?.team_id) {
          showMessage('error', 'Les deux équipes sont requises pour les marchés sportifs')
          return
        }
        if (!marketForm.sport_type_id) {
          showMessage('error', 'Le type de sport est requis')
          return
        }
        if (!marketForm.league_id) {
          showMessage('error', 'La ligue est requise')
          return
        }
      }

      // Validate outcomes
      if (marketForm.outcomes.length < 2) {
        showMessage('error', 'Au moins deux options sont requises')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Prepare market data for Supabase insertion
      const marketData: any = {
        title: marketForm.title,
        description: marketForm.description,
        category_id: marketForm.category_id,
        market_type: marketForm.market_type, // This is now correctly set
        image_url: marketForm.image_url || null,
        initial_liquidity: marketForm.initial_liquidity,
        min_bet_amount: marketForm.min_bet_amount,
        max_bet_amount: marketForm.max_bet_amount,
        country_id: marketForm.country_id || null,
        created_by: user.id,
        status: 'pending'
      }

      console.log('📊 Market data being sent to Supabase:', {
        market_type: marketData.market_type,
        fullData: marketData
      })

      // Handle dates
      if (marketForm.start_date) marketData.start_date = marketForm.start_date
      if (marketForm.end_date) marketData.end_date = marketForm.end_date
      if (marketForm.resolution_date) marketData.resolution_date = marketForm.resolution_date
      if (marketForm.game_date) marketData.game_date = marketForm.game_date

      // Add sports-specific fields only for sports markets
      if (isSportsMarket) {
        marketData.sport_type_id = marketForm.sport_type_id
        marketData.league_id = marketForm.league_id
        marketData.match_type_id = marketForm.match_type_id
        
        // Set team names for quick access
        const homeTeam = getTeamByType('home')
        const awayTeam = getTeamByType('away')
        if (homeTeam) {
          marketData.team_a_name = homeTeam.name
          marketData.team_a_id = homeTeam.id
        }
        if (awayTeam) {
          marketData.team_b_name = awayTeam.name
          marketData.team_b_id = awayTeam.id
        }
        if (homeTeam?.logo_url) marketData.team_a_image = homeTeam.logo_url
        if (awayTeam?.logo_url) marketData.team_b_image = awayTeam.logo_url
      }

      console.log('Creating market with data:', marketData)

      // Create market in Supabase
      const { data: marketDataResult, error: marketError } = await supabase
        .from('markets')
        .insert(marketData)
        .select()
        .single()

      if (marketError) {
        console.error('Market creation error:', marketError)
        throw marketError
      }

      console.log('Market created:', marketDataResult)

      // Create market teams in Supabase for sports markets
      if (isSportsMarket) {
        const { error: teamsError } = await supabase
          .from('market_teams')
          .insert(
            marketForm.teams.map(team => ({
              market_id: marketDataResult.id,
              team_id: team.team_id,
              team_type: team.team_type
            }))
          )

        if (teamsError) {
          console.error('Teams creation error:', teamsError)
          throw teamsError
        }
      }

      // Create outcomes in market_outcomes table
      const { error: outcomesError } = await supabase
        .from('market_outcomes')
        .insert(
          marketForm.outcomes.map((outcome, index) => ({
            market_id: marketDataResult.id,
            title: outcome.title,
            description: outcome.description,
            image_url: outcome.image_url,
            yes_price: outcome.yes_price,
            no_price: outcome.no_price,
            total_yes_shares: 0,
            total_no_shares: 0
          }))
        )

      if (outcomesError) {
        console.error('Outcomes creation error:', outcomesError)
        // Don't throw here as outcomes are also stored in JSONB
        console.log('Outcomes stored in JSONB, continuing...')
      }

      showMessage('success', 'Marché créé avec succès!')
      onMarketCreated()
      handleClose()
    } catch (error) {
      console.error('Error creating market:', error)
      showMessage('error', 'Erreur lors de la création du marché: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setMarketForm({
      title: '',
      description: '',
      category_id: '',
      market_type: 'binary',
      image_url: '',
      start_date: '',
      end_date: '',
      resolution_date: '',
      initial_liquidity: 100,
      min_bet_amount: 1,
      max_bet_amount: 10000,
      outcomes: [],
      country_id: '',
      sport_type_id: '',
      league_id: '',
      match_type_id: '',
      game_date: '',
      teams: [
        { team_id: '', team_type: 'home' },
        { team_id: '', team_type: 'away' }
      ]
    })
    setMessage(null)
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Créer un Nouveau Marché</h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Market Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de marché *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {marketTypes.map(type => (
                <div
                  key={type.value}
                  onClick={() => handleMarketTypeChange(type.value as any)}
                  className={`cursor-pointer p-4 border-2 rounded-lg transition-all ${
                    marketForm.market_type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{type.label}</div>
                  <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Country and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays *
              </label>
              <select
                value={marketForm.country_id}
                onChange={(e) => setMarketForm(prev => ({ ...prev, country_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez un pays</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.flag_emoji} {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              <select
                value={marketForm.category_id}
                onChange={(e) => setMarketForm(prev => ({ ...prev, category_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionnez une catégorie</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Market Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image du marché
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <div className={`flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg transition-colors ${
                    isUploading 
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}>
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {isUploading ? 'Téléchargement...' : 'Choisir une image'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  value={marketForm.image_url}
                  onChange={(e) => setMarketForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="Ou coller une URL d'image..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {marketForm.image_url && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Aperçu:</p>
                  <img 
                    src={marketForm.image_url} 
                    alt="Aperçu" 
                    className="w-20 h-20 rounded-lg object-cover border"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sports-specific fields - Only show for sports markets */}
          {marketForm.market_type === 'sports' && (
            <>
              <div className="border-t pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-600" />
                  Détails de l'événement sportif
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sport *
                    </label>
                    <select
                      value={marketForm.sport_type_id}
                      onChange={(e) => setMarketForm(prev => ({ ...prev, sport_type_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez un sport</option>
                      {sportTypes.map(sport => (
                        <option key={sport.id} value={sport.id}>
                          {sport.icon} {sport.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ligue *
                    </label>
                    <select
                      value={marketForm.league_id}
                      onChange={(e) => setMarketForm(prev => ({ ...prev, league_id: e.target.value }))}
                      disabled={!marketForm.sport_type_id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Sélectionnez une ligue</option>
                      {filteredLeagues.map(league => (
                        <option key={league.id} value={league.id}>
                          {league.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de match *
                    </label>
                    <select
                      value={marketForm.match_type_id}
                      onChange={(e) => setMarketForm(prev => ({ ...prev, match_type_id: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez un type</option>
                      {matchTypes.map(matchType => (
                        <option key={matchType.id} value={matchType.id}>
                          {matchType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teams Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Équipe Domicile *
                    </label>
                    <select
                      value={marketForm.teams.find(t => t.team_type === 'home')?.team_id || ''}
                      onChange={(e) => updateTeam('home', e.target.value)}
                      disabled={!marketForm.sport_type_id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Sélectionnez l'équipe domicile</option>
                      {filteredTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name} {team.short_name && `(${team.short_name})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Équipe Extérieure *
                    </label>
                    <select
                      value={marketForm.teams.find(t => t.team_type === 'away')?.team_id || ''}
                      onChange={(e) => updateTeam('away', e.target.value)}
                      disabled={!marketForm.sport_type_id}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Sélectionnez l'équipe extérieure</option>
                      {filteredTeams
                        .filter(team => team.id !== marketForm.teams.find(t => t.team_type === 'home')?.team_id)
                        .map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name} {team.short_name && `(${team.short_name})`}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {/* Game Date */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date du match
                  </label>
                  <input
                    type="datetime-local"
                    value={marketForm.game_date}
                    onChange={(e) => setMarketForm(prev => ({ ...prev, game_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          {/* Title and Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre du marché *
            </label>
            <input
              type="text"
              value={marketForm.title}
              onChange={(e) => setMarketForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder={
                marketForm.market_type === 'sports' 
                  ? "Ex: Real Madrid vs Barcelona - Qui va gagner?"
                  : "Ex: Qui sera le prochain président de la RDC en 2028?"
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={marketForm.description}
              onChange={(e) => setMarketForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez les critères de résolution..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Outcomes with Yes/No prices */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Options du marché (Oui/Non pour chaque option) *
                <span className="text-xs text-gray-500 block mt-1">
                  {marketForm.market_type === 'sports' 
                    ? 'Les options sont automatiquement générées basées sur les équipes'
                    : 'Configurez chaque option avec ses prix Oui/Non'
                  }
                </span>
              </label>
              {marketForm.market_type === 'multiple' && (
                <button
                  type="button"
                  onClick={addOutcome}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter une option
                </button>
              )}
            </div>

            <div className="space-y-4">
              {marketForm.outcomes.map((outcome, index) => (
                <div key={index} className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-4">
                    {/* Outcome Image - Hide for Match Nul in sports */}
                    {!(marketForm.market_type === 'sports' && outcome.title === 'Match Nul') && (
                      <div className="flex-shrink-0">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Image
                        </label>
                        <div className="space-y-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleOutcomeImageUpload(e, index)}
                              className="hidden"
                              disabled={uploadingOutcomeIndex === index}
                            />
                            <div className={`w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                              uploadingOutcomeIndex === index
                                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                                : outcome.image_url
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                            }`}>
                              {uploadingOutcomeIndex === index ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              ) : outcome.image_url ? (
                                <img 
                                  src={outcome.image_url} 
                                  alt="Option" 
                                  className="w-14 h-14 rounded object-cover"
                                />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Outcome Details */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Option {index + 1} *
                        </label>
                        <input
                          type="text"
                          value={outcome.title}
                          onChange={(e) => updateOutcome(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={outcome.description}
                          onChange={(e) => updateOutcome(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      {/* Yes/No Prices */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Prix Oui (${outcome.yes_price.toFixed(2)})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={outcome.yes_price}
                          onChange={(e) => updateYesPrice(index, parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          Probabilité: <strong>{(outcome.yes_price * 100).toFixed(0)}%</strong>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Prix Non (${outcome.no_price.toFixed(2)})
                        </label>
                        <div className="px-3 py-2 bg-gray-100 rounded text-sm text-gray-700">
                          ${outcome.no_price.toFixed(2)} ({(outcome.no_price * 100).toFixed(0)}%)
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Calculé automatiquement
                        </div>
                      </div>
                    </div>
                    
                    {/* Remove button - Only for multiple markets */}
                    {marketForm.market_type === 'multiple' && marketForm.outcomes.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOutcome(index)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0 mt-6"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Yes/No Preview */}
                  <div className="mt-3 p-3 bg-white rounded border">
                    <div className="text-xs font-medium text-gray-700 mb-2">Aperçu pour les utilisateurs:</div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        Oui: ${outcome.yes_price.toFixed(2)}
                      </span>
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        Non: ${outcome.no_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Settings - Auto-calculated */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Paramètres financiers (Calculés automatiquement)
              {isCalculating && (
                <span className="text-xs text-blue-600 animate-pulse">Calcul en cours...</span>
              )}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Liquidité initiale ($)
                </label>
                <div className="px-4 py-2 bg-white border border-blue-300 rounded-lg text-blue-800 font-medium">
                  ${marketForm.initial_liquidity.toFixed(2)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Basé sur le type de marché et la popularité
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Mise minimale ($)
                </label>
                <div className="px-4 py-2 bg-white border border-blue-300 rounded-lg text-blue-800 font-medium">
                  ${marketForm.min_bet_amount.toFixed(2)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  0.5% de la liquidité initiale
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Mise maximale ($)
                </label>
                <div className="px-4 py-2 bg-white border border-blue-300 rounded-lg text-blue-800 font-medium">
                  ${marketForm.max_bet_amount.toFixed(2)}
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  20% de la liquidité initiale
                </p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de début
              </label>
              <input
                type="datetime-local"
                value={marketForm.start_date}
                onChange={(e) => setMarketForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date de fin *
              </label>
              <input
                type="datetime-local"
                value={marketForm.end_date}
                onChange={(e) => setMarketForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Resolution Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de résolution
            </label>
            <input
              type="datetime-local"
              value={marketForm.resolution_date}
              onChange={(e) => setMarketForm(prev => ({ ...prev, resolution_date: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Date à laquelle le marché sera résolu (après la date de fin)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={createMarket}
            disabled={isSubmitting || !marketForm.title.trim() || !marketForm.end_date || 
                     (marketForm.market_type === 'sports' && 
                      (!marketForm.teams.find(t => t.team_type === 'home')?.team_id || 
                       !marketForm.teams.find(t => t.team_type === 'away')?.team_id || 
                       !marketForm.sport_type_id || !marketForm.league_id || !marketForm.match_type_id))}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Création...
              </span>
            ) : (
              'Créer le Marché'
            )}
          </button>
        </div>

        {/* Market Type Info */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Information sur les types de marché
          </h4>
          <div className="text-xs text-yellow-700 space-y-1">
            <p><strong>Binaire:</strong> 2 options (Oui/Non) - Liquidité divisée en 2</p>
            <p><strong>Sports:</strong> 3 options (Équipe A/Draw/Équipe B) - Liquidité divisée en 3</p>
            <p><strong>Multiple:</strong> Options personnalisées - Liquidité adaptée automatiquement</p>
          </div>
        </div>
      </div>
    </div>
  )
}