/**
 * Web3 Service
 * Handles fetching data from various Web3 APIs
 */

import { logger } from '../utils/logger.js';

// Cache for API responses to avoid rate limits
let cache = {};
const CACHE_TTL = parseInt(process.env.WEB3_CACHE_TTL || '60000'); // Default: 1 minute

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
    logger.error('Error fetching trending coins:', error.message);
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
    logger.error('Error fetching DeFi protocols:', error.message);
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
    logger.error('Error fetching market data:', error.message);
    return [];
  }
}

/**
 * Fetches current Web3 trends and data
 */
export async function getWeb3Trends() {
  try {
    const [trendingCoins, defiProtocols, marketData] = await Promise.all([
      getTrendingCoins(),
      getDeFiProtocols(),
      getCryptoMarketData()
    ]);

    return {
      trending_coins: trendingCoins,
      top_defi_protocols: defiProtocols,
      market_data: marketData,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error fetching Web3 trends:', error.message);
    return {
      trending_coins: [],
      top_defi_protocols: [],
      market_data: []
    };
  }
}

/**
 * Searches for relevant Web3 context based on query
 */
export async function searchWeb3Context(query) {
  try {
    const lowerQuery = query.toLowerCase();
    const sources = [];

    // Determine what type of information to fetch based on query
    let relevantData = '';
    const keywords = lowerQuery.split(' ');

    // Check if query is about specific coins
    const coinKeywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'bnb', 'solana', 'sol', 'cardano', 'ada'];
    const hasCoinKeyword = coinKeywords.some(keyword => keywords.some(k => k.includes(keyword)));

    if (hasCoinKeyword || lowerQuery.includes('price') || lowerQuery.includes('coin')) {
      const marketData = await getCryptoMarketData();
      if (marketData.length > 0) {
        relevantData += `Recent market data: ${marketData.map(c => `${c.name} (${c.symbol}) at $${c.price}`).join(', ')}.\n`;
        sources.push({ name: 'CoinGecko', url: 'https://www.coingecko.com' });
      }
    }

    // Check if query is about DeFi
    if (lowerQuery.includes('defi') || lowerQuery.includes('lending') || lowerQuery.includes('yield')) {
      const defiData = await getDeFiProtocols();
      if (defiData.length > 0) {
        relevantData += `Top DeFi protocols: ${defiData.map(p => `${p.name} on ${p.chain}`).join(', ')}.\n`;
        sources.push({ name: 'DeFiLlama', url: 'https://defillama.com' });
      }
    }

    // Check if query is about trends
    if (lowerQuery.includes('trending') || lowerQuery.includes('trend')) {
      const trending = await getTrendingCoins();
      if (trending.length > 0) {
        relevantData += `Currently trending: ${trending.map(c => `${c.name} (${c.symbol})`).join(', ')}.\n`;
        sources.push({ name: 'CoinGecko', url: 'https://www.coingecko.com' });
      }
    }

    // General Web3 context if no specific match
    if (!relevantData) {
      relevantData = 'Web3 ecosystem is evolving rapidly with DeFi, NFTs, and Layer 2 solutions. ';
      const trends = await getWeb3Trends();
      if (trends.market_data.length > 0) {
        relevantData += `Current top cryptocurrencies include ${trends.market_data.slice(0, 3).map(c => c.name).join(', ')}.`;
      }
      sources.push({ name: 'CoinGecko', url: 'https://www.coingecko.com' });
    }

    return {
      relevantData,
      sources
    };
  } catch (error) {
    logger.error('Error searching Web3 context:', error.message);
    
    // Provide fallback context when APIs are unavailable
    return {
      relevantData: 'Web3 is a rapidly evolving space including DeFi, NFTs, blockchain technology, and cryptocurrencies. ' +
        'Due to network constraints, I cannot fetch current market data, but I can still discuss Web3 concepts and trends.',
      sources: [{ name: 'General Web3 Knowledge', url: '#' }]
    };
  }
}

