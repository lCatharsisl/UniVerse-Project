import { Request, Response } from 'express';
import { GetDashboardStatsHandler } from '../../application/queries/get-dashboard-stats.handler';
import * as MenuService from '../../infrastructure/menu.service';

export class CampusInfoController {
  static async getStats(_req: Request, res: Response) {
    const result = await GetDashboardStatsHandler.execute();
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    return res.json(result.data);
  }

  static async getMenu(_req: Request, res: Response) {
    try {
      let data = MenuService.getTodaysMenu();
      if (!data) {
        await MenuService.fetchAndParseMenu();
        data = MenuService.getTodaysMenu();
      }
      if (!data) return res.status(404).json({ error: 'Menu not available' });
      return res.json(data);
    } catch (err) {
      const cached = MenuService.getTodaysMenu();
      if (cached) return res.json(cached);
      return res.status(503).json({ error: 'Menu temporarily unavailable' });
    }
  }

  static async getFullMenu(_req: Request, res: Response) {
    try {
      let cache = MenuService.getFullMenu();
      if (!cache || MenuService.isMenuCacheStaleByCalendarMonth()) {
        try {
          await MenuService.fetchAndParseMenu();
        } catch {
          // boş
        }
        cache = MenuService.getFullMenu();
      }
      if (!cache) return res.status(404).json({ error: 'Menu not available' });
      return res.json({
        lastUpdated: cache.fetchedAt,
        sourceUrl: cache.sourceUrl,
        notices: cache.parsed.notices,
        pricing: cache.parsed.pricing,
        allergenWarning: cache.parsed.allergenWarning,
        sections: cache.parsed.sections,
        periodLabel: cache.parsed.periodLabel,
      });
    } catch (err) {
      const cache = MenuService.getFullMenu();
      if (cache)
        return res.json({
          lastUpdated: cache.fetchedAt,
          sourceUrl: cache.sourceUrl,
          notices: cache.parsed.notices,
          pricing: cache.parsed.pricing,
          allergenWarning: cache.parsed.allergenWarning,
          sections: cache.parsed.sections,
          periodLabel: cache.parsed.periodLabel,
        });
      return res.status(503).json({ error: 'Menu temporarily unavailable' });
    }
  }

  static async getMenuByDate(req: Request, res: Response) {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ error: 'Invalid date format (use YYYY-MM-DD)' });
    try {
      let data = MenuService.getMenuByDate(date);
      /**
       * Önce: sadece cache boşsa fetch ediliyordu → eski ayın cache’i varken yeni aya ait gün
       * sorgulandığında 404. Tarih bulunamayınca her zaman PDF’i taze çekmeyi dene.
       */
      if (!data) {
        try {
          await MenuService.fetchAndParseMenu();
        } catch {
          // Ağ/403: eski cache ile tekrar dene
        }
        data = MenuService.getMenuByDate(date);
      }
      if (!data) return res.status(404).json({ error: 'No menu for this date' });
      const cache = MenuService.getFullMenu();
      return res.json({
        ...data,
        lastUpdated: cache?.fetchedAt,
        sourceUrl: cache?.sourceUrl,
        notices: cache?.parsed?.notices || [],
        pricing: cache?.parsed?.pricing || [],
        allergenWarning: cache?.parsed?.allergenWarning,
        periodLabel: cache?.parsed?.periodLabel,
      });
    } catch (err) {
      const data = MenuService.getMenuByDate(date);
      if (data) {
        const cache = MenuService.getFullMenu();
        return res.json({
          ...data,
          lastUpdated: cache?.fetchedAt,
          sourceUrl: cache?.sourceUrl,
          notices: cache?.parsed?.notices || [],
          pricing: cache?.parsed?.pricing || [],
          allergenWarning: cache?.parsed?.allergenWarning,
          periodLabel: cache?.parsed?.periodLabel,
        });
      }
      return res.status(503).json({ error: 'Menu temporarily unavailable' });
    }
  }

  static async refreshMenu(_req: Request, res: Response) {
    try {
      await MenuService.fetchAndParseMenu(true);
      const data = MenuService.getTodaysMenu();
      return res.json({ success: true, lastUpdated: data?.lastUpdated });
    } catch (err) {
      return res.status(502).json({ error: 'Failed to refresh menu', details: String(err) });
    }
  }
}
