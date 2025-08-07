import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get latest Reddit sentiment data (last 24 hours)
    const { data, error } = await supabase
      .from('reddit_sentiment')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('mention_count', { ascending: false })
      .limit(50)

    if (error) throw error

    // Transform data for frontend
    const trendingStocks = data.map(stock => ({
      symbol: stock.symbol,
      sentiment: stock.sentiment_label,
      sentimentScore: stock.sentiment_score,
      mentions: stock.mention_count,
      trend: stock.sentiment_score > 0 ? 'bullish' : 'bearish',
      lastUpdated: stock.timestamp
    }))

    res.status(200).json(trendingStocks)
    
  } catch (error) {
    console.error('Error fetching sentiment data:', error)
    res.status(500).json({ error: 'Failed to fetch sentiment data' })
  }
}