import { test, expect } from '@playwright/test';

/**
 * Test visuel : Transitions entre layouts
 * Précondition 2.5 : Test déterministe et exhaustif
 */
const BASELINE_URL = 'http://localhost:3000';

test.describe('Layout Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASELINE_URL);
    await page.waitForSelector('.deck-container', { timeout: 30000, state: 'attached' });
    await page.waitForTimeout(500);
  });

  test('transition fan → ring', async ({ page }) => {
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Ring")');
    await page.waitForTimeout(1000);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('transition-fan-to-ring.png');
  });

  test('transition ring → stack', async ({ page }) => {
    await page.click('button:has-text("Ring")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Stack")');
    await page.waitForTimeout(1000);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('transition-ring-to-stack.png');
  });

  test('transition stack → fan', async ({ page }) => {
    await page.click('button:has-text("Stack")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('transition-stack-to-fan.png');
  });

  test('transition fan → stack', async ({ page }) => {
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Stack")');
    await page.waitForTimeout(1000);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('transition-fan-to-stack.png');
  });

  test('transition ring → fan', async ({ page }) => {
    await page.click('button:has-text("Ring")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('transition-ring-to-fan.png');
  });

  test('transition stack → ring', async ({ page }) => {
    await page.click('button:has-text("Stack")');
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("Ring")');
    await page.waitForTimeout(1000);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('transition-stack-to-ring.png');
  });

  test('transition fan → shuffle → fan', async ({ page }) => {
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);
    
    // Activer restore layout
    const restoreCheckbox = page.locator('input[type="checkbox"]');
    if (!(await restoreCheckbox.isChecked())) {
      await restoreCheckbox.check();
    }
    
    await page.click('button:has-text("Shuffle")');
    await page.waitForTimeout(1500);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('transition-fan-shuffle-fan.png');
  });
});
