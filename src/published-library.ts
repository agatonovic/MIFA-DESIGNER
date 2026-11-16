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
                "x": 2216,
                "y": -16,
                "width": 1192,
                "height": 1800,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-8c904x",
                "name": "Supplier",
                "symbol": "rectangle",
                "x": 56,
                "y": 352,
                "width": 248,
                "height": 320,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-9sqd4k",
                "name": "SUPPLIERS",
                "symbol": "rectangle",
                "x": 155,
                "y": 390,
                "width": 123,
                "height": 28,
                "shape": "text",
                "color": "#c5221f",
                "bold": true,
                "font": 23
              },
              {
                "id": "mark-0gp9ew",
                "name": "Supplier",
                "symbol": "rectangle",
                "x": 384,
                "y": 88,
                "width": 688,
                "height": 240,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-1nh6ba",
                "name": "Supplier",
                "symbol": "rectangle",
                "x": 1160,
                "y": 88,
                "width": 976,
                "height": 680,
                "artwork": "process-supplier"
              },
              {
                "id": "mark-1znkls",
                "name": "NOLA",
                "symbol": "rectangle",
                "x": 411,
                "y": 126,
                "width": 64,
                "height": 28,
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
                "x": 403,
                "y": 280,
                "width": 24,
                "height": 24,
                "shape": "ellipse",
                "fill": "#00ff00",
                "weight": 0
              },
              {
                "id": "mark-agt9z7",
                "name": "SMALL BOXES",
                "symbol": "rectangle",
                "x": 435,
                "y": 273,
                "width": 81,
                "height": 13,
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
                "x": 3344,
                "y": 272,
                "width": 48,
                "height": 1504,
                "artwork": "process-production-line-in-batches"
              },
              {
                "id": "mark-hsvcar",
                "name": "RBV SB = 0,44",
                "symbol": "rectangle",
                "x": 435,
                "y": 289,
                "width": 81,
                "height": 13,
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
                "x": 291,
                "y": 208,
                "width": 80,
                "height": 28,
                "artwork": "materials-truck-transfer"
              },
              {
                "id": "mark-0i8g1q",
                "name": "transfert by Truck",
                "symbol": "rectangle",
                "x": 403,
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
                "x": 491,
                "y": 193,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-0y5v5n",
                "name": "man-handled transfert",
                "symbol": "rectangle",
                "x": 499,
                "y": 160,
                "width": 16,
                "height": 24,
                "artwork": "materials-man-transfer"
              },
              {
                "id": "mark-oxunpy",
                "name": "Visual Information Flow",
                "symbol": "rectangle",
                "x": 515,
                "y": 144,
                "width": 32,
                "height": 11,
                "artwork": "information-visual-information-flow"
              },
              {
                "id": "mark-li8djf",
                "name": "Controlled inventory: Big COntainers empty",
                "symbol": "rectangle",
                "x": 571,
                "y": 183,
                "width": 56,
                "height": 26,
                "artwork": "inventories-controlled-inventory-big-containers-empty",
                "flip": true
              },
              {
                "id": "mark-nymkn9",
                "name": "Controlled inventory: Big COntainers empty",
                "symbol": "rectangle",
                "x": 571,
                "y": 209,
                "width": 56,
                "height": 26,
                "artwork": "inventories-controlled-inventory-big-containers-empty",
                "flip": true
              },
              {
                "id": "mark-bi6gmf",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 576,
                "y": 187,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-71hlhj",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 602,
                "y": 187,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-atttv8",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 603,
                "y": 216,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-t5h7up",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 587,
                "y": 153,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-hn1x5x",
                "name": "",
                "symbol": "rectangle",
                "x": 659,
                "y": 232,
                "width": 88,
                "height": 80,
                "shape": "rectangle"
              },
              {
                "id": "mark-tv6c21",
                "name": "",
                "symbol": "rectangle",
                "x": 659,
                "y": 136,
                "width": 88,
                "height": 80,
                "shape": "rectangle"
              },
              {
                "id": "mark-v8t3hn",
                "name": "REPACKING",
                "symbol": "rectangle",
                "x": 678,
                "y": 231,
                "width": 53,
                "height": 11,
                "shape": "text",
                "font": 9
              },
              {
                "id": "mark-nbcx27",
                "name": "STOCK SB",
                "symbol": "rectangle",
                "x": 680,
                "y": 136,
                "width": 47,
                "height": 11,
                "shape": "text",
                "font": 9
              },
              {
                "id": "mark-sp8n5t",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 670,
                "y": 160,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-jqouyk",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 694,
                "y": 160,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-yymezu",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 718,
                "y": 160,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-920k01",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 718,
                "y": 184,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-1a4hu6",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 670,
                "y": 184,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-hkc15z",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 694,
                "y": 184,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-t2bqs3",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 717,
                "y": 283,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-ul5awm",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 672,
                "y": 283,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-ws7pbk",
                "name": "man-handled transfert",
                "symbol": "rectangle",
                "x": 694,
                "y": 256,
                "width": 16,
                "height": 24,
                "artwork": "materials-man-transfer"
              },
              {
                "id": "mark-wn85a8",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 755,
                "y": 281,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-jhs7te",
                "name": "Controlled inventory: Small Boxes empty",
                "symbol": "rectangle",
                "x": 776,
                "y": 136,
                "width": 66,
                "height": 80,
                "artwork": "inventories-controlled-inventory-small-boxes-empty"
              },
              {
                "id": "mark-ta38dv",
                "name": "transfert by Truck",
                "symbol": "rectangle",
                "x": 968,
                "y": 144,
                "width": 80,
                "height": 28,
                "artwork": "materials-truck-transfer"
              },
              {
                "id": "mark-vbedl4",
                "name": "transfert by Truck",
                "symbol": "rectangle",
                "x": 968,
                "y": 192,
                "width": 80,
                "height": 28,
                "artwork": "materials-truck-transfer"
              },
              {
                "id": "mark-r01kyo",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 864,
                "y": 128,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-ib8vs4",
                "name": "Small Boxes delivered by Forklift empty",
                "symbol": "rectangle",
                "x": 868,
                "y": 177,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-empty"
              },
              {
                "id": "mark-vmoo9t",
                "name": "SIT WAREHOUSE (MAF + MEP)",
                "symbol": "rectangle",
                "x": 1192,
                "y": 128,
                "width": 330,
                "height": 28,
                "shape": "text",
                "color": "#c5221f",
                "align": "left",
                "bold": true,
                "font": 23
              },
              {
                "id": "mark-hco5t6",
                "name": "transfert by Truck",
                "symbol": "rectangle",
                "x": 1200,
                "y": 274,
                "width": 80,
                "height": 28,
                "artwork": "materials-truck-transfer",
                "flip": true
              },
              {
                "id": "mark-battxc",
                "name": "Controlled inventory: Big COntainers empty",
                "symbol": "rectangle",
                "x": 1368,
                "y": 276,
                "width": 56,
                "height": 26,
                "artwork": "inventories-controlled-inventory-big-containers-empty",
                "flip": true
              },
              {
                "id": "mark-29dbth",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1400,
                "y": 284,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-hhzhkk",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1400,
                "y": 253,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-274ivz",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1373,
                "y": 253,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-zyyknu",
                "name": "Controlled inventory: Big COntainers empty",
                "symbol": "rectangle",
                "x": 1368,
                "y": 250,
                "width": 56,
                "height": 26,
                "artwork": "inventories-controlled-inventory-big-containers-empty",
                "flip": true
              },
              {
                "id": "mark-zin6jv",
                "name": "Visual Information Flow",
                "symbol": "rectangle",
                "x": 1312,
                "y": 208,
                "width": 32,
                "height": 11,
                "artwork": "information-visual-information-flow"
              },
              {
                "id": "mark-7fkyux",
                "name": "man-handled transfert",
                "symbol": "rectangle",
                "x": 1296,
                "y": 224,
                "width": 16,
                "height": 24,
                "artwork": "materials-man-transfer"
              },
              {
                "id": "mark-y9v8ae",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 1289,
                "y": 257,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-9b48pb",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1572,
                "y": 339,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-c01t6n",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1521,
                "y": 339,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-t9v3rm",
                "name": "",
                "symbol": "rectangle",
                "x": 1512,
                "y": 288,
                "width": 88,
                "height": 80,
                "shape": "rectangle"
              },
              {
                "id": "mark-9g40ox",
                "name": "man-handled transfert",
                "symbol": "rectangle",
                "x": 1548,
                "y": 312,
                "width": 16,
                "height": 24,
                "artwork": "materials-man-transfer"
              },
              {
                "id": "mark-xo91ta",
                "name": "REPACKING",
                "symbol": "rectangle",
                "x": 1530,
                "y": 288,
                "width": 53,
                "height": 11,
                "shape": "text",
                "font": 9
              },
              {
                "id": "mark-644g28",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 1432,
                "y": 277,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-fhlrpd",
                "name": "",
                "symbol": "rectangle",
                "x": 1648,
                "y": 200,
                "width": 88,
                "height": 128,
                "shape": "rectangle"
              },
              {
                "id": "mark-262b6f",
                "name": "STOCK SB",
                "symbol": "rectangle",
                "x": 1672,
                "y": 200,
                "width": 47,
                "height": 11,
                "shape": "text",
                "font": 9
              },
              {
                "id": "mark-bpz0df",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1659,
                "y": 224,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-jsx821",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1683,
                "y": 224,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-jrhsiz",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1707,
                "y": 224,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-cg5a7a",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1707,
                "y": 248,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-c04zyz",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1659,
                "y": 248,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-mxbpep",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1683,
                "y": 248,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-vbsr1e",
                "name": "NOT HO",
                "symbol": "rectangle",
                "x": 1443,
                "y": 329,
                "width": 37,
                "height": 11,
                "shape": "text",
                "font": 9
              },
              {
                "id": "mark-vs3mc2",
                "name": "HO",
                "symbol": "rectangle",
                "x": 1516,
                "y": 232,
                "width": 14,
                "height": 11,
                "shape": "text",
                "font": 9
              },
              {
                "id": "mark-5kzw6f",
                "name": "HO",
                "symbol": "rectangle",
                "x": 1623,
                "y": 323,
                "width": 14,
                "height": 11,
                "shape": "text",
                "font": 9
              },
              {
                "id": "mark-va31k5",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1659,
                "y": 272,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-3ksya7",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1683,
                "y": 272,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-trkntz",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1707,
                "y": 272,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-qvrru9",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1707,
                "y": 296,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-i5d3f3",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1659,
                "y": 296,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-mh8chd",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1683,
                "y": 296,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-uuw019",
                "name": "Controlled inventory: Big COntainers empty",
                "symbol": "rectangle",
                "x": 1832,
                "y": 256,
                "width": 56,
                "height": 26,
                "artwork": "inventories-controlled-inventory-big-containers-empty",
                "flip": true
              },
              {
                "id": "mark-koc1qu",
                "name": "Controlled inventory: Big COntainers empty",
                "symbol": "rectangle",
                "x": 1832,
                "y": 288,
                "width": 56,
                "height": 26,
                "artwork": "inventories-controlled-inventory-big-containers-empty",
                "flip": true
              },
              {
                "id": "mark-quvwpi",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1864,
                "y": 296,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-0u31n2",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1864,
                "y": 264,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-foelqa",
                "name": "Small Boxes (Pallet) full",
                "symbol": "rectangle",
                "x": 1837,
                "y": 264,
                "width": 20,
                "height": 19,
                "artwork": "inventories-small-boxes-pallet-full"
              },
              {
                "id": "mark-1w7qqa",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 1752,
                "y": 272,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-luwfps",
                "name": "transfert by Truck",
                "symbol": "rectangle",
                "x": 1984,
                "y": 288,
                "width": 80,
                "height": 28,
                "artwork": "materials-truck-transfer"
              },
              {
                "id": "mark-5con48",
                "name": "Small Boxes delivered by Forklift full",
                "symbol": "rectangle",
                "x": 1904,
                "y": 272,
                "width": 58,
                "height": 23,
                "artwork": "materials-forklift-sb-full"
              },
              {
                "id": "mark-ncxt0i",
                "name": "",
                "symbol": "rectangle",
                "x": 1200,
                "y": 392,
                "width": 24,
                "height": 24,
                "shape": "ellipse",
                "fill": "#00ff00",
                "weight": 0
              },
              {
                "id": "mark-nfw1f4",
                "name": "SMALL BOXES",
                "symbol": "rectangle",
                "x": 1232,
                "y": 384,
                "width": 81,
                "height": 13,
                "shape": "text",
                "color": "#c5221f",
                "align": "left",
                "bold": true,
                "font": 11
              },
              {
                "id": "mark-zjwpau",
                "name": "RBV SB = 0,44",
                "symbol": "rectangle",
                "x": 1232,
                "y": 400,
                "width": 81,
                "height": 13,
                "shape": "text",
                "color": "#c5221f",
                "align": "left",
                "bold": true,
                "font": 11
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
                    "x": 360,
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
              },
              "link-4v6hw4": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "n",
                  "at": 716
                },
                "to": {
                  "side": "s",
                  "at": 716
                },
                "shaped": true
              },
              "link-fk5ew9": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 222
                },
                "to": {
                  "side": "w",
                  "at": 222
                },
                "shaped": true
              },
              "link-nsm9ln": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 291.5
                },
                "to": {
                  "side": "w",
                  "at": 292.5
                },
                "corners": [
                  {
                    "x": 692,
                    "y": 292.5
                  }
                ],
                "shaped": true
              },
              "link-nicmbu": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 158
                },
                "to": {
                  "side": "w",
                  "at": 158
                },
                "shaped": true
              },
              "link-ccwjvt": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 272
                },
                "to": {
                  "side": "w",
                  "at": 176
                },
                "corners": [
                  {
                    "x": 752,
                    "y": 272
                  },
                  {
                    "x": 752,
                    "y": 176
                  }
                ],
                "shaped": true
              },
              "link-wqf2t2": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 206
                },
                "to": {
                  "side": "w",
                  "at": 206
                },
                "shaped": true
              },
              "link-550etm": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 288
                },
                "to": {
                  "side": "w",
                  "at": 288
                },
                "corners": [
                  {
                    "x": 1344,
                    "y": 288
                  },
                  {
                    "x": 1344,
                    "y": 288
                  }
                ],
                "shaped": true
              },
              "link-5p11ht": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 348.5
                },
                "to": {
                  "side": "w",
                  "at": 348.5
                },
                "shaped": true
              },
              "link-2dvj2z": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "s",
                  "at": 1416
                },
                "to": {
                  "side": "w",
                  "at": 350
                },
                "corners": [
                  {
                    "x": 1416,
                    "y": 350
                  }
                ],
                "shaped": true
              },
              "link-v0b4wn": {
                "x": 0,
                "y": 0,
                "shaped": true,
                "from": {
                  "side": "e",
                  "at": 263
                },
                "to": {
                  "side": "w",
                  "at": 255
                },
                "corners": [
                  {
                    "x": 1424,
                    "y": 255
                  }
                ]
              },
              "link-jsz3s5": {
                "x": 0,
                "y": 0,
                "from": {
                  "side": "e",
                  "at": 344
                },
                "to": {
                  "side": "s",
                  "at": 1688
                },
                "corners": [
                  {
                    "x": 1688,
                    "y": 344
                  }
                ],
                "shaped": true
              },
              "link-qks78j": {
                "x": 0,
                "y": 0,
                "shaped": true,
                "from": {
                  "side": "e",
                  "at": 302
                },
                "to": {
                  "side": "w",
                  "at": 302
                }
              }
            },
            "strokes": {
              "link-nsm9ln": {
                "color": "#202124",
                "dash": "",
                "arrow": "end"
              }
            },
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
              },
              {
                "id": "link-fk5ew9",
                "from": "mark-0i8g1q",
                "to": "mark-nymkn9",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-nsm9ln",
                "from": "mark-ul5awm",
                "to": "mark-t2bqs3",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-nicmbu",
                "from": "mark-jhs7te",
                "to": "mark-ta38dv",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-wqf2t2",
                "from": "mark-jhs7te",
                "to": "mark-vbedl4",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-nd63e5",
                "from": "mark-0gp9ew",
                "to": "mark-1nh6ba",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-ccwjvt",
                "from": "mark-hn1x5x",
                "to": "mark-jhs7te",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-550etm",
                "from": "mark-hco5t6",
                "to": "mark-battxc",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-5p11ht",
                "from": "mark-c01t6n",
                "to": "mark-9b48pb",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-2dvj2z",
                "from": "mark-battxc",
                "to": "mark-t9v3rm",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-v0b4wn",
                "from": "mark-zyyknu",
                "to": "mark-fhlrpd",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-jsz3s5",
                "from": "mark-t9v3rm",
                "to": "mark-fhlrpd",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-tdarhb",
                "from": "mark-fhlrpd",
                "to": "mark-koc1qu",
                "kind": "material",
                "label": ""
              },
              {
                "id": "link-qks78j",
                "from": "mark-koc1qu",
                "to": "mark-luwfps",
                "kind": "material",
                "label": ""
              }
            ],
            "stack": {
              "back": [
                "mark-1nh6ba",
                "mark-t9v3rm",
                "mark-zyyknu",
                "mark-0gp9ew",
                "mark-hn1x5x"
              ],
              "front": []
            },
            "icons": {},
            "poses": {},
            "canvas": {
              "x": 0,
              "y": -40,
              "width": 3424,
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

/** Bump a sheet when the copy already saved in a browser should be replaced once. */
const SHIPPED_REVISION: Record<string, number> = {
  "mifa-ga-melfi": 2,
};

export const SHIPPED_KEY = "mifa.shipped.v1";

export function readShippedRevisions(raw: string | null): Record<string, number> {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
  } catch {
    return {};
  }
}

/** Replace a shipped sheet once, then leave later edits in this browser alone. */
export function applyShippedUpdates(stored: Archive, seen: Record<string, number>): { archive: Archive; seen: Record<string, number> } {
  const published = publishedLibrary();
  const byId = new Map(published.folders.flatMap((folder) => folder.mifas.map((mifa) => [mifa.id, mifa] as const)));
  const nextSeen = { ...seen };
  let changed = false;
  const folders = stored.folders.map((folder) => {
    let folderChanged = false;
    const mifas = folder.mifas.map((mifa) => {
      const revision = SHIPPED_REVISION[mifa.id];
      const shipped = byId.get(mifa.id);
      if (!revision || !shipped || (nextSeen[mifa.id] ?? 0) >= revision) return mifa;
      nextSeen[mifa.id] = revision;
      if (JSON.stringify(mifa.document) === JSON.stringify(shipped.document)) return mifa;
      folderChanged = true;
      changed = true;
      return { ...mifa, document: shipped.document };
    });
    return folderChanged ? { ...folder, mifas } : folder;
  });
  for (const [id, revision] of Object.entries(SHIPPED_REVISION)) {
    if ((nextSeen[id] ?? 0) < revision) nextSeen[id] = revision;
  }
  return { archive: changed ? { ...stored, folders } : stored, seen: nextSeen };
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
