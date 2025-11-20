describe('Deck renders on mobile', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('baseline screenshot', async () => {
    await expect(element(by.id('DeckRoot'))).toBeVisible();
    await device.takeScreenshot('baseline-mobile');
  });
});





