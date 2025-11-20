import { test, expect } from '@playwright/test';

/**
 * Test visuel : Animation Flip
 * Couverture ciblée sur plusieurs layouts
 */
const BASELINE_URL = 'http://localhost:3000?seed=12345';

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
    
    // Wait for cards to be visible in viewport after layout change
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
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        });
      },
      { timeout: 20000 }
    );
    
    // Verify card is still visible and clickable
    const firstCard = page.locator('[data-testid^="card-"]').first();
    await firstCard.waitFor({ state: 'visible', timeout: 10000 });
    
    // Ensure card is in viewport and clickable
    await firstCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Try standard click, fall back to JS click if needed
    try {
      await firstCard.click({ force: true, timeout: 5000 });
    } catch (e) {
      console.log('Standard click failed, trying JS click', e);
      await firstCard.evaluate((node) => (node as HTMLElement).click());
    }
    
    await page.waitForTimeout(500);

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
    await expect(deckContainer).toHaveScreenshot('flip-from-fan.png');
  });

  test('flip multiple cards - from ring layout', async ({ page }) => {
    await page.click('button:has-text("Ring")');
    
    // Wait for layout change to complete and cards to be repositioned
    await page.waitForTimeout(1500);
    
    // Wait for cards to be visible in viewport after layout change
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
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        });
      },
      { timeout: 20000 }
    );
    
    // Click on multiple cards
    const visibleCards = page.locator('[data-testid^="card-"]');
    const count = await visibleCards.count();
    const taps = Math.min(count, 3);
    for (let i = 0; i < taps; i += 1) {
      const card = visibleCards.nth(i);
      await card.waitFor({ state: 'visible', timeout: 10000 });
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      try {
        await card.click({ force: true, timeout: 5000 });
      } catch (e) {
        console.log(`Standard click failed for card ${i}, trying JS click`, e);
        await card.evaluate((node) => (node as HTMLElement).click());
      }
      await page.waitForTimeout(300);
    }

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
    await expect(deckContainer).toHaveScreenshot('flip-from-ring.png');
  });

  test('flip card - from stack layout', async ({ page }) => {
    await page.click('button:has-text("Stack")');
    
    // Wait for layout change to complete and cards to be repositioned
    await page.waitForTimeout(1500);
    
    // Wait for cards to be visible in viewport after layout change
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
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        });
      },
      { timeout: 20000 }
    );
    
    // Verify card is still visible and clickable
    const topCard = page.locator('[data-testid^="card-"]').first();
    await topCard.waitFor({ state: 'visible', timeout: 10000 });
    
    // Ensure card is in viewport and clickable
    await topCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    
    try {
      await topCard.click({ force: true, timeout: 5000 });
    } catch (e) {
      console.log('Standard click failed, trying JS click', e);
      await topCard.evaluate((node) => (node as HTMLElement).click());
    }
    await page.waitForTimeout(500);

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
    await expect(deckContainer).toHaveScreenshot('flip-from-stack.png');
  });
});
