const { device, element, by, waitFor } = require('detox');

/**
 * Test visuel : Différentes tailles de deck (Mobile)
 * Précondition 2.6 : Test déterministe et exhaustif
 * Tailles selon Précondition 2.5 : [5, 10, 16, 24, 32, 48, 64]
 */
describe('Deck Sizes - Mobile', () => {
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

  // Tailles de deck selon Précondition 2.5 : [5, 10, 16, 24, 32, 48, 64]
  const deckSizes = [5, 10, 16, 24, 32, 48, 64];

  deckSizes.forEach(size => {
    it(`deck size ${size} - fan layout`, async () => {
      await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
      try {
      await element(by.id(`option-${size}`)).tap();
      } catch (e) {
        await element(by.text(`${size}`)).atIndex(0).tap();
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
      await element(by.id('Fan')).tap();
      } catch (e) {
        await element(by.text('Fan')).tap();
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Remonter pour voir les cartes avant le screenshot
      await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await device.takeScreenshot(`deck-size-${size}-fan-mobile.png`);
    });

    it(`deck size ${size} - ring layout`, async () => {
      await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
      try {
      await element(by.id(`option-${size}`)).tap();
      } catch (e) {
        await element(by.text(`${size}`)).atIndex(0).tap();
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
      
      await device.takeScreenshot(`deck-size-${size}-ring-mobile.png`);
    });

    it(`deck size ${size} - stack layout`, async () => {
      await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
      try {
      await element(by.id(`option-${size}`)).tap();
      } catch (e) {
        await element(by.text(`${size}`)).atIndex(0).tap();
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
      
      await device.takeScreenshot(`deck-size-${size}-stack-mobile.png`);
    });
  });
});

