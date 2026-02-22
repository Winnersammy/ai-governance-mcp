import rateLimit from 'express-rate-limit';

// Configure limits using environment variables
function parseEnvInt(value, defaultValue) {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    if (value !== undefined) console.warn(`[rateLimiter] Invalid value "${value}", using default ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

const rateLimitPerIP = parseEnvInt(process.env.RATE_LIMIT_PER_IP, 100);
const rateLimitPerSession = parseEnvInt(process.env.RATE_LIMIT_PER_SESSION, 50);

export const limiterPerIP = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: rateLimitPerIP,
  message: 'Too many requests from this IP, please try again later.',
});

export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: rateLimitPerSession,
  message: 'Too many requests from this session, please try again later.',
});
