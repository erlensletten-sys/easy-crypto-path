/**
 * Simple in-memory rate limiter for edge functions
 * Uses sliding window algorithm to track requests per identifier
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store for rate limiting (resets on function cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const cutoff = now - windowMs;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Prefix for the identifier to namespace different limiters */
  prefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request is allowed based on rate limiting rules
 * @param identifier - Unique identifier for the rate limit (e.g., userId, IP)
 * @param config - Rate limiting configuration
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs, prefix } = config;
  const key = `${prefix}:${identifier}`;
  const now = Date.now();
  
  // Cleanup old entries
  cleanupExpiredEntries(windowMs);
  
  const entry = rateLimitStore.get(key);
  
  // If no entry or window expired, start fresh
  if (!entry || now - entry.windowStart >= windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
    });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const resetAt = entry.windowStart + windowMs;
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }
  
  // Increment count and allow
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.windowStart + windowMs,
  };
}

/**
 * Create a rate limit response with appropriate headers
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.",
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfter || 60),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.resetAt),
      },
    }
  );
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult
): Record<string, string> {
  return {
    ...headers,
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
  };
}

// Preset configurations for common use cases
export const RATE_LIMIT_PRESETS = {
  // Strict limit for payment creation: 5 requests per minute per user
  createPayment: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    prefix: "create-payment",
  },
  // Moderate limit for status checks: 30 requests per minute per user
  checkStatus: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    prefix: "check-status",
  },
  // Strict limit for email sending: 10 requests per minute
  sendEmail: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    prefix: "send-email",
  },
  // Webhook rate limit: 100 requests per minute per IP (webhooks are from payment provider)
  webhook: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    prefix: "webhook",
  },
} as const;
