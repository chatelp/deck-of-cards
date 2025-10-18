# Deck of Cards Monorepo

Modern cross-platform reimplementation of Juha Lindstedt's Deck of Cards. The goal is to evolve the original DOM/CSS deck (now archived under `legacy/`) into a TypeScript core with platform bindings for React Native (Expo/Reanimated) and Web (React Native Web + Framer Motion), serving as the base for a Yi Jing (I Ching) card reading interface.

## Packages

- `@deck/core` – TypeScript domain models, deck state & logic (`fan`, `shuffle`, `animateTo`, `flip`), animation driver abstraction, `useDeck` hook, event observable
- `@deck/web` – Web bindings powered by `react-native-web` + Framer Motion (`DeckView`, `CardView`, `WebMotionDriver`)
- `@deck/rn` – React Native bindings (currently a skeleton `DeckView`, `CardView`, `ReanimatedDriver` stub)

## Apps

- `apps/mobile` – Expo app showcasing the deck experience on iOS/Android
- `apps/web` – Next.js app previewing the web experience via `@deck/web` (Yi Jing demo, deck size/draw limit controls)

## Legacy Source

- `legacy/` – original DOM/CSS implementation by Juha Lindstedt. Preserved for reference; not used by the new codebase.

## Getting Started

```bash
pnpm install

# Full dev (all workspaces that define a `dev` script)
pnpm dev

# Web‑only dev (best for the Next.js demo):
pnpm dev:web
```

What the dev scripts do:

- Packages export compiled bundles from `dist/` (no direct `.ts` imports at runtime).
- `pnpm dev` / `pnpm dev:web` run `tsc -b --watch` in `@deck/core` and `@deck/web` so `dist/` is kept in sync while Next.js serves the app.
- No manual rebuild is required during development. For a clean build:
  - `pnpm --filter @deck/* build`

To run individual targets explicitly:

```bash
pnpm --filter deck-web-app dev   # Next.js web app (Framer Motion bindings)
pnpm --filter deck-mobile dev    # Expo dev client (React Native)
pnpm --filter @deck/core build   # Build shared core
```

### Development Tips

- Packages export `dist/` and are kept in sync by `tsc -b --watch` when using `pnpm dev` / `pnpm dev:web`.
- Use the provided scripts (`pnpm dev`, `pnpm dev:web`, `pnpm build`) to orchestrate builds across the monorepo.
- If the web app shows stale behavior, ensure `pnpm dev:web` is running (you should see watchers for `@deck/core` and `@deck/web` plus `next dev`). If needed, clear `apps/web/.next` and restart.
- Legacy sources remain in `legacy/` if you need to reference the original DOM implementation.

### Interaction model (web demo)

- Click a card: it flips, then is removed from the deck and appended to the “Drawn Cards” list (draw limit enforced by the core).

## Architecture Overview

1. **TypeScript Core (`@deck/core`)** – deterministic layouts, deck state management, animation sequences, event system, driver abstraction.
2. **Animation Drivers** – concrete drivers (Framer Motion for web, Reanimated for native) consume sequences emitted by the core.
3. **Hooks & Bindings** – `useDeck` orchestrates fan/shuffle/flip, enforces draw limits, exposes actions to `DeckView` components.
4. **Platform UI** – React Native & Web bindings mirror APIs, enabling shared logic with platform-specific animations.

## Current Status

- ✅ Core primitives (`fan`, `shuffle`, `flip`, `animateTo`) and deck state/draw-limit logic
- ✅ Web bindings with Framer Motion (`DeckView`, `CardView`, 3D flip, Next.js demo)
- ⏳ React Native bindings (Reanimated driver implementation pending)
- 🗃 Legacy DOM/CSS moved to `legacy/` for archival reference

## Roadmap

- [ ] Flesh out Reanimated driver (shared values, gestures) to match web features
- [ ] Polish Framer Motion driver (flip visuals, cancellation handling)
- [ ] Enrich Yi Jing data set (64 cards, metadata, imagery, localization)
- [ ] Build shared component catalog / Storybook for design validation
- [ ] Add unit tests for primitives and animation sequencing; e2e tests for web demo
- [ ] Expand documentation & examples for extending layouts and interactions

## License

MIT