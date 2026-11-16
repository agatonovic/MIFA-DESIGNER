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

/** Add shipped factories that this browser does not already have. An existing sheet is left as it is. */
export function adoptPublished(stored: Archive): Archive {
  const published = publishedLibrary();
  const ids = new Set(stored.folders.map((folder) => folder.id));
  const names = new Set(stored.folders.map((folder) => folder.name));
  const added = published.folders.filter((folder) => !ids.has(folder.id) && !names.has(folder.name));
  if (!added.length) return stored;
  return { ...stored, folders: [...stored.folders, ...added] };
}
