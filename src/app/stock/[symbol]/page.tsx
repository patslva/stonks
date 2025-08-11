'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Globe, Calendar, Building } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

interface CompanyProfile {
  name: string
  ticker: string
  exchange: string
  ipo: string
  marketCapitalization: number
  shareOutstanding: number
  logo: string
  phone: string
  weburl: string
  finnhubIndustry: string
}

interface NewsItem {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

interface HistoricalData {
  c: number[] // close prices
  h: number[] // high prices
  l: number[] // low prices
  o: number[] // open prices
  t: number[] // timestamps
  v: number[] // volumes
}

interface ChartDataPoint {
  date: string
  price: number
  timestamp: number
}

export default function StockPage() {
  const params = useParams()
  const router = useRouter()
  const symbol = params.symbol as string
  
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartPeriod, setChartPeriod] = useState<'1D' | '1W' | '1M' | '3M' | '1Y'>('1M')

  useEffect(() => {
    if (!symbol) return
    fetchStockDetails()
  }, [symbol])

  useEffect(() => {
    if (!symbol || !stockData) return
    fetchChartData()
  }, [chartPeriod, symbol, stockData])

  const fetchStockDetails = async () => {
    setLoading(true)
    try {
      // Fetch stock quote, company profile, and news in parallel
      const [quoteRes, profileRes, newsRes] = await Promise.all([
        fetch(`/api/stock-data?symbol=${symbol}`),
        fetch(`/api/stock-data?symbol=${symbol}&type=profile`),
        fetch(`/api/stock-data?symbol=${symbol}&type=news`)
      ])

      if (quoteRes.ok) {
        const quoteData = await quoteRes.json()
        setStockData(quoteData)
        // Fetch chart data after we have the current stock data
        setTimeout(() => fetchChartData(), 100)
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setCompanyProfile(profileData)
      }

      if (newsRes.ok) {
        const newsData = await newsRes.json()
        setNews(newsData.slice(0, 10)) // Show top 10 news items
      }

    } catch (err) {
      setError('Failed to fetch stock details')
      console.error('Error fetching stock details:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchChartData = async () => {
    try {
      const periodToDays: Record<typeof chartPeriod, number> = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '1Y': 365
      }

      const days = periodToDays[chartPeriod]
      const resolution = chartPeriod === '1D' ? '5' : chartPeriod === '1W' ? '15' : 'D'
      
      const response = await fetch(
        `/api/stock-data?symbol=${symbol}&type=candles&days=${days}&resolution=${resolution}`
      )

      if (response.ok) {
        const historicalData: HistoricalData = await response.json()
        
        if (historicalData.c && historicalData.t && historicalData.c.length > 0) {
          const formattedData: ChartDataPoint[] = historicalData.c.map((price, index) => ({
            price: price,
            timestamp: historicalData.t[index],
            date: new Date(historicalData.t[index] * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              ...(chartPeriod === '1Y' ? { year: '2-digit' } : {})
            })
          }))
          
          setChartData(formattedData)
        } else {
          // Fallback: Generate mock data based on current stock price
          generateMockChartData()
        }
      } else {
        console.error('Failed to fetch historical data:', response.status)
        generateMockChartData()
      }
    } catch (err) {
      console.error('Error fetching chart data:', err)
      generateMockChartData()
    }
  }

  const generateMockChartData = () => {
    if (!stockData?.c) return

    const currentPrice = stockData.c
    const dataPoints = chartPeriod === '1D' ? 48 : chartPeriod === '1W' ? 7 : chartPeriod === '1M' ? 30 : chartPeriod === '3M' ? 90 : 365
    const mockData: ChartDataPoint[] = []
    
    // Generate realistic price movement around current price
    let price = currentPrice * 0.95 // Start 5% below current
    const volatility = 0.02 // 2% daily volatility
    const trend = (currentPrice - price) / dataPoints // Gradual trend to current price

    for (let i = 0; i < dataPoints; i++) {
      const randomChange = (Math.random() - 0.5) * volatility * price
      price += trend + randomChange
      
      const date = new Date()
      if (chartPeriod === '1D') {
        date.setHours(9 + Math.floor(i / 2), (i % 2) * 30) // Every 30 minutes
      } else {
        date.setDate(date.getDate() - (dataPoints - i - 1)) // Days ago
      }
      
      mockData.push({
        price: Math.max(price, currentPrice * 0.8), // Don't go below 80% of current
        timestamp: date.getTime() / 1000,
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          ...(chartPeriod === '1Y' ? { year: '2-digit' } : {}),
          ...(chartPeriod === '1D' ? { hour: 'numeric' } : {})
        })
      })
    }
    
    setChartData(mockData)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p style={{ fontSize: '16px', color: '#888888' }}>Loading {symbol?.toUpperCase()} details...</p>
        </div>
      </main>
    )
  }

  if (error || !stockData) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
            Stock Not Found
          </h1>
          <p style={{ fontSize: '16px', color: '#888888', marginBottom: '32px' }}>
            Unable to load data for {symbol?.toUpperCase()}
          </p>
          <Link 
            href="/"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: '#1db954',
              color: '#000000',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              transition: 'background-color 0.2s ease'
            }}
          >
            <ArrowLeft style={{ height: '16px', width: '16px' }} />
            Back to Home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#000000', color: '#ffffff', padding: '0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link 
            href="/"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1db954',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '24px'
            }}
          >
            <ArrowLeft style={{ height: '16px', width: '16px' }} />
            Back to Home
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {companyProfile?.logo && (
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  backgroundColor: '#1a1a1a', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid #333333'
                }}>
                  <img 
                    src={companyProfile.logo} 
                    alt={`${symbol} logo`}
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.textContent = symbol?.slice(0, 2) || '';
                    }}
                  />
                </div>
              )}
              <div>
                <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', margin: '0', lineHeight: '1.1' }}>
                  {symbol?.toUpperCase()}
                </h1>
                {companyProfile?.name && (
                  <p style={{ fontSize: '20px', color: '#888888', margin: '8px 0 0 0' }}>
                    {companyProfile.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stock Chart */}
        <div style={{ 
          backgroundColor: '#0a0a0a', 
          borderRadius: '16px', 
          border: '1px solid #333333', 
          boxShadow: '0 8px 32px rgb(0 0 0 / 0.4)',
          marginBottom: '32px'
        }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #333333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '0' }}>
                📈 Price Chart
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['1D', '1W', '1M', '3M', '1Y'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: chartPeriod === period ? '#1db954' : '#1a1a1a',
                      color: chartPeriod === period ? '#000000' : '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '24px', height: '400px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888888" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333333',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={(stockData?.d || 0) >= 0 ? '#1db954' : '#ff6b6b'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: (stockData?.d || 0) >= 0 ? '#1db954' : '#ff6b6b' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#888888'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                  <p>Loading chart data...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Price KPI Cards */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {/* Current Price */}
          <div style={{ 
            flex: '1', 
            backgroundColor: '#0a0a0a', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid #333333',
            minWidth: '280px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CURRENT PRICE
                </p>
                <p style={{ fontSize: '48px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px', lineHeight: '1' }}>
                  ${stockData.c?.toFixed(2) || 'N/A'}
                </p>
                <p style={{ 
                  fontSize: '16px', 
                  color: (stockData.d || 0) >= 0 ? '#1db954' : '#ff6b6b', 
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: '600'
                }}>
                  {(stockData.d || 0) >= 0 ? (
                    <TrendingUp style={{ height: '16px', width: '16px' }} />
                  ) : (
                    <TrendingDown style={{ height: '16px', width: '16px' }} />
                  )}
                  {(stockData.d || 0) >= 0 ? '+' : ''}{stockData.d?.toFixed(2) || '0.00'} 
                  ({(stockData.dp || 0) >= 0 ? '+' : ''}{stockData.dp?.toFixed(2) || '0.00'}%)
                </p>
              </div>
              <div style={{ 
                height: '64px', 
                width: '64px', 
                backgroundColor: (stockData.d || 0) >= 0 ? '#1db954' : '#ff6b6b', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {(stockData.d || 0) >= 0 ? (
                  <TrendingUp style={{ height: '32px', width: '32px', color: '#000000' }} />
                ) : (
                  <TrendingDown style={{ height: '32px', width: '32px', color: '#000000' }} />
                )}
              </div>
            </div>
          </div>

          {/* Day Range */}
          <div style={{ 
            flex: '1', 
            backgroundColor: '#0a0a0a', 
            borderRadius: '16px', 
            padding: '24px', 
            border: '1px solid #333333',
            minWidth: '200px'
          }}>
            <p style={{ fontSize: '14px', fontWeight: '500', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              DAY RANGE
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#888888' }}>Low</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>${stockData.l?.toFixed(2) || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#888888' }}>High</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>${stockData.h?.toFixed(2) || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#888888' }}>Open</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>${stockData.o?.toFixed(2) || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#888888' }}>Prev Close</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>${stockData.pc?.toFixed(2) || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          {/* Company Profile */}
          {companyProfile && (
            <div style={{ 
              backgroundColor: '#0a0a0a', 
              borderRadius: '16px', 
              border: '1px solid #333333', 
              boxShadow: '0 8px 32px rgb(0 0 0 / 0.4)'
            }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #333333' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building style={{ height: '24px', width: '24px', color: '#1db954' }} />
                  Company Profile
                </h2>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Industry
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
                      {companyProfile.finnhubIndustry || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Exchange
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
                      {companyProfile.exchange || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      IPO Date
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
                      {companyProfile.ipo || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                      Market Cap
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
                      ${(companyProfile.marketCapitalization / 1000).toFixed(2)}B
                    </p>
                  </div>
                </div>
                
                {companyProfile.weburl && (
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #333333' }}>
                    <a 
                      href={companyProfile.weburl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#1db954',
                        textDecoration: 'none',
                        fontSize: '16px',
                        fontWeight: '500'
                      }}
                    >
                      <Globe style={{ height: '16px', width: '16px' }} />
                      Visit Company Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* News */}
          <div style={{ 
            backgroundColor: '#0a0a0a', 
            borderRadius: '16px', 
            border: '1px solid #333333', 
            boxShadow: '0 8px 32px rgb(0 0 0 / 0.4)'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #333333' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📰 Latest News
              </h2>
            </div>
            <div style={{ padding: '0' }}>
              {news.length > 0 ? (
                news.slice(0, 5).map((article, index) => (
                  <div
                    key={article.id}
                    style={{ 
                      padding: '20px 24px',
                      borderBottom: index < 4 ? '1px solid #333333' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111111'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => window.open(article.url, '_blank')}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      {article.image && (
                        <img
                          src={article.image}
                          alt={article.headline}
                          style={{
                            width: '60px',
                            height: '45px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            flexShrink: 0
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#ffffff', 
                          marginBottom: '6px',
                          lineHeight: '1.3',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {article.headline}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#666666' }}>
                          <span>{article.source}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar style={{ height: '10px', width: '10px' }} />
                            <span>{new Date(article.datetime * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: '#888888', fontSize: '14px' }}>No news available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}