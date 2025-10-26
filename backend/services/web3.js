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

