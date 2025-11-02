import rateLimit from 'express-rate-limit';

// General API rate limiter - applies to most endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false,
});

// Very strict rate limiter for password reset/sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: 'Too many requests from this IP for this sensitive operation, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Generous rate limiter for Twilio webhooks (they can send many requests)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many webhook requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for file/recording downloads
export const downloadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 downloads per minute per IP (increased from 10)
  message: 'Too many download requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for SMS sending
export const smsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 SMS per minute per IP
  message: 'Too many SMS requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for making calls
export const callLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 calls per minute per IP
  message: 'Too many call requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});
