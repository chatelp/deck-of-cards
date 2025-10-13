# Deck of Cards Monorepo

Modern cross-platform reimplementation of Juha Lindstedt's Deck of Cards for React Native (Expo) and React Native Web.

## Packages

- `@deck/core` – shared TypeScript domain models, primitives (`fan`, `shuffle`, `animateTo`, `flip`), animation driver abstraction, React hooks
- `@deck/rn` – React Native bindings (`DeckView`, `CardView`), Reanimated driver integration stub
- `@deck/web` – Web bindings using `react-native-web` and Framer Motion

## Apps

- `apps/mobile` – Expo app showcasing the deck experience on iOS/Android
- `apps/web` – Next.js app previewing the web experience via `@deck/web`

## Getting Started

```bash
pnpm install
pnpm dev       # runs all app/package dev scripts via TurboRepo
```

To run individual targets:

```bash
pnpm --filter deck-mobile dev   # Expo dev client
pnpm --filter deck-web-app dev  # Next.js web app
pnpm --filter @deck/core build  # Build shared core
```

## Architecture Overview

1. **Core logic in TypeScript** – deterministic layout + state transitions, animation sequences returned as data.
2. **Animation Driver abstraction** – inject platform-specific animation engines (Reanimated, Framer Motion).
3. **Composable Hooks** – `useDeck` orchestrates primitives with injected driver; consumers render via `DeckView` APIs.
4. **Platform bindings** – UI components leverage native primitives (`Animated.View`, `Pressable`, `motion.div`) while keeping API parity.

## Roadmap

- Flesh out Reanimated driver with shared values and gesture integration
- Implement Framer Motion driver controls with layout Spring parity
- Enrich Yi Jing card data (64 hexagrams, metadata, localized copy)
- Add storybook / component catalog for design validation
- Write tests for primitive logic and animation sequencing
- Provide documentation and examples for extending layouts and interactions

## License

MIT © Juha Lindstedt & contributors, modern port maintained by the Cursor project.
