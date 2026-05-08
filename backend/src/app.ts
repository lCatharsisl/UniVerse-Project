import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import env from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { requestLoggingMiddleware } from './middleware/observability';
import healthRouter from './routes/health';
import { swaggerSpec } from './config/swagger';
import { apiLimiter } from './middleware/rateLimiter';
import { mainRouter } from './shared/presentation/router';

const app: Express = express();

// Render / reverse proxy: X-Forwarded-For ve req.protocol için (rate limit, log IP)
if (process.env.RENDER === 'true' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

const allowedOrigins = new Set<string>(
  [
    env.FRONTEND_URL,
    ...(env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []),
  ].filter(Boolean)
);

/** LAN’den Vite ile test (tablet/telefon); prod’da kapalı kalır */
function allowPrivateLanFrontendInDev(origin: string): boolean {
  if (env.NODE_ENV !== 'development') return false;
  let hostname = '';
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

// Middleware
app.use(
  helmet({
    // Keep compatibility with Swagger UI and current frontend.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // CDN / Supabase Storage görselleri ile uyumluluk (cross-origin <img>)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cursor / Postman / mobil uygulama: Origin yok → izin ver
      if (!origin) {
        callback(null, true);
        return;
      }

      const explicit =
        allowedOrigins.size === 0 ||
        allowedOrigins.has(origin) ||
        allowPrivateLanFrontendInDev(origin);

      if (explicit) {
        callback(null, true);
        return;
      }

      // Hata nesnesi vermeyin → Express bunu yakalayıp 500 döner; tarayıcıda "internal server error" görünür
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (local disk uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'UniVerse API Documentation',
}));

// Health and readiness
app.use(healthRouter);

// Modular routes
app.use('/api', apiLimiter, mainRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
