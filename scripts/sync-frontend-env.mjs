#!/usr/bin/env node
/**
 * backend/.env içindeki BACKEND_PUBLIC_URL (veya PORT) ile frontend/.env oluşturur.
 * Sırlar yazılmaz; yalnızca VITE_* kamuya açık API kökü.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const backendEnvPath = path.join(root, 'backend', '.env');
const frontendEnvPath = path.join(root, 'frontend', '.env');

function parseEnv(text) {
  const out = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

if (!fs.existsSync(backendEnvPath)) {
  console.error('[sync-frontend-env] backend/.env bulunamadı. Önce backend/.env.example kopyalayın.');
  process.exit(1);
}

const raw = fs.readFileSync(backendEnvPath, 'utf8');
const env = parseEnv(raw);
const port = env.PORT || '3000';
const apiRoot = (env.BACKEND_PUBLIC_URL || `http://localhost:${port}`).replace(
  /\/+$/,
  ''
);

const uploadsExtra = (env.FRONTEND_UPLOADS_BASE_URL || '').trim().replace(
  /\/+$/,
  ''
);

const lines = [
  '# npm run sync:frontend-env — backend/.env ile senkron. Commit etmeyin.',
  '',
  `VITE_API_BASE_URL=${apiRoot}`,
];

if (uploadsExtra) {
  lines.push(`VITE_UPLOADS_BASE_URL=${uploadsExtra}`);
}

const supabaseProject = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const storageBucket = (env.SUPABASE_STORAGE_BUCKET || 'uploads').trim();
if (supabaseProject) {
  lines.push(`VITE_SUPABASE_URL=${supabaseProject}`);
  lines.push(`VITE_SUPABASE_STORAGE_BUCKET=${storageBucket}`);
}

lines.push('');

fs.mkdirSync(path.dirname(frontendEnvPath), { recursive: true });
fs.writeFileSync(frontendEnvPath, lines.join('\n'), 'utf8');

console.log(`[sync-frontend-env] yazıldı: ${frontendEnvPath}`);
console.log(`  VITE_API_BASE_URL=${apiRoot}`);
if (uploadsExtra) console.log(`  VITE_UPLOADS_BASE_URL=${uploadsExtra}`);
if (supabaseProject) {
  console.log(`  VITE_SUPABASE_URL=${supabaseProject}`);
  console.log(`  VITE_SUPABASE_STORAGE_BUCKET=${storageBucket}`);
}
