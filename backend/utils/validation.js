/**
 * Validation Utilities
 * Input validation helpers for API endpoints
 */

/**
 * Validates chat message
 */
export function validateChatMessage(message) {
  const errors = [];

  if (!message || typeof message !== 'string') {
    errors.push('Message must be a string');
  } else {
    const trimmed = message.trim();
    
    if (trimmed.length === 0) {
      errors.push('Message cannot be empty');
    }
    
    if (trimmed.length > 5000) {
      errors.push('Message cannot exceed 5000 characters');
    }
    
    // Check for potentially malicious content (basic)
    if (trimmed.includes('<script>') || trimmed.includes('javascript:')) {
      errors.push('Message contains potentially unsafe content');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates document content
 */
export function validateDocument(content, metadata = {}) {
  const errors = [];

  if (!content || typeof content !== 'string') {
    errors.push('Content must be a string');
  } else {
    const trimmed = content.trim();
    
    if (trimmed.length === 0) {
      errors.push('Content cannot be empty');
    }
    
    if (trimmed.length > 100000) {
      errors.push('Content cannot exceed 100000 characters');
    }
  }

  // Validate metadata if provided
  if (metadata && typeof metadata !== 'object') {
    errors.push('Metadata must be an object');
  } else if (metadata) {
    // Validate metadata structure
    if (metadata.title && typeof metadata.title !== 'string') {
      errors.push('Metadata title must be a string');
    }
    if (metadata.url && typeof metadata.url !== 'string') {
      errors.push('Metadata url must be a string');
    }
    if (metadata.source && typeof metadata.source !== 'string') {
      errors.push('Metadata source must be a string');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Express middleware for chat message validation
 */
export function validateChatRequest(req, res, next) {
  const { message } = req.body;
  const validation = validateChatMessage(message);

  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors
    });
  }

  // Sanitize: trim whitespace
  req.body.message = req.body.message.trim();
  next();
}

/**
 * Express middleware for document validation
 */
export function validateDocumentRequest(req, res, next) {
  const { content, metadata } = req.body;
  const validation = validateDocument(content, metadata);

  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors
    });
  }

  // Sanitize: trim whitespace
  req.body.content = req.body.content.trim();
  if (metadata && metadata.title) {
    req.body.metadata.title = req.body.metadata.title.trim();
  }
  next();
}

