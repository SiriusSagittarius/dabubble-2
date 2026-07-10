const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();

  // --- Auge bei verschiedenen Breiten ---
  for (const vp of [[1920, 1080], [1366, 768], [768, 900], [320, 700]]) {
    const page = await browser.newPage({ viewport: { width: vp[0], height: vp[1] } });
    await page.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('text=Gäste-Login', { timeout: 30000 });
    await page.waitForTimeout(3500);
    await page.fill('input[formcontrolname="password"]', 'geheim123');
    const grp = page.locator('.input-group', { has: page.locator('input[formcontrolname="password"]') }).first();
    const box = await grp.boundingBox();
    const clip = { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: box.width + 20, height: box.height + 20 };
    await page.screenshot({ path: path.join(OUT, `eye-${vp[0]}-closed.png`), clip });
    await page.click('.btn-toggle-password');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `eye-${vp[0]}-open.png`), clip });
    await page.close();
  }

  // --- Sidebar mit kleinem Viewport + beigetretenem Channel ---
  const page = await browser.newPage({ viewport: { width: 412, height: 690 } });
  await page.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('text=Gäste-Login', { timeout: 30000 });
  await page.waitForTimeout(3500);
  await page.click('button:has-text("Gäste-Login")');
  await page.waitForTimeout(5000);

  const alle = page.locator('.channel-sublist-toggle', { hasText: 'Alle Channels' }).first();
  await alle.click();
  await page.waitForTimeout(500);
  // einem Channel beitreten, damit "Verlassen"-Buttons wie beim User erscheinen
  const join = page.locator('.channel-join-btn').first();
  if (await join.count()) { await join.click(); await page.waitForTimeout(800); }
  // zurück zur Sidebar falls Channel geöffnet wurde (mobil wechselt die Ansicht)
  const back = page.locator('[aria-label*="urück"], .chat-back-btn, button:has-text("zurück")').first();
  if (await back.count()) { try { await back.click({ timeout: 2000 }); } catch {} }
  await page.waitForTimeout(800);
  const alle2 = page.locator('.channel-sublist-toggle', { hasText: 'Alle Channels' }).first();
  if (await alle2.count()) {
    const expanded = await alle2.getAttribute('aria-expanded');
    if (expanded !== 'true') { await alle2.click(); await page.waitForTimeout(500); }
  }
  await page.screenshot({ path: path.join(OUT, 'sidebar-690.png') });

  // noch kleiner
  await page.setViewportSize({ width: 412, height: 600 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'sidebar-600.png') });

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
