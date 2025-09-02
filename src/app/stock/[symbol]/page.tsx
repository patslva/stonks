'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Globe, Calendar, Building } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

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
  const [chartLoading, setChartLoading] = useState(false)
  const [chartPeriod, setChartPeriod] = useState<'1D' | '1W' | '1M' | '6M' | '1Y' | '5Y'>('1M')

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
    setChartLoading(true)
    try {
      const periodToDays: Record<typeof chartPeriod, number> = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '6M': 180,
        '1Y': 365,
        '5Y': 1825
      }

      const days = periodToDays[chartPeriod]
      const resolution = chartPeriod === '1D' ? '5' : chartPeriod === '1W' ? '15' : chartPeriod === '1M' ? 'D' : 'W'
      
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
              ...(chartPeriod === '1Y' || chartPeriod === '5Y' ? { year: '2-digit' } : {}),
              ...(chartPeriod === '1D' ? { hour: 'numeric', minute: '2-digit' } : {})
            })
          }))
          
          setChartData(formattedData)
        } else {
          // No data available
          setChartData([])
        }
      } else {
        setChartData([])
      }
    } catch (err) {
      setChartData([])
    } finally {
      setChartLoading(false)
    }
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
          borderRadius: '20px', 
          border: '1px solid #222222', 
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04)',
          marginBottom: '32px'
        }}>
          <div style={{ padding: '32px 32px 16px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: '0', lineHeight: '1.2' }}>
                  ${stockData?.c?.toFixed(2) || '0.00'}
                </h2>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginTop: '4px',
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: (stockData?.d || 0) >= 0 ? '#10b981' : '#ef4444'
                }}>
                  <span>{(stockData?.d || 0) >= 0 ? '↗' : '↘'}</span>
                  <span>
                    {(stockData?.d || 0) >= 0 ? '+' : ''}{stockData?.d?.toFixed(2) || '0.00'} 
                    ({(stockData?.dp || 0) >= 0 ? '+' : ''}{stockData?.dp?.toFixed(2) || '0.00'}%)
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['1D', '1W', '1M', '6M', '1Y', '5Y'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: chartPeriod === period ? '#1db954' : 'transparent',
                      color: chartPeriod === period ? '#000000' : '#888888',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (chartPeriod !== period) {
                        e.currentTarget.style.backgroundColor = '#1a1a1a'
                        e.currentTarget.style.color = '#ffffff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (chartPeriod !== period) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = '#888888'
                      }
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding: '0 32px 32px 32px', height: '450px' }}>
            {chartLoading ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                color: '#888888'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                  <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading chart data...</p>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="5%" 
                        stopColor={(stockData?.d || 0) >= 0 ? '#10b981' : '#ef4444'} 
                        stopOpacity={0.2}
                      />
                      <stop 
                        offset="95%" 
                        stopColor={(stockData?.d || 0) >= 0 ? '#10b981' : '#ef4444'} 
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="1 4" stroke="#1a1a1a" horizontal={true} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666666" 
                    fontSize={13}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666666' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#666666" 
                    fontSize={13}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666666' }}
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: '1px solid #333333',
                      borderRadius: '12px',
                      color: '#ffffff',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    labelFormatter={(label) => `${label}`}
                    cursor={{ strokeDasharray: '2 2', stroke: '#666666' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={(stockData?.d || 0) >= 0 ? '#10b981' : '#ef4444'}
                    strokeWidth={3}
                    fill="url(#priceGradient)"
                    activeDot={{ 
                      r: 6, 
                      fill: (stockData?.d || 0) >= 0 ? '#10b981' : '#ef4444',
                      strokeWidth: 3,
                      stroke: '#111111'
                    }}
                  />
                </AreaChart>
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
                  <p>No chart data available for this period</p>
                  <p style={{ fontSize: '12px', marginTop: '8px' }}>Try selecting a different time period</p>
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