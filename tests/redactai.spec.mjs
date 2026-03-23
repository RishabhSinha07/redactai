import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PDF = path.join(__dirname, 'test-pii.pdf');
const BASE_URL = 'http://localhost:5176';

test.describe('Landing page', () => {
  test('renders hero and navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.getByText('RedactAI', { exact: true }).first()).toBeVisible();
    await expect(page.locator('text=AI-powered redaction')).toBeVisible();
    await expect(page.locator('h1').getByText('that never sees your data')).toBeVisible();
    await expect(page.locator('text=Start Redacting').first()).toBeVisible();
    await expect(page.locator('text=Launch App')).toBeVisible();
  });

  test('CTA navigates to app page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('text=Start Redacting').first().click();
    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('text=Upload a PDF to redact')).toBeVisible();
    await expect(page.locator('text=Drop a PDF here')).toBeVisible();
  });
});

test.describe('RedactApp', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/app`);
  });

  test('app page renders correctly', async ({ page }) => {
    await expect(page.getByText('RedactAI', { exact: true })).toBeVisible();
    await expect(page.locator('text=Browser-only')).toBeVisible();
    await expect(page.locator('text=Upload a PDF to redact')).toBeVisible();
    await expect(page.locator('text=Drop a PDF here')).toBeVisible();
  });

  test('status bar shows model loading state', async ({ page }) => {
    await expect(page.locator('text=bert-base-NER').first()).toBeVisible();
  });

  test('upload PDF and view document', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_PDF);
    await expect(page.locator('text=test-pii.pdf')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=4 pages')).toBeVisible({ timeout: 10000 });
  });

  test('PDF renders and regex detects PII spans', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
    await expect(page.locator('text=test-pii.pdf')).toBeVisible({ timeout: 10000 });
    const pdfCanvas = page.locator('canvas').first();
    await expect(pdfCanvas).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/\\d+ detected/')).toBeVisible({ timeout: 10000 });
  });

  test('sidebar controls are visible after upload', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
    await expect(page.locator('text=test-pii.pdf')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:text("Redact All")')).toBeVisible();
    await expect(page.locator('button:text("Clear All")')).toBeVisible();
    await expect(page.locator('text=Regex')).toBeVisible();
    await expect(page.locator('text=bert-base-NER').first()).toBeVisible();
    await expect(page.getByText('Redacted', { exact: true })).toBeVisible();
  });

  test('overlay canvas is interactive', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
    await expect(page.locator('text=test-pii.pdf')).toBeVisible({ timeout: 10000 });
    const canvases = page.locator('canvas');
    await expect(canvases).toHaveCount(8, { timeout: 10000 });
    const overlay = canvases.nth(1);
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute('title', /Click highlight/);
  });

  test('Redact All changes count', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
    await expect(page.locator('text=/\\d+ detected/')).toBeVisible({ timeout: 10000 });
    await page.locator('button:text("Redact All")').click();
    await expect(page.locator('text=/[1-9]\\d* redacted/')).toBeVisible({ timeout: 5000 });
  });

  test('Clear All resets redactions', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
    await expect(page.locator('text=/\\d+ detected/')).toBeVisible({ timeout: 10000 });
    await page.locator('button:text("Redact All")').click();
    await expect(page.locator('text=/[1-9]\\d* redacted/')).toBeVisible({ timeout: 5000 });
    await page.locator('button:text("Clear All")').click();
    await expect(page.locator('text=0 redacted')).toBeVisible({ timeout: 5000 });
  });

  test('logo links back to landing', async ({ page }) => {
    await page.locator('a:has-text("RedactAI")').click();
    await expect(page).toHaveURL(BASE_URL + '/');
    await expect(page.locator('text=AI-powered redaction')).toBeVisible();
  });

  test('New PDF button resets', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(TEST_PDF);
    await expect(page.locator('text=test-pii.pdf')).toBeVisible({ timeout: 10000 });
    await page.locator('button:text("New PDF")').click();
    await expect(page.locator('text=Drop a PDF here')).toBeVisible({ timeout: 5000 });
  });

  test('NER worker boots without errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.waitForTimeout(3000);
    const criticalErrors = consoleErrors.filter(e =>
      e.includes('registerBackend') || e.includes('[NER worker] Load error')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
