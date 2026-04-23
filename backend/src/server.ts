import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import env from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './config/swagger';
import { mainRouter } from './shared/presentation/router';

const app: Express = express();

// Middleware
app.use(cors());
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

// Modular Routes
app.use('/api', mainRouter);

// Error handler (must be last)
app.use(errorHandler);

const PORT = env.PORT;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  try {
    const { fetchAndParseMenu } = await import('./modules/campus-info/infrastructure/menu.service');
    await fetchAndParseMenu();
    console.log('📋 Menu cache refreshed on startup');
  } catch (e) {
    console.warn('Menu initial refresh failed (will retry via cron):', (e as Error).message);
  }
  const cron = await import('node-cron');
  /**
   * Her gün 06:00 (Europe/Istanbul) — yemek-liste.pdf yenilenir.
   * Ay takvimi değişince (ör. Mart→Nisan) `menu.service` hash eşleşse bile parse atlar; “sadece her ayın 1’i” ayrı cron yok, ilk Nisan günkü 06:00 zaten aynı mantığı çalıştırır.
   */
  cron.default.schedule(
    '0 6 * * *',
    async () => {
      try {
        const { fetchAndParseMenu } = await import('./modules/campus-info/infrastructure/menu.service');
        await fetchAndParseMenu();
        console.log('📋 Menu cache refreshed (daily cron)');
      } catch (e) {
        console.warn('Menu cron refresh failed:', (e as Error).message);
      }
    },
    { timezone: 'Europe/Istanbul' }
  );
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { closePool } = await import('./config/db');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const { closePool } = await import('./config/db');
  await closePool();
  process.exit(0);
});

