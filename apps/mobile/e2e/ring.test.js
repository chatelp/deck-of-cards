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
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await waitFor(element(by.id('Ring'))).toBeVisible().withTimeout(2000);
      await element(by.id('Ring')).tap();
    } catch (e) {
      // Fallback text
      await element(by.text('Ring')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));

    await device.takeScreenshot('ring-default-mobile.png');
  });

  it('ring layout - small deck (5 cards)', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('option-5')).tap();
    } catch (e) {
      await element(by.text('5')).atIndex(0).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await element(by.id('Ring')).tap();
    } catch (e) {
      await element(by.text('Ring')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));

    await device.takeScreenshot('ring-5-cards-mobile.png');
  });

  it('ring layout - large deck (24 cards)', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('option-24')).tap();
    } catch (e) {
      await element(by.text('24')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await element(by.id('Ring')).tap();
    } catch (e) {
      await element(by.text('Ring')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));

    await device.takeScreenshot('ring-24-cards-mobile.png');
  });
});

