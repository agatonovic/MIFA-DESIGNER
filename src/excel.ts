import * as XLSX from "xlsx";
import { blankFlow, emptyProject, type Flow, type MifaDocument, type ProjectInfo } from "./document";

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
  const layoutSheet = book.Sheets.Layout ?? book.Sheets.layout;
  if (layoutSheet) {
    for (const row of sheetRows(layoutSheet).slice(1)) {
      const id = asText(row[0]);
      const x = Number(row[1]);
      const y = Number(row[2]);
      if (id && Number.isFinite(x) && Number.isFinite(y)) positions[id] = { x, y };
    }
  }
  return { project, flows, positions };
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
  const layoutRows = [["Node", "X", "Y"], ...Object.entries(doc.positions).map(([id, point]) => [id, point.x, point.y])];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(projectRows), "Project");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(flowRows), "Flows");
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(layoutRows), "Layout");
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
