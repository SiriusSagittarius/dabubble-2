const { chromium } = require('playwright');
const path = require('path');

const OUT = path.join(__dirname, 'shots');
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 917 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://localhost:4200/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Intro-Animation abwarten
  await page.waitForSelector('text=Gäste-Login', { timeout: 30000 });
  await page.waitForTimeout(3500);

  // 1) Login: Passwort tippen + Auge togglen
  await page.fill('input[formcontrolname="password"]', 'geheim123');
  await page.screenshot({ path: path.join(OUT, '01-login-eye-closed.png') });
  await page.screenshot({ path: path.join(OUT, '01b-password-field.png'), clip: await clipOf(page, '.input-group:has(input[formcontrolname="password"])') });
  await page.click('.btn-toggle-password');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, '02-login-eye-open.png'), clip: await clipOf(page, '.input-group:has(input[formcontrolname="password"])') });

  // 2) Gäste-Login -> Sidebar mobil
  await page.click('button:has-text("Gäste-Login")');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(OUT, '03-after-login.png') });

  // Channels expandieren: "Alle Channels" Sublist öffnen
  const alle = page.locator('.channel-sublist-toggle', { hasText: 'Alle Channels' }).first();
  if (await alle.count()) {
    await alle.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(OUT, '04-sidebar-alle-channels.png') });

  console.log('CONSOLE ERRORS:', JSON.stringify(errors, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

async function clipOf(page, sel) {
  const box = await page.locator(sel).first().boundingBox();
  if (!box) return undefined;
  return { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: box.width + 20, height: box.height + 20 };
}
