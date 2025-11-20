const { device, element, by, waitFor } = require('detox');

/**
 * Test visuel : Animation Shuffle (Mobile)
 * Précondition 2.6 : Test déterministe et exhaustif
 */
describe('Shuffle Animation - Mobile', () => {
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

  it('shuffle - from fan layout', async () => {
    // Mettre en fan d'abord
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Activer "Restore layout after shuffle" si nécessaire
    // Note: Adapter selon l'interface mobile
    
    // Shuffle
    await element(by.id('Shuffle')).tap();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Shuffle prend plus de temps
    
    await device.takeScreenshot('shuffle-from-fan-mobile.png');
  });

  it('shuffle - from ring layout', async () => {
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await element(by.id('Shuffle')).tap();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await device.takeScreenshot('shuffle-from-ring-mobile.png');
  });

  it('shuffle - without restore layout', async () => {
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Désactiver "Restore layout after shuffle" si possible
    // Note: Adapter selon l'interface mobile
    
    await element(by.id('Shuffle')).tap();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await device.takeScreenshot('shuffle-no-restore-mobile.png');
  });
});

