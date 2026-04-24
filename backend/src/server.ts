import env from './config/env';
import app from './app';

const PORT = env.PORT;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
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

