/**
 * Headless-browser PDF indirici.
 * `yasar.edu.tr` Cloudflare bot koruması Node `fetch` için 403 döner,
 * gerçek tarayıcı ise JS challenge’ı geçip PDF’i verir.
 * Bu modül sistem Chrome’unu `puppeteer-core` ile kullanır; Chromium indirmez.
 */
import * as fs from 'fs';
import * as path from 'path';

const CANDIDATE_CHROME_PATHS_DARWIN = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

const CANDIDATE_CHROME_PATHS_LINUX = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

function resolveExecutablePath(): string | null {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const list = process.platform === 'darwin' ? CANDIDATE_CHROME_PATHS_DARWIN : CANDIDATE_CHROME_PATHS_LINUX;
  for (const p of list) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export interface BrowserPdfResult {
  buffer: Buffer;
  url: string;
  userAgent: string;
}

/**
 * PDF’i tarayıcı ile indir. Cloudflare challenge’ını geçmek için önce ana sayfayı ziyaret eder,
 * ardından PDF URL’sini çerezlerle alır.
 */
export async function downloadMenuPdfViaBrowser(pdfUrl: string, timeoutMs = 45_000): Promise<BrowserPdfResult> {
  const executablePath = resolveExecutablePath();
  if (!executablePath) {
    throw new Error(
      'Sistem Chrome/Chromium bulunamadı. CHROME_PATH env ile elle belirtin veya Google Chrome kurun.'
    );
  }

  // Dinamik import: puppeteer-core kurulu değilse saldırı yüzeyi yok; çağıran try/catch yakalar.
  const puppeteer = (await import('puppeteer-core')).default;

  const parsed = new URL(pdfUrl);
  const origin = `${parsed.protocol}//${parsed.host}/`;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  try {
    const page = await browser.newPage();
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    });

    // 1) Ana sayfa: Cloudflare challenge çerezi (cf_clearance) toplanır.
    try {
      await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      await new Promise((r) => setTimeout(r, 2500));
    } catch {
      // Ana sayfa erişilemezse yine de PDF isteğini dene.
    }

    // 2) PDF’i doğrudan fetch et (aynı origin için çerezler otomatik taşınır).
    const fetchInBrowser = new Function(
      'url',
      `return (async () => {
        try {
          const resp = await fetch(url, {
            credentials: 'include',
            headers: {
              Accept: 'application/pdf,application/octet-stream,*/*;q=0.8',
              Referer: window.location.origin + '/',
            },
          });
          if (!resp.ok) return null;
          const ab = await resp.arrayBuffer();
          const bytes = new Uint8Array(ab);
          const chunkSize = 0x8000;
          let binary = '';
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
          }
          return btoa(binary);
        } catch (_) { return null; }
      })();`
    ) as (url: string) => Promise<string | null>;

    const base64 = await page.evaluate(fetchInBrowser, pdfUrl);

    if (!base64) {
      throw new Error('Tarayıcı PDF’i indiremedi (Cloudflare challenge veya 403).');
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length < 1024) {
      throw new Error(`PDF şüpheli şekilde küçük (${buffer.length} bayt)`);
    }
    // İlk 4 bayt %PDF olmalı
    const header = buffer.slice(0, 4).toString('ascii');
    if (header !== '%PDF') {
      throw new Error(`Beklenen PDF başlığı yok: ${header}`);
    }
    return { buffer, url: pdfUrl, userAgent };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export function getResolvedBrowserPath(): string | null {
  return resolveExecutablePath();
}

/** Geçici yardımcı: başarılı buffer’ı yerel fallback dosyasına yaz. */
export function writeLocalCopy(buffer: Buffer, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buffer);
}
