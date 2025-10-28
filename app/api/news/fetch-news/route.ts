// app/api/news/fetch-news/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '54cbe32defmsh6a651e90bf42b47p156320jsne2509fde2460'
const RAPIDAPI_HOST = 'google-news13.p.rapidapi.com'

// Google News API Categories
type NewsCategory = 'latest' | 'entertainment' | 'world' | 'business' | 'health' | 'sports' | 'science' | 'technology'

// Map API categories to our database categories
const CATEGORY_MAPPING: { [key: string]: string } = {
  'latest': 'general',
  'entertainment': 'entertainment',
  'world': 'world',
  'business': 'business',
  'health': 'health',
  'sports': 'sports',
  'science': 'science',
  'technology': 'technology'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      category = 'latest',
      language = 'en-US',
      limit = 50,
      keyword = null
    } = body

    const supabase = await createClient()

    console.log('🔍 Fetching news with:', { category, language, limit, keyword })

    // Validate category
    const validCategories = ['latest', 'entertainment', 'world', 'business', 'health', 'sports', 'science', 'technology']
    const apiCategory = category.toLowerCase() as NewsCategory
    
    if (!validCategories.includes(apiCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Build the appropriate URL (matching the debugger)
    let apiUrl: string
    if (keyword) {
      apiUrl = `https://${RAPIDAPI_HOST}/search?keyword=${encodeURIComponent(keyword)}&lr=${language}`
    } else if (apiCategory === 'latest') {
      apiUrl = `https://${RAPIDAPI_HOST}/latest?lr=${language}`
    } else {
      apiUrl = `https://${RAPIDAPI_HOST}/${apiCategory}?lr=${language}`
    }

    console.log('📡 Calling external API:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      signal: AbortSignal.timeout(15000)
    })

    console.log('📊 External API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ External API error:', response.status, errorText)
      
      return NextResponse.json(
        { 
          error: `News API returned ${response.status}`,
          details: errorText,
          url: apiUrl
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('📦 Raw API response keys:', Object.keys(data))
    
    // Handle different response structures - based on what the debugger shows
    const items = data.items || data.news || data.articles || data.data || []
    console.log(`🎯 Found ${items.length} raw items from API`)

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        articles: [],
        count: 0,
        category: apiCategory,
        language: language,
        message: `No news articles found for ${apiCategory} category`,
        debug: {
          rawDataKeys: Object.keys(data),
          sampleItem: items[0] || null
        }
      })
    }

    // Get category ID from database
    const dbCategoryName = CATEGORY_MAPPING[apiCategory] || apiCategory
    const { data: dbCategory, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', dbCategoryName)
      .single()

    if (categoryError) {
      console.warn(`⚠️ Category not found in database: ${dbCategoryName}`)
    }

    console.log(`🔄 Processing ${items.length} articles...`)

    // Process and store articles
    const processedArticles = await processAndStoreArticles(
      items.slice(0, limit),
      dbCategory?.id || null,
      apiCategory,
      supabase
    )

    console.log(`✅ Successfully processed ${processedArticles.length} articles`)

    return NextResponse.json({
      success: true,
      articles: processedArticles,
      count: processedArticles.length,
      category: apiCategory,
      language: language,
      message: `Successfully fetched and stored ${processedArticles.length} articles from ${apiCategory}`,
      debug: {
        rawItemsCount: items.length,
        processedCount: processedArticles.length,
        sampleRawItem: items[0] || null
      }
    })

  } catch (error: any) {
    console.error('💥 Fetch news error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch news from external API',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

async function processAndStoreArticles(
  items: any[],
  categoryId: string | null,
  apiCategory: string,
  supabase: any
) {
  const processedArticles = []

  for (const [index, item] of items.entries()) {
    try {
      console.log(`📝 Processing article ${index + 1}/${items.length}`)
      console.log('🔍 Raw item structure:', Object.keys(item))
      console.log('📰 Item title:', item.title)
      console.log('🔗 Item URL:', item.url || item.newsUrl || item.link)

      // Use provided category or auto-detect
      let finalCategoryId = categoryId
      if (!finalCategoryId) {
        finalCategoryId = await detectCategoryId(
          item.title, 
          item.snippet || item.description || item.summary, 
          supabase
        )
      }

      // Extract article data with comprehensive field mapping
      const articleData = {
        title: item.title || item.headline || 'Untitled',
        description: item.snippet || item.description || item.summary || item.content || null,
        url: item.newsUrl || item.url || item.link || item.webUrl || item.source?.url,
        image_url: item.images?.thumbnail || item.image || item.thumbnail || item.urlToImage || item.media || null,
        source_name: item.source?.name || item.publisher || item.source || item.author || 'Unknown Source',
        source_url: item.source?.url || item.sourceUrl || item.site || null,
        published_at: parseDate(item),
        category_id: finalCategoryId,
        keywords: extractKeywords(item.title, item.snippet || item.description || item.summary),
        language: 'en',
        country_code: 'US',
        api_source: 'google-news',
        api_id: item.id || item.newsUrl || item.url || null,
        market_eligible: isMarketEligible(item),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('📊 Processed article data:', {
        title: articleData.title,
        url: articleData.url,
        source: articleData.source_name,
        published: articleData.published_at
      })

      // Validate required fields
      if (!articleData.title || articleData.title === 'Untitled') {
        console.warn('⚠️ Skipping article with no title')
        continue
      }

      if (!articleData.url) {
        console.warn('⚠️ Skipping article with no URL:', articleData.title)
        continue
      }

      // Clean URL - remove tracking parameters and ensure it's a valid URL
      try {
        const cleanUrl = new URL(articleData.url)
        // Remove common tracking parameters
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
        paramsToRemove.forEach(param => cleanUrl.searchParams.delete(param))
        articleData.url = cleanUrl.toString()
      } catch (error) {
        console.warn('⚠️ Invalid URL, skipping:', articleData.url)
        continue
      }

      // Check if article already exists (using cleaned URL)
      const { data: existingArticle, error: checkError } = await supabase
        .from('news_articles')
        .select('id')
        .eq('url', articleData.url)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing article:', checkError)
      }

      let article
      if (existingArticle) {
        console.log('🔄 Updating existing article:', articleData.title.substring(0, 50))
        // Update existing article
        const { data, error } = await supabase
          .from('news_articles')
          .update({
            ...articleData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingArticle.id)
          .select('*, category:category_id(name, icon)')
          .single()

        if (error) {
          console.error('❌ Error updating article:', error)
          console.log('Article data that failed:', articleData)
          continue
        }
        article = data
      } else {
        console.log('✅ Inserting new article:', articleData.title.substring(0, 50))
        // Insert new article
        const { data, error } = await supabase
          .from('news_articles')
          .insert([articleData])
          .select('*, category:category_id(name, icon)')
          .single()

        if (error) {
          console.error('❌ Error inserting article:', error)
          console.log('Article data that failed:', articleData)
          console.log('Full error details:', error)
          continue
        }
        article = data
      }

      if (article) {
        processedArticles.push(article)
        console.log('🎉 Successfully stored article')
      }

    } catch (error) {
      console.error(`❌ Error processing article ${index + 1}:`, error)
      console.log('Problematic item:', item)
    }
  }

  console.log(`🎉 Successfully processed ${processedArticles.length}/${items.length} articles`)
  return processedArticles
}

// Keep the helper functions the same but add more logging
async function detectCategoryId(
  title: string, 
  description: string, 
  supabase: any
): Promise<string | null> {
  const text = `${title} ${description || ''}`.toLowerCase()
  
  // Define category keywords
  const categoryKeywords: { [key: string]: string[] } = {
    sports: ['sport', 'football', 'rugby', 'cricket', 'soccer', 'springboks', 'proteas', 'bafana', 'match', 'game', 'team', 'player'],
    politics: ['politics', 'election', 'government', 'president', 'anc', 'da', 'eff', 'parliament', 'ramaphosa', 'vote', 'policy'],
    technology: ['tech', 'ai', 'software', 'app', 'google', 'apple', 'microsoft', 'startup', 'innovation', 'digital'],
    business: ['business', 'economy', 'stock', 'jse', 'market', 'company', 'ceo', 'revenue', 'profit', 'investment', 'rand'],
    entertainment: ['movie', 'music', 'celebrity', 'actor', 'singer', 'show', 'entertainment', 'film', 'concert'],
    health: ['health', 'medical', 'doctor', 'hospital', 'disease', 'treatment', 'covid', 'vaccine', 'clinic'],
    science: ['science', 'research', 'study', 'scientist', 'discovery', 'space', 'climate', 'environment'],
    world: ['world', 'international', 'country', 'global', 'foreign', 'africa', 'europe', 'asia']
  }

  // Find matching category
  for (const [categoryName, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      // Get category ID from database
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', categoryName)
        .single()
      
      if (category) {
        console.log(`🏷️ Auto-detected category: ${categoryName}`)
        return category.id
      }
    }
  }

  console.log('🔍 No category auto-detected')
  return null
}

function extractKeywords(title: string, description: string): string[] {
  const text = `${title} ${description || ''}`.toLowerCase()
  const words = text.match(/\b[a-z]{4,}\b/g) || []
  
  // Get unique words, filter common words
  const commonWords = new Set([
    'this', 'that', 'with', 'from', 'have', 'will', 'said', 'they', 
    'their', 'been', 'more', 'would', 'about', 'south', 'africa', 'says'
  ])
  const keywords = [...new Set(words)]
    .filter(word => !commonWords.has(word))
    .slice(0, 10)
  
  return keywords
}

function parseDate(item: any): string {
  // Try different date fields and formats
  const dateSources = [
    item.timestamp, // Unix timestamp
    item.publishedAt,
    item.pubDate,
    item.date,
    item.createdAt,
    item.updatedAt
  ]

  for (const dateSource of dateSources) {
    if (!dateSource) continue

    try {
      if (typeof dateSource === 'number') {
        // Unix timestamp
        return new Date(dateSource * 1000).toISOString()
      } else if (typeof dateSource === 'string') {
        // ISO string or other date string
        const date = new Date(dateSource)
        if (!isNaN(date.getTime())) {
          return date.toISOString()
        }
      }
    } catch (error) {
      console.log('Date parsing error for:', dateSource)
    }
  }

  // Fallback to current date
  console.log('⚠️ Using current date as fallback')
  return new Date().toISOString()
}

function isMarketEligible(item: any): boolean {
  const title = (item.title || '').toLowerCase()
  const description = (item.snippet || item.description || item.summary || '').toLowerCase()
  const text = `${title} ${description}`
  
  console.log('🔍 Checking market eligibility for:', title.substring(0, 50))

  // Must contain future-oriented or predictive language
  const futureIndicators = [
    'will', 'could', 'might', 'may', 'expected', 'forecast', 'predict',
    'upcoming', 'future', 'next', 'plans to', 'set to', 'scheduled',
    'to be', 'likely', 'potential', 'estimated', 'projected'
  ]
  
  // Should not be past events
  const pastIndicators = [
    'died', 'killed', 'passed away', 'confirmed dead', 'found dead', 'murdered'
  ]
  
  const hasFutureIndicator = futureIndicators.some(indicator => {
    const hasIndicator = text.includes(indicator)
    if (hasIndicator) console.log(`✅ Found future indicator: ${indicator}`)
    return hasIndicator
  })
  
  const hasPastIndicator = pastIndicators.some(indicator => {
    const hasIndicator = text.includes(indicator)
    if (hasIndicator) console.log(`❌ Found past indicator: ${indicator}`)
    return hasIndicator
  })
  
  const eligible = hasFutureIndicator && !hasPastIndicator
  console.log(`📊 Market eligibility: ${eligible} (future: ${hasFutureIndicator}, past: ${hasPastIndicator})`)
  
  // For testing, make more articles eligible
  if (!eligible && !hasPastIndicator) {
    console.log('🤔 Article has no future indicators but also no past indicators - considering eligible for testing')
    return true
  }
  
  return eligible
}

// GET endpoint for direct testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'latest'
  const language = searchParams.get('language') || 'en-US'
  const keyword = searchParams.get('keyword')

  try {
    let apiUrl: string
    if (keyword) {
      apiUrl = `https://${RAPIDAPI_HOST}/search?keyword=${encodeURIComponent(keyword)}&lr=${language}`
    } else if (category === 'latest') {
      apiUrl = `https://${RAPIDAPI_HOST}/latest?lr=${language}`
    } else {
      apiUrl = `https://${RAPIDAPI_HOST}/${category}?lr=${language}`
    }

    console.log('🔍 Direct GET test to:', apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    const items = data.items || data.news || data.articles || []

    console.log(`✅ Direct GET found ${items.length} items`)

    return NextResponse.json({
      success: true,
      items: items,
      count: items.length,
      category,
      language,
      keyword,
      debug: {
        rawDataKeys: Object.keys(data),
        sampleItem: items[0] || null
      }
    })

  } catch (error: any) {
    console.error('❌ Direct GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}