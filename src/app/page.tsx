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
  loading: boolean
  error?: string
}


export default function Home() {
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [stocks, setStocks] = useState<StockQuote[]>([])
  const [loadingTickers, setLoadingTickers] = useState(true)

  useEffect(() => {
    // Auto-refresh cache when home page loads
    refreshCache()
    // Load market data
    loadMarketData()
  }, [])

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
              <div key={stock.symbol} className="p-6 border rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{stock.symbol}</h3>
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
                      <div>Open: ${stock.data.o?.toFixed(2) || 'N/A'}</div>
                      <div>High: ${stock.data.h?.toFixed(2) || 'N/A'}</div>
                      <div>Low: ${stock.data.l?.toFixed(2) || 'N/A'}</div>
                      <div>Prev: ${stock.data.pc?.toFixed(2) || 'N/A'}</div>
                    </div>
                  </div>
                ) : stock.error ? (
                  <div className="text-red-500 text-sm">{stock.error}</div>
                ) : stock.data ? (
                  <div className="text-yellow-600 text-sm">No price data available</div>
                ) : null}
              </div>
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