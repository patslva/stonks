'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StockData {
  c: number // current price
  d: number // change
  dp: number // percent change
  h: number // high
  l: number // low
  o: number // open
  pc: number // previous close
  t: number // timestamp
}

interface StockQuote {
  symbol: string
  data?: StockData
  profile?: {
    name: string
    logo: string
    marketCapitalization: number
    finnhubIndustry: string
  }
  loading: boolean
  error?: string
}


export default function Home() {
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [stocks, setStocks] = useState<StockQuote[]>([])
  const [loadingTickers, setLoadingTickers] = useState(true)
  const [indices, setIndices] = useState<any[]>([])
  const [movers, setMovers] = useState<{gainers: any[], losers: any[]}>({gainers: [], losers: []})
  const [loadingMarketData, setLoadingMarketData] = useState(true)

  useEffect(() => {
    // Auto-refresh cache when home page loads
    refreshCache()
    // Load market data
    loadMarketData()
    // Load indices and movers
    loadMarketOverview()
  }, [])

  const loadMarketOverview = async () => {
    setLoadingMarketData(true)
    try {
      // Fetch indices and movers in parallel
      const [indicesRes, moversRes] = await Promise.all([
        fetch('/api/stock-data?type=indices'),
        fetch('/api/stock-data?type=movers')
      ])

      if (indicesRes.ok) {
        const indicesData = await indicesRes.json()
        setIndices(indicesData.indices || [])
      }

      if (moversRes.ok) {
        const moversData = await moversRes.json()
        setMovers(moversData)
      }

    } catch (error) {
      console.error('Failed to load market overview:', error)
    } finally {
      setLoadingMarketData(false)
    }
  }

  const loadMarketData = async () => {
    setLoadingTickers(true)
    try {
      // Fetch market data from Finnhub
      const response = await fetch('/api/stock-data?type=market')
      const data = await response.json()
      
      if (response.ok && data.stocks && data.stocks.length > 0) {
        // Transform the market data to match our StockQuote interface
        const marketStocks = data.stocks.map((stock: any) => ({
          symbol: stock.symbol,
          data: stock.data,
          profile: stock.profile,
          loading: false,
          error: stock.error
        }))
        
        setStocks(marketStocks)
      } else {
        throw new Error('Failed to fetch market data')
      }
      
      setLoadingTickers(false)
      
    } catch (error) {
      console.error('Failed to load market data:', error)
      // Use fallback stocks with individual API calls
      const fallbackTickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN']
      const initialStocks = fallbackTickers.map(ticker => ({
        symbol: ticker,
        loading: true
      }))
      setStocks(initialStocks)
      setLoadingTickers(false)
      fetchStockData(fallbackTickers)
    }
  }

  const fetchStockData = async (tickers?: string[]) => {
    const tickersToFetch = tickers || stocks.map(s => s.symbol)
    
    const stockPromises = tickersToFetch.map(async (ticker) => {
      try {
        const response = await fetch(`/api/stock-data?symbol=${ticker}`)
        const data = await response.json()
        
        if (response.ok) {
          return { symbol: ticker, data, loading: false }
        } else {
          return { symbol: ticker, error: data.error || 'Failed to fetch', loading: false }
        }
      } catch (error) {
        return { symbol: ticker, error: 'Network error', loading: false }
      }
    })
    
    const updatedStocks = await Promise.all(stockPromises)
    setStocks(updatedStocks)
  }

  const refreshCache = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/refresh-cache', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setLastRefresh(new Date().toLocaleTimeString())
      }
    } catch (error) {
      console.error('Failed to refresh cache:', error)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Stonks 📈
        </h1>
        <p className="text-xl text-center text-gray-600 mb-4">
          AI-powered stock analysis with Reddit sentiment
        </p>
        
        {refreshing ? (
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Refreshing Reddit data...</p>
          </div>
        ) : lastRefresh ? (
          <p className="text-center text-sm text-green-600 mb-8">
            ✅ Data refreshed at {lastRefresh}
          </p>
        ) : null}
        
        <div className="text-center mb-8">
          <Link 
            href="/dashboard" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Dashboard →
          </Link>
        </div>

        {/* Stock Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search stocks (e.g., AAPL, TSLA)..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement
                  const symbol = target.value.trim().toUpperCase()
                  if (symbol) {
                    window.location.href = `/stock/${symbol}`
                  }
                }
              }}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg 
                className="w-5 h-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            Press Enter to view detailed stock information
          </p>
        </div>

        {/* Market Overview */}
        <div className="mt-12 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">📊 Market Overview</h2>
          
          {loadingMarketData ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading market data...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Market Indices */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Market Indices</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {indices.map((index) => (
                    <div key={index.symbol} className="bg-white rounded-lg border p-4 text-center">
                      <h4 className="font-semibold text-gray-900 mb-1">{index.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{index.symbol}</p>
                      {index.data && index.data.c ? (
                        <>
                          <p className="text-xl font-bold text-gray-900">
                            ${index.data.c.toFixed(2)}
                          </p>
                          <p className={`text-sm ${
                            (index.data.d || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(index.data.d || 0) >= 0 ? '+' : ''}{index.data.d?.toFixed(2) || '0.00'} 
                            ({(index.data.dp || 0) >= 0 ? '+' : ''}{index.data.dp?.toFixed(2) || '0.00'}%)
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No data</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Movers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top Gainers */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-green-700">🚀 Top Gainers</h3>
                  <div className="space-y-3">
                    {movers.gainers.slice(0, 5).map((stock) => (
                      <Link
                        key={stock.symbol}
                        href={`/stock/${stock.symbol}`}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          {stock.profile?.logo && (
                            <img 
                              src={stock.profile.logo} 
                              alt={`${stock.symbol} logo`}
                              className="w-3 h-3 rounded"
                              style={{ width: '80px', height: '80px', maxWidth: '80px', maxHeight: '80px' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{stock.symbol}</p>
                            <p className="text-xs text-gray-600 truncate max-w-[120px]">
                              {stock.profile?.name || ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${stock.data.c?.toFixed(2) || 'N/A'}
                          </p>
                          <p className="text-sm text-green-600">
                            +{stock.data.dp?.toFixed(2) || '0.00'}%
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Top Losers */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-700">📉 Top Losers</h3>
                  <div className="space-y-3">
                    {movers.losers.slice(0, 5).map((stock) => (
                      <Link
                        key={stock.symbol}
                        href={`/stock/${stock.symbol}`}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2">
                          {stock.profile?.logo && (
                            <img 
                              src={stock.profile.logo} 
                              alt={`${stock.symbol} logo`}
                              className="w-3 h-3 rounded"
                              style={{ width: '80px', height: '80px', maxWidth: '80px', maxHeight: '80px' }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{stock.symbol}</p>
                            <p className="text-xs text-gray-600 truncate max-w-[120px]">
                              {stock.profile?.name || ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${stock.data.c?.toFixed(2) || 'N/A'}
                          </p>
                          <p className="text-sm text-red-600">
                            {stock.data.dp?.toFixed(2) || '0.00'}%
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-center mb-8">📈 Top Market Performers</h2>
          {loadingTickers ? (
            <div className="text-center mb-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading market data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocks.map((stock) => (
              <Link 
                key={stock.symbol} 
                href={`/stock/${stock.symbol}`}
                className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {stock.profile?.logo && (
                      <img 
                        src={stock.profile.logo} 
                        alt={`${stock.symbol} logo`}
                        className="w-3 h-3 rounded"
                        style={{ width: '80px', height: '80px', maxWidth: '80px', maxHeight: '80px' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-gray-900">{stock.symbol}</h3>
                      {stock.profile?.name && (
                        <p className="text-sm text-gray-600 truncate max-w-[200px]">
                          {stock.profile.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {stock.loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </div>
                
                {stock.data && stock.data.c !== null ? (
                  <div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      ${stock.data.c?.toFixed(2) || 'N/A'}
                    </div>
                    <div className={`flex items-center text-sm ${
                      (stock.data.d || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span className="mr-1">
                        {(stock.data.d || 0) >= 0 ? '▲' : '▼'}
                      </span>
                      <span className="font-medium">
                        {(stock.data.d || 0) >= 0 ? '+' : ''}{stock.data.d?.toFixed(2) || '0.00'} 
                        ({(stock.data.dp || 0) >= 0 ? '+' : ''}{stock.data.dp?.toFixed(2) || '0.00'}%)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-gray-500">
                      <div>High: ${stock.data.h?.toFixed(2) || 'N/A'}</div>
                      <div>Low: ${stock.data.l?.toFixed(2) || 'N/A'}</div>
                      {stock.profile?.marketCapitalization && (
                        <div>Market Cap: ${(stock.profile.marketCapitalization / 1000).toFixed(1)}B</div>
                      )}
                      {stock.profile?.finnhubIndustry && (
                        <div className="col-span-1 truncate">{stock.profile.finnhubIndustry}</div>
                      )}
                    </div>
                  </div>
                ) : stock.error ? (
                  <div className="text-red-500 text-sm">{stock.error}</div>
                ) : stock.data ? (
                  <div className="text-yellow-600 text-sm">No price data available</div>
                ) : null}
              </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🤖 AI Analysis</h3>
            <p className="text-gray-600">OpenAI O3 powered buy/sell recommendations</p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📊 Real-time Data</h3>
            <p className="text-gray-600">Live stock prices and earnings reports</p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">💬 Reddit Sentiment</h3>
            <p className="text-gray-600">r/wallstreetbets community insights</p>
          </div>
        </div>
      </div>
    </main>
  )
}