import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function resolveError(err) {
  if (err instanceof ApiError || err.isOperational) {
    return { statusCode: err.statusCode || 500, message: err.message };
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { statusCode: 413, message: 'File too large. Maximum size is 5 MB' };
    }
    return { statusCode: 400, message: err.message };
  }

  return { statusCode: err.statusCode || err.status || 500, message: 'Internal server error' };
}

export function errorHandler(err, _req, res, _next) {
  const { statusCode, message } = resolveError(err);

  const payload = {
    success: false,
    message,
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (env.nodeEnv !== 'production' && statusCode >= 500) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}
