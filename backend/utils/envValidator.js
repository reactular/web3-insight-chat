/**
 * Environment Variable Validator
 * Validates required environment variables on startup
 */

import { logger } from './logger.js';

/**
 * Validates environment variables
 */
export function validateEnvironment() {
  const errors = [];
  const warnings = [];

  // Check LLM configuration
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const provider = process.env.LLM_PROVIDER?.toLowerCase();

  if (!hasOpenAI && !hasAnthropic) {
    warnings.push('No LLM API key found. Chat functionality will be limited.');
  } else {
    if (provider === 'openai' && !hasOpenAI) {
      errors.push('LLM_PROVIDER is set to "openai" but OPENAI_API_KEY is missing');
    }
    if (provider === 'anthropic' && !hasAnthropic) {
      errors.push('LLM_PROVIDER is set to "anthropic" but ANTHROPIC_API_KEY is missing');
    }
  }

  // Check embedding model (required if using vector store)
  if (hasOpenAI && !process.env.OPENAI_EMBEDDING_MODEL) {
    // Uses default, but log it
    logger.debug('Using default embedding model: text-embedding-3-small');
  }

  // Validate numeric values
  const numericVars = {
    PORT: process.env.PORT,
    DB_PORT: process.env.DB_PORT,
    OPENAI_TEMPERATURE: process.env.OPENAI_TEMPERATURE,
    OPENAI_MAX_TOKENS: process.env.OPENAI_MAX_TOKENS,
    ANTHROPIC_MAX_TOKENS: process.env.ANTHROPIC_MAX_TOKENS,
    VECTOR_SEARCH_LIMIT: process.env.VECTOR_SEARCH_LIMIT,
    VECTOR_MIN_SIMILARITY: process.env.VECTOR_MIN_SIMILARITY,
    QUERY_EXPANSION_MAX_VARIANTS: process.env.QUERY_EXPANSION_MAX_VARIANTS,
    WEB3_CACHE_TTL: process.env.WEB3_CACHE_TTL
  };

  for (const [key, value] of Object.entries(numericVars)) {
    if (value && isNaN(value)) {
      errors.push(`${key} must be a number, got: ${value}`);
    }
  }

  // Validate similarity threshold
  if (process.env.VECTOR_MIN_SIMILARITY) {
    const similarity = parseFloat(process.env.VECTOR_MIN_SIMILARITY);
    if (similarity < 0 || similarity > 1) {
      errors.push('VECTOR_MIN_SIMILARITY must be between 0 and 1');
    }
  }

  // Log results
  if (errors.length > 0) {
    logger.error('Environment validation failed:');
    errors.forEach(err => logger.error(`  - ${err}`));
    throw new Error('Environment validation failed. Please check your .env file.');
  }

  if (warnings.length > 0) {
    logger.warn('Environment warnings:');
    warnings.forEach(warn => logger.warn(`  - ${warn}`));
  }

  logger.info('Environment validation passed');
  return true;
}
