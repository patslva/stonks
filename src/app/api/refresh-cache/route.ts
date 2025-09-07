import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

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

async function fetchTopComments(permalink: string): Promise<RedditComment[]> {
  try {
    // Reddit API endpoint for post comments (remove leading slash and add .json)
    const commentsUrl = `https://www.reddit.com${permalink}.json?sort=top&limit=5`
    const response = await fetch(commentsUrl, {
      headers: {
        'User-Agent': 'web:stonks-app:v1.0.0 (by /u/your-username)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
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
    console.log(`=== Starting cache refresh (skipComments: ${skipComments}) ===`)
    
    // Initialize Redis client
    console.log('Initializing Redis connection...')
    const redis = new Redis(process.env.REDIS_URL!, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    })
    
    // Fetch hot posts from r/wallstreetbets using Reddit API with timeout and retry
    console.log('Fetching Reddit posts...')
    let response;
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        response = await fetch('https://www.reddit.com/r/wallstreetbets/hot.json?limit=25', {
          headers: {
            'User-Agent': 'web:stonks-app:v1.0.0 (by /u/your-username)',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`Reddit API success on attempt ${attempt + 1}`);
          break;
        } else {
          console.log(`Reddit API failed with status ${response.status} on attempt ${attempt + 1}`);
          throw new Error(`Reddit API failed: ${response.status}`);
        }
      } catch (error: any) {
        attempt++;
        console.log(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt >= maxAttempts) {
          throw new Error(`Reddit API failed after ${maxAttempts} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    console.log('Parsing Reddit response...')
    const redditData = await response.json()
    console.log(`Found ${redditData.data.children.length} posts from Reddit`)
    
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
          console.log('Fetching comments for daily thread:', post.title.substring(0, 50) + '...')
          const topComments = await fetchTopComments(post.permalink)
          post_data.top_comments = topComments
        } else {
          console.log('Skipping comments for daily thread (cron mode):', post.title.substring(0, 50) + '...')
          post_data.top_comments = []
        }
        daily_threads.push(post_data)
      } else {
        posts_data.push(post_data)
      }
    }
    
    console.log(`Processing complete: ${posts_data.length} regular posts, ${daily_threads.length} daily threads`)
    
    if (posts_data.length === 0) {
      console.log('No posts to cache, returning early')
      return NextResponse.json({
        success: true,
        message: 'No new posts to process',
        posts_processed: 0
      })
    }
    
    // Store in Redis cache with 24-hour expiration (for cron setup)
    const cache_data: CacheData = {
      posts: posts_data,
      daily_threads: daily_threads,
      last_updated: new Date().toISOString(),
      total_posts: posts_data.length
    }
    
    // Store with 24-hour TTL (86400 seconds) for daily cron
    console.log('Storing data in Redis...')
    await redis.setex(
      'wsb:hot_posts',
      86400,  // 24 hours
      JSON.stringify(cache_data)
    )
    
    // Store metadata
    await redis.setex(
      'wsb:last_updated',
      86400,
      new Date().toISOString()
    )
    
    // Close Redis connection
    console.log('Closing Redis connection')
    redis.disconnect()
    
    console.log('=== Cache refresh completed successfully ===');
    
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
  
  console.log('Running cron job - skipping comments for performance');
  return await refreshCache(true); // Skip comments during cron
}

// Handle POST requests (for manual triggers)
export async function POST() {
  return await refreshCache();
}