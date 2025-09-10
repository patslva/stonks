import Redis from 'ioredis'

interface RedditTokenResponse {
  access_token: string
  expires_in: number
}

interface RedditToken {
  access_token: string
  expires_at: number
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
  top_comments: never[]
}

interface CacheData {
  posts: RedditPost[]
  daily_threads: RedditPost[]
  last_updated: string
  total_posts: number
}

const log = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || '')
}

let redditToken: RedditToken | null = null

async function getRedditAccessToken(): Promise<string> {
  if (redditToken && redditToken.expires_at > Date.now()) {
    return redditToken.access_token
  }

  log.info('Getting new Reddit OAuth token...')
  
  const clientId = process.env.REDDIT_CLIENT_ID
  const clientSecret = process.env.REDDIT_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing Reddit credentials in environment variables')
  }
  
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

    const data: RedditTokenResponse = await response.json()
    
    redditToken = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000
    }
    
    log.info('Reddit OAuth token obtained successfully')
    return redditToken.access_token
    
  } catch (error: any) {
    log.error('Failed to get Reddit OAuth token:', error.message)
    throw error
  }
}

async function fetchRedditPosts(): Promise<CacheData> {
  try {
    const token = await getRedditAccessToken()
    
    log.info('Fetching Reddit posts with OAuth...')
    let response: Response | undefined
    let attempt = 0
    const maxAttempts = 3
    
    while (attempt < maxAttempts) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        
        response = await fetch('https://oauth.reddit.com/r/wallstreetbets/hot?limit=25', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': 'web:stonks-app:v1.0.0 (by /u/DueIndividual6973)',
            'Accept': 'application/json'
          },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          log.info(`Reddit API success on attempt ${attempt + 1}`)
          break
        } else {
          log.warn(`Reddit API failed with status ${response.status} on attempt ${attempt + 1}`)
          throw new Error(`Reddit API failed: ${response.status}`)
        }
      } catch (error: any) {
        attempt++
        log.warn(`Attempt ${attempt} failed:`, error.message)
        
        if (attempt >= maxAttempts) {
          throw new Error(`Reddit API failed after ${maxAttempts} attempts: ${error.message}`)
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
    
    if (!response) {
      throw new Error('Failed to get response after all attempts')
    }
    
    log.info('Parsing Reddit response...')
    const redditData = await response.json()
    log.info(`Found ${redditData.data.children.length} posts from Reddit`)
    
    const posts_data: RedditPost[] = []
    const daily_threads: RedditPost[] = []
    
    for (const item of redditData.data.children) {
      const post = item.data
      
      const post_data: RedditPost = {
        reddit_id: post.id,
        title: post.title.length > 500 ? post.title.substring(0, 500) : post.title,
        author: post.author || '[deleted]',
        score: post.score,
        num_comments: post.num_comments,
        url: post.url,
        permalink: `https://reddit.com${post.permalink}`,
        created_utc: post.created_utc,
        subreddit: 'wallstreetbets',
        top_comments: []
      }
      
      const title = post.title.toLowerCase()
      const isDailyThread = (
        title.includes('daily discussion thread') ||
        title.includes('what are your moves tomorrow') ||
        title.includes('moves tomorrow') ||
        (title.includes('daily discussion') && title.includes('thread')) ||
        (post.author === 'AutoModerator' && (title.includes('daily') || title.includes('moves tomorrow'))) ||
        title.match(/daily.*thread.*\d{1,2}[\/\-\.]\d{1,2}/i)
      )
      
      if (isDailyThread) {
        daily_threads.push(post_data)
      } else {
        posts_data.push(post_data)
      }
    }
    
    log.info(`Processing complete: ${posts_data.length} regular posts, ${daily_threads.length} daily threads`)
    
    return {
      posts: posts_data,
      daily_threads: daily_threads,
      last_updated: new Date().toISOString(),
      total_posts: posts_data.length
    }
    
  } catch (error: any) {
    log.error('Failed to fetch Reddit posts:', error.message)
    throw error
  }
}

async function saveToRedis(data: CacheData): Promise<void> {
  try {
    log.info('Initializing Redis client...')
    
    const redisUrl = process.env.REDIS_URL
    
    if (!redisUrl) {
      throw new Error('Missing REDIS_URL in environment variables')
    }
    
    const redis = new Redis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })
    
    log.info('Storing Reddit data in Redis...')
    
    const cache_data: CacheData = {
      posts: data.posts,
      daily_threads: data.daily_threads,
      last_updated: data.last_updated,
      total_posts: data.total_posts
    }
    
    await redis.setex(
      'wsb:hot_posts',
      3600,
      JSON.stringify(cache_data)
    )
    
    await redis.setex(
      'wsb:last_updated',
      3600,
      new Date().toISOString()
    )
    
    redis.disconnect()
    
    log.info(`Successfully stored ${data.total_posts} posts in Redis`)
    
  } catch (error: any) {
    log.error('Failed to save to Redis:', error.message)
    throw error
  }
}

async function main(): Promise<void> {
  try {
    log.info('Starting Reddit data fetch job...')
    
    const redditData = await fetchRedditPosts()
    
    await saveToRedis(redditData)
    
    log.info('Reddit data fetch job completed successfully!')
    
  } catch (error: any) {
    log.error('Reddit data fetch job failed:', error.message)
    process.exit(1)
  }
}

main()