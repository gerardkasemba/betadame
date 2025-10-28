'use client'

import { useState, useEffect } from 'react'
import { 
  Plus,
  Calendar,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Lock,
  Unlock,
  Search,
  BarChart3,
  Users,
  Target,
  Upload,
  Image as ImageIcon,
  X,
  Globe,
  Trophy,
  Users as TeamIcon,
  Shield,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CreateMarketModal from './CreateMarketModal'

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
  
  // Foreign keys
  country_id: string
  sport_type_id: string
  league_id: string
  match_type_id: string
  game_date: string
  
  // Teams using the new structure
  teams: MarketTeam[]
}

interface Market {
  id: string
  title: string
  description: string
  category_id: string
  market_type: 'binary' | 'multiple' | 'sports'
  image_url?: string
  status: 'pending' | 'active' | 'closed' | 'resolved' | 'cancelled'
  created_at: string
  start_date?: string
  end_date?: string
  resolution_date?: string
  winning_outcome?: string
  initial_liquidity: number
  min_bet_amount: number
  max_bet_amount: number
  total_volume: number
  unique_traders: number
  outcomes?: MarketOutcome[]
  
  // Foreign keys
  country_id?: string
  sport_type_id?: string
  league_id?: string
  match_type_id?: string
  game_date?: string
  
  // Joined data
  country?: Country
  category?: Category
  sport_type?: SportType
  league?: League
  match_type?: MatchType
  market_teams?: {
    team: Team
    team_type: 'home' | 'away'
  }[]
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string
  value: string
  icon: React.ReactNode
  color: string 
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600'
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function AdminMarkets() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [winningOutcome, setWinningOutcome] = useState<string>('')
  const [resolutionSource, setResolutionSource] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingOutcomeIndex, setUploadingOutcomeIndex] = useState<number | null>(null)
  
  // Data from database
  const [countries, setCountries] = useState<Country[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sportTypes, setSportTypes] = useState<SportType[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matchTypes, setMatchTypes] = useState<MatchType[]>([])
  const [filteredLeagues, setFilteredLeagues] = useState<League[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])

  const [marketForm, setMarketForm] = useState<MarketForm>({
    title: '',
    description: '',
    category_id: '',
    market_type: 'sports',
    image_url: '',
    start_date: '',
    end_date: '',
    resolution_date: '',
    initial_liquidity: 100,
    min_bet_amount: 1,
    max_bet_amount: 10000,
    outcomes: [],
    
    // Foreign keys
    country_id: '',
    sport_type_id: '',
    league_id: '',
    match_type_id: '',
    game_date: '',
    
    // Teams
    teams: [
      { team_id: '', team_type: 'home' },
      { team_id: '', team_type: 'away' }
    ]
  })

  const supabase = createClient()

  // Helper function to get team by type
  const getTeamByType = (teamType: 'home' | 'away'): Team | undefined => {
    const teamId = marketForm.teams.find(t => t.team_type === teamType)?.team_id
    return filteredTeams.find(t => t.id === teamId)
  }

  // Helper function to update team
  const updateTeam = (teamType: 'home' | 'away', teamId: string) => {
    setMarketForm(prev => ({
      ...prev,
      teams: prev.teams.map(t => 
        t.team_type === teamType ? { ...t, team_id: teamId } : t
      )
    }))
  }

  // Load initial data
  useEffect(() => {
    checkAuthorization()
  }, [])

  // Load reference data after authorization
  useEffect(() => {
    if (isAuthorized) {
      loadReferenceData()
    }
  }, [isAuthorized])

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

  // Initialize outcomes based on market type and teams
  useEffect(() => {
    if (marketForm.market_type === 'binary') {
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
    } else if (marketForm.category_id && marketForm.category_id === getCategoryIdByName('Sports')) {
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
    } else if (marketForm.market_type === 'multiple') {
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
  }, [marketForm.market_type, marketForm.category_id, marketForm.teams, filteredTeams])

  const getCategoryIdByName = (name: string): string => {
    const category = categories.find(c => c.name === name)
    return category?.id || ''
  }

  const loadReferenceData = async () => {
    try {
      console.log('Loading reference data...')
      
      // Load all reference data
      const [
        { data: countriesData },
        { data: categoriesData },
        { data: sportTypesData },
        { data: leaguesData },
        { data: teamsData },
        { data: matchTypesData }
      ] = await Promise.all([
        supabase.from('countries').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('sport_types').select('*').order('name'),
        supabase.from('leagues').select('*').order('name'),
        supabase.from('teams').select('*').order('name'),
        supabase.from('match_types').select('*').order('name')
      ])

      setCountries(countriesData || [])
      setCategories(categoriesData || [])
      setSportTypes(sportTypesData || [])
      setLeagues(leaguesData || [])
      setTeams(teamsData || [])
      setMatchTypes(matchTypesData || [])

      // Set default category to Sports
      const sportsCategory = categoriesData?.find(c => c.name === 'Sports')
      if (sportsCategory) {
        setMarketForm(prev => ({ ...prev, category_id: sportsCategory.id }))
      }

      // Set default country to DR Congo
      const drcCountry = countriesData?.find(c => c.code === 'CD')
      if (drcCountry) {
        setMarketForm(prev => ({ ...prev, country_id: drcCountry.id }))
      }

    } catch (error) {
      console.error('Error loading reference data:', error)
      showMessage('error', 'Erreur lors du chargement des données de référence')
    }
  }

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.email === 'gerardkasemba@gmail.com') {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Authorization error:', error)
      setIsAuthorized(false)
      setIsLoading(false)
    }
  }

  const fetchMarkets = async () => {
    try {
      setIsLoading(true)
      
      // First, get markets with basic relationships
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select(`
          *,
          country:countries(*),
          category:categories(*),
          sport_type:sport_types(*),
          league:leagues(*),
          match_type:match_types(*)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (marketsError) throw marketsError

      // Then, for each market, get the teams and outcomes
      const marketsWithDetails = await Promise.all(
        (marketsData || []).map(async (market) => {
          // Get teams for this market
          const { data: marketTeamsData } = await supabase
            .from('market_teams')
            .select(`
              team_type,
              team:teams(*)
            `)
            .eq('market_id', market.id)

          // Get outcomes for this market
          const { data: outcomesData } = await supabase
            .from('market_outcomes')
            .select('*')
            .eq('market_id', market.id)
            .order('created_at')

          return {
            ...market,
            market_teams: marketTeamsData || [],
            outcomes: outcomesData || []
          }
        })
      )

      setMarkets(marketsWithDetails)
    } catch (error) {
      console.error('Error fetching markets:', error)
      showMessage('error', 'Erreur lors du chargement des marchés')
    } finally {
      setIsLoading(false)
    }
  }

  // Load markets after reference data is loaded
  useEffect(() => {
    if (isAuthorized && categories.length > 0) {
      fetchMarkets()
    }
  }, [isAuthorized, categories.length])

  const addOutcome = () => {
    setMarketForm(prev => ({
      ...prev,
      outcomes: [
        ...prev.outcomes,
        { 
          title: '', 
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

  // Upload market image
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

  // Upload outcome image
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

    // Validate file size (max 5MB)
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

    // Validate file size (max 5MB)
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

  const createMarket = async () => {
    try {
      if (!marketForm.title.trim()) {
        showMessage('error', 'Le titre est requis')
        return
      }

      if (!marketForm.end_date) {
        showMessage('error', 'La date de fin est requise')
        return
      }

      // Validate sports-specific fields
      const isSportsMarket = marketForm.category_id === getCategoryIdByName('Sports')
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
        if (!marketForm.match_type_id) {
          showMessage('error', 'Le type de match est requis')
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

      // Prepare market data
      const marketData: any = {
        title: marketForm.title,
        description: marketForm.description,
        category_id: marketForm.category_id,
        market_type: marketForm.market_type,
        image_url: marketForm.image_url || null,
        initial_liquidity: marketForm.initial_liquidity,
        min_bet_amount: marketForm.min_bet_amount,
        max_bet_amount: marketForm.max_bet_amount,
        country_id: marketForm.country_id || null,
        created_by: user.id,
        status: 'pending'
      }

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
      }

      // Create market
      const { data: marketDataResult, error: marketError } = await supabase
        .from('markets')
        .insert(marketData)
        .select()
        .single()

      if (marketError) throw marketError

      // Create market teams
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

        if (teamsError) throw teamsError
      }

      // Create outcomes
      const { error: outcomesError } = await supabase
        .from('market_outcomes')
        .insert(
          marketForm.outcomes.map(outcome => ({
            market_id: marketDataResult.id,
            title: outcome.title,
            description: outcome.description,
            image_url: outcome.image_url,
            yes_price: outcome.yes_price,
            no_price: outcome.no_price
          }))
        )

      if (outcomesError) throw outcomesError

      showMessage('success', 'Marché créé avec succès!')
      setShowCreateModal(false)
      resetForm()
      fetchMarkets()
    } catch (error) {
      console.error('Error creating market:', error)
      showMessage('error', 'Erreur lors de la création du marché')
    }
  }

  const resolveMarket = async () => {
    if (!selectedMarket || !winningOutcome) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('markets')
        .update({
          status: 'resolved',
          winning_outcome: winningOutcome,
          resolution_source: resolutionSource,
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', selectedMarket.id)

      if (error) throw error

      showMessage('success', 'Marché résolu avec succès!')
      setShowResolveModal(false)
      setSelectedMarket(null)
      setWinningOutcome('')
      setResolutionSource('')
      fetchMarkets()
    } catch (error) {
      console.error('Error resolving market:', error)
      showMessage('error', 'Erreur lors de la résolution du marché')
    }
  }

  const updateMarketStatus = async (marketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('markets')
        .update({ status: newStatus })
        .eq('id', marketId)

      if (error) throw error

      showMessage('success', 'Statut mis à jour avec succès!')
      fetchMarkets()
    } catch (error) {
      console.error('Error updating market status:', error)
      showMessage('error', 'Erreur lors de la mise à jour du statut')
    }
  }

  const deleteMarket = async (marketId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce marché?')) return

    try {
      const { error } = await supabase
        .from('markets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', marketId)

      if (error) throw error

      showMessage('success', 'Marché supprimé avec succès!')
      fetchMarkets()
    } catch (error) {
      console.error('Error deleting market:', error)
      showMessage('error', 'Erreur lors de la suppression du marché')
    }
  }

  const resetForm = () => {
    const sportsCategory = categories.find(c => c.name === 'Sports')
    const drcCountry = countries.find(c => c.code === 'CD')

    setMarketForm({
      title: '',
      description: '',
      category_id: sportsCategory?.id || '',
      market_type: 'sports',
      image_url: '',
      start_date: '',
      end_date: '',
      resolution_date: '',
      initial_liquidity: 100,
      min_bet_amount: 1,
      max_bet_amount: 10000,
      outcomes: [],
      country_id: drcCountry?.id || '',
      sport_type_id: '',
      league_id: '',
      match_type_id: '',
      game_date: '',
      teams: [
        { team_id: '', team_type: 'home' },
        { team_id: '', team_type: 'away' }
      ]
    })
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         market.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || market.category_id === filterCategory
    const matchesStatus = filterStatus === 'all' || market.status === filterStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: markets.length,
    active: markets.filter(m => m.status === 'active').length,
    pending: markets.filter(m => m.status === 'pending').length,
    resolved: markets.filter(m => m.status === 'resolved').length,
    totalVolume: markets.reduce((sum, m) => sum + (m.total_volume || 0), 0),
    totalTraders: markets.reduce((sum, m) => sum + (m.unique_traders || 0), 0),
    upcoming: markets.filter(m => m.status === 'pending' && m.game_date && new Date(m.game_date) > new Date()).length,
    ongoing: markets.filter(m => m.status === 'active').length
  }

  // Helper to get team name for display
  const getTeamDisplay = (market: Market, teamType: 'home' | 'away') => {
    const teamData = market.market_teams?.find(mt => mt.team_type === teamType)
    return teamData?.team?.name || 'Équipe inconnue'
  }

  // Authorization check
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès Refusé</h2>
          <p className="text-gray-600">
            Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
          </p>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  const marketTypes = [
    { value: 'binary', label: 'Binaire (Oui/Non)', description: 'Question simple Oui/Non' },
    { value: 'multiple', label: 'Choix Multiple', description: 'Plusieurs options avec Oui/Non pour chacune' },
    { value: 'sports', label: 'Sports', description: 'Événements sportifs avec options multiples' }
  ]

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    active: 'bg-green-100 text-green-800 border-green-300',
    closed: 'bg-gray-100 text-gray-800 border-gray-300',
    resolved: 'bg-blue-100 text-blue-800 border-blue-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300'
  }

  const statusLabels = {
    pending: 'En attente',
    active: 'Actif',
    closed: 'Fermé',
    resolved: 'Résolu',
    cancelled: 'Annulé'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-8 w-8 text-blue-600" />
              Gestion des Marchés
            </h1>
            <p className="text-gray-600 mt-1">Créez et gérez les marchés de prédiction</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="h-5 w-5" />
            Créer un Marché
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`max-w-7xl mx-auto mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total" value={stats.total.toString()} icon={<BarChart3 />} color="blue" />
        <StatCard title="Actifs" value={stats.active.toString()} icon={<Activity />} color="green" />
        <StatCard title="En attente" value={stats.pending.toString()} icon={<Clock />} color="yellow" />
        <StatCard title="Résolus" value={stats.resolved.toString()} icon={<CheckCircle />} color="purple" />
        <StatCard title="À venir" value={stats.upcoming.toString()} icon={<Calendar />} color="orange" />
        <StatCard title="Traders" value={stats.totalTraders.toString()} icon={<Users />} color="emerald" />
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un marché..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Markets List */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marché</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pays</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date de fin</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMarkets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Aucun marché trouvé
                    </td>
                  </tr>
                ) : (
                  filteredMarkets.map((market) => (
                    <tr key={market.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {market.image_url && (
                            <img 
                              src={market.image_url} 
                              alt={market.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{market.title}</div>
                            <div className="text-sm text-gray-500 line-clamp-1">{market.description}</div>
                            {market.sport_type && (
                              <div className="text-xs text-gray-400 mt-1">
                                {getTeamDisplay(market, 'home')} vs {getTeamDisplay(market, 'away')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {marketTypes.find(t => t.value === market.market_type)?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {market.category?.icon} {market.category?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {market.country?.flag_emoji}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[market.status as keyof typeof statusColors]}`}>
                          {statusLabels[market.status as keyof typeof statusLabels]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {market.outcomes?.slice(0, 3).map((outcome: any, index: number) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {outcome.title}
                            </span>
                          ))}
                          {market.outcomes && market.outcomes.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600">
                              +{market.outcomes.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {market.end_date ? new Date(market.end_date).toLocaleDateString('fr-FR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {market.status === 'pending' && (
                            <button
                              onClick={() => updateMarketStatus(market.id, 'active')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Activer"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                          
                          {market.status === 'active' && (
                            <>
                              <button
                                onClick={() => updateMarketStatus(market.id, 'closed')}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Fermer"
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMarket(market)
                                  setShowResolveModal(true)
                                }}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Résoudre"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {market.status === 'closed' && (
                            <button
                              onClick={() => {
                                setSelectedMarket(market)
                                setShowResolveModal(true)
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Résoudre"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteMarket(market.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Market Modal */}
      <CreateMarketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onMarketCreated={fetchMarkets}
        countries={countries}
        categories={categories}
        sportTypes={sportTypes}
        leagues={leagues}
        teams={teams}
        matchTypes={matchTypes}
      />
      {/* Resolve Market Modal */}
      {showResolveModal && selectedMarket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Résoudre le Marché</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{selectedMarket.title}</p>
                <p className="text-sm text-gray-600 mt-1">{selectedMarket.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option gagnante *
                </label>
                <div className="space-y-2">
                  {selectedMarket.outcomes?.map((outcome: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => setWinningOutcome(outcome.title)}
                      className={`w-full py-3 px-4 rounded-lg border-2 transition-colors font-medium text-left ${
                        winningOutcome === outcome.title
                          ? 'bg-green-50 border-green-500 text-green-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                      }`}
                    >
                      <div className="font-medium">{outcome.title}</div>
                      <div className="text-sm text-gray-600">{outcome.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source de résolution
                </label>
                <input
                  type="text"
                  value={resolutionSource}
                  onChange={(e) => setResolutionSource(e.target.value)}
                  placeholder="URL ou description de la source..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Attention:</strong> Cette action est irréversible. 
                  Les utilisateurs qui ont acheté OUI sur l'option gagnante seront payés.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowResolveModal(false)
                  setSelectedMarket(null)
                  setWinningOutcome('')
                  setResolutionSource('')
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                onClick={resolveMarket}
                disabled={!winningOutcome}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmer la Résolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}