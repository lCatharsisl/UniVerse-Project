/**
 * CI ve temiz klonlarda `backend/.env` olmayabilir; bazı test dosyaları üst düzey import ile
 * errorHandler → observability → env zincirini yükler. env doğrulamasından önce minimum değerleri ayarla.
 */
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
