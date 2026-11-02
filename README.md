# MIFA Designer

A standalone sheet for drawing Stellantis internal-logistics MIFAs.

The canvas and the data table are the same document. Add a supplier, dock, warehouse, kit, or line on the sheet and that step is written into the selected flow. Change a cell and the sheet updates. Select a symbol and pick another to turn it into that symbol. Connect two symbols and the line is stored on the flow: material, information, or an empty return.

Pinch on a trackpad zooms the sheet. Two-finger scroll pans it. Hold Space and drag to pan with a mouse. Hide data when you want the sheet alone, and show it again when you want the register.

Import and Export use three Excel sheets: Project, Flows, and Layout.

## Run it

```bash
npm install
npm run dev
```

The app opens at http://localhost:3001.

`npm test` checks the sheet. `npm run build` writes a static site to `dist/`.

The public site is https://agatonovic.github.io/MIFA-DESIGNER/. A push to `main` builds that site and publishes it.
