/**
 * LLM Service
 * Handles communication with LLM providers (OpenAI, Anthropic)
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Calls OpenAI API
 */
async function callOpenAI(prompt, apiKey) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo-1106',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant specializing in Web3, blockchain, and cryptocurrency trends. Provide accurate, up-to-date information and insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Calls Anthropic API
 */
async function callAnthropic(prompt, apiKey) {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are a helpful AI assistant specializing in Web3, blockchain, and cryptocurrency trends. Provide accurate, up-to-date information and insights.\n\n${prompt}`
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Main function to get LLM response
 */
export async function getLLMResponse(message, context = '') {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();
  const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  // Combine message with context if available
  const prompt = context ? `Context: ${context}\n\nUser Question: ${message}` : message;

  try {
    let response;
    if (provider === 'openai') {
      response = await callOpenAI(prompt, apiKey);
    } else if (provider === 'anthropic') {
      response = await callAnthropic(prompt, apiKey);
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    return response;
  } catch (error) {
    console.error('LLM API Error:', error);
    throw error;
  }
}

