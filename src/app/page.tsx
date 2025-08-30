'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LineChart, CalendarClock, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button" 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

const KPICard = ({ title, value, change, icon: Icon, isIndex = false }: {
  title: string
  value: string | number
  change?: number
  icon: any
  isIndex?: boolean
}) => (
  <div style={{ 
    flex: '1', 
    backgroundColor: '#0a0a0a', 
    borderRadius: '12px', 
    padding: '24px', 
    border: '1px solid #333333',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.border = '1px solid #555555';
    e.currentTarget.style.backgroundColor = '#111111';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.border = '1px solid #333333';
    e.currentTarget.style.backgroundColor = '#0a0a0a';
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: '500', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </p>
        <p style={{ fontSize: isIndex ? '32px' : '48px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px', lineHeight: '1' }}>
          {typeof value === 'number' ? (isIndex ? `$${value.toFixed(2)}` : value.toLocaleString()) : value}
        </p>
        {change !== undefined && (
          <p style={{ 
            fontSize: '12px', 
            color: change >= 0 ? '#1db954' : '#ff6b6b', 
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {change >= 0 ? '▲' : '▼'} {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </p>
        )}
      </div>
      <div style={{ 
        height: '48px', 
        width: '48px', 
        backgroundColor: '#1db954', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Icon style={{ height: '24px', width: '24px', color: '#000000' }} />
      </div>
    </div>
  </div>
)

const StockRow = ({ stock }: { stock: any }) => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '16px',
    borderBottom: '1px solid #333333',
    transition: 'background-color 0.2s ease',
    cursor: 'pointer'
  }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111111'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
  onClick={() => window.location.href = `/stock/${stock.symbol}`}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        backgroundColor: '#1a1a1a', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid #333333'
      }}>
        {stock.profile?.logo ? (
          <img 
            src={stock.profile.logo} 
            alt={`${stock.symbol} logo`}
            style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.textContent = stock.symbol.slice(0, 2);
            }}
          />
        ) : (
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>
            {stock.symbol.slice(0, 2)}
          </span>
        )}
      </div>
      <div>
        <p style={{ fontWeight: '600', color: '#ffffff', margin: '0' }}>{stock.symbol}</p>
        <p style={{ fontSize: '12px', color: '#888888', margin: '0', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stock.profile?.name || stock.name || ''}
        </p>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <p style={{ fontWeight: '600', color: '#ffffff', margin: '0' }}>
        ${stock.data?.c?.toFixed(2) || stock.price?.toFixed(2) || 'N/A'}
      </p>
      <p style={{ 
        fontSize: '12px', 
        color: (stock.data?.dp || stock.change || 0) >= 0 ? '#1db954' : '#ff6b6b', 
        margin: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '4px'
      }}>
        {(stock.data?.dp || stock.change || 0) >= 0 ? '▲' : '▼'} 
        {(stock.data?.dp || stock.change || 0) >= 0 ? '+' : ''}{(stock.data?.dp || stock.change || 0).toFixed(2)}%
      </p>
    </div>
  </div>
)

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [stocks, setStocks] = useState<StockQuote[]>([])
  const [loadingTickers, setLoadingTickers] = useState(true)
  const [indices, setIndices] = useState<any[]>([])
  const [movers, setMovers] = useState<{gainers: any[], losers: any[]}>({gainers: [], losers: []})
  const [loadingMarketData, setLoadingMarketData] = useState(true)
  const [marketNews, setMarketNews] = useState<any[]>([])
  const [loadingNews, setLoadingNews] = useState(true)

  // Auth check - redirect to login if not authenticated
  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/login')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    // Auto-refresh cache when home page loads
    refreshCache()
    // Load market data
    loadMarketData()
    // Load indices and movers
    loadMarketOverview()
    // Load market news
    loadMarketNews()
  }, [])

  const loadMarketNews = async () => {
    setLoadingNews(true)
    try {
      const response = await fetch('/api/stock-data?type=market-news')
      if (response.ok) {
        const data = await response.json()
        setMarketNews(data.news || [])
      }
    } catch (error) {
      console.error('Failed to load market news:', error)
    } finally {
      setLoadingNews(false)
    }
  }

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
        setLastRefresh(new Date().toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }))
      }
    } catch (error) {
      console.error('Failed to refresh cache:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Show loading while checking auth or redirecting
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', padding: '0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Clean Header like Image 1 */}
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '28px' }}>📈</span>
            <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#ffffff', margin: '0' }}>
              Stonks
            </h1>
            <span style={{ fontSize: '24px' }}>🚀</span>
          </div>
          
          <p style={{ fontSize: '18px', color: '#888888', marginBottom: '24px' }}>
            AI-powered stock analysis with Reddit Trading dashboard with AI-assisted 'betting' tips
          </p>
          
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '12px', 
            backgroundColor: '#1a1a1a',
            border: '1px solid #333333',
            borderRadius: '50px',
            padding: '12px 24px',
            marginBottom: '24px'
          }}>
            <div style={{ 
              backgroundColor: '#1db954', 
              color: '#000000', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: '600' 
            }}>
              {refreshing ? 'Refreshing...' : 'Data OK'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#888888' }}>
              <CalendarClock style={{ height: '14px', width: '14px' }} />
              Refreshed at {lastRefresh || new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}
            </div>
          </div>
          
          <div style={{ marginBottom: '32px' }}>
            <Link 
              href="/dashboard" 
              style={{ 
                color: '#ffffff', 
                textDecoration: 'underline',
                textDecorationColor: '#888888',
                textUnderlineOffset: '4px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              View r/WallStreetBets Dashboard →
            </Link>
          </div>
        </header>

        {/* Clean Search Section */}
        <div style={{ maxWidth: '600px', margin: '0 auto 48px auto' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ 
              position: 'absolute', 
              left: '20px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              height: '20px', 
              width: '20px', 
              color: '#666666' 
            }} />
            <input
              type="text"
              placeholder="Search stocks (e.g., AAPL, TSLA) and press Enter…"
              style={{
                width: '100%',
                padding: '16px 20px 16px 52px',
                backgroundColor: '#1a1a1a',
                border: '2px solid #333333',
                borderRadius: '50px',
                color: '#ffffff',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#1db954'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#333333'}
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
          </div>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#666666', marginTop: '12px' }}>
            Press Enter to view detailed stock information
          </p>
        </div>

        {/* Market Overview - KPI Cards */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
            📊 Market Overview
          </h2>
          
          {loadingMarketData ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
              <p style={{ fontSize: '14px', color: '#888888' }}>Loading market data...</p>
            </div>
          ) : (
            <>
              {/* Market Indices KPI Cards */}
              <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                {indices.slice(0, 4).map((index) => (
                  <KPICard
                    key={index.symbol}
                    title={index.name}
                    value={index.data?.c || 0}
                    change={index.data?.dp}
                    icon={LineChart}
                    isIndex={true}
                  />
                ))}
              </div>

              {/* Top Movers Section */}
              <div style={{ 
                backgroundColor: '#0a0a0a', 
                borderRadius: '16px', 
                border: '1px solid #333333', 
                boxShadow: '0 8px 32px rgb(0 0 0 / 0.4)'
              }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #333333' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🚀 Top Movers
                  </h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                  {/* Top Gainers */}
                  <div>
                    <div style={{ padding: '16px 24px', backgroundColor: '#1db954', color: '#000000' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ▲ Top Gainers
                      </h4>
                    </div>
                    <div>
                      {movers.gainers.slice(0, 5).map((stock, index) => (
                        <StockRow key={stock.symbol} stock={stock} />
                      ))}
                    </div>
                  </div>

                  {/* Top Losers */}
                  <div style={{ borderLeft: '1px solid #333333' }}>
                    <div style={{ padding: '16px 24px', backgroundColor: '#ff6b6b', color: '#000000' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ▼ Top Losers
                      </h4>
                    </div>
                    <div>
                      {movers.losers.slice(0, 5).map((stock, index) => (
                        <StockRow key={stock.symbol} stock={stock} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Market News Section */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
            📰 Market News
          </h2>
          
          {loadingNews ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
              <p style={{ fontSize: '14px', color: '#888888' }}>Loading market news...</p>
            </div>
          ) : (
            <div style={{ 
              backgroundColor: '#0a0a0a', 
              borderRadius: '16px', 
              border: '1px solid #333333', 
              boxShadow: '0 8px 32px rgb(0 0 0 / 0.4)'
            }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #333333' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📰 Latest Market News
                </h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '0' }}>
                {marketNews.slice(0, 6).map((article, index) => (
                  <div
                    key={index}
                    style={{ 
                      padding: '20px 24px',
                      borderBottom: index < 5 ? '1px solid #333333' : 'none',
                      borderRight: index % 2 === 0 ? '1px solid #333333' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111111'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => window.open(article.url, '_blank')}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      {article.image && (
                        <img
                          src={article.image}
                          alt={article.headline}
                          style={{
                            width: '80px',
                            height: '60px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#ffffff', 
                          marginBottom: '8px',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {article.headline}
                        </h4>
                        <p style={{ 
                          fontSize: '14px', 
                          color: '#888888', 
                          marginBottom: '8px',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {article.summary}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#666666' }}>
                          <span>{article.source}</span>
                          <span>{new Date(article.datetime * 1000).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
// test