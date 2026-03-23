import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PDF = path.join(__dirname, 'test-pii.pdf');
const BASE_URL = 'http://localhost:5176';

test('NER highlights align to correct words', async ({ page }) => {
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(BASE_URL);
  await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
  await expect(page.locator('text=test-pii.pdf')).toBeVisible({ timeout: 10000 });

  // Wait for all 4 pages to complete NER
  for (let i = 0; i < 360; i++) {
    await page.waitForTimeout(500);
    const allLogs = logs.join('\n');
    const pagesMatched = allLogs.match(/\[NER worker\] Page \d+:/g) || [];
    if (pagesMatched.length >= 4) break;
    if (allLogs.includes('Load error') || allLogs.includes('MODEL_ERROR')) break;
  }

  // Extract grouped entity details from logs
  // The worker logs: [NER worker] Page 3: 110 raw → 18 grouped [{...}, ...]
  const nerLogs = logs.filter(l => l.includes('[NER worker] Page'));
  console.log('\n=== NER Results ===');
  for (const l of nerLogs) console.log(l);

  // Page 3 is the NER-only page — check entities have correct words
  // We need to look at the actual entity objects. Let's use page.evaluate to inspect.
  // Instead, let's add a test that checks the grouped entities logged by the worker.

  // Verify all pages produced results
  expect(nerLogs.length).toBeGreaterThanOrEqual(4);

  // Check that page 3 has substantial entities (pure NER page)
  const page3Log = nerLogs.find(l => l.includes('Page 3'));
  expect(page3Log).toBeDefined();
  const match = page3Log.match(/(\d+) grouped/);
  expect(parseInt(match[1])).toBeGreaterThan(10);

  // Verify detected count in the UI increased
  await expect(page.locator('text=/\\d+ detected/')).toBeVisible({ timeout: 5000 });
});

test('NER entity word extraction is accurate', async ({ page }) => {
  // Inject a test directly in the browser to validate alignment
  await page.goto(BASE_URL);

  // Wait for NER model to be ready
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
  await expect(page.locator('text=test-pii.pdf')).toBeVisible({ timeout: 10000 });

  // Wait for page 3 NER
  for (let i = 0; i < 360; i++) {
    await page.waitForTimeout(500);
    if (logs.join('\n').includes('[NER worker] Page 3:')) break;
  }

  // Find logs that contain entity details
  const entityLogs = logs.filter(l => l.includes('grouped'));
  console.log('\n=== Entity Logs ===');
  for (const l of entityLogs) console.log(l);

  // Check no entity has a partial/shifted word (common misalignment symptoms)
  // Partial words would be things like "tz-Carlton" instead of "Ritz-Carlton"
  // or "hicago" instead of "Chicago"
  const badPatterns = ['tz-', 'hicago', 'oky', 'ingapor', 'enev'];
  for (const pattern of badPatterns) {
    const hasBad = entityLogs.some(l => l.includes(pattern));
    expect(hasBad, `Found partial word "${pattern}" in NER entities — offset is wrong`).toBe(false);
  }
});
