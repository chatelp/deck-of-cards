const { device, element, by, waitFor } = require('detox');

/**
 * Test visuel : Layout Fan (Mobile)
 * Précondition 2.6 : Test déterministe et exhaustif
 */
describe('Fan Layout - Mobile', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Attendre que l'app soit complètement chargée
    await waitFor(element(by.id('DeckRoot'))).toBeVisible().withTimeout(10000);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre animations initiales
  });

  beforeEach(async () => {
    // Réinitialiser l'app avant chaque test pour garantir la déterministe
    await device.reloadReactNative();
    await waitFor(element(by.id('DeckRoot'))).toBeVisible().withTimeout(10000);
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  it('fan layout - default deck size', async () => {
    // Cliquer sur le bouton Fan
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('Fan')).tap();
    } catch (e) {
      await element(by.text('Fan')).tap();
    }
    
    // Attendre que l'animation se termine
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Prendre un screenshot
    await device.takeScreenshot('fan-default-mobile.png');
  });

  it('fan layout - small deck (5 cards)', async () => {
    // Sélectionner la taille 5 via testID
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('option-5')).tap();
    } catch (e) {
      // Fallback: "5" est ambigu (Deck Size vs Draw Limit), on prend le premier
      await element(by.text('5')).atIndex(0).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Cliquer sur Fan
    try {
      await element(by.id('Fan')).tap();
    } catch (e) {
      await element(by.text('Fan')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Remonter pour voir les cartes avant le screenshot
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await device.takeScreenshot('fan-5-cards-mobile.png');
  });

  it('fan layout - large deck (24 cards)', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('option-24')).tap();
    } catch (e) {
      await element(by.text('24')).tap();
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
    
    await device.takeScreenshot('fan-24-cards-mobile.png');
  });
});

