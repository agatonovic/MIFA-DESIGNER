import { parseArchive, type Archive } from "./archive";

/** Library saved on localhost and shipped so the published site opens with the same factories. */
const PUBLISHED_ARCHIVE = {
  "folders": [
    {
      "id": "folder-2dnuot",
      "name": "Factory",
      "mifas": [
        {
          "id": "mifa-de7yhq",
          "document": {
            "project": {
              "name": "Inbound example",
              "plant": "Plant",
              "shop": "GA",
              "scenario": "Current",
              "rate": "30",
              "shifts": "2",
              "perDay": "770",
              "diversity": "3 top hats",
              "updated": "02/11/2026"
            },
            "flows": [
              {
                "id": "f-lv",
                "flowNumber": "1",
                "building": "GA",
                "packaging": "LV",
                "supplier": "Supplier",
                "direct": false,
                "dock": "1",
                "transportTruck": "Truck",
                "unloadingBuffer": false,
                "bufferNumber": "",
                "transportToWarehouse": "Forklift",
                "warehouse": "1",
                "kitting": true,
                "kitNumber": "1",
                "transportToKitting": "Forklift",
                "sequencing": false,
                "sequencingNumber": "",
                "transportToSequencing": "",
                "transportKitToLine": "Tugger",
                "transportSeqToLine": "",
                "productionLine": "Line",
                "emptiesFromLine": "Tugger",
                "emptiesFromSequencing": "",
                "emptiesFromKitting": "",
                "emptiesStore": "1",
                "emptiesDock": "2",
                "trigger": "Kanban",
                "system": "WMS"
              },
              {
                "id": "f-sb",
                "flowNumber": "2",
                "building": "GA",
                "packaging": "SB",
                "supplier": "Supplier",
                "direct": false,
                "dock": "1",
                "transportTruck": "Truck",
                "unloadingBuffer": false,
                "bufferNumber": "",
                "transportToWarehouse": "Forklift",
                "warehouse": "2",
                "kitting": false,
                "kitNumber": "",
                "transportToKitting": "",
                "sequencing": true,
                "sequencingNumber": "1",
                "transportToSequencing": "Forklift",
                "transportKitToLine": "",
                "transportSeqToLine": "Tugger",
                "productionLine": "Line",
                "emptiesFromLine": "Tugger",
                "emptiesFromSequencing": "",
                "emptiesFromKitting": "",
                "emptiesStore": "2",
                "emptiesDock": "",
                "trigger": "Call box",
                "system": "WMS"
              }
            ],
            "positions": {
              "line:Line": {
                "x": 2648,
                "y": 8
              },
              "empties:SB:2": {
                "x": 1360,
                "y": 824
              },
              "empties:LV:1": {
                "x": 1256,
                "y": 568
              },
              "emptiesDock:2": {
                "x": 1072,
                "y": 568
              },
              "kitting:LV:1": {
                "x": 1032,
                "y": 408
              },
              "it:WMS": {
                "x": 728,
                "y": 8
              },
              "dock:1": {
                "x": 376,
                "y": 264
              },
              "sequencing:1": {
                "x": 1016,
                "y": 128
              }
            },
            "glyphs": {},
            "marks": [],
            "sizes": {
              "line:Line": {
                "width": 96,
                "height": 1792
              }
            },
            "bends": {
              "link-scy8mv": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 285
                },
                "to": {
                  "side": "w",
                  "at": 300
                },
                "corners": [
                  {
                    "x": 319.36,
                    "y": 285
                  },
                  {
                    "x": 319.36,
                    "y": 168
                  }
                ]
              },
              "line:Line>empties:SB:2:empty": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "w",
                  "at": 800.9322564570138
                },
                "to": {
                  "side": "e",
                  "at": 758.9322564570138
                },
                "corners": [
                  {
                    "x": 2207.3466585475885,
                    "y": 800.9322564570138
                  },
                  {
                    "x": 2207.3466585475885,
                    "y": 838.08
                  }
                ]
              },
              "sequencing:1>line:Line:material": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 168
                },
                "to": {
                  "side": "w",
                  "at": 904
                },
                "corners": [
                  {
                    "x": 1711.04,
                    "y": 168
                  },
                  {
                    "x": 1711.04,
                    "y": 296
                  }
                ]
              }
            },
            "strokes": {},
            "links": [],
            "stack": {
              "back": [],
              "front": []
            },
            "icons": {
              "supplier:Supplier>dock:1:material::Truck": {
                "x": 208,
                "y": 248,
                "width": 132,
                "height": 45
              },
              "sequencing:1>line:Line:material::Tugger": {
                "x": 2184,
                "y": 848,
                "width": 72,
                "height": 29.999999999999996
              }
            },
            "poses": {}
          },
          "versions": []
        }
      ]
    },
    {
      "id": "folder-j9qac8",
      "name": "FACTORY KRAGUJEVAC",
      "mifas": [
        {
          "id": "mifa-9b40cb",
          "document": {
            "project": {
              "name": "Untitled MIFA",
              "plant": "",
              "shop": "",
              "scenario": "Current",
              "rate": "",
              "shifts": "",
              "perDay": "",
              "diversity": "",
              "updated": ""
            },
            "flows": [],
            "positions": {},
            "glyphs": {},
            "marks": [],
            "sizes": {},
            "bends": {},
            "strokes": {},
            "links": [],
            "stack": {
              "back": [],
              "front": []
            },
            "icons": {},
            "poses": {}
          },
          "versions": [
            {
              "id": "ver-eiapkk",
              "savedAt": "2026-11-09T08:46:09.432Z",
              "name": "Draft",
              "document": {
                "project": {
                  "name": "Draft",
                  "plant": "",
                  "shop": "",
                  "scenario": "Current",
                  "rate": "",
                  "shifts": "",
                  "perDay": "",
                  "diversity": "",
                  "updated": ""
                },
                "flows": [],
                "positions": {},
                "glyphs": {},
                "marks": [],
                "sizes": {},
                "bends": {},
                "strokes": {},
                "links": [],
                "stack": {
                  "back": [],
                  "front": []
                },
                "icons": {},
                "poses": {}
              }
            },
            {
              "id": "ver-q49jdx",
              "savedAt": "2026-11-09T08:45:53.921Z",
              "name": "Untitled MIFA",
              "document": {
                "project": {
                  "name": "Untitled MIFA",
                  "plant": "",
                  "shop": "",
                  "scenario": "Current",
                  "rate": "",
                  "shifts": "",
                  "perDay": "",
                  "diversity": "",
                  "updated": ""
                },
                "flows": [],
                "positions": {},
                "glyphs": {},
                "marks": [],
                "sizes": {},
                "bends": {},
                "strokes": {},
                "links": [],
                "stack": {
                  "back": [],
                  "front": []
                },
                "icons": {},
                "poses": {}
              }
            }
          ]
        },
        {
          "id": "mifa-ga-melfi",
          "document": {
            "project": {
              "name": "MIFA GA MELFI",
              "plant": "",
              "shop": "",
              "scenario": "Current",
              "rate": "",
              "shifts": "",
              "perDay": "",
              "diversity": "",
              "updated": ""
            },
            "flows": [
              {
                "id": "f-kwrq6b",
                "flowNumber": "1",
                "building": "",
                "packaging": "",
                "supplier": "",
                "direct": false,
                "dock": "",
                "transportTruck": "",
                "unloadingBuffer": false,
                "bufferNumber": "",
                "transportToWarehouse": "",
                "warehouse": "",
                "kitting": false,
                "kitNumber": "",
                "transportToKitting": "",
                "sequencing": false,
                "sequencingNumber": "",
                "transportToSequencing": "",
                "transportKitToLine": "",
                "transportSeqToLine": "",
                "productionLine": "",
                "emptiesFromLine": "",
                "emptiesFromSequencing": "",
                "emptiesFromKitting": "",
                "emptiesStore": "",
                "emptiesDock": "",
                "trigger": "",
                "system": ""
              }
            ],
            "positions": {},
            "glyphs": {},
            "marks": [
              {
                "id": "mark-vewtvm",
                "name": "Supplier",
                "symbol": "rectangle",
                "x": 1592,
                "y": -16,
                "width": 1181,
                "height": 1800,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-8c904x",
                "name": "Supplier",
                "symbol": "rectangle",
                "x": 56,
                "y": 352,
                "width": 360,
                "height": 320,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-9sqd4k",
                "name": "SUPPLIERS",
                "symbol": "rectangle",
                "x": 248,
                "y": 384,
                "width": 160,
                "height": 40,
                "shape": "text",
                "color": "#c5221f",
                "bold": true,
                "font": 23
              },
              {
                "id": "mark-0gp9ew",
                "name": "Supplier",
                "symbol": "rectangle",
                "x": 496,
                "y": 88,
                "width": 440,
                "height": 240,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-1nh6ba",
                "name": "Supplier",
                "symbol": "rectangle",
                "x": 992,
                "y": 88,
                "width": 544,
                "height": 568,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-1znkls",
                "name": "NOLA",
                "symbol": "rectangle",
                "x": 520,
                "y": 120,
                "width": 160,
                "height": 40,
                "shape": "text",
                "color": "#c5221f",
                "align": "left",
                "bold": true,
                "font": 23
              },
              {
                "id": "mark-uep4vg",
                "name": "",
                "symbol": "rectangle",
                "x": 512,
                "y": 280,
                "width": 24,
                "height": 24,
                "shape": "ellipse",
                "fill": "#188038"
              },
              {
                "id": "mark-agt9z7",
                "name": "SMALL BOXES",
                "symbol": "rectangle",
                "x": 544,
                "y": 256,
                "width": 160,
                "height": 56,
                "shape": "text",
                "color": "#c5221f",
                "align": "left",
                "bold": true,
                "font": 11
              },
              {
                "id": "mark-gaox33",
                "name": "Production line in batches",
                "symbol": "rectangle",
                "x": 2704,
                "y": 232,
                "width": 48,
                "height": 1504,
                "artwork": "process-production-line-in-batches"
              },
              {
                "id": "mark-hsvcar",
                "name": "RBV SB = 0,44",
                "symbol": "rectangle",
                "x": 544,
                "y": 272,
                "width": 160,
                "height": 56,
                "shape": "text",
                "color": "#c5221f",
                "align": "left",
                "bold": true,
                "font": 11
              },
              {
                "id": "mark-weg6lh",
                "name": "transfert by Truck",
                "symbol": "rectangle",
                "x": 400,
                "y": 208,
                "width": 80,
                "height": 28,
                "artwork": "materials-truck-transfer"
              },
              {
                "id": "mark-0i8g1q",
                "name": "transfert by Truck",
                "symbol": "rectangle",
                "x": 512,
                "y": 208,
                "width": 80,
                "height": 28,
                "artwork": "materials-truck-transfer",
                "flip": true
              },
              {
                "id": "mark-1x2fhc",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 608,
                "y": 200,
                "width": 48,
                "height": 19,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-0y5v5n",
                "name": "man-handled transfert",
                "symbol": "rectangle",
                "x": 608,
                "y": 160,
                "width": 16,
                "height": 24,
                "artwork": "materials-man-transfer"
              },
              {
                "id": "mark-oxunpy",
                "name": "Visual Information Flow",
                "symbol": "rectangle",
                "x": 624,
                "y": 144,
                "width": 24,
                "height": 8,
                "artwork": "information-visual-information-flow"
              }
            ],
            "sizes": {},
            "bends": {
              "link-plwj8e": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 487.51194981385515
                },
                "to": {
                  "side": "w",
                  "at": 264
                },
                "corners": [
                  {
                    "x": 456,
                    "y": 487.51194981385515
                  },
                  {
                    "x": 456,
                    "y": 264
                  }
                ],
                "shaped": true
              },
              "link-vbvyuu": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 616
                },
                "to": {
                  "side": "w",
                  "at": 392
                },
                "corners": [
                  {
                    "x": 683.8186384597069,
                    "y": 616
                  },
                  {
                    "x": 683.8186384597069,
                    "y": 392
                  }
                ],
                "shaped": true
              },
              "link-mr5uav": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 512
                },
                "to": {
                  "side": "w",
                  "at": 400
                },
                "corners": [
                  {
                    "x": 636.3650869790795,
                    "y": 512
                  },
                  {
                    "x": 636.3650869790795,
                    "y": 400.3972026087914
                  }
                ],
                "shaped": true
              },
              "link-ujfpb5": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "s",
                  "at": 716
                },
                "to": {
                  "side": "n",
                  "at": 716
                },
                "shaped": true
              },
              "link-2mnrcu": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 140
                },
                "to": {
                  "side": "w",
                  "at": 140
                },
                "shaped": true
              }
            },
            "strokes": {},
            "links": [
              {
                "id": "link-plwj8e",
                "from": "mark-8c904x",
                "to": "mark-0gp9ew",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-mr5uav",
                "from": "mark-8c904x",
                "to": "mark-1nh6ba",
                "kind": "material",
                "label": ""
              }
            ],
            "stack": {
              "back": [],
              "front": []
            },
            "icons": {},
            "poses": {},
            "canvas": {
              "x": 0,
              "y": -40,
              "width": 2800,
              "height": 1840
            }
          },
          "versions": []
        }
      ]
    }
  ],
  "openFolderId": "folder-2dnuot",
  "openMifaId": "mifa-de7yhq"
};

export function publishedLibrary(): Archive {
  const parsed = parseArchive(JSON.parse(JSON.stringify(PUBLISHED_ARCHIVE)));
  if (!parsed) throw new Error("Published library is not a valid archive");
  return parsed;
}

/** Add shipped factories and sheets that this browser does not already have. An existing sheet is left as it is. */
export function adoptPublished(stored: Archive): Archive {
  const published = publishedLibrary();
  let changed = false;
  const folders = stored.folders.map((folder) => {
    const source = published.folders.find((item) => item.id === folder.id) ?? published.folders.find((item) => item.name === folder.name);
    if (!source) return folder;
    const ids = new Set(folder.mifas.map((mifa) => mifa.id));
    const names = new Set(folder.mifas.map((mifa) => mifa.document.project.name));
    const added = source.mifas.filter((mifa) => !ids.has(mifa.id) && !names.has(mifa.document.project.name));
    if (!added.length) return folder;
    changed = true;
    return { ...folder, mifas: [...folder.mifas, ...added] };
  });
  const folderIds = new Set(folders.map((folder) => folder.id));
  const folderNames = new Set(folders.map((folder) => folder.name));
  const addedFolders = published.folders.filter((folder) => !folderIds.has(folder.id) && !folderNames.has(folder.name));
  if (addedFolders.length) changed = true;
  if (!changed) return stored;
  return { ...stored, folders: [...folders, ...addedFolders] };
}
