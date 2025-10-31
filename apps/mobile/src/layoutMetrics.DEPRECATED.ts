/**
 * @deprecated Ce fichier n'est plus utilisé depuis le refactoring de DeckView.
 * 
 * La logique de layout responsive est maintenant entièrement gérée dans
 * packages/deck-rn/src/DeckView.tsx via le calcul de `layoutParams`.
 * 
 * Ce fichier sera supprimé dans une prochaine version.
 * 
 * Migration:
 * - Ne plus importer `getDeckLayoutMetrics` ou `getResponsiveCardSize`
 * - Ne plus passer `cardDimensions`, `fanConfig`, `ringRadius` à DeckView
 * - DeckView calcule automatiquement tous ces paramètres en fonction du containerSize
 */

// Ce fichier est conservé temporairement pour référence historique
// mais ne doit plus être utilisé


