import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Geliştirmede Vite `/api`'yi hep localhost'tan proxy'ler → tüm tablet + tarayıcı
 * tek IP (loopback) gibi görünür; sıkı limit iki cihazda anında 429 üretirdi.
 */
const AUTH_ROUTE_MAX_PER_WINDOW = isDev ? 300 : 5;

/**
 * Genel `/api` limiti prod’da brute-force / abuse için; dev’de aynı “tek görünür IP” paylaşımı yüzünden kapatılıyor.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  skip: (_req /* , res */) => isDev,
  message: { error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth endpoints
 * Prod: 5 / 15 dk / IP · Dev: aynı “tek IP” kaçınımı için yüksek tavan
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: AUTH_ROUTE_MAX_PER_WINDOW,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Upload rate limiter
 * 20 uploads per hour
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Elasticsearch search: avoid abuse */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many search requests, please try again in a moment' },
  standardHeaders: true,
  legacyHeaders: false,
});
