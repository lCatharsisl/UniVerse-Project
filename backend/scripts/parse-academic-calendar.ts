/**
 * Parse Yaşar University academic calendar PDF and output structured data.
 * Usage: npx tsx scripts/parse-academic-calendar.ts [path-to-PDF]
 * Example: npx tsx scripts/parse-academic-calendar.ts ~/Downloads/2025-2026-Akademik_Takvim_Revize-26.08.2025.pdf
 */

import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

async function extractText(pdfPath: string): Promise<string> {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function main() {
  const pdfPath =
    process.argv[2] ||
    path.join(
      process.env.HOME || '',
      'Downloads',
      '2025-2026-Akademik_Takvim_Revize-26.08.2025.pdf'
    );

  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found:', pdfPath);
    console.error(
      'Download from: https://oim.yasar.edu.tr/wp-content/uploads/2025/08/2025-2026-Akademik_Takvim_Revize-26.08.2025.pdf'
    );
    process.exit(1);
  }

  const text = await extractText(pdfPath);
  console.log('=== EXTRACTED TEXT ===\n');
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
