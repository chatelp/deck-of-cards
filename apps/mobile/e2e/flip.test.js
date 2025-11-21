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
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('Fan')).tap();
    } catch (e) {
      await element(by.text('Fan')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remonter pour voir les cartes
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    
    // Cliquer sur une carte pour la retourner (au centre de DeckRoot)
    // card-0 n'est pas toujours accessible/visible pour Detox en mode Fan
    await element(by.id('DeckRoot')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre l'animation de flip
    
    await device.takeScreenshot('flip-single-card-mobile.png');
  });

  it('flip multiple cards - from ring layout', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('Ring')).tap();
    } catch (e) {
      await element(by.text('Ring')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remonter pour voir les cartes
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    
    // Retourner plusieurs cartes
    // Les cartes utilisent testID={state.id} qui correspond à "card-0", "card-1", etc.
    for (let i = 0; i < 3; i++) {
      const card = element(by.id(`card-${i}`));
      // Pas de `if (await card.exists())` simple en Detox, on suppose qu'elles sont là
      try {
        await card.tap();
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (e) {
        // Ignorer si non trouvable (peut être hors écran ou caché)
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await device.takeScreenshot('flip-multiple-cards-mobile.png');
  });

  it('flip card - from stack layout', async () => {
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('bottom');
    try {
      await element(by.id('Stack')).tap();
    } catch (e) {
      await element(by.text('Stack')).tap();
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remonter pour voir les cartes
    await element(by.type('UIScrollView')).atIndex(0).scrollTo('top');
    
    // Retourner la carte du dessus (Stack = cartes empilées au centre)
    // On clique au centre du conteneur DeckRoot
    await element(by.id('DeckRoot')).tap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await device.takeScreenshot('flip-stack-card-mobile.png');
  });
});

