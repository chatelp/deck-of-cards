import { test, expect } from '@playwright/test';

/**
 * Test visuel : Différentes tailles de deck
 * Précondition 2.5 : Test déterministe et exhaustif
 */
const BASELINE_URL = 'http://localhost:3000?seed=12345';

test.describe('Deck Sizes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASELINE_URL);
    await page.waitForSelector('.deck-container', { timeout: 30000, state: 'attached' });
    await page.waitForTimeout(500);
  });

  // Tailles de deck selon Précondition 2.5 : [5, 10, 16, 24, 32, 48, 64]
  const deckSizes = [5, 10, 16, 24, 32, 48, 64];

  for (const size of deckSizes) {
    test(`deck size ${size} - fan layout`, async ({ page }) => {
      await page.selectOption('.deck-size-picker select', size.toString());
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("Fan")');
      await page.waitForTimeout(1000);
      
      await page.waitForFunction(() =>
        Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
      );
      
      const deckContainer = page.locator('.deck-container');
      await expect(deckContainer).toHaveScreenshot(`deck-size-${size}-fan.png`);
    });

    test(`deck size ${size} - ring layout`, async ({ page }) => {
      await page.selectOption('.deck-size-picker select', size.toString());
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("Ring")');
      await page.waitForTimeout(1000);
      
      await page.waitForFunction(() =>
        Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
      );
      
      const deckContainer = page.locator('.deck-container');
      await expect(deckContainer).toHaveScreenshot(`deck-size-${size}-ring.png`);
    });

    test(`deck size ${size} - stack layout`, async ({ page }) => {
      await page.selectOption('.deck-size-picker select', size.toString());
      await page.waitForTimeout(500);
      
      await page.click('button:has-text("Stack")');
      await page.waitForTimeout(1000);
      
      await page.waitForFunction(() =>
        Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
      );
      
      const deckContainer = page.locator('.deck-container');
      await expect(deckContainer).toHaveScreenshot(`deck-size-${size}-stack.png`);
    });
  }
});
