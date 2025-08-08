import { NextRequest, NextResponse } from 'next/server'
import { DefaultApi, Configuration } from 'finnhub-ts'

const initializeFinnhubClient = () => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY not found in environment variables');
  }

  const configuration = new Configuration({
    apiKey: apiKey
  });

  return new DefaultApi(configuration);
}

const getQuote = async (symbol: string) => {
  const finnhubClient = initializeFinnhubClient();
  const response = await finnhubClient.quote(symbol);
  return response.data;
}

const getCompanyProfile = async (symbol: string) => {
  const finnhubClient = initializeFinnhubClient();
  const response = await finnhubClient.companyProfile2(symbol);
  return response.data;
}

const getCompanyNews = async (symbol: string) => {
  const finnhubClient = initializeFinnhubClient();
  
  // Get news for the last 30 days
  const to = Math.floor(Date.now() / 1000);
  const from = to - (30 * 24 * 60 * 60); // 30 days ago
  
  const response = await finnhubClient.companyNews(symbol, from.toString(), to.toString());
  return response.data;
}

const getMarketData = async () => {
  // Popular tech stocks and blue chips
  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
  
  const finnhubClient = initializeFinnhubClient();
  
  const stockPromises = popularStocks.map(async (symbol) => {
    try {
      // Fetch both quote and basic profile data
      const [quoteRes, profileRes] = await Promise.all([
        finnhubClient.quote(symbol),
        finnhubClient.companyProfile2(symbol)
      ]);
      
      return { 
        symbol, 
        data: quoteRes.data,
        profile: profileRes.data
      };
    } catch (error) {
      return { symbol, error: 'Failed to fetch data' };
    }
  });
  
  const results = await Promise.all(stockPromises);
  
  // Sort by market cap (using price as proxy) and return top performers
  const validResults = results.filter(r => r.data && r.data.c);
  return validResults.sort((a, b) => (b.data?.c || 0) - (a.data?.c || 0));
}

const getMarketIndices = async () => {
  const indices = [
    { symbol: 'SPY', name: 'S&P 500 ETF' },
    { symbol: 'QQQ', name: 'NASDAQ 100 ETF' },
    { symbol: 'DIA', name: 'Dow Jones ETF' },
    { symbol: 'VTI', name: 'Total Stock Market' }
  ];
  
  const finnhubClient = initializeFinnhubClient();
  
  const indexPromises = indices.map(async (index) => {
    try {
      const response = await finnhubClient.quote(index.symbol);
      return { 
        symbol: index.symbol,
        name: index.name,
        data: response.data
      };
    } catch (error) {
      return { 
        symbol: index.symbol, 
        name: index.name,
        error: 'Failed to fetch data' 
      };
    }
  });
  
  return await Promise.all(indexPromises);
}

const getMarketMovers = async () => {
  // For demo, we'll get data for popular stocks and sort them
  // Finnhub has specific endpoints for market movers but they require premium
  const stocks = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL'];
  
  const finnhubClient = initializeFinnhubClient();
  
  const stockPromises = stocks.map(async (symbol) => {
    try {
      const [quoteRes, profileRes] = await Promise.all([
        finnhubClient.quote(symbol),
        finnhubClient.companyProfile2(symbol)
      ]);
      
      return { 
        symbol, 
        data: quoteRes.data,
        profile: profileRes.data
      };
    } catch (error) {
      return { symbol, error: 'Failed to fetch data' };
    }
  });
  
  const results = await Promise.all(stockPromises);
  const validResults = results.filter(r => r.data && r.data.c && r.data.dp !== null);
  
  // Sort by percent change
  const gainers = validResults
    .filter(r => (r.data?.dp || 0) > 0)
    .sort((a, b) => (b.data?.dp || 0) - (a.data?.dp || 0))
    .slice(0, 5);
    
  const losers = validResults
    .filter(r => (r.data?.dp || 0) < 0)
    .sort((a, b) => (a.data?.dp || 0) - (b.data?.dp || 0))
    .slice(0, 5);
  
  return { gainers, losers };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const type = searchParams.get('type')

    // Handle market data request
    if (type === 'market') {
      const marketData = await getMarketData()
      return NextResponse.json({ stocks: marketData })
    }

    // Handle market indices request
    if (type === 'indices') {
      const indicesData = await getMarketIndices()
      return NextResponse.json({ indices: indicesData })
    }

    // Handle market movers request
    if (type === 'movers') {
      const moversData = await getMarketMovers()
      return NextResponse.json(moversData)
    }

    // Handle individual symbol request
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

    // Handle different data types for a specific symbol
    if (type === 'profile') {
      const profileData = await getCompanyProfile(symbol)
      return NextResponse.json(profileData)
    }

    if (type === 'news') {
      const newsData = await getCompanyNews(symbol)
      return NextResponse.json(newsData)
    }

    // Default: return quote data
    const data = await getQuote(symbol)
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Error fetching stock data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock data' }, 
      { status: 500 }
    )
  }
}
