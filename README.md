# MIFA Designer

A sheet for drawing Stellantis internal-logistics MIFAs: place a shape, turn it into a symbol, and connect material, information, and empty-return flows. Preview fades everything that is not on the hovered path.

This folder is the whole product. It does not depend on Labelator. Copy it into its own repository when MIFA Designer should be shared on its own.

## Run it alone

```bash
npm install
npm run dev
```

The app opens at http://localhost:3001.

`npm run build` writes a static site to `dist/`.

## Use it inside Labelator

Labelator imports `MifaDesigner` from this package and shows it at `/mifa`. The component keeps its own document model and does not read Labelator templates, stores, or auth.
