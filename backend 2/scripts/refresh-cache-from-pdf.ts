/**
 * Refresh menu cache from a local PDF (use when remote fetch fails).
 * Usage: npx tsx scripts/refresh-cache-from-pdf.ts [path-to-yemek-liste.pdf]
 */
import * as path from 'path';
import * as MenuService from '../src/modules/campus-info/infrastructure/menu.service';

async function main() {
  const pdfPath = process.argv[2] || path.join(process.env.HOME || '', 'Downloads', 'yemek-liste.pdf');
  await MenuService.parseAndCacheFromFile(pdfPath);
  const data = MenuService.getTodaysMenu();
  console.log('Cache refreshed. Today:', data?.lastUpdated);
  console.log('22 March lunch:', data?.lunch?.soup, data?.lunch?.main);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
