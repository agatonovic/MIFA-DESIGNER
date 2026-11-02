# MIFA Designer

A sheet for drawing Stellantis internal-logistics MIFAs from a flow register.

Each row is one flow: supplier, dock, warehouse, then kitting and sequencing side by side, then the line, with empty-packaging returns and the information trigger. The drawing shares a dock, a line, or a system that several rows use. Hover a step in Preview and the other flows fade.

The register is the same table you can open in Excel. Import and Export read and write three sheets: Project, Flows, and Layout.

This folder is the whole product. It does not depend on Labelator. Copy it into its own repository when MIFA Designer should be shared on its own.

## Run it alone

```bash
npm install
npm run dev
```

The app opens at http://localhost:3001.

`npm run build` writes a static site to `dist/`.

## Use it inside Labelator

Labelator imports `MifaDesigner` from this package and shows it at `/mifa`.
