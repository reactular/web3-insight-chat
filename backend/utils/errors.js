/**
 * Error handler middleware for Express
 * Handles errors and returns consistent error responses
 */
export function errorHandler(err, req, res, next) {
  // For validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: err.message,
        code: 'VALIDATION_ERROR',
        statusCode: 400
      }
    });
  }

  // Default error handling
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: {
      message,
      code: 'INTERNAL_ERROR',
      statusCode
    }
  });
}


