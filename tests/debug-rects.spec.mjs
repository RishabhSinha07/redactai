import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5176';

test('all 3 models show Ready in status bar', async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/app`);

  // Enable all 3 models via the dropdown
  await page.locator('text=1 model active').click();
  await page.locator('text=DistilBERT NER').click();
  await page.locator('text=BERT NER (uncased)').click();
  // Close dropdown
  await page.keyboard.press('Escape');

  // Wait for all models to load (up to 120s for cold start)
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);
    const readyBadges = await page.locator('text=Ready').count();
    console.log(`Attempt ${i + 1}: ${readyBadges} Ready badges`);
    if (readyBadges >= 3) break;
  }

  await page.screenshot({ path: 'tests/screenshot-3models.png' });

  const readyCount = await page.locator('text=Ready').count();
  console.log(`Final: ${readyCount} Ready badges`);
  expect(readyCount).toBe(3);

  await context.close();
});
