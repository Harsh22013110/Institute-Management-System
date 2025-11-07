// Simple in-memory rate limiter
// For production, consider using redis-rate-limiter or express-rate-limit

const rateLimitMap = new Map();

/**
 * Rate limiter middleware
 * @param {Number} maxRequests - Maximum requests allowed
 * @param {Number} windowMs - Time window in milliseconds
 */
const rateLimiter = (maxRequests = 2, windowMs = 60000) => {
  return (req, res, next) => {
    const key = `${req.path}:${req.userId || req.ip}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now - record.firstRequest > windowMs) {
      // New window or expired
      rateLimitMap.set(key, {
        count: 1,
        firstRequest: now,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMs / 1000} seconds.`,
      });
    }

    record.count++;
    next();
  };
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.firstRequest > 300000) {
      // Remove entries older than 5 minutes
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Run cleanup every minute

module.exports = rateLimiter;

