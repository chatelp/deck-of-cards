const { device, element, by, waitFor } = require('detox');

/**
 * Test visuel : Layout Ring (Mobile)
 * Précondition 2.6 : Test déterministe et exhaustif
 */
describe('Ring Layout - Mobile', () => {
  beforeAll(async () => {
    await device.launchApp();
    await waitFor(element(by.id('DeckRoot'))).toBeVisible().withTimeout(10000);
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await waitFor(element(by.id('DeckRoot'))).toBeVisible().withTimeout(10000);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  it('ring layout - default deck size', async () => {
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await device.takeScreenshot('ring-default-mobile.png');
  });

  it('ring layout - small deck (5 cards)', async () => {
    await element(by.id('option-5')).tap();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await device.takeScreenshot('ring-5-cards-mobile.png');
  });

  it('ring layout - large deck (20 cards)', async () => {
    await element(by.id('option-20')).tap();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await device.takeScreenshot('ring-20-cards-mobile.png');
  });
});

