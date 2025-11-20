import { test, expect } from '@playwright/test';

/**
 * Test visuel : Animation Flip
 * Couverture ciblée sur plusieurs layouts
 */
const BASELINE_URL = 'http://localhost:3000';

test.describe('Flip Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASELINE_URL);
    await page.waitForSelector('.deck-container', { timeout: 30000, state: 'attached' });
    
    // Wait for cards to be rendered initially (they may take time to appear with autoFan)
    // Use 'attached' instead of 'visible' because cards might be positioned off-screen initially
    await page.waitForSelector('[data-testid^="card-"]', { timeout: 20000, state: 'attached' });
    
    // Wait for at least one card to be visible (not just attached)
    await page.waitForFunction(
      () => {
        const cards = Array.from(document.querySelectorAll('[data-testid^="card-"]')) as HTMLElement[];
        return cards.some(card => {
          const rect = card.getBoundingClientRect();
          const style = window.getComputedStyle(card);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.width > 0 &&
            rect.height > 0
          );
        });
      },
      { timeout: 15000 }
    );
    
    // Additional wait to ensure layout is stable
    await page.waitForTimeout(500);
  });

  test('flip single card - from fan layout', async ({ page }) => {
    await page.click('button:has-text("Fan")');
    
    // Wait for layout change to complete and cards to be repositioned
    await page.waitForTimeout(1500);
    
    // Verify card is still visible and clickable
    const firstCard = page.locator('[data-testid^="card-"]').first();
    await firstCard.waitFor({ state: 'visible', timeout: 10000 });
    await firstCard.click({ force: true, timeout: 10000 });
    await page.waitForTimeout(500);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    await page.waitForSelector('.deck-container[data-assets-ready="true"]', { timeout: 10000 });

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('flip-from-fan.png');
  });

  test('flip multiple cards - from ring layout', async ({ page }) => {
    await page.click('button:has-text("Ring")');
    
    // Wait for layout change to complete and cards to be repositioned
    await page.waitForTimeout(1500);
    
    // Click on multiple cards
    const visibleCards = page.locator('[data-testid^="card-"]');
    const count = await visibleCards.count();
    const taps = Math.min(count, 3);
    for (let i = 0; i < taps; i += 1) {
      await visibleCards.nth(i).click({ force: true, timeout: 5000 });
      await page.waitForTimeout(300);
    }

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    await page.waitForSelector('.deck-container[data-assets-ready="true"]', { timeout: 10000 });

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('flip-from-ring.png');
  });

  test('flip card - from stack layout', async ({ page }) => {
    await page.click('button:has-text("Stack")');
    
    // Wait for layout change to complete and cards to be repositioned
    await page.waitForTimeout(1500);
    
    // Verify card is still visible and clickable
    const topCard = page.locator('[data-testid^="card-"]').first();
    await topCard.waitFor({ state: 'visible', timeout: 10000 });
    await topCard.click({ force: true, timeout: 10000 });
    await page.waitForTimeout(500);

    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );
    await page.waitForSelector('.deck-container[data-assets-ready="true"]', { timeout: 10000 });

    const deckContainer = page.locator('.deck-container');
    await expect(deckContainer).toHaveScreenshot('flip-from-stack.png');
  });
});
