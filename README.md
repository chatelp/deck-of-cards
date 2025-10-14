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
pnpm dev       # runs all app/package dev scripts via TurboRepo
```

To run individual targets:

```bash
pnpm --filter deck-mobile dev   # Expo dev client (React Native)
pnpm --filter deck-web-app dev  # Next.js web app (Framer Motion bindings)
pnpm --filter @deck/core build  # Build shared core
```

### Development Tips

- With `transpilePackages` enabled in `apps/web/next.config.js`, changes under `packages/@deck/core/src/**` and `packages/@deck/web/src/**` hot-reload automatically while running `pnpm --filter deck-web-app dev`.
- Use Turborepo commands (`pnpm dev`, `pnpm build`, etc.) to orchestrate builds across the monorepo.
- Legacy sources remain in `legacy/` if you need to reference the original DOM implementation.

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

MIT © Juha Lindstedt & contributors, modern port maintained by the Cursor project.
