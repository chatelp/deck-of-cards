const { device, element, by, waitFor } = require('detox');

/**
 * Test visuel : Transitions entre layouts (Mobile)
 * Précondition 2.6 : Test déterministe et exhaustif
 */
describe('Layout Transitions - Mobile', () => {
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

  it('transition fan → ring', async () => {
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('transition-fan-to-ring-mobile.png');
  });

  it('transition ring → stack', async () => {
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await element(by.id('Stack')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('transition-ring-to-stack-mobile.png');
  });

  it('transition stack → fan', async () => {
    await element(by.id('Stack')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('transition-stack-to-fan-mobile.png');
  });

  it('transition fan → stack', async () => {
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await element(by.id('Stack')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('transition-fan-to-stack-mobile.png');
  });

  it('transition ring → fan', async () => {
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('transition-ring-to-fan-mobile.png');
  });

  it('transition stack → ring', async () => {
    await element(by.id('Stack')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('transition-stack-to-ring-mobile.png');
  });

  it('transition fan → shuffle → fan', async () => {
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Activer restore layout si nécessaire
    // Note: Adapter selon l'interface mobile
    
    await element(by.id('Shuffle')).tap();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await device.takeScreenshot('transition-fan-shuffle-fan-mobile.png');
  });
});

