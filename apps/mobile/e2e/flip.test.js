const { device, element, by, waitFor } = require('detox');

/**
 * Test visuel : Animation Flip (Mobile)
 * Précondition 2.6 : Test déterministe et exhaustif
 */
describe('Flip Animation - Mobile', () => {
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

  it('flip single card - from fan layout', async () => {
    // Mettre en fan
    await element(by.id('Fan')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Cliquer sur une carte pour la retourner
    // Les cartes utilisent testID={state.id} qui correspond à "card-0", "card-1", etc.
    const firstCard = element(by.id('card-0'));
    await waitFor(firstCard).toBeVisible().withTimeout(5000);
    await firstCard.tap();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre l'animation de flip
    
    await device.takeScreenshot('flip-single-card-mobile.png');
  });

  it('flip multiple cards - from ring layout', async () => {
    await element(by.id('Ring')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Retourner plusieurs cartes
    // Les cartes utilisent testID={state.id} qui correspond à "card-0", "card-1", etc.
    for (let i = 0; i < 3; i++) {
      const card = element(by.id(`card-${i}`));
      if (await card.exists()) {
        await card.tap();
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await device.takeScreenshot('flip-multiple-cards-mobile.png');
  });

  it('flip card - from stack layout', async () => {
    await element(by.id('Stack')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Retourner la carte du dessus
    const topCard = element(by.id('card-0'));
    await waitFor(topCard).toBeVisible().withTimeout(5000);
    await topCard.tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('flip-stack-card-mobile.png');
  });
});

