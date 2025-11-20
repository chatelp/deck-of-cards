import { test, expect } from '@playwright/test';

/**
 * Test visuel : Layout Fan
 * Couverture ciblée pour différentes tailles (default, small, large)
 */
const BASELINE_URL = 'http://localhost:3000';

test.describe('Fan Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASELINE_URL);
    await page.waitForSelector('.deck-container', { timeout: 30000, state: 'attached' });
    await page.waitForTimeout(500);
  });

  test('fan layout - default deck size', async ({ page }) => {
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    await page.waitForSelector('.deck-container[data-assets-ready="true"]', { timeout: 10000 });

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('fan-default.png');
  });

  test('fan layout - small deck (5 cards)', async ({ page }) => {
    await page.selectOption('.deck-size-picker select', '5');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    await page.waitForSelector('.deck-container[data-assets-ready="true"]', { timeout: 10000 });

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('fan-5-cards.png');
  });

  test('fan layout - large deck (24 cards)', async ({ page }) => {
    await page.selectOption('.deck-size-picker select', '24');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    await page.waitForSelector('.deck-container[data-assets-ready="true"]', { timeout: 10000 });

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('fan-24-cards.png');
  });
});
