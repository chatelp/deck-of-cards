const { device, element, by, waitFor } = require('detox');

/**
 * Test visuel : Layout Stack (Mobile)
 * Précondition 2.6 : Test déterministe et exhaustif
 */
describe('Stack Layout - Mobile', () => {
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

  it('stack layout - default deck size', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
    await element(by.id('Stack')).tap();
    } catch (e) {
      await element(by.text('Stack')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await device.takeScreenshot('stack-default-mobile.png');
  });

  it('stack layout - small deck (5 cards)', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
    await element(by.id('option-5')).tap();
    } catch (e) {
      await element(by.text('5')).atIndex(0).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
    await element(by.id('Stack')).tap();
    } catch (e) {
      await element(by.text('Stack')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await device.takeScreenshot('stack-5-cards-mobile.png');
  });

  it('stack layout - large deck (24 cards)', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('option-24')).tap();
    } catch (e) {
      await element(by.text('24')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
    await element(by.id('Stack')).tap();
    } catch (e) {
      await element(by.text('Stack')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));

    await device.takeScreenshot('stack-24-cards-mobile.png');
  });
});

