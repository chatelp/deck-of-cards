import { test, expect } from '@playwright/test';

/**
 * Test visuel : Animation Shuffle
 * Précondition 2.5 : Test déterministe et exhaustif
 */
const BASELINE_URL = 'http://localhost:3000?seed=12345';

test.describe('Shuffle Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASELINE_URL);
    await page.waitForSelector('.deck-container', { timeout: 30000, state: 'attached' });
    await page.waitForTimeout(500);
  });

  test('shuffle - from fan layout', async ({ page }) => {
    // Mettre en fan d'abord
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);
    
    // Activer "Restore layout after shuffle"
    const restoreCheckbox = page.locator('input[type="checkbox"]');
    if (!(await restoreCheckbox.isChecked())) {
      await restoreCheckbox.check();
    }
    
    // Shuffle
    await page.click('button:has-text("Shuffle")');
    await page.waitForTimeout(1500); // Shuffle prend plus de temps
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('shuffle-from-fan.png');
  });

  test('shuffle - from ring layout', async ({ page }) => {
    await page.click('button:has-text("Ring")');
    await page.waitForTimeout(1000);
    
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
    await expect(deckContainer).toHaveScreenshot('shuffle-from-ring.png');
  });

  test('shuffle - without restore layout', async ({ page }) => {
    await page.click('button:has-text("Fan")');
    await page.waitForTimeout(1000);
    
    // Désactiver "Restore layout after shuffle"
    const restoreCheckbox = page.locator('input[type="checkbox"]');
    if (await restoreCheckbox.isChecked()) {
      await restoreCheckbox.uncheck();
    }
    
    await page.click('button:has-text("Shuffle")');
    await page.waitForTimeout(1500);
    
    await page.waitForFunction(() =>
      Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
    );
    
    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('shuffle-no-restore.png');
  });
});
