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
    await element(by.id('Fan')).tap();
    
    // Attendre que l'animation se termine
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Prendre un screenshot
    await device.takeScreenshot('fan-default-mobile.png');
  });

  it('fan layout - small deck (5 cards)', async () => {
    // Sélectionner la taille 5 via testID
    await element(by.id('option-5')).tap();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Cliquer sur Fan
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await device.takeScreenshot('fan-5-cards-mobile.png');
  });

  it('fan layout - large deck (20 cards)', async () => {
    await element(by.id('option-20')).tap();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await device.takeScreenshot('fan-20-cards-mobile.png');
  });
});

