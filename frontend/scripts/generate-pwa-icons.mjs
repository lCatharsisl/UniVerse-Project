import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const svg = readFileSync(join(publicDir, 'pwa-icon-source.svg'));

const pipeline = () => sharp(svg).png();

await pipeline().resize(192, 192).toFile(join(publicDir, 'pwa-192x192.png'));
await pipeline().resize(512, 512).toFile(join(publicDir, 'pwa-512x512.png'));
await pipeline().resize(512, 512).toFile(join(publicDir, 'maskable-512x512.png'));
await pipeline().resize(180, 180).toFile(join(publicDir, 'apple-touch-icon.png'));

console.log('Wrote PWA PNGs from pwa-icon-source.svg');
