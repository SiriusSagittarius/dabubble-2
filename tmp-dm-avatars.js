const { chromium } = require('C:\\Users\\adm\\.npm-global\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

  await page.goto('http://localhost:4300/login');
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Gäste-Login")', { force: true });
  await page.waitForTimeout(2000);

  // Screenshot of full page first
  await page.screenshot({ path: 'tmp-dm-full.png', fullPage: false });

  // Check sidebar Direktnachrichten avatars
  const dmAvatars = await page.$$eval('.dm-item-avatar', (els) =>
    els.map((el) => ({ src: (el.getAttribute('src') || '').slice(0, 60), name: el.getAttribute('alt') })),
  );
  console.log('DM avatars:', JSON.stringify(dmAvatars, null, 2));

  // Open the @ mention popup in message input
  await page.click('.message-input, textarea, [contenteditable]', { force: true }).catch(() => {});
  await page.waitForTimeout(300);
  await page.keyboard.type('@');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tmp-dm-mention-popup.png' });

  const suggestionAvatars = await page.$$eval('.contact-suggestion-avatar', (els) =>
    els.map((el) => ({ src: (el.getAttribute('src') || '').slice(0, 60), bg: getComputedStyle(el).backgroundImage })),
  ).catch(() => []);
  console.log('Suggestion avatars:', JSON.stringify(suggestionAvatars, null, 2));

  // Members avatar stack in channel header
  const memberStackAvatars = await page.$$eval('.members-avatar-stack-item', (els) =>
    els.map((el) => (el.getAttribute('src') || '').slice(0, 60)),
  ).catch(() => []);
  console.log('Member stack avatars:', JSON.stringify(memberStackAvatars, null, 2));

  await browser.close();
})();
