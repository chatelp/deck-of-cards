import { test, expect } from '@playwright/test';

const BASELINE_URL = 'http://localhost:3000';

test('Deck renders (web baseline)', async ({ page }) => {
  await page.goto(BASELINE_URL);
  await page.waitForTimeout(1000); // wait for animations
  
  await page.waitForFunction(() =>
    Array.from(document.images).every(img => img.complete && img.naturalWidth > 0)
  );
  
  await expect(page).toHaveScreenshot('baseline-web.png');
});
