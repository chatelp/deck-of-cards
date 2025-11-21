import { test, expect } from '@playwright/test';

/**
 * Test visuel : Layout Stack
 * Couverture ciblée pour différentes tailles (default, small, large)
 */
const BASELINE_URL = 'http://localhost:3000?seed=12345&animation=0';

test.describe('Stack Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASELINE_URL);
    await page.waitForSelector('.deck-container', { timeout: 30000, state: 'attached' });
    await page.waitForTimeout(500);
  });

  test('stack layout - default deck size', async ({ page }) => {
    await page.click('button:has-text("Stack")');
    await page.waitForTimeout(1000);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    // Wait for deck container to be ready (check DeckView's data-assets-ready)
    await page.waitForFunction(
      () => {
        const deckView = document.querySelector('.deck-container[data-assets-ready="true"]');
        return deckView !== null;
      },
      { timeout: 10000 }
    );

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('stack-default.png');
  });

  test('stack layout - small deck (5 cards)', async ({ page }) => {
    await page.selectOption('.deck-size-picker select', '5');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Stack")');
    await page.waitForTimeout(1000);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    // Wait for deck container to be ready (check DeckView's data-assets-ready)
    await page.waitForFunction(
      () => {
        const deckView = document.querySelector('.deck-container[data-assets-ready="true"]');
        return deckView !== null;
      },
      { timeout: 10000 }
    );

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('stack-5-cards.png');
  });

  test('stack layout - large deck (24 cards)', async ({ page }) => {
    await page.selectOption('.deck-size-picker select', '24');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Stack")');
    await page.waitForTimeout(1000);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    // Wait for deck container to be ready (check DeckView's data-assets-ready)
    await page.waitForFunction(
      () => {
        const deckView = document.querySelector('.deck-container[data-assets-ready="true"]');
        return deckView !== null;
      },
      { timeout: 10000 }
    );

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('stack-24-cards.png');
  });
});
