/**
 * Logger Utility
 * Centralized logging with consistent formatting
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
const levelValue = LOG_LEVELS[currentLogLevel] ?? LOG_LEVELS.INFO;

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, ...args) {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level}]`;
  return args.length > 0 ? [prefix, message, ...args] : [prefix, message];
}

export const logger = {
  error: (...args) => {
    if (levelValue >= LOG_LEVELS.ERROR) {
      console.error(...formatMessage('ERROR', ...args));
    }
  },

  warn: (...args) => {
    if (levelValue >= LOG_LEVELS.WARN) {
      console.warn(...formatMessage('WARN', ...args));
    }
  },

  info: (...args) => {
    if (levelValue >= LOG_LEVELS.INFO) {
      console.log(...formatMessage('INFO', ...args));
    }
  },

  debug: (...args) => {
    if (levelValue >= LOG_LEVELS.DEBUG) {
      console.log(...formatMessage('DEBUG', ...args));
    }
  },

  // Special formatted loggers
  success: (...args) => {
    if (levelValue >= LOG_LEVELS.INFO) {
      console.log('✅', ...formatMessage('INFO', ...args));
    }
  },

  step: (...args) => {
    if (levelValue >= LOG_LEVELS.INFO) {
      console.log('🔧', ...formatMessage('INFO', ...args));
    }
  }
};


