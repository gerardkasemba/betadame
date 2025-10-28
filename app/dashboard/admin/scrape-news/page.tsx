// app/admin/news/page.tsx - UPDATED CATEGORY-BASED FETCHING (SOUTH AFRICA)
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Newspaper,
  RefreshCw,
  TrendingUp,
  Plus,
  Check,
  Loader2,
  ExternalLink,
  Calendar,
  Eye,
  X,
  Globe,
  Filter,
  Download,
  Upload
} from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string
}

interface NewsArticle {
  id: string
  title: string
  description: string | null
  url: string
  image_url: string | null
  source_name: string | null
  published_at: string
  category_id: string | null
  category?: Category
  keywords: string[]
  market_created: boolean
  market_id: string | null
  market_eligible: boolean
  views_count: number
  country_code: string | null
  language: string | null
}

// Google News API Categories
const NEWS_CATEGORIES = [
  { value: 'latest', label: '📰 Latest', icon: '📰' },
  { value: 'entertainment', label: '🎬 Entertainment', icon: '🎬' },
  { value: 'world', label: '🌍 World', icon: '🌍' },
  { value: 'business', label: '💼 Business', icon: '💼' },
  { value: 'health', label: '🏥 Health', icon: '🏥' },
  { value: 'sports', label: '⚽ Sports', icon: '⚽' },
  { value: 'science', label: '🔬 Science', icon: '🔬' },
  { value: 'technology', label: '💻 Technology', icon: '💻' }
]

// Language options for South Africa and surrounding regions
const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: '🇿🇦 English (South Africa)' },
  { value: 'af-US', label: '🇿🇦 Afrikaans (South Africa)' },
  { value: 'zu-US', label: '🇿🇦 Zulu (South Africa)' },
  { value: 'en-NA', label: '🇳🇦 English (Namibia)' },
  { value: 'en-BW', label: '🇧🇼 English (Botswana)' },
  { value: 'en-ZW', label: '🇿🇼 English (Zimbabwe)' }
]

export default function NewsManagementPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [selectedApiCategory, setSelectedApiCategory] = useState('latest')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [filterMarketStatus, setFilterMarketStatus] = useState<'all' | 'with-market' | 'without-market'>('without-market')
  const [filterEligibility, setFilterEligibility] = useState<'all' | 'eligible' | 'ineligible'>('all')
  const [creatingMarkets, setCreatingMarkets] = useState<Set<string>>(new Set())
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    southAfrica: 0,
    eligible: 0,
    withMarkets: 0,
    totalViews: 0
  })

  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
    fetchArticles()
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [filterMarketStatus, filterEligibility, selectedCategoryId])

  useEffect(() => {
    updateStats()
  }, [articles])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchArticles = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('news_articles')
        .select('*, category:category_id(id, name, icon)')
        .is('deleted_at', null)
        .order('published_at', { ascending: false })
        .limit(200)

      if (filterMarketStatus === 'with-market') {
        query = query.eq('market_created', true)
      } else if (filterMarketStatus === 'without-market') {
        query = query.eq('market_created', false)
      }

      if (filterEligibility === 'eligible') {
        query = query.eq('market_eligible', true)
      } else if (filterEligibility === 'ineligible') {
        query = query.eq('market_eligible', false)
      }

      if (selectedCategoryId) {
        query = query.eq('category_id', selectedCategoryId)
      }

      if (searchKeyword) {
        query = query.or(`title.ilike.%${searchKeyword}%,description.ilike.%${searchKeyword}%,source_name.ilike.%${searchKeyword}%`)
      }

      const { data, error } = await query

      if (error) throw error

      setArticles(data || [])
      console.log(`Loaded ${data?.length || 0} articles`)
    } catch (error) {
      console.error('Error fetching articles:', error)
      alert('Failed to load articles')
    } finally {
      setLoading(false)
    }
  }

  const updateStats = () => {
    const southAfrica = articles.filter(a => a.country_code === 'US').length
    const eligible = articles.filter(a => a.market_eligible && !a.market_created).length
    const withMarkets = articles.filter(a => a.market_created).length
    const totalViews = articles.reduce((sum, a) => sum + a.views_count, 0)

    setStats({
      total: articles.length,
      southAfrica,
      eligible,
      withMarkets,
      totalViews
    })
  }

// In your main page, update the fetchNewsFromAPI function:
const fetchNewsFromAPI = async (category?: string, language?: string) => {
  setFetching(true)
  try {
    const fetchCategory = category || selectedApiCategory
    const fetchLanguage = language || selectedLanguage
    
    console.log('🔄 Starting news fetch:', { category: fetchCategory, language: fetchLanguage })

    const response = await fetch('/api/news/fetch-news', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: fetchCategory,
        language: fetchLanguage,
        limit: 50
      })
    })

    const data = await response.json()
    
    console.log('📨 API Response:', data)

    if (!response.ok) {
      throw new Error(data.error || data.details || `HTTP ${response.status}: Failed to fetch news`)
    }

    if (data.count === 0) {
      alert(`⚠️ No articles stored for ${fetchCategory}\n\nAPI returned ${data.debug?.rawItemsCount || 0} items, but none were processed.\n\nCheck console for details.`)
    } else {
      alert(`✅ Successfully stored ${data.count} articles from ${fetchCategory}!`)
    }
    
    // Refresh the articles list
    await fetchArticles()
    
  } catch (error: any) {
    console.error('💥 Fetch error:', error)
    alert(`❌ ${error.message}`)
  } finally {
    setFetching(false)
  }
}

  const fetchAllCategories = async () => {
    if (!confirm('Fetch news from ALL categories? This will take a few minutes.')) {
      return
    }

    setFetching(true)
    let successCount = 0
    let errorCount = 0
    const results = []

    for (const category of NEWS_CATEGORIES) {
      try {
        const response = await fetch('/api/news/fetch-news', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            category: category.value,
            language: selectedLanguage,
            limit: 30
          })
        })

        const data = await response.json()

        if (response.ok) {
          successCount += data.count
          results.push(`✅ ${category.label}: ${data.count} articles`)
        } else {
          errorCount++
          results.push(`❌ ${category.label}: ${data.error || 'Failed'}`)
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        errorCount++
        results.push(`❌ ${category.label}: Error`)
      }
    }

    setFetching(false)
    
    const resultMessage = [
      `📊 Bulk fetch complete!`,
      `✅ Fetched: ${successCount} articles`,
      `❌ Errors: ${errorCount}`,
      '',
      ...results
    ].join('\n')
    
    alert(resultMessage)
    await fetchArticles()
  }

  const searchNewsByKeyword = async () => {
    if (!searchKeyword.trim()) {
      alert('Please enter a search keyword')
      return
    }

    setFetching(true)
    try {
      const response = await fetch(`/api/news/fetch-news?keyword=${encodeURIComponent(searchKeyword)}&language=${selectedLanguage}`)
      
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search news')
      }

      alert(`✅ Found ${data.count} articles for "${searchKeyword}"`)
      await fetchArticles()
    } catch (error: any) {
      console.error('Error searching news:', error)
      alert(`❌ ${error.message}`)
    } finally {
      setFetching(false)
    }
  }

  const createMarket = async (articleId: string) => {
    setCreatingMarkets(prev => new Set(prev).add(articleId))
    
    try {
      const response = await fetch('/api/markets/create-from-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsArticleId: articleId,
          marketType: 'binary',
          initialLiquidity: 100
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create market')
      }

      alert(`✅ Market created!\n\n"${data.market.title}"`)
      await fetchArticles()
    } catch (error: any) {
      console.error('Error creating market:', error)
      alert(`❌ ${error.message}`)
    } finally {
      setCreatingMarkets(prev => {
        const next = new Set(prev)
        next.delete(articleId)
        return next
      })
    }
  }

  const createBulkMarkets = async () => {
    if (selectedArticles.size === 0) {
      alert('Please select articles first')
      return
    }

    if (!confirm(`Create markets for ${selectedArticles.size} articles?`)) {
      return
    }

    setFetching(true)
    try {
      const response = await fetch('/api/markets/create-from-news', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newsArticleIds: Array.from(selectedArticles),
          marketType: 'binary',
          initialLiquidity: 100
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create markets')
      }

      alert(`✅ Created ${data.created} markets!\n${data.errors?.length ? `⚠️ ${data.errors.length} failed` : ''}`)
      setSelectedArticles(new Set())
      await fetchArticles()
    } catch (error: any) {
      console.error('Error creating bulk markets:', error)
      alert(`❌ ${error.message}`)
    } finally {
      setFetching(false)
    }
  }

  const toggleArticle = (articleId: string) => {
    const next = new Set(selectedArticles)
    if (next.has(articleId)) {
      next.delete(articleId)
    } else {
      next.add(articleId)
    }
    setSelectedArticles(next)
  }

  const toggleAll = () => {
    if (selectedArticles.size === eligibleArticles.length) {
      setSelectedArticles(new Set())
    } else {
      setSelectedArticles(new Set(eligibleArticles.map(a => a.id)))
    }
  }

  const clearFilters = () => {
    setSelectedCategoryId('')
    setFilterMarketStatus('without-market')
    setFilterEligibility('all')
    setSearchKeyword('')
  }

  const exportArticles = () => {
    const data = articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source_name,
      published_at: article.published_at,
      category: article.category?.name,
      market_eligible: article.market_eligible,
      market_created: article.market_created,
      country_code: article.country_code,
      views: article.views_count
    }))

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `news-articles-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const eligibleArticles = articles.filter(a => !a.market_created && a.market_eligible)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="h-8 w-8" />
            News Management
            <span className="text-base font-normal text-gray-600 flex items-center gap-1 ml-2">
              <Globe className="h-4 w-4" />
              Southern Africa
            </span>
          </h1>
          <p className="text-gray-600 mt-1">Fetch news by category and create prediction markets</p>
        </div>

        {/* Fetch Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                News Category
              </label>
              <select
                value={selectedApiCategory}
                onChange={(e) => setSelectedApiCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {NEWS_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language/Region
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {LANGUAGE_OPTIONS.map(lang => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fetch Button */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fetch News
              </label>
              <button
                onClick={() => fetchNewsFromAPI()}
                disabled={fetching}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
              >
                {fetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Fetch {NEWS_CATEGORIES.find(c => c.value === selectedApiCategory)?.icon}
                  </>
                )}
              </button>
            </div>

            {/* Bulk Fetch */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bulk Actions
              </label>
              <button
                onClick={fetchAllCategories}
                disabled={fetching}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-400 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Fetch All Categories
              </button>
            </div>
          </div>

          {/* Search Section */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Articles
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Search by title, description, or source..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && searchNewsByKeyword()}
                  />
                  <button
                    onClick={searchNewsByKeyword}
                    disabled={fetching || !searchKeyword.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400"
                  >
                    Search
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={exportArticles}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </button>
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Database Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Market Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Market Status
                </label>
                <select
                  value={filterMarketStatus}
                  onChange={(e) => setFilterMarketStatus(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Articles</option>
                  <option value="without-market">No Market</option>
                  <option value="with-market">With Market</option>
                </select>
              </div>

              {/* Eligibility Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Eligibility
                </label>
                <select
                  value={filterEligibility}
                  onChange={(e) => setFilterEligibility(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Articles</option>
                  <option value="eligible">Market Eligible</option>
                  <option value="ineligible">Not Eligible</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Market Creation */}
          {eligibleArticles.length > 0 && (
            <div className="pt-4 border-t border-gray-200 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedArticles.size === eligibleArticles.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedArticles.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedArticles.size} article{selectedArticles.size !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                {selectedArticles.size > 0 && (
                  <button
                    onClick={createBulkMarkets}
                    disabled={fetching}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create {selectedArticles.size} Market{selectedArticles.size !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Articles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">🇿🇦 {stats.southAfrica} from SA</p>
              </div>
              <Newspaper className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Market Eligible</p>
                <p className="text-2xl font-bold text-blue-600">{stats.eligible}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Markets Created</p>
                <p className="text-2xl font-bold text-green-600">{stats.withMarkets}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
              </div>
              <Eye className="h-8 w-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-purple-600">{selectedArticles.size}</p>
                <p className="text-xs text-gray-500 mt-1">For bulk actions</p>
              </div>
              <Upload className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading articles...</span>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600 mb-4">
                {searchKeyword ? 'Try adjusting your search terms' : 'Select a category and click "Fetch" to get started'}
              </p>
              <button
                onClick={fetchNewsFromAPI}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fetch Latest News
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {articles.map((article) => {
                const isCreating = creatingMarkets.has(article.id)
                const isSelected = selectedArticles.has(article.id)
                const canSelect = !article.market_created && article.market_eligible

                return (
                  <div
                    key={article.id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                  >
                    <div className="flex gap-4">
                      {/* Checkbox */}
                      {canSelect && (
                        <div className="flex-shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleArticle(article.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {/* Image */}
                      {article.image_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-32 h-24 rounded-lg object-cover border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight">
                              {article.title}
                            </h3>
                            {article.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {article.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                              <span className="flex items-center gap-1 font-medium">
                                {article.source_name || 'Unknown Source'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(article.published_at)}
                              </span>
                              {article.country_code === 'US' && (
                                <>
                                  <span>•</span>
                                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                    🇿🇦 South Africa
                                  </span>
                                </>
                              )}
                              {article.category && (
                                <>
                                  <span>•</span>
                                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                                    {article.category.icon} {article.category.name}
                                  </span>
                                </>
                              )}
                              {article.market_created && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                                    <Check className="h-3.5 w-3.5" />
                                    Market Created
                                  </span>
                                </>
                              )}
                              {!article.market_eligible && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                    <X className="h-3.5 w-3.5" />
                                    Not Eligible
                                  </span>
                                </>
                              )}
                              {article.views_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <Eye className="h-3.5 w-3.5" />
                                    {article.views_count} views
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View article"
                            >
                              <ExternalLink className="h-5 w-5 text-gray-600" />
                            </a>
                            
                            {!article.market_created && article.market_eligible && (
                              <button
                                onClick={() => createMarket(article.id)}
                                disabled={isCreating}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 flex items-center gap-1.5"
                              >
                                {isCreating ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    Create Market
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Showing {articles.length} articles • Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  )
}