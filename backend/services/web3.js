/**
 * Web3 Service
 * Handles fetching data from various Web3 APIs
 */

// Cache for API responses to avoid rate limits
let cache = {};
const CACHE_TTL = 60000; // 1 minute

function getCached(key) {
  const item = cache[key];
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache[key] = {
    data,
    timestamp: Date.now()
  };
}

/**
 * Fetches trending cryptocurrencies from CoinGecko
 */
async function getTrendingCoins() {
  try {
    const cached = getCached('trending_coins');
    if (cached) return cached;

    const response = await fetch('https://api.coingecko.com/api/v3/search/trending', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trending coins');
    }

    const data = await response.json();
    const trending = data.coins?.slice(0, 5).map(coin => ({
      name: coin.item.name,
      symbol: coin.item.symbol,
      market_cap_rank: coin.item.market_cap_rank,
      price_change_24h: coin.item.data?.price_change_percentage_24h?.usd || 0,
      source: 'CoinGecko'
    }));

    setCache('trending_coins', trending);
    return trending;
  } catch (error) {
    console.error('Error fetching trending coins:', error);
    return [];
  }
}

/**
 * Fetches DeFi protocols data from DeFiLlama
 */
async function getDeFiProtocols() {
  try {
    const cached = getCached('defi_protocols');
    if (cached) return cached;

    const response = await fetch('https://api.llama.fi/protocols', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch DeFi protocols');
    }

    const data = await response.json();
    const topProtocols = data
      ?.filter(p => p.chains && p.chains.length > 0)
      .slice(0, 5)
      .map(protocol => ({
        name: protocol.name,
        tvl: protocol.tvl || 0,
        chain: protocol.chains[0],
        source: 'DeFiLlama'
      }));

    setCache('defi_protocols', topProtocols);
    return topProtocols;
  } catch (error) {
    console.error('Error fetching DeFi protocols:', error);
    return [];
  }
}

/**
 * Gets recent crypto market data
 */
async function getCryptoMarketData() {
  try {
    const cached = getCached('market_data');
    if (cached) return cached;

    // Fetch top cryptocurrencies by market cap
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1&sparkline=false',
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }

    const data = await response.json();
    const marketData = data.map(coin => ({
      name: coin.name,
      symbol: coin.symbol,
      price: coin.current_price,
      price_change_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      source: 'CoinGecko'
    }));

    setCache('market_data', marketData);
    return marketData;
  } catch (error) {
    console.error('Error fetching market data:', error);
    return [];
  }
}

