# Tests Visuels - Deck of Cards

## Configuration

Les tests visuels utilisent Playwright pour le web et Detox pour le mobile pour capturer des screenshots et détecter les régressions visuelles.

## Prérequis

### Web (Playwright)
- Playwright installé : `pnpm exec playwright install`
- App web démarrée sur `http://localhost:3000`

### Mobile (Detox)
- Detox installé : `pnpm install` (déjà dans devDependencies)
- App mobile buildée et démarrée
- Simulateur iOS ou émulateur Android configuré

## Lancer les Tests

### Tests Web

```bash
# Démarrer l'app web d'abord (dans un autre terminal)
pnpm dev:web

# Dans un autre terminal, lancer les tests
pnpm test:visual:web

# Générer/mettre à jour les baselines (première fois)
pnpm test:visual:web --update-snapshots
```

### Tests Mobile

```bash
# Build et démarrer l'app mobile d'abord
cd apps/mobile
pnpm ios  # ou pnpm android

# Dans un autre terminal, lancer les tests
pnpm test:visual:mobile
```

### Tous les Tests

```bash
pnpm test:visual:all
```

## Structure des Tests

### Web (`tests/web/deck.spec.ts`)
- `fan-web.png` : Layout en éventail
- `ring-web.png` : Layout en cercle
- `stack-web.png` : Layout empilé
- `shuffle-web.png` : Animation de mélange
- `flip-web.png` : Retournement de carte
- `sequence-web.png` : Animations en rafale

### Mobile (`apps/mobile/e2e/deck.spec.js`)
- Tests équivalents avec suffixe `-mobile.png`

## Baselines

Les baselines (screenshots de référence) sont stockées dans :
- Web : `tests/web/deck.spec.ts-snapshots/`
- Mobile : `apps/mobile/e2e/artifacts/`

**Important** : Les baselines doivent être générées sur une version stable et validée manuellement avant d'être commitées.

## Détection des Divergences

Les tests comparent pixel par pixel les screenshots actuels avec les baselines :
- Écart > 1px = FAIL
- Différence de position > 5px pour une carte = FAIL
- Différence de rotation > 2deg = FAIL

Voir `AGENTS_PROTOCOL.md` pour plus de détails sur le système de correction automatique.

## Mode Debug

Pour voir les différences visuelles en cas d'échec :

```bash
# Web
PLAYWRIGHT_DEBUG=1 pnpm test:visual:web

# Les screenshots de différence sont générés automatiquement
```

## CI/CD

Les tests visuels peuvent être intégrés dans CI/CD. Voir `AGENTS_PROTOCOL.md` pour la configuration GitHub Actions / GitLab CI.





