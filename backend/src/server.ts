import './config/loadDotenv';
import { preflightSecrets } from './integrations/secretProvider';

async function bootstrap() {
  await preflightSecrets();
  const { default: env } = await import('./config/env');
  const { default: app } = await import('./app');

  const PORT = env.PORT;
  const listenHost = env.LISTEN_HOST;

  const { isSupabaseStorageConfigured } = await import('./integrations/supabaseStorage');
  if (!isSupabaseStorageConfigured()) {
    if (env.NODE_ENV === 'production') {
      console.error(
        '❌ SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY zorunludur — medya yalnızca Storage’da saklanır.',
      );
      process.exit(1);
    }
    console.warn(
      '⚠️ Supabase Storage env tanımlı değil — geliştirmede fotoğraf yükleme istekleri hata ile döner.',
    );
  }

  const onListen = async () => {
    const where =
      listenHost && listenHost !== '127.0.0.1'
        ? `http://${listenHost === '0.0.0.0' ? '<bu-makinenin-IP>' : listenHost}:${PORT} (ve http://localhost:${PORT})`
        : `http://localhost:${PORT}`;
    console.log(`🚀 Server running on ${where}`);
    console.log(`📊 Environment: ${env.NODE_ENV}`);
    try {
      const { query } = await import('./config/db');
      await query('SELECT 1');
      console.log('✅ Database: connection OK');
    } catch (e) {
      console.error('❌ Database: connection failed —', (e as Error).message);
    }
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
  };

  if (listenHost) {
    app.listen(PORT, listenHost, onListen);
  } else {
    app.listen(PORT, onListen);
  }

  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    const { closePool } = await import('./config/db');
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
