const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 720 } });
  await page.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('text=Gäste-Login', { timeout: 30000 });
  await page.waitForTimeout(3500);
  await page.click('button:has-text("Gäste-Login")');
  await page.waitForTimeout(5000);

  // "Alle Channels" öffnen und allen öffentlichen Channels beitreten
  const alle = page.locator('.channel-sublist-toggle', { hasText: 'Alle Channels' }).first();
  await alle.click();
  await page.waitForTimeout(500);
  for (let i = 0; i < 5; i++) {
    const join = page.locator('.channel-join-btn').first();
    if (!(await join.count())) break;
    await join.click();
    await page.waitForTimeout(700);
  }

  // Zustand wie im User-Screenshot: Abonnierte Channels + Öffentlich expandiert
  const abo = page.locator('.channel-sublist-toggle', { hasText: 'Abonnierte Channels' }).first();
  await abo.click();
  await page.waitForTimeout(500);
  const oeff = page.locator('.channel-sublist-toggle-nested', { hasText: 'Öffentlich' }).first();
  if (await oeff.count()) {
    const exp = await oeff.getAttribute('aria-expanded');
    if (exp !== 'true') { await oeff.click(); await page.waitForTimeout(400); }
  }
  await page.screenshot({ path: path.join(OUT, 'fixed-desktop-720.png') });

  // Noch enger, wie ein kleines Laptop-Fenster
  await page.setViewportSize({ width: 1366, height: 620 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'fixed-desktop-620.png') });

  const card = page.locator('.sidebar-card').first();
  const box = await card.boundingBox();
  if (box) {
    await page.screenshot({ path: path.join(OUT, 'fixed-desktop-620-sidebar.png'), clip: box });
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
