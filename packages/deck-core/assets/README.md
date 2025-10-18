Cross-Platform Card Assets
==========================

Place shared artwork in this directory so both the web and mobile decks can resolve card faces and backs from a single source of truth.

```
packages/deck-core/assets/
├── card-backs/
│   └── default.png      # add your default card-back artwork here
└── card-faces/
    └── example.png      # optional per-card face artwork
```

Guidelines
----------

* Use PNG (preferred) or WebP assets sized appropriately for your deck.
* Keep filenames lowercase with hyphens (e.g. `hexagram-01.png`).
* Reference these files from your apps during build/bundle:
  * **Web**: copy or symlink into `apps/web/public/cards/` before build.
  * **Mobile**: include in the Metro bundle (e.g. via `require`) or copy into `apps/mobile/assets/`.
* Update `DEFAULT_CARD_BACK_ASSET` (packages/deck-core/src/defaultAssets.ts) if you provide a real default image.
