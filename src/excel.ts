import * as XLSX from "xlsx";
import { FLOW_KINDS, SYMBOLS, blankFlow, emptyProject, type DrawnLink, type Flow, type FlowKind, type LineBend, type MifaDocument, type ProjectInfo, type Side, type SymbolId } from "./document";

export const FLOW_COLUMNS: { key: keyof Flow; header: string; short: string }[] = [
  { key: "flowNumber", header: "Flow number", short: "#" },
  { key: "building", header: "Building", short: "Building" },
  { key: "packaging", header: "Packaging type", short: "Pack" },
  { key: "supplier", header: "Supplier", short: "Supplier" },
  { key: "direct", header: "Direct flow (y/n)", short: "Direct" },
  { key: "dock", header: "Inbound dock number", short: "Dock" },
  { key: "transportTruck", header: "Way of transport (truck-> unloading buffer)", short: "Truck" },
  { key: "unloadingBuffer", header: "Unloading buffer (y/n)", short: "Buffer?" },
  { key: "bufferNumber", header: "Unloading buffer number", short: "Buffer" },
  { key: "transportToWarehouse", header: "Way of transport (unloading buffer-> warehouse)", short: "To WH" },
  { key: "warehouse", header: "Warehouse number", short: "WH" },
  { key: "kitting", header: "Kitting (y/n)", short: "Kit?" },
  { key: "kitNumber", header: "Kit number", short: "Kit" },
  { key: "transportToKitting", header: "Way of transport (warehouse-> kitting)", short: "To kit" },
  { key: "sequencing", header: "Sequencing (y/n)", short: "Seq?" },
  { key: "sequencingNumber", header: "Sequencing number", short: "Seq" },
  { key: "transportToSequencing", header: "Way of transport (warehouse-> sequencing)", short: "To seq" },
  { key: "transportKitToLine", header: "Way of transport (kitting-> production line)", short: "Kit to line" },
  { key: "transportSeqToLine", header: "Way of transport (sequencing-> production line)", short: "Seq to line" },
  { key: "productionLine", header: "Production line", short: "Line" },
  { key: "emptiesFromLine", header: "Way of transport empties (line-> empties)", short: "Line empty" },
  { key: "emptiesFromSequencing", header: "Way of transport empties (sequencing-> empties)", short: "Seq empty" },
  { key: "emptiesFromKitting", header: "Way of transport empties (kitting-> empties)", short: "Kit empty" },
  { key: "emptiesStore", header: "Empties storage", short: "Empty store" },
  { key: "emptiesDock", header: "Dock for loading empties", short: "Empty dock" },
  { key: "trigger", header: "Information trigger", short: "Trigger" },
  { key: "system", header: "Information system", short: "System" },
];

export const FLOW_GROUPS = [
  { name: "Flow", count: 5 },
  { name: "Inbound", count: 6 },
  { name: "Preparation", count: 8 },
  { name: "Line", count: 1 },
  { name: "Empties", count: 5 },
  { name: "Information", count: 2 },
];

const ALIASES: [keyof Flow, string[]][] = [
  ["emptiesFromSequencing", ["way of transport empties sequencing", "empties sequencing"]],
  ["emptiesFromKitting", ["way of transport empties kitting", "empties kitting"]],
  ["emptiesFromLine", ["way of transport empties production", "way of transport empties line", "empties line"]],
  ["emptiesDock", ["dock for loading empties", "empties dock"]],
  ["emptiesStore", ["empties storage", "empties store"]],
  ["transportToSequencing", ["way of transport warehouse sequencing"]],
  ["transportSeqToLine", ["way of transport sequencing"]],
  ["transportToKitting", ["way of transport warehouse kitting"]],
  ["transportKitToLine", ["way of transport kitting"]],
  ["transportToWarehouse", ["way of transport unloading"]],
  ["transportTruck", ["way of transport truck"]],
  ["bufferNumber", ["unloading buffer number", "buffer number"]],
  ["unloadingBuffer", ["unloading buffer"]],
  ["sequencingNumber", ["sequencing number"]],
  ["kitNumber", ["kit number"]],
  ["sequencing", ["sequencing"]],
  ["kitting", ["kitting"]],
  ["warehouse", ["warehouse"]],
  ["dock", ["inbound dock", "inboud dock", "dock number"]],
  ["direct", ["direct flow", "direct"]],
  ["packaging", ["packaging"]],
  ["building", ["building"]],
  ["supplier", ["supplier"]],
  ["productionLine", ["production line"]],
  ["trigger", ["information trigger", "trigger"]],
  ["system", ["information system", "system"]],
  ["flowNumber", ["flow number"]],
];

const PROJECT_FIELDS: { key: keyof ProjectInfo; header: string }[] = [
  { key: "name", header: "Name" },
  { key: "plant", header: "Plant" },
  { key: "shop", header: "Shop" },
  { key: "scenario", header: "Scenario" },
  { key: "rate", header: "Rate" },
  { key: "shifts", header: "Shifts" },
  { key: "perDay", header: "Vehicles per day" },
  { key: "diversity", header: "Diversity" },
  { key: "updated", header: "Updated" },
];

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchKey(header: string): keyof Flow | null {
  const name = norm(header);
  if (!name) return null;
  for (const [key, aliases] of ALIASES) {
    if (aliases.some((alias) => name === alias || name.includes(alias))) return key;
  }
  return null;
}

function asText(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asBool(value: unknown) {
  const text = asText(value).toLowerCase();
  return text === "y" || text === "yes" || text === "true" || text === "1";
}

function asPackaging(value: unknown): Flow["packaging"] {
  const text = asText(value).toUpperCase();
  if (text === "SB" || text === "PC" || text.includes("SMALL")) return "SB";
  if (text === "LV" || text === "BC" || text === "GV" || text.includes("LARGE") || text.includes("BIG")) return "LV";
  return "";
}

function sheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, { header: 1, raw: false, defval: "" });
}

function findFlowsSheet(book: XLSX.WorkBook) {
  const named = book.Sheets.Flows ?? book.Sheets.flows;
  if (named) return named;
  for (const name of book.SheetNames) {
    const rows = sheetRows(book.Sheets[name]);
    const hit = rows.slice(0, 6).some((row) => row.some((cell) => matchKey(asText(cell)) === "supplier" || matchKey(asText(cell)) === "flowNumber"));
    if (hit) return book.Sheets[name];
  }
  return null;
}

export function workbookToDocument(book: XLSX.WorkBook): MifaDocument {
  const flowsSheet = findFlowsSheet(book);
  if (!flowsSheet) throw new Error("The workbook has no flow register. Expected a sheet with a Supplier or Flow number column.");
  const rows = sheetRows(flowsSheet);
  const headerIndex = rows.findIndex((row) => row.some((cell) => matchKey(asText(cell))));
  if (headerIndex < 0) throw new Error("Could not find a header row in the flow register.");
  const columns = rows[headerIndex].map((cell) => matchKey(asText(cell)));
  const flows: Flow[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    if (row.every((cell) => asText(cell) === "")) continue;
    const flow = blankFlow(String(flows.length + 1));
    columns.forEach((key, index) => {
      if (!key) return;
      const value = row[index];
      if (key === "direct" || key === "unloadingBuffer" || key === "kitting" || key === "sequencing") {
        flow[key] = asBool(value);
      } else if (key === "packaging") {
        flow.packaging = asPackaging(value);
      } else {
        flow[key] = asText(value);
      }
    });
    if (!flow.flowNumber) flow.flowNumber = String(flows.length + 1);
    flows.push(flow);
  }

  const project = emptyProject();
  const projectSheet = book.Sheets.Project ?? book.Sheets.project;
  if (projectSheet) {
    for (const row of sheetRows(projectSheet)) {
      const field = norm(asText(row[0]));
      const match = PROJECT_FIELDS.find((item) => norm(item.header) === field || item.key.toLowerCase() === field);
      if (match) project[match.key] = asText(row[1]);
    }
  }
  if (!project.name) project.name = "Imported MIFA";

  const positions: MifaDocument["positions"] = {};
  const glyphs: Record<string, SymbolId> = {};
  const sizes: NonNullable<MifaDocument["sizes"]> = {};
  const symbolIds = new Set<string>(SYMBOLS.map((item) => item.id));
  const layoutSheet = book.Sheets.Layout ?? book.Sheets.layout;
  if (layoutSheet) {
    for (const row of sheetRows(layoutSheet).slice(1)) {
      const id = asText(row[0]);
      const x = Number(row[1]);
      const y = Number(row[2]);
      const symbol = asText(row[3]);
      if (id && Number.isFinite(x) && Number.isFinite(y)) positions[id] = { x, y };
      if (id && symbolIds.has(symbol)) glyphs[id] = symbol as SymbolId;
      const width = Number(row[4]);
      const height = Number(row[5]);
      if (id && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) sizes[id] = { width, height };
    }
  }
  const marks: MifaDocument["marks"] = [];
  const symbolSheet = book.Sheets.Symbols ?? book.Sheets.symbols;
  if (symbolSheet) {
    for (const row of sheetRows(symbolSheet).slice(1)) {
      const id = asText(row[0]);
      const name = asText(row[1]);
      const symbol = asText(row[2]);
      const x = Number(row[3]);
      const y = Number(row[4]);
      const width = Number(row[5]);
      const height = Number(row[6]);
      const shape = asText(row[7]);
      if (id && name && symbolIds.has(symbol) && Number.isFinite(x) && Number.isFinite(y)) {
        marks.push({
          id,
          name,
          symbol: symbol as SymbolId,
          x,
          y,
          width: Number.isFinite(width) && width > 0 ? width : undefined,
          height: Number.isFinite(height) && height > 0 ? height : undefined,
          shape: shape === "text" || shape === "rectangle" || shape === "ellipse" ? shape : undefined,
        });
      }
    }
  }
  const bends: NonNullable<MifaDocument["bends"]> = {};
  const routeSheet = book.Sheets.Routes ?? book.Sheets.routes;
  if (routeSheet) {
    for (const row of sheetRows(routeSheet).slice(1)) {
      const id = asText(row[0]);
      const x = Number(row[1]);
      const y = Number(row[2]);
      const part = asText(row[3]);
      const side = asText(row[4]);
      if (!id || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      const bend: LineBend = bends[id] ?? { x: 0, y: 0 };
      if (part === "corner") bend.corners = [...(bend.corners ?? []), { x, y }];
      else if ((part === "from" || part === "to") && (side === "n" || side === "e" || side === "s" || side === "w")) bend[part] = { side: side as Side, at: x };
      else {
        bend.x = x;
        bend.y = y;
      }
      bends[id] = bend;
    }
  }
  const strokes: NonNullable<MifaDocument["strokes"]> = {};
  const strokeSheet = book.Sheets.Strokes ?? book.Sheets.strokes;
  if (strokeSheet) {
    for (const row of sheetRows(strokeSheet).slice(1)) {
      const id = asText(row[0]);
      const color = asText(row[1]);
      const dash = asText(row[2]);
      const arrow = asText(row[3]);
      if (id && color) strokes[id] = { color, dash, ...(arrow === "end" || arrow === "start" || arrow === "both" || arrow === "none" ? { arrow } : {}) };
    }
  }
  const kinds = new Set<string>(FLOW_KINDS.map((item) => item.id));
  const links: DrawnLink[] = [];
  const linkSheet = book.Sheets.Links ?? book.Sheets.links;
  if (linkSheet) {
    for (const row of sheetRows(linkSheet).slice(1)) {
      const id = asText(row[0]);
      const from = asText(row[1]);
      const to = asText(row[2]);
      const kind = asText(row[3]);
      if (id && from && to && kinds.has(kind)) links.push({ id, from, to, kind: kind as FlowKind, label: asText(row[4]) });
    }
  }
  const stack = { back: [] as string[], front: [] as string[] };
  const stackSheet = book.Sheets.Stack ?? book.Sheets.stack;
  if (stackSheet) {
    for (const row of sheetRows(stackSheet).slice(1)) {
      const layer = asText(row[0]);
      const id = asText(row[1]);
      if (!id) continue;
      if (layer === "back") stack.back.push(id);
      if (layer === "front") stack.front.push(id);
    }
  }
  return { project, flows, positions, glyphs, marks, sizes, bends, strokes, links, stack };
}

export function documentToWorkbook(doc: MifaDocument) {
  const projectRows = [["Field", "Value"], ...PROJECT_FIELDS.map((field) => [field.header, doc.project[field.key]])];
  const flowRows = [
    FLOW_COLUMNS.map((column) => column.header),
    ...doc.flows.map((flow) =>
      FLOW_COLUMNS.map((column) => {
        const value = flow[column.key];
        if (typeof value === "boolean") return value ? "y" : "n";
        return value;
      }),
    ),
  ];
  const layoutRows = [
    ["Node", "X", "Y", "Symbol", "W", "H"],
    ...[...new Set([...Object.keys(doc.positions), ...Object.keys(doc.sizes ?? {})])].map((id) => {
      const point = doc.positions[id];
      const size = doc.sizes?.[id];
      return [id, point?.x ?? "", point?.y ?? "", doc.glyphs?.[id] ?? "", size?.width ?? "", size?.height ?? ""];
    }),
  ];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(projectRows), "Project");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(flowRows), "Flows");
  const symbolRows = [
    ["Id", "Name", "Symbol", "X", "Y", "W", "H", "Shape"],
    ...(doc.marks ?? []).map((mark) => [mark.id, mark.name, mark.symbol, mark.x, mark.y, mark.width ?? "", mark.height ?? "", mark.shape ?? ""]),
  ];
  const routeRows = [
    ["Edge", "X", "Y", "Part", "Side"],
    ...Object.entries(doc.bends ?? {}).flatMap(([id, bend]) => [
      [id, bend.x, bend.y, "offset", ""],
      ...(bend.from ? [[id, bend.from.at, 0, "from", bend.from.side]] : []),
      ...(bend.to ? [[id, bend.to.at, 0, "to", bend.to.side]] : []),
      ...(bend.corners ?? []).map((corner) => [id, corner.x, corner.y, "corner", ""]),
    ]),
  ];
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(layoutRows), "Layout");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(symbolRows), "Symbols");
  const strokeRows = [["Edge", "Color", "Dash", "Arrow"], ...Object.entries(doc.strokes ?? {}).map(([id, style]) => [id, style.color, style.dash, style.arrow ?? ""])];
  const linkRows = [["Id", "From", "To", "Kind", "Label"], ...(doc.links ?? []).map((link) => [link.id, link.from, link.to, link.kind, link.label])];
  const stackRows = [
    ["Layer", "Id"],
    ...(doc.stack?.back ?? []).map((id) => ["back", id]),
    ...(doc.stack?.front ?? []).map((id) => ["front", id]),
  ];
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(routeRows), "Routes");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(strokeRows), "Strokes");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(linkRows), "Links");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(stackRows), "Stack");
  return book;
}

export function workbookFileName(doc: MifaDocument) {
  const base = doc.project.name.trim() || "MIFA";
  return `${base.replace(/[^\w.-]+/g, "_")}.xlsx`;
}

export function downloadWorkbook(doc: MifaDocument) {
  const book = documentToWorkbook(doc);
  XLSX.writeFile(book, workbookFileName(doc));
}

export function readWorkbook(data: ArrayBuffer) {
  return workbookToDocument(XLSX.read(data, { type: "array" }));
}
