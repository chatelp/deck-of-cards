import { test, expect } from '@playwright/test';

/**
 * Test visuel : Action Draw (Tirer une carte)
 * Vérifie que la carte quitte le deck et apparaît dans la zone de tirage.
 */
const BASELINE_URL = 'http://localhost:3000?seed=12345&animation=0';

test.describe('Draw Action', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASELINE_URL);
    await page.waitForSelector('.deck-container', { timeout: 30000, state: 'attached' });
    
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
    await page.waitForTimeout(500);
  });

  test('draw single card - fan layout', async ({ page }) => {
    // 1. Initial state check (optional, covered by other tests)
    
    // 2. Perform Draw (Click)
    const firstCard = page.locator('[data-testid^="card-"]').first();
    await firstCard.waitFor({ state: 'visible' });
    
    // Click to draw
    try {
      await firstCard.click({ force: true, timeout: 5000 });
    } catch (e) {
      console.log('Standard click failed, trying JS click', e);
      await firstCard.evaluate((node) => (node as HTMLElement).click());
    }
    
    // Wait for draw animation/state update
    await page.waitForTimeout(1000);

    // 3. Verify Drawn Card Area
    // The drawn card should appear in the list below
    const drawnList = page.locator('.drawn-card-list-inline');
    await expect(drawnList).toBeVisible();
    await expect(drawnList.locator('li')).toHaveCount(1);
    
    // Wait for everything to stabilize
    await page.waitForFunction(() =>
      Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0)
    );

    // 4. Capture the full main demo area (Deck + Insights + Drawn Cards)
    const mainSection = page.locator('.demo-main');
    await expect(mainSection).toHaveScreenshot('draw-single-fan.png');
  });

  test('draw multiple cards - limit check', async ({ page }) => {
    // Draw limit is usually 2 by default in page.tsx
    
    const cards = page.locator('[data-testid^="card-"]');
    
    // Draw card 1
    await cards.nth(0).click({ force: true });
    await page.waitForTimeout(500);
    
    // Draw card 2
    await cards.nth(0).click({ force: true }); // The next card becomes index 0 or similar
    await page.waitForTimeout(500);
    
    // Verify 2 cards drawn
    const drawnList = page.locator('.drawn-card-list-inline');
    await expect(drawnList.locator('li')).toHaveCount(2);
    
    // Capture state with multiple drawn cards
    const mainSection = page.locator('.demo-main');
    await expect(mainSection).toHaveScreenshot('draw-multiple-limit.png');
  });
});

