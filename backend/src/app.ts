import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import env from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestIdMiddleware } from './middleware/requestId';
import { requestLoggingMiddleware } from './middleware/observability';
import { swaggerSpec } from './config/swagger';
import { mainRouter } from './shared/presentation/router';

const app: Express = express();

const allowedOrigins = new Set<string>(
  [
    env.FRONTEND_URL,
    ...(env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []),
  ].filter(Boolean)
);

// Middleware
app.use(
  helmet({
    // Keep compatibility with Swagger UI and current frontend.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools and same-origin requests.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'UniVerse API Documentation',
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Modular routes
app.use('/api', mainRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
