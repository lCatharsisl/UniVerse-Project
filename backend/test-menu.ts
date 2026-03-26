const { MenuService } = require('./src/modules/services/infrastructure/menu.service');

(async () => {
    console.log("Starting script to test scrapeMenu...");
    await MenuService.scrapeMenu();
    console.log("Cache:", MenuService.cachedMenuData);
    console.log("Today's key:", new Date().toISOString().split('T')[0]);
    console.log("Today's menu:", MenuService.getTodaysMenu());
    process.exit(0);
})();
