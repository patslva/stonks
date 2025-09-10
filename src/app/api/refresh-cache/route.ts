import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

// Reddit OAuth token cache
let redditToken: { access_token: string; expires_at: number } | null = null

// Simple logger utility
const log = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
}

interface RedditComment {
  author: string
  body: string
  score: number
  created_utc: number
  permalink: string
}

interface RedditPost {
  reddit_id: string
  title: string
  author: string
  score: number
  num_comments: number
  url: string
  permalink: string
  created_utc: number
  subreddit: string
  top_comments?: RedditComment[]
}

interface CacheData {
  posts: RedditPost[]
  daily_threads: RedditPost[]
  last_updated: string
  total_posts: number
}

async function getRedditAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (redditToken && redditToken.expires_at > Date.now()) {
    return redditToken.access_token
  }

  log.info('Getting new Reddit OAuth token...')
  
  // Reddit OAuth credentials
  const clientId = process.env.REDDIT_CLIENT_ID!
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  
  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'web:stonks-app:v1.0.0 (by /u/DueIndividual6973)',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials&scope=read'
    })

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.status}`)
    }

    const data = await response.json()
    
    // Cache token with expiry (Reddit tokens last 1 hour)
    redditToken = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer
    }
    
    log.info('Reddit OAuth token obtained successfully')
    return redditToken.access_token
    
  } catch (error: any) {
    log.error('Failed to get Reddit OAuth token:', error.message)
    throw error
  }
}

async function fetchTopComments(permalink: string): Promise<RedditComment[]> {
  try {
    // Get OAuth token for authenticated request
    const token = await getRedditAccessToken()
    
    // Reddit OAuth API endpoint for post comments
    const commentsUrl = `https://oauth.reddit.com${permalink}?sort=top&limit=5`
    const response = await fetch(commentsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'web:stonks-app:v1.0.0 (by /u/DueIndividual6973)',
        'Accept': 'application/json'
      }
    })
    
    if (!response.ok) {
      return []
    }
    
    const data = await response.json()
    
    // Reddit returns an array: [post_data, comments_data]
    const commentsData = data[1]?.data?.children || []
    
    const topComments: RedditComment[] = []
    
    for (const comment of commentsData.slice(0, 5)) {
      const commentData = comment.data
      
      // Skip deleted comments and AutoModerator
      if (!commentData.body || commentData.body === '[deleted]' || commentData.author === 'AutoModerator') {
        continue
      }
      
      topComments.push({
        author: commentData.author,
        body: commentData.body.length > 200 ? commentData.body.substring(0, 200) + '...' : commentData.body,
        score: commentData.score,
        created_utc: commentData.created_utc,
        permalink: `https://reddit.com${commentData.permalink}`
      })
    }
    
    return topComments
    
  } catch (error) {
    return []
  }
}

async function refreshCache(skipComments: boolean = false) {
  try {
    log.info(`Starting cache refresh (skipComments: ${skipComments})`)
    
    // Initialize Redis client
    log.info('Initializing Redis connection...')
    const redis = new Redis(process.env.REDIS_URL!, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })
    
    // Get OAuth token for authenticated requests
    const token = await getRedditAccessToken()
    
    // Fetch hot posts from r/wallstreetbets using Reddit OAuth API with timeout and retry
    log.info('Fetching Reddit posts with OAuth...')
    let response;
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        response = await fetch('https://oauth.reddit.com/r/wallstreetbets/hot?limit=25', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'web:stonks-app:v1.0.0 (by /u/DueIndividual6973)',
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          log.info(`Reddit API success on attempt ${attempt + 1}`);
          break;
        } else {
          log.warn(`Reddit API failed with status ${response.status} on attempt ${attempt + 1}`);
          throw new Error(`Reddit API failed: ${response.status}`);
        }
      } catch (error: any) {
        attempt++;
        log.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt >= maxAttempts) {
          throw new Error(`Reddit API failed after ${maxAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    // TypeScript safety check
    if (!response) {
      throw new Error('Failed to get response after all attempts');
    }
    
    log.info('Parsing Reddit response...')
    const redditData = await response.json()
    log.info(`Found ${redditData.data.children.length} posts from Reddit`)
    
    const posts_data: RedditPost[] = []
    const daily_threads: RedditPost[] = []
    
    for (const item of redditData.data.children) {
      const post = item.data
      
      // Prepare post data for cache
      const post_data: RedditPost = {
        reddit_id: post.id,
        title: post.title.length > 500 ? post.title.substring(0, 500) : post.title,
        author: post.author || '[deleted]',
        score: post.score,
        num_comments: post.num_comments,
        url: post.url,
        permalink: `https://reddit.com${post.permalink}`,
        created_utc: post.created_utc,
        subreddit: 'wallstreetbets'
      }
      
      
      // Separate daily discussion threads from regular posts
      // WSB rotates between "Daily Discussion Thread" (market hours) and "What Are Your Moves Tomorrow" (off hours)
      const title = post.title.toLowerCase()
      const isDailyThread = (
        // Market hours thread
        title.includes('daily discussion thread') ||
        // Off hours thread  
        title.includes('what are your moves tomorrow') ||
        title.includes('moves tomorrow') ||
        // Alternative patterns
        (title.includes('daily discussion') && title.includes('thread')) ||
        // AutoModerator posts with daily in title (common for these threads)
        (post.author === 'AutoModerator' && (title.includes('daily') || title.includes('moves tomorrow'))) ||
        // Date-based daily thread patterns
        title.match(/daily.*thread.*\d{1,2}[\/\-\.]\d{1,2}/i)
      )
      
      if (isDailyThread) {
        // Fetch top comments for daily threads (skip during cron for performance)
        if (!skipComments) {
          log.info('Fetching comments for daily thread:', post.title.substring(0, 50) + '...')
          const topComments = await fetchTopComments(post.permalink)
          post_data.top_comments = topComments
        } else {
          log.info('Skipping comments for daily thread (cron mode):', post.title.substring(0, 50) + '...')
          post_data.top_comments = []
        }
        daily_threads.push(post_data)
      } else {
        posts_data.push(post_data)
      }
    }
    
    log.info(`Processing complete: ${posts_data.length} regular posts, ${daily_threads.length} daily threads`)
    
    if (posts_data.length === 0) {
      log.info('No posts to cache, returning early')
      return NextResponse.json({
        success: true,
        message: 'No new posts to process',
        posts_processed: 0
      })
    }
    
    // Store in Redis with separate keys for posts and comments
    log.info('Storing data in Redis...')
    
    // Always cache posts (24-hour TTL for cron)
    const posts_cache: CacheData = {
      posts: posts_data,
      daily_threads: daily_threads.map(thread => ({
        ...thread,
        top_comments: [] // Posts cache doesn't include comments
      })),
      last_updated: new Date().toISOString(),
      total_posts: posts_data.length
    }
    
    await redis.setex(
      'wsb:hot_posts',
      86400,  // 24 hours
      JSON.stringify(posts_cache)
    )
    
    // Cache daily comments separately if we fetched them (shorter TTL)
    if (!skipComments && daily_threads.some(thread => thread.top_comments && thread.top_comments.length > 0)) {
      log.info('Storing daily thread comments separately...')
      const comments_cache = daily_threads.filter(thread => thread.top_comments && thread.top_comments.length > 0)
      
      await redis.setex(
        'wsb:daily_comments',
        14400,  // 4 hours TTL
        JSON.stringify(comments_cache)
      )
      
      // Store comment cache timestamp for age checking
      await redis.setex(
        'wsb:comments_updated',
        14400,  // Same TTL as comments
        new Date().toISOString()
      )
    }
    
    // Store metadata
    await redis.setex(
      'wsb:last_updated',
      86400,
      new Date().toISOString()
    )
    
    // Close Redis connection
    log.info('Closing Redis connection')
    redis.disconnect()
    
    log.info('Cache refresh completed successfully');
    
    return NextResponse.json({
      success: true,
      posts_processed: posts_data.length,
      cached_until: Date.now() + (86400 * 1000),
      sample_titles: posts_data.slice(0, 3).map(post => post.title.substring(0, 100)),
      message: `Successfully fetched and cached ${posts_data.length} WSB posts`,
      cache_key: 'wsb:hot_posts'
    })
    
  } catch (error: any) {
    if (error.message?.includes('Redis')) {
      return NextResponse.json({
        success: false,
        error: `Redis connection failed: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred'
    }, { status: 500 })
  }
}

// Handle GET requests (for Vercel cron jobs)
export async function GET(req: NextRequest) {
  // Validate cron secret for security
  const authHeader = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  log.info('Running cron job - skipping comments for performance');
  return await refreshCache(true); // Skip comments during cron
}

// Handle POST requests (for manual triggers)
export async function POST() {
  return await refreshCache();
}