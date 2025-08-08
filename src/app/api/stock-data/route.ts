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

const getMarketData = async () => {
  // Popular tech stocks and blue chips
  const popularStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'];
  
  const finnhubClient = initializeFinnhubClient();
  
  const stockPromises = popularStocks.map(async (symbol) => {
    try {
      const response = await finnhubClient.quote(symbol);
      return { symbol, data: response.data };
    } catch (error) {
      return { symbol, error: 'Failed to fetch data' };
    }
  });
  
  const results = await Promise.all(stockPromises);
  
  // Sort by market cap (using price as proxy) and return top performers
  const validResults = results.filter(r => r.data && r.data.c);
  return validResults.sort((a, b) => (b.data?.c || 0) - (a.data?.c || 0));
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

    // Handle individual symbol request
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

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
