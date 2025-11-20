#!/bin/bash

# Script de vérification des tests visuels

set -e

echo "🔍 Vérification de la configuration des tests visuels..."
echo ""

# Vérifier Playwright
if command -v playwright &> /dev/null || pnpm exec playwright --version &> /dev/null; then
    echo "✅ Playwright installé"
    PLAYWRIGHT_VERSION=$(pnpm exec playwright --version 2>/dev/null || echo "non disponible")
    echo "   Version: $PLAYWRIGHT_VERSION"
else
    echo "❌ Playwright non installé"
    echo "   Installez avec: pnpm exec playwright install"
    exit 1
fi

# Vérifier les navigateurs Playwright
if [ -d "$HOME/Library/Caches/ms-playwright" ] || [ -d "$HOME/.cache/ms-playwright" ]; then
    echo "✅ Navigateurs Playwright installés"
else
    echo "⚠️  Navigateurs Playwright non installés"
    echo "   Installez avec: pnpm exec playwright install chromium"
fi

# Vérifier la configuration
if [ -f "tests/web/playwright.config.ts" ]; then
    echo "✅ Configuration Playwright trouvée"
else
    echo "❌ Configuration Playwright manquante"
    exit 1
fi

if [ -f "tests/web/deck.spec.ts" ]; then
    echo "✅ Tests web trouvés"
    TEST_COUNT=$(pnpm exec playwright test --list --config=tests/web/playwright.config.ts 2>/dev/null | grep -c "test" || echo "0")
    echo "   Nombre de tests: $TEST_COUNT"
else
    echo "❌ Tests web manquants"
    exit 1
fi

# Vérifier Detox
if [ -f "apps/mobile/detox.config.js" ]; then
    echo "✅ Configuration Detox trouvée"
else
    echo "⚠️  Configuration Detox manquante"
fi

if [ -f "apps/mobile/e2e/deck.spec.js" ]; then
    echo "✅ Tests mobile trouvés"
else
    echo "⚠️  Tests mobile manquants"
fi

echo ""
echo "📋 Commandes utiles:"
echo "   pnpm test:visual:web          - Lancer les tests web"
echo "   pnpm test:visual:mobile        - Lancer les tests mobile"
echo "   pnpm test:visual:all           - Lancer tous les tests"
echo ""
echo "⚠️  Note: Les tests nécessitent que les apps soient démarrées:"
echo "   - Web: pnpm dev:web (sur http://localhost:3000)"
echo "   - Mobile: pnpm --filter deck-mobile ios/android"
echo ""






