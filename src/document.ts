import { ART_BY_ID } from "./symbol-art";

export const SYMBOLS = [
  { id: "rectangle", label: "Rectangle" },
  { id: "supplier", label: "Supplier" },
  { id: "dock", label: "Dock" },
  { id: "warehouse", label: "Warehouse" },
  { id: "supermarket", label: "Supermarket" },
  { id: "kitting", label: "Kitting" },
  { id: "sequencing", label: "Sequencing" },
  { id: "production", label: "Production" },
  { id: "stock", label: "Stock" },
  { id: "it", label: "IT system" },
  { id: "empty", label: "Empties" },
] as const;

export type SymbolId = (typeof SYMBOLS)[number]["id"];

export const FLOW_KINDS = [
  { id: "material", label: "Material" },
  { id: "information", label: "Information" },
  { id: "empty", label: "Empty return" },
] as const;

export type FlowKind = (typeof FLOW_KINDS)[number]["id"];

export type NodeKind =
  | "supplier"
  | "dock"
  | "buffer"
  | "warehouse"
  | "kitting"
  | "sequencing"
  | "line"
  | "empties"
  | "emptiesDock"
  | "it";

export type Flow = {
  id: string;
  flowNumber: string;
  building: string;
  packaging: "" | "SB" | "LV";
  supplier: string;
  direct: boolean;
  dock: string;
  transportTruck: string;
  unloadingBuffer: boolean;
  bufferNumber: string;
  transportToWarehouse: string;
  warehouse: string;
  kitting: boolean;
  kitNumber: string;
  transportToKitting: string;
  sequencing: boolean;
  sequencingNumber: string;
  transportToSequencing: string;
  transportKitToLine: string;
  transportSeqToLine: string;
  productionLine: string;
  emptiesFromLine: string;
  emptiesFromSequencing: string;
  emptiesFromKitting: string;
  emptiesStore: string;
  emptiesDock: string;
  trigger: string;
  system: string;
};

export type ProjectInfo = {
  name: string;
  plant: string;
  shop: string;
  scenario: string;
  rate: string;
  shifts: string;
  perDay: string;
  diversity: string;
  updated: string;
};

export type MarkShape = "text" | "rectangle" | "ellipse";

export type QuarterTurn = 0 | 90 | 180 | 270;

export type TextAlign = "left" | "center" | "right";

export type Mark = {
  id: string;
  name: string;
  symbol: SymbolId;
  x: number;
  y: number;
  width?: number;
  height?: number;
  shape?: MarkShape;
  /** Id of a traced drawing from the symbol folders. */
  artwork?: string;
  /** Mirror left to right. */
  flip?: boolean;
  /** Clockwise quarter turns. */
  turn?: QuarterTurn;
  color?: string;
  align?: TextAlign;
  bold?: boolean;
  /** Type size in pixels. The frame around the words stays as it is. */
  font?: number;
  /** Shape fill. Omitted is white. "none" leaves the inside empty. */
  fill?: string;
  /** Shape border color. Omitted is black. */
  border?: string;
  /** Shape border thickness in pixels. Omitted is 1. Zero hides the border. */
  weight?: number;
};

export type ArrowEnds = "end" | "start" | "both" | "none";

/** Stored end that puts the arrowhead on the right. A vertical line keeps the end of its path. */
export function arrowTowardScreen(points: { x: number; y: number }[]): "end" | "start" {
  const start = points[0];
  const end = points[points.length - 1];
  if (!start || !end) return "end";
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < Math.abs(dy)) return "end";
  return dx >= 0 ? "end" : "start";
}

/** Toolbar value for a stored arrow, so the highlighted icon matches the head on the sheet. */
export function arrowOnScreen(stored: ArrowEnds, toward: "end" | "start"): ArrowEnds {
  if (stored === "none" || stored === "both" || toward === "end") return stored;
  return stored === "end" ? "start" : "end";
}

export type StrokeStyle = { color: string; dash: string; arrow?: ArrowEnds };

export type DrawnLink = {
  id: string;
  from: string;
  to: string;
  kind: FlowKind;
  label: string;
};

export type BoxSize = { width: number; height: number };

export type LineIcon = {
  x: number;
  y: number;
  width: number;
  height: number;
  flip?: boolean;
  turn?: QuarterTurn;
  /** Dragged off the line. Otherwise it stays centered on the line as the symbols move. */
  placed?: boolean;
};

export type StackOrder = { back: string[]; front: string[] };

export type MifaDocument = {
  project: ProjectInfo;
  flows: Flow[];
  positions: Record<string, { x: number; y: number }>;
  glyphs?: Record<string, SymbolId>;
  marks?: Mark[];
  sizes?: Record<string, BoxSize>;
  bends?: Record<string, LineBend>;
  strokes?: Record<string, StrokeStyle>;
  links?: DrawnLink[];
  stack?: StackOrder;
  /** Moved or resized transport icons, keyed by the line and the word that produced them. */
  icons?: Record<string, LineIcon>;
  /** Flip and rotation for symbols that come from the register. */
  poses?: Record<string, { flip?: boolean; turn?: QuarterTurn }>;
  /** Symbols held at the layout center until they are unlocked. */
  locks?: Record<string, true>;
  /** Page origin and size. The origin moves when the sheet grows to the left or upward. */
  canvas?: SheetBox;
};

export type Side = "n" | "e" | "s" | "w";

export type LinePort = { side: Side; at: number };

export type LineBend = {
  x: number;
  y: number;
  from?: LinePort;
  to?: LinePort;
  corners?: { x: number; y: number }[];
  /** Drawn from the stored corners. The automatic router does not add points back. */
  shaped?: boolean;
};

export function paintLayers(ids: string[], stack?: StackOrder) {
  const known = new Set(ids);
  const back = (stack?.back ?? []).filter((id) => known.has(id));
  const pinned = (stack?.front ?? []).filter((id) => known.has(id));
  const placed = new Set([...back, ...pinned]);
  return { back, front: [...ids.filter((id) => !placed.has(id)), ...pinned] };
}

export function arrange(ids: string[], stack: StackOrder | undefined, id: string, where: "front" | "back"): StackOrder {
  const known = new Set(ids);
  const back = (stack?.back ?? []).filter((item) => known.has(item) && item !== id);
  const front = (stack?.front ?? []).filter((item) => known.has(item) && item !== id);
  if (where === "back") return { back: [id, ...back], front };
  return { back, front: [...front, id] };
}

export type SheetNode = {
  id: string;
  kind: NodeKind;
  symbol: SymbolId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  flowIds: string[];
};

export type SheetEdge = {
  id: string;
  from: string;
  to: string;
  kind: FlowKind;
  label: string;
  flowIds: string[];
};

export type Sheet = {
  nodes: SheetNode[];
  edges: SheetEdge[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export const SHEET_WIDTH = 2800;
export const SHEET_HEIGHT = 1800;
export const MIN_SHEET_WIDTH = 640;
export const MIN_SHEET_HEIGHT = 480;

export type SheetBox = { x: number; y: number; width: number; height: number };

/** The page the drawing sits on. Missing means the original sheet. */
export function sheetBox(doc?: { canvas?: Partial<SheetBox> } | null): SheetBox {
  const canvas = doc?.canvas;
  const width = canvas?.width;
  const height = canvas?.height;
  if (typeof width !== "number" || typeof height !== "number" || width < MIN_SHEET_WIDTH || height < MIN_SHEET_HEIGHT) {
    return { x: 0, y: 0, width: SHEET_WIDTH, height: SHEET_HEIGHT };
  }
  return { x: typeof canvas?.x === "number" ? canvas.x : 0, y: typeof canvas?.y === "number" ? canvas.y : 0, width, height };
}

export const SYMBOL_SIZE: Record<SymbolId, { width: number; height: number }> = {
  rectangle: { width: 148, height: 64 },
  supplier: { width: 132, height: 88 },
  dock: { width: 128, height: 76 },
  warehouse: { width: 156, height: 92 },
  supermarket: { width: 156, height: 88 },
  kitting: { width: 132, height: 80 },
  sequencing: { width: 148, height: 80 },
  production: { width: 48, height: 280 },
  stock: { width: 112, height: 88 },
  it: { width: 128, height: 76 },
  empty: { width: 128, height: 76 },
};

const KIND_SYMBOL: Record<NodeKind, SymbolId> = {
  supplier: "supplier",
  dock: "dock",
  buffer: "stock",
  warehouse: "warehouse",
  kitting: "kitting",
  sequencing: "sequencing",
  line: "production",
  empties: "empty",
  emptiesDock: "dock",
  it: "it",
};

const COLUMN: Record<NodeKind, number> = {
  supplier: 0,
  dock: 1,
  buffer: 2,
  warehouse: 3,
  kitting: 4,
  sequencing: 4,
  line: 5,
  empties: 6,
  emptiesDock: 7,
  it: 3,
};

const NODE_FIELD: Record<NodeKind, keyof Flow> = {
  supplier: "supplier",
  dock: "dock",
  buffer: "bufferNumber",
  warehouse: "warehouse",
  kitting: "kitNumber",
  sequencing: "sequencingNumber",
  line: "productionLine",
  empties: "emptiesStore",
  emptiesDock: "emptiesDock",
  it: "system",
};

export function fieldForNode(kind: NodeKind): keyof Flow {
  return NODE_FIELD[kind];
}

const SYMBOL_COLUMN: Partial<Record<keyof Flow, NodeKind>> = {
  supplier: "supplier",
  dock: "dock",
  bufferNumber: "buffer",
  warehouse: "warehouse",
  kitNumber: "kitting",
  sequencingNumber: "sequencing",
  productionLine: "line",
  emptiesStore: "empties",
  emptiesDock: "emptiesDock",
  system: "it",
};

const LINE_COLUMN: Partial<Record<keyof Flow, FlowKind>> = {
  transportTruck: "material",
  transportToWarehouse: "material",
  transportToKitting: "material",
  transportToSequencing: "material",
  transportKitToLine: "material",
  transportSeqToLine: "material",
  emptiesFromLine: "empty",
  emptiesFromSequencing: "empty",
  emptiesFromKitting: "empty",
  trigger: "information",
};

/** A data cell that can be pointed at a symbol, or at a line. */
export function bindTarget(column: keyof Flow): { role: "symbol"; kind: NodeKind } | { role: "line"; kind: FlowKind } | null {
  const symbol = SYMBOL_COLUMN[column];
  if (symbol) return { role: "symbol", kind: symbol };
  const line = LINE_COLUMN[column];
  if (line) return { role: "line", kind: line };
  return null;
}

/** The value a flow cell stores for this symbol. Shared docks and warehouses keep the number only. */
export function symbolValue(node: { id: string; kind: NodeKind; label: string }) {
  const rest = node.id.startsWith(`${node.kind}:`) ? node.id.slice(node.kind.length + 1) : node.label;
  if (node.kind === "buffer" || node.kind === "kitting" || node.kind === "empties") return rest.split(":").pop() || node.label;
  if (node.kind === "supplier" || node.kind === "line" || node.kind === "it") return node.label || rest;
  return rest;
}

/** Point one flow cell at a symbol already on the sheet. Returns nothing when the symbol is the wrong kind. */
export function bindFlowSymbol(doc: MifaDocument, flowId: string, column: keyof Flow, node: { id: string; kind: NodeKind; label: string }): MifaDocument | null {
  if (SYMBOL_COLUMN[column] !== node.kind) return null;
  const value = symbolValue(node);
  return {
    ...doc,
    flows: doc.flows.map((flow) => {
      if (flow.id !== flowId) return flow;
      const next: Flow = { ...flow, [column]: value };
      if (column === "bufferNumber") next.unloadingBuffer = true;
      if (column === "kitNumber" || column === "sequencingNumber") {
        next.direct = false;
        if (column === "kitNumber") next.kitting = true;
        if (column === "sequencingNumber") next.sequencing = true;
      }
      return next;
    }),
  };
}

/** Point one flow cell at a line already on the sheet. The cell keeps that line's name. */
export function bindFlowLine(doc: MifaDocument, flowId: string, column: keyof Flow, edge: { kind: FlowKind; label: string }): MifaDocument | null {
  if (LINE_COLUMN[column] !== edge.kind || !edge.label.trim()) return null;
  return { ...doc, flows: doc.flows.map((flow) => (flow.id === flowId ? { ...flow, [column]: edge.label } : flow)) };
}

export function fieldForConnection(from: NodeKind, to: NodeKind, kind: FlowKind): keyof Flow | null {
  if (kind === "information") return "trigger";
  if (kind === "empty") {
    if (from === "line") return "emptiesFromLine";
    if (from === "kitting") return "emptiesFromKitting";
    if (from === "sequencing") return "emptiesFromSequencing";
    return null;
  }
  if (to === "dock" || to === "buffer") return "transportTruck";
  if (to === "warehouse") return "transportToWarehouse";
  if (to === "kitting") return "transportToKitting";
  if (to === "sequencing") return "transportToSequencing";
  if (to === "line") return from === "sequencing" ? "transportSeqToLine" : "transportKitToLine";
  return null;
}

const TEXT_KEYS = [
  "flowNumber",
  "building",
  "supplier",
  "dock",
  "transportTruck",
  "bufferNumber",
  "transportToWarehouse",
  "warehouse",
  "kitNumber",
  "transportToKitting",
  "sequencingNumber",
  "transportToSequencing",
  "transportKitToLine",
  "transportSeqToLine",
  "productionLine",
  "emptiesFromLine",
  "emptiesFromSequencing",
  "emptiesFromKitting",
  "emptiesStore",
  "emptiesDock",
  "trigger",
  "system",
] as const satisfies readonly (keyof Flow)[];

const BOOL_KEYS = ["direct", "unloadingBuffer", "kitting", "sequencing"] as const satisfies readonly (keyof Flow)[];

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function snap(value: number, grid = 8) {
  return Math.round(value / grid) * grid;
}

export function nextQuarter(turn: QuarterTurn | undefined): QuarterTurn {
  return (((turn ?? 0) + 90) % 360) as QuarterTurn;
}

/** Resize from a handle. A circle keeps both sides equal, down to the given minimum. */
export function resizeBox(
  handle: string,
  origin: { x: number; y: number; width: number; height: number },
  dx: number,
  dy: number,
  options?: { minWidth?: number; minHeight?: number; circle?: boolean },
) {
  const minW = options?.minWidth ?? 40;
  const minH = options?.circle ? minW : (options?.minHeight ?? 40);
  let { x, y, width, height } = origin;
  if (handle.includes("e")) width = origin.width + dx;
  if (handle.includes("s")) height = origin.height + dy;
  if (handle.includes("w")) {
    width = origin.width - dx;
    x = origin.x + dx;
  }
  if (handle.includes("n")) {
    height = origin.height - dy;
    y = origin.y + dy;
  }
  if (width < minW) {
    if (handle.includes("w")) x -= minW - width;
    width = minW;
  }
  if (height < minH) {
    if (handle.includes("n")) y -= minH - height;
    height = minH;
  }
  if (options?.circle) {
    const alongWidth = handle === "e" || handle === "w";
    const alongHeight = handle === "n" || handle === "s";
    const size = alongWidth ? width : alongHeight ? height : Math.abs(width - origin.width) >= Math.abs(height - origin.height) ? width : height;
    const side = Math.max(minW, size);
    if (handle.includes("w")) x = origin.x + origin.width - side;
    else if (alongHeight) x = origin.x + (origin.width - side) / 2;
    else x = origin.x;
    if (handle.includes("n")) y = origin.y + origin.height - side;
    else if (alongWidth) y = origin.y + (origin.height - side) / 2;
    else y = origin.y;
    width = side;
    height = side;
  }
  width = Math.max(minW, snap(width));
  height = options?.circle ? width : Math.max(minH, snap(height));
  if (options?.circle && handle.includes("w")) x = origin.x + origin.width - width;
  if (options?.circle && handle.includes("n")) y = origin.y + origin.height - height;
  return { x: snap(x), y: snap(y), width, height };
}

/** Grow or shrink a box around its center, and keep it on the sheet. */
export function scaledBox(box: { x: number; y: number; width: number; height: number }, factor: number, page: SheetBox = sheetBox()) {
  const width = snap(Math.min(720, Math.max(28, box.width * factor)));
  const height = snap(Math.min(720, Math.max(28, box.height * factor)));
  const x = snap(box.x + (box.width - width) / 2);
  const y = snap(box.y + (box.height - height) / 2);
  return { ...keepOnSheet(x, y, width, height, page), width, height };
}

type SizeBox = { x: number; y: number; width: number; height: number };

/** Keep a typed font size inside the range the sheet can show. */
export function clampFont(value: number) {
  return Math.min(200, Math.max(8, Math.round(value)));
}

/** How large a symbol is, compared with its normal width. 100 is unchanged. */
export function symbolPercent(box: { width: number; height: number }, naturalWidth: number, turn?: QuarterTurn) {
  const along = turn === 90 || turn === 270 ? box.height : box.width;
  if (!(naturalWidth > 0)) return 100;
  return Math.round((along / naturalWidth) * 100);
}

/** Resize a symbol so it is the requested percent of its normal width. */
export function boxForPercent(box: SizeBox, naturalWidth: number, turn: QuarterTurn | undefined, percent: number, page: SheetBox = sheetBox()) {
  const size = Math.min(400, Math.max(10, percent));
  const along = turn === 90 || turn === 270 ? box.height : box.width;
  const factor = along > 0 ? (naturalWidth * (size / 100)) / along : 1;
  return resizeAboutCenter(box, box.width * factor, box.height * factor, page);
}

function resizeAboutCenter(box: SizeBox, width: number, height: number, page: SheetBox) {
  const nextWidth = Math.min(720, Math.max(28, Math.round(width)));
  const nextHeight = Math.min(720, Math.max(28, Math.round(height)));
  const x = box.x + (box.width - nextWidth) / 2;
  const y = box.y + (box.height - nextHeight) / 2;
  return { ...keepOnSheet(x, y, nextWidth, nextHeight, page), width: nextWidth, height: nextHeight };
}

/** Swap the box when a quarter turn changes which side is longer. */
export function quarterBox(box: { x: number; y: number; width: number; height: number }, from: QuarterTurn, to: QuarterTurn, page: SheetBox = sheetBox()) {
  const sideways = (turn: QuarterTurn) => turn === 90 || turn === 270;
  if (sideways(from) === sideways(to)) return box;
  const width = box.height;
  const height = box.width;
  const x = snap(box.x + box.width / 2 - width / 2);
  const y = snap(box.y + box.height / 2 - height / 2);
  return { ...keepOnSheet(x, y, width, height, page), width, height };
}

function keepOnSheet(x: number, y: number, width: number, height: number, page: SheetBox) {
  return {
    x: Math.min(Math.max(page.x, x), Math.max(page.x, page.x + page.width - width)),
    y: Math.min(Math.max(page.y, y), Math.max(page.y, page.y + page.height - height)),
  };
}

function snapDown(value: number) {
  return Math.floor(value / 8) * 8;
}

function snapUp(value: number) {
  return Math.ceil(value / 8) * 8;
}

/** Drag one or two edges. West and north move the origin so the new space appears on that side. */
export function resizeSheet(doc: MifaDocument, edge: string, dx: number, dy: number): MifaDocument {
  const page = sheetBox(doc);
  const bounds = contentBounds(doc);
  let x = page.x;
  let y = page.y;
  let width = page.width;
  let height = page.height;
  if (edge.includes("e")) width += dx;
  if (edge.includes("w")) {
    x += dx;
    width -= dx;
  }
  if (edge.includes("s")) height += dy;
  if (edge.includes("n")) {
    y += dy;
    height -= dy;
  }
  x = snap(x);
  y = snap(y);
  width = Math.max(MIN_SHEET_WIDTH, snap(width));
  height = Math.max(MIN_SHEET_HEIGHT, snap(height));
  if (bounds) {
    x = Math.min(x, snapDown(bounds.left));
    y = Math.min(y, snapDown(bounds.top));
    width = Math.max(width, snapUp(bounds.right) - x, MIN_SHEET_WIDTH);
    height = Math.max(height, snapUp(bounds.bottom) - y, MIN_SHEET_HEIGHT);
  }
  const canvas = { x, y, width, height };
  if (canvas.x === page.x && canvas.y === page.y && canvas.width === page.width && canvas.height === page.height) return doc;
  if (canvas.x === 0 && canvas.y === 0 && canvas.width === SHEET_WIDTH && canvas.height === SHEET_HEIGHT) {
    if (!doc.canvas) return doc;
    const next = { ...doc };
    delete next.canvas;
    return next;
  }
  return { ...doc, canvas };
}

function contentBounds(doc: MifaDocument) {
  const laid = buildSheet(doc);
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  const take = (x: number, y: number, width: number, height: number) => {
    if (x < left) left = x;
    if (y < top) top = y;
    if (x + width > right) right = x + width;
    if (y + height > bottom) bottom = y + height;
  };
  for (const node of laid.nodes) take(node.x, node.y, node.width, node.height);
  for (const mark of doc.marks ?? []) take(mark.x, mark.y, mark.width ?? 40, mark.height ?? 40);
  for (const icon of Object.values(doc.icons ?? {})) take(icon.x, icon.y, icon.width, icon.height);
  for (const bend of Object.values(doc.bends ?? {})) {
    for (const corner of bend.corners ?? []) take(corner.x, corner.y, 0, 0);
  }
  if (!Number.isFinite(left)) return null;
  return { left, top, right, bottom };
}

export function emptyProject(): ProjectInfo {
  return {
    name: "Untitled MIFA",
    plant: "",
    shop: "",
    scenario: "Current",
    rate: "",
    shifts: "",
    perDay: "",
    diversity: "",
    updated: "",
  };
}

export function blankFlow(flowNumber: string): Flow {
  return {
    id: createId("f"),
    flowNumber,
    building: "",
    packaging: "",
    supplier: "",
    direct: false,
    dock: "",
    transportTruck: "",
    unloadingBuffer: false,
    bufferNumber: "",
    transportToWarehouse: "",
    warehouse: "",
    kitting: false,
    kitNumber: "",
    transportToKitting: "",
    sequencing: false,
    sequencingNumber: "",
    transportToSequencing: "",
    transportKitToLine: "",
    transportSeqToLine: "",
    productionLine: "",
    emptiesFromLine: "",
    emptiesFromSequencing: "",
    emptiesFromKitting: "",
    emptiesStore: "",
    emptiesDock: "",
    trigger: "",
    system: "",
  };
}

export function emptyDocument(): MifaDocument {
  return { project: emptyProject(), flows: [], positions: {} };
}

export function exampleDocument(): MifaDocument {
  const lv = blankFlow("1");
  lv.id = "f-lv";
  Object.assign(lv, {
    building: "GA",
    packaging: "LV",
    supplier: "Supplier",
    dock: "1",
    transportTruck: "Truck",
    warehouse: "1",
    transportToWarehouse: "Forklift",
    kitting: true,
    kitNumber: "1",
    transportToKitting: "Forklift",
    transportKitToLine: "Tugger",
    productionLine: "Line",
    emptiesFromLine: "Tugger",
    emptiesStore: "1",
    emptiesDock: "2",
    trigger: "Kanban",
    system: "WMS",
  });
  const sb = blankFlow("2");
  sb.id = "f-sb";
  Object.assign(sb, {
    building: "GA",
    packaging: "SB",
    supplier: "Supplier",
    dock: "1",
    transportTruck: "Truck",
    warehouse: "2",
    transportToWarehouse: "Forklift",
    sequencing: true,
    sequencingNumber: "1",
    transportToSequencing: "Forklift",
    transportSeqToLine: "Tugger",
    productionLine: "Line",
    emptiesFromLine: "Tugger",
    emptiesStore: "2",
    trigger: "Call box",
    system: "WMS",
  });
  return {
    project: {
      name: "Inbound example",
      plant: "Plant",
      shop: "GA",
      scenario: "Current",
      rate: "30",
      shifts: "2",
      perDay: "770",
      diversity: "3 top hats",
      updated: "02/11/2026",
    },
    flows: [lv, sb],
    positions: {},
  };
}

function text(value: string) {
  return value.trim();
}

function laneOf(packaging: Flow["packaging"]) {
  return packaging === "LV" ? 1 : 0;
}

function named(prefix: string, value: string) {
  return new RegExp(`^${prefix}\\b`, "i").test(value) ? value : `${prefix} ${value}`;
}

type DraftNode = {
  id: string;
  kind: NodeKind;
  label: string;
  lanes: Set<number>;
  flowIds: Set<string>;
};

type DraftEdge = {
  id: string;
  from: string;
  to: string;
  kind: FlowKind;
  labels: Set<string>;
  flowIds: Set<string>;
};

function ensureNode(nodes: Map<string, DraftNode>, kind: NodeKind, key: string, label: string, lane: number, flowId: string) {
  const id = `${kind}:${key}`;
  const existing = nodes.get(id);
  if (existing) {
    existing.lanes.add(lane);
    existing.flowIds.add(flowId);
    return id;
  }
  nodes.set(id, { id, kind, label, lanes: new Set([lane]), flowIds: new Set([flowId]) });
  return id;
}

function ensureEdge(edges: Map<string, DraftEdge>, from: string, to: string, kind: FlowKind, label: string, flowId: string) {
  if (!from || !to || from === to) return;
  const id = `${from}>${to}:${kind}`;
  const existing = edges.get(id);
  if (existing) {
    existing.flowIds.add(flowId);
    if (label) existing.labels.add(label);
    return;
  }
  edges.set(id, { id, from, to, kind, labels: new Set(label ? [label] : []), flowIds: new Set([flowId]) });
}

export function buildSheet(doc: MifaDocument): Sheet {
  const nodes = new Map<string, DraftNode>();
  const edges = new Map<string, DraftEdge>();

  for (const flow of doc.flows) {
    const lane = laneOf(flow.packaging);
    const supplier = text(flow.supplier);
    const dock = text(flow.dock);
    const buffer = flow.unloadingBuffer ? text(flow.bufferNumber) : "";
    const warehouse = text(flow.warehouse);
    const kit = !flow.direct && flow.kitting ? text(flow.kitNumber) : "";
    const seq = !flow.direct && flow.sequencing ? text(flow.sequencingNumber) : "";
    const line = text(flow.productionLine);
    const empties = text(flow.emptiesStore);
    const emptiesDock = text(flow.emptiesDock);
    const pack = flow.packaging || "X";

    const supplierId = supplier ? ensureNode(nodes, "supplier", supplier, supplier, lane, flow.id) : "";
    const dockId = dock ? ensureNode(nodes, "dock", dock, named("Dock", dock), lane, flow.id) : "";
    const bufferId = buffer ? ensureNode(nodes, "buffer", `${pack}:${buffer}`, named("Buffer", buffer), lane, flow.id) : "";
    const warehouseId = warehouse ? ensureNode(nodes, "warehouse", warehouse, named("WH", warehouse), lane, flow.id) : "";
    const kitId = kit ? ensureNode(nodes, "kitting", `${pack}:${kit}`, named("Kit", kit), lane, flow.id) : "";
    const seqId = seq ? ensureNode(nodes, "sequencing", seq, named("Seq", seq), lane, flow.id) : "";
    const lineId = line ? ensureNode(nodes, "line", line, line, lane, flow.id) : "";
    const emptiesId = empties
      ? ensureNode(nodes, "empties", `${pack}:${empties}`, named("Empties", empties), lane, flow.id)
      : "";
    const emptiesDockId = emptiesDock
      ? ensureNode(nodes, "emptiesDock", emptiesDock, named("Empty dock", emptiesDock), lane, flow.id)
      : "";

    const steps: { id: string; label: string }[] = [];
    if (supplierId) steps.push({ id: supplierId, label: "" });
    if (dockId) steps.push({ id: dockId, label: text(flow.transportTruck) });
    if (bufferId) steps.push({ id: bufferId, label: text(flow.transportTruck) });
    if (warehouseId) steps.push({ id: warehouseId, label: text(flow.transportToWarehouse) });
    for (let i = 1; i < steps.length; i += 1) {
      ensureEdge(edges, steps[i - 1].id, steps[i].id, "material", steps[i].label, flow.id);
    }
    const upstream = warehouseId || bufferId || dockId || supplierId;
    if (kitId) ensureEdge(edges, upstream, kitId, "material", text(flow.transportToKitting), flow.id);
    if (seqId) ensureEdge(edges, upstream, seqId, "material", text(flow.transportToSequencing), flow.id);
    if (kitId && lineId) ensureEdge(edges, kitId, lineId, "material", text(flow.transportKitToLine), flow.id);
    if (seqId && lineId) ensureEdge(edges, seqId, lineId, "material", text(flow.transportSeqToLine), flow.id);
    if (!kitId && !seqId && lineId && upstream && upstream !== lineId) {
      ensureEdge(edges, upstream, lineId, "material", text(flow.transportKitToLine) || (flow.direct ? "Direct" : ""), flow.id);
    }

    if (emptiesId) {
      if (text(flow.emptiesFromLine) && lineId) ensureEdge(edges, lineId, emptiesId, "empty", text(flow.emptiesFromLine), flow.id);
      if (text(flow.emptiesFromKitting) && kitId) ensureEdge(edges, kitId, emptiesId, "empty", text(flow.emptiesFromKitting), flow.id);
      if (text(flow.emptiesFromSequencing) && seqId) ensureEdge(edges, seqId, emptiesId, "empty", text(flow.emptiesFromSequencing), flow.id);
      const hasReturn =
        (text(flow.emptiesFromLine) && lineId) ||
        (text(flow.emptiesFromKitting) && kitId) ||
        (text(flow.emptiesFromSequencing) && seqId);
      if (!hasReturn && lineId) ensureEdge(edges, lineId, emptiesId, "empty", "", flow.id);
      if (emptiesDockId) ensureEdge(edges, emptiesId, emptiesDockId, "empty", "", flow.id);
    }

    if (text(flow.trigger) || text(flow.system)) {
      const system = text(flow.system) || "IT";
      const itId = ensureNode(nodes, "it", system, system, -1, flow.id);
      const target = warehouseId || lineId || dockId;
      if (target) ensureEdge(edges, itId, target, "information", text(flow.trigger), flow.id);
    }
  }

  const itNodes = [...nodes.values()].filter((node) => node.kind === "it");
  const top = 132 + Math.max(0, itNodes.length - 1) * 84;
  const placed = new Map<string, { x: number; y: number; width: number; height: number }>();
  const byColumn = new Map<number, DraftNode[]>();
  for (const node of nodes.values()) {
    if (node.kind === "it") continue;
    const column = COLUMN[node.kind];
    byColumn.set(column, [...(byColumn.get(column) ?? []), node]);
  }

  for (const [column, group] of byColumn) {
    const sorted = [...group]
      .filter((node) => node.kind !== "line" && node.kind !== "empties" && node.kind !== "emptiesDock")
      .sort((a, b) => {
      const lane = Math.min(...a.lanes) - Math.min(...b.lanes);
      if (lane !== 0) return lane;
      if (a.kind !== b.kind) return a.kind === "kitting" ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    const cursor = [top, top + 280];
    for (const node of sorted) {
      const size = boxSize(doc, node.id, KIND_SYMBOL[node.kind]);
      const shared = node.lanes.has(0) && node.lanes.has(1);
      let y = shared ? top + 120 : cursor[Math.min(...node.lanes) >= 1 ? 1 : 0];
      if (!shared) {
        const band = Math.min(...node.lanes) >= 1 ? 1 : 0;
        cursor[band] = y + size.height + 36;
      }
      const override = savedPlace(doc, node.id);
      const x = override?.x ?? 56 + column * 220;
      if (override) y = override.y;
      placed.set(node.id, { x, y, width: size.width, height: size.height });
    }
  }

  let contentRight = 56;
  let contentTop = top;
  let contentBottom = top;
  for (const box of placed.values()) {
    contentRight = Math.max(contentRight, box.x + box.width);
    contentTop = Math.min(contentTop, box.y);
    contentBottom = Math.max(contentBottom, box.y + box.height);
  }
  const lineSpan = Math.max(SYMBOL_SIZE.production.height, contentBottom - contentTop);
  const lineNodes = [...nodes.values()].filter((node) => node.kind === "line").sort((a, b) => a.label.localeCompare(b.label));
  lineNodes.forEach((node, index) => {
    const saved = doc.sizes?.[node.id];
    const width = saved?.width ?? SYMBOL_SIZE.production.width;
    const height = saved?.height ?? lineSpan;
    const pos = savedPlace(doc, node.id);
    placed.set(node.id, {
      x: pos?.x ?? contentRight + 88,
      y: pos?.y ?? contentTop + index * (height + 24),
      width,
      height,
    });
  });

  const lineAnchor = lineNodes[0] ? placed.get(lineNodes[0].id) : undefined;
  let returnX = (lineAnchor?.x ?? contentRight + 88) - 32;
  const returns = [...nodes.values()]
    .filter((node) => node.kind === "empties" || node.kind === "emptiesDock")
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "empties" ? -1 : 1;
      const lane = Math.min(...a.lanes) - Math.min(...b.lanes);
      if (lane !== 0) return lane;
      return a.label.localeCompare(b.label);
    });
  for (const node of returns) {
    const size = boxSize(doc, node.id, KIND_SYMBOL[node.kind]);
    returnX -= size.width;
    const pos = savedPlace(doc, node.id);
    const band = Math.min(...node.lanes) >= 1 ? 1 : 0;
    placed.set(node.id, {
      x: pos?.x ?? returnX,
      y: pos?.y ?? contentBottom + 64 + band * (size.height + 28),
      width: size.width,
      height: size.height,
    });
    returnX -= 48;
  }

  itNodes.forEach((node, index) => {
    const size = boxSize(doc, node.id, "it");
    const override = savedPlace(doc, node.id);
    placed.set(node.id, {
      x: override?.x ?? 56 + COLUMN.it * 210,
      y: override?.y ?? 28 + index * (size.height + 12),
      width: size.width,
      height: size.height,
    });
  });

  const sheetNodes: SheetNode[] = [...nodes.values()].map((node) => {
    const box = placed.get(node.id)!;
    return {
      id: node.id,
      kind: node.kind,
      symbol: doc.glyphs?.[node.id] ?? KIND_SYMBOL[node.kind],
      label: node.label,
      ...box,
      flowIds: [...node.flowIds],
    };
  });
  const sheetEdges: SheetEdge[] = [...edges.values()].map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    label: [...edge.labels].join(" · "),
    flowIds: [...edge.flowIds],
  }));

  const page = sheetBox(doc);
  return { nodes: sheetNodes, edges: sheetEdges, x: page.x, y: page.y, width: page.width, height: page.height };
}

export function pathForFlows(sheet: Sheet, flowIds: Iterable<string>) {
  const wanted = new Set(flowIds);
  return {
    nodes: new Set(sheet.nodes.filter((node) => node.flowIds.some((id) => wanted.has(id))).map((node) => node.id)),
    edges: new Set(sheet.edges.filter((edge) => edge.flowIds.some((id) => wanted.has(id))).map((edge) => edge.id)),
  };
}

const MATERIAL_ORDER = ["supplier", "dock", "buffer", "warehouse", "kitting", "sequencing", "line"];
const STORY_ORDER = [...MATERIAL_ORDER, "empties", "emptiesDock"];
const RETURN_KINDS = new Set(["empties", "emptiesDock"]);

function onFlows(edge: SheetEdge, flows: Set<string>) {
  if (!edge.flowIds.length) return true;
  return edge.flowIds.some((id) => flows.has(id));
}

/** Follow connections of one kind. "out" goes on toward the line or back along a return. "in" walks a return back to where it started. */
function follow(all: SheetEdge[], seeds: string[], kind: FlowKind, flows: Set<string>, nodes: Set<string>, edges: Set<string>, direction: "out" | "in") {
  const queue = [...seeds];
  const seen = new Set(seeds);
  while (queue.length) {
    const id = queue.shift();
    if (!id) break;
    for (const edge of all) {
      if (edge.kind !== kind || !onFlows(edge, flows)) continue;
      const next = direction === "out" ? (edge.from === id ? edge.to : "") : edge.to === id ? edge.from : "";
      if (!next) continue;
      edges.add(edge.id);
      nodes.add(next);
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
}

export type NestBox = { id: string; x: number; y: number; width: number; height: number };

function boxContains(box: NestBox, x: number, y: number) {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

/** The flow symbol a nested mark belongs to. A mark inside another mark follows that outer mark's symbol. */
export function nestHosts(boxes: NestBox[]) {
  const hosts = new Map<string, string>();
  const byId = new Map(boxes.map((box) => [box.id, box]));
  function hostOf(id: string, seen: Set<string>): string | null {
    if (seen.has(id)) return null;
    const box = byId.get(id);
    if (!box) return null;
    seen.add(id);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const holders = boxes
      .filter((other) => other.id !== id && boxContains(other, cx, cy))
      .sort((a, b) => a.width * a.height - b.width * b.height || Number(a.id.startsWith("mark-")) - Number(b.id.startsWith("mark-")));
    const inner = holders[0];
    if (!inner) return null;
    if (!inner.id.startsWith("mark-")) return inner.id;
    return hostOf(inner.id, seen) ?? inner.id;
  }
  for (const box of boxes) {
    if (!box.id.startsWith("mark-")) continue;
    const host = hostOf(box.id, new Set());
    if (host && host !== box.id) hosts.set(box.id, host);
  }
  return hosts;
}

/** From the hovered symbol, along the material path to the production line, then back along the empty return. */
export function previewPath(sheet: Sheet, focusId: string, extra: SheetEdge[] = []) {
  const all = [...sheet.edges, ...extra];
  const focus = sheet.nodes.find((node) => node.id === focusId);
  const edge = all.find((item) => item.id === focusId);
  const nodes = new Set<string>();
  const edges = new Set<string>();
  const flows = new Set(focus?.flowIds ?? edge?.flowIds ?? []);
  if (!focus && !edge) return { nodes, edges, shared: 0 };
  const kind = focus?.kind ?? (edge?.kind === "empty" ? "empties" : edge?.kind === "information" ? "it" : "line");
  if (focus) nodes.add(focus.id);
  if (edge) {
    edges.add(edge.id);
    nodes.add(edge.from);
    nodes.add(edge.to);
  }
  if (kind === "it" || edge?.kind === "information") {
    follow(all, [...nodes], "information", flows, nodes, edges, "out");
    return { nodes, edges, shared: 0 };
  }
  if (RETURN_KINDS.has(kind) || edge?.kind === "empty") {
    follow(all, [...nodes], "empty", flows, nodes, edges, "in");
    follow(all, [...nodes], "empty", flows, nodes, edges, "out");
    return { nodes, edges, shared: flows.size > 1 ? flows.size : 0 };
  }
  const forward = edge ? [edge.to] : focus ? [focus.id] : [];
  follow(all, forward, "material", flows, nodes, edges, "out");
  follow(all, [...nodes], "empty", flows, nodes, edges, "out");
  return { nodes, edges, shared: flows.size > 1 ? flows.size : 0 };
}

function storyLabels(sheet: Sheet, flowId: string, path: Set<string>) {
  return sheet.nodes
    .filter((node) => path.has(node.id) && node.flowIds.includes(flowId) && STORY_ORDER.includes(node.kind))
    .sort((a, b) => STORY_ORDER.indexOf(a.kind) - STORY_ORDER.indexOf(b.kind) || a.x - b.x)
    .map((node) => node.label);
}

/** The material steps on a flow, in the order they run, through to the production line and the return. */
export function flowStory(sheet: Sheet, focusId: string, extra: SheetEdge[] = []) {
  const path = previewPath(sheet, focusId, extra);
  const focus = sheet.nodes.find((node) => node.id === focusId) ?? [...sheet.edges, ...extra].find((edge) => edge.id === focusId);
  const seen = new Set<string>();
  const routes: string[][] = [];
  for (const flowId of focus?.flowIds ?? []) {
    const route = storyLabels(sheet, flowId, path.nodes);
    const key = route.join("\0");
    if (!route.length || seen.has(key)) continue;
    seen.add(key);
    routes.push(route);
  }
  const systems = sheet.nodes.filter((node) => path.nodes.has(node.id) && node.kind === "it").map((node) => node.label);
  return {
    title: focus?.label || "Flow",
    steps: routes.length === 1 ? routes[0] : [],
    routes,
    systems,
    shared: routes.length > 1 ? routes.length : 0,
  };
}

function symbolOutline(node: SheetNode) {
  if (node.id.startsWith("mark-") || node.symbol === "production") return { x: node.x, y: node.y, width: node.width, height: node.height };
  const insetX = node.symbol === "stock" ? 0.1 : 0.04;
  const insetY = node.symbol === "supplier" || node.symbol === "stock" ? 0.06 : 0.08;
  return {
    x: node.x + node.width * insetX,
    y: node.y + node.height * insetY,
    width: node.width * (1 - insetX * 2),
    height: node.height * (node.symbol === "supplier" || node.symbol === "stock" ? 0.88 : 0.84),
  };
}

export function edgeRoute(from: SheetNode, to: SheetNode, bend?: LineBend, lane = 0, page: SheetBox = sheetBox()) {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  const guide = bend && !bend.shaped && target.height > source.height + 48 ? { x: bend.x, y: bend.y } : bend;
  const finish = (points: Point[], fromPort: LinePort, toPort: LinePort) => {
    const cleaned = dropColinear(dedupe(points));
    if (departsByStub(cleaned, fromPort.side)) {
      const elbow = openElbow(source, target, guide?.x ?? 0, guide?.y ?? 0);
      if (elbow) return packRoute(elbow, pointToPort(source, elbow[0]), pointToPort(target, elbow[elbow.length - 1]));
    }
    return packRoute(cleaned, fromPort, toPort);
  };
  if (guide?.shaped && guide.from && guide.to) {
    const start = portPoint(source, guide.from);
    const end = portPoint(target, guide.to);
    const cleaned = dropColinear(orthogonalize(dedupe([start, ...(guide.corners ?? []), end])));
    return packRoute(cleaned, guide.from, guide.to);
  }
  if ((guide?.from && guide?.to) || guide?.corners?.length) {
    const fromPort = guide.from ?? portFromApproach(source, guide.corners![0]);
    const toPort = guide.to ?? portFromApproach(target, guide.corners![guide.corners!.length - 1]);
    const jog = guide.corners?.[0] ?? portPoint(source, fromPort);
    const approach = guide.corners?.length ? guide.corners[guide.corners.length - 1] : portPoint(target, toPort);
    const points = routeThrough(portPoint(source, fromPort), portPoint(target, toPort), fromPort.side, toPort.side, jog, approach, source, target);
    return finish(points, fromPort, toPort);
  }
  const fromCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const toCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const placed = Math.abs(guide?.x ?? 0) > 0.5 || Math.abs(guide?.y ?? 0) > 0.5;
  const laneShift = placed ? 0 : lane * 16;
  const shiftX = (guide?.x ?? 0) + (horizontal ? 0 : laneShift);
  const shiftY = (guide?.y ?? 0) + (horizontal ? laneShift : 0);
  const centeredY = Math.abs(shiftY) < 0.5 ? fitPort(toCenter.y, source.y, source.height) : null;
  const centeredX = Math.abs(shiftX) < 0.5 ? fitPort(toCenter.x, source.x, source.width) : null;
  const laneOnTarget = target.height > source.height + 48 ? fitPort(fromCenter.y + shiftY, target.y, target.height) : null;
  if (!placed && laneOnTarget == null) {
    const elbow = openElbow(source, target, shiftX, shiftY);
    if (elbow) return packRoute(elbow, pointToPort(source, elbow[0]), pointToPort(target, elbow[elbow.length - 1]));
  }
  const start = horizontal
    ? {
        x: dx >= 0 ? source.x + source.width : source.x,
        y: laneOnTarget != null ? clampPort(laneOnTarget, source.y, source.height) : (centeredY ?? clampPort(fromCenter.y + shiftY, source.y, source.height)),
      }
    : { x: centeredX ?? clampPort(fromCenter.x + shiftX, source.x, source.width), y: dy >= 0 ? source.y + source.height : source.y };
  const end = horizontal
    ? { x: dx >= 0 ? target.x : target.x + target.width, y: laneOnTarget ?? centeredY ?? clampPort(toCenter.y + shiftY, target.y, target.height) }
    : { x: centeredX ?? clampPort(toCenter.x + shiftX, target.x, target.width), y: dy >= 0 ? target.y : target.y + target.height };
  const midX = clamp((start.x + end.x) / 2 + shiftX, page.x + 8, page.x + page.width - 8);
  const midY = clamp((start.y + end.y) / 2 + shiftY, page.y + 8, page.y + page.height - 8);
  const points = horizontal
    ? [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
    : [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
  return finish(points, pointToPort(source, start), pointToPort(target, end));
}

/** One corner when the next symbol is off to the side and above or below. Leave the top or bottom so the line does not step off the side and drop. */
function openElbow(source: Outline, target: Outline, shiftX: number, shiftY: number): Point[] | null {
  const gapRight = target.x - (source.x + source.width);
  const gapLeft = source.x - (target.x + target.width);
  const gapBelow = target.y - (source.y + source.height);
  const gapAbove = source.y - (target.y + target.height);
  const sepX = Math.max(gapRight, gapLeft);
  const sepY = Math.max(gapBelow, gapAbove);
  const toCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const verticallyOut = toCenter.y > source.y + source.height || toCenter.y < source.y || sepY > 8;
  const horizontallyOut = toCenter.x > source.x + source.width || toCenter.x < source.x || sepX > 8;
  if (!verticallyOut || !horizontallyOut) return null;
  if (sepX < -12 || sepY < -12) return null;
  const verticalGap = Math.max(gapBelow, gapAbove);
  const horizontalGap = Math.max(gapRight, gapLeft);
  const leaveHorizontal = verticalGap < 36 && horizontalGap > Math.max(verticalGap, 0) * 2 && horizontalGap > 36;
  const start = leaveHorizontal
    ? {
        x: gapRight >= gapLeft ? source.x + source.width : source.x,
        y: clampPort(source.y + source.height / 2 + shiftY, source.y, source.height),
      }
    : {
        x: clampPort(source.x + source.width / 2 + shiftX, source.x, source.width),
        y: gapBelow >= gapAbove ? source.y + source.height : source.y,
      };
  const end = leaveHorizontal
    ? {
        x: clampPort(target.x + target.width / 2 + shiftX, target.x, target.width),
        y: gapBelow >= gapAbove ? target.y : target.y + target.height,
      }
    : {
        x: gapRight >= gapLeft ? target.x : target.x + target.width,
        y: clampPort(target.y + target.height / 2 + shiftY, target.y, target.height),
      };
  const elbow = leaveHorizontal ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
  const points = dropColinear(dedupe([start, elbow, end]));
  if (crossesBox(points, source) || crossesBox(points, target)) return null;
  return points;
}

/** A short step off the side, then a long drop, is the router hugging the box. */
function departsByStub(points: Point[], fromSide: Side) {
  if (points.length < 4 || points.length > 6) return false;
  const horizontal = fromSide === "e" || fromSide === "w";
  const stub = horizontal ? Math.abs(points[1].x - points[0].x) : Math.abs(points[1].y - points[0].y);
  const span = horizontal ? Math.abs(points[points.length - 1].x - points[0].x) : Math.abs(points[points.length - 1].y - points[0].y);
  const shared = horizontal ? Math.abs(points[1].x - points[2].x) < 0.5 : Math.abs(points[1].y - points[2].y) < 0.5;
  const drop = horizontal ? Math.abs(points[2].y - points[1].y) : Math.abs(points[2].x - points[1].x);
  return shared && drop > 32 && span > 48 && stub < 28 && stub * 3 < drop;
}

export function bendFromCorner(from: SheetNode, to: SheetNode, bend: LineBend | undefined, index: number, point: { x: number; y: number }): LineBend {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  const route = edgeRoute(from, to, bend);
  const atEnd = route.corners.length === 0 ? closerTo(point, target, source) : index >= route.corners.length - 1;
  const fromPort = atEnd ? route.from : portFromApproach(source, point);
  const toPort = atEnd ? portFromApproach(target, point) : route.to;
  const jogAt = atEnd ? (route.corners[0] ?? point) : point;
  const approachAt = atEnd ? point : (route.corners[route.corners.length - 1] ?? route.handle);
  const points = routeThrough(portPoint(source, fromPort), portPoint(target, toPort), fromPort.side, toPort.side, jogAt, approachAt, source, target);
  return { x: 0, y: 0, from: fromPort, to: toPort, corners: points.slice(1, -1) };
}

export function straightenConnection(doc: MifaDocument, edgeId: string, from: SheetNode, to: SheetNode): MifaDocument {
  const placed = centerOnLine(from, to);
  let next = doc;
  if (Math.abs(placed.from.x - from.x) > 0.5 || Math.abs(placed.from.y - from.y) > 0.5) next = moveNode(next, from, placed.from);
  if (Math.abs(placed.to.x - to.x) > 0.5 || Math.abs(placed.to.y - to.y) > 0.5) next = moveNode(next, to, placed.to);
  if (!next.bends?.[edgeId]) return next;
  const bends = { ...next.bends };
  delete bends[edgeId];
  return { ...next, bends };
}

function centerOnLine(from: SheetNode, to: SheetNode) {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  const fromCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const toCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const horizontal = Math.abs(toCenter.x - fromCenter.x) >= Math.abs(toCenter.y - fromCenter.y);
  const axis = horizontal
    ? sharedCenter(fromCenter.y, source.height, toCenter.y, target.height)
    : sharedCenter(fromCenter.x, source.width, toCenter.x, target.width);
  if (horizontal) {
    return {
      from: { x: from.x, y: from.y + axis - fromCenter.y },
      to: { x: to.x, y: to.y + axis - toCenter.y },
    };
  }
  return {
    from: { x: from.x + axis - fromCenter.x, y: from.y },
    to: { x: to.x + axis - toCenter.x, y: to.y },
  };
}

function sharedCenter(aCenter: number, aSize: number, bCenter: number, bSize: number) {
  if (aSize > bSize + 8) return aCenter;
  if (bSize > aSize + 8) return bCenter;
  return (aCenter + bCenter) / 2;
}

function savedPlace(doc: MifaDocument, id: string) {
  if (doc.locks?.[id]) return undefined;
  return doc.positions[id];
}

function moveNode(doc: MifaDocument, node: SheetNode, at: { x: number; y: number }): MifaDocument {
  const page = sheetBox(doc);
  const x = Math.min(Math.max(page.x, at.x), Math.max(page.x, page.x + page.width - node.width));
  const y = Math.min(Math.max(page.y, at.y), Math.max(page.y, page.y + page.height - node.height));
  if (node.id.startsWith("mark-")) {
    return { ...doc, marks: (doc.marks ?? []).map((mark) => (mark.id === node.id ? { ...mark, x, y } : mark)) };
  }
  return { ...doc, positions: { ...doc.positions, [node.id]: { x, y } } };
}

/** Drop a symbol back on the layout center, and let the icons on its lines sit in the middle again. */
export function lockToCenter(doc: MifaDocument, ids: string[], edges: { id: string; from: string; to: string }[]): MifaDocument {
  const positions = { ...doc.positions };
  const locks = { ...(doc.locks ?? {}) };
  for (const id of ids) {
    delete positions[id];
    locks[id] = true;
  }
  return { ...doc, positions, locks, icons: releaseLineIcons(doc.icons, edges, ids) };
}

/** Keep the symbol where it is, and allow it to be dragged. */
export function unlockNodes(doc: MifaDocument, ids: string[], at: Record<string, { x: number; y: number }>): MifaDocument {
  const locks = { ...(doc.locks ?? {}) };
  const positions = { ...doc.positions };
  for (const id of ids) {
    delete locks[id];
    if (at[id]) positions[id] = at[id];
  }
  return { ...doc, positions, ...(Object.keys(locks).length ? { locks } : { locks: undefined }) };
}

function releaseLineIcons(icons: MifaDocument["icons"], edges: { id: string; from: string; to: string }[], ids: string[]) {
  if (!icons) return icons;
  const held = new Set(ids);
  let next = icons;
  let changed = false;
  for (const edge of edges) {
    if (!held.has(edge.from) && !held.has(edge.to)) continue;
    const prefix = `${edge.id}::`;
    for (const [key, box] of Object.entries(icons)) {
      if (!key.startsWith(prefix) || box.placed === false) continue;
      if (!changed) next = { ...icons };
      next[key] = { ...box, placed: false };
      changed = true;
    }
  }
  return next;
}

/** Remember how a line is drawn before a symbol moves, so the arrow keeps its direction. */
export function pinOpenRoutes(doc: MifaDocument, movedIds: string[], laneOf: (id: string) => number = () => 0): NonNullable<MifaDocument["bends"]> {
  const laid = buildSheet(doc);
  const bends = { ...(doc.bends ?? {}) };
  const moved = new Set(movedIds);
  const consider = (id: string, fromId: string, toId: string) => {
    if (!moved.has(fromId) && !moved.has(toId)) return;
    const saved = bends[id];
    if (saved?.shaped && saved.from && saved.to) return;
    const from = nodeById(doc, laid, fromId);
    const to = nodeById(doc, laid, toId);
    if (!from || !to) return;
    const route = edgeRoute(from, to, saved, laneOf(id), sheetBox(doc));
    bends[id] = { x: 0, y: 0, shaped: true, from: route.from, to: route.to, ...(route.corners.length ? { corners: route.corners } : {}) };
  };
  for (const edge of laid.edges) consider(edge.id, edge.from, edge.to);
  for (const link of doc.links ?? []) consider(link.id, link.from, link.to);
  return bends;
}

export function centerPortsOnMove(
  doc: MifaDocument,
  movedIds: string[],
  shift: { x: number; y: number } = { x: 0, y: 0 },
  baseline?: MifaDocument["bends"],
): MifaDocument {
  const source = baseline ?? doc.bends;
  if (!source || movedIds.length === 0) return doc;
  const moved = new Set(movedIds);
  const laid = buildSheet(doc);
  let bends = source;
  let changed = false;
  const consider = (id: string, fromId: string, toId: string) => {
    const bend = source[id];
    if (!bend) return;
    const fromMoved = moved.has(fromId);
    const toMoved = moved.has(toId);
    if (!fromMoved && !toMoved) return;
    const from = nodeById(doc, laid, fromId);
    const to = nodeById(doc, laid, toId);
    if (!from || !to) return;
    const next = retargetBend(bend, from, to, fromMoved, toMoved, shift);
    if (next === bend) return;
    if (!changed) bends = { ...source };
    bends[id] = next;
    changed = true;
  };
  for (const edge of laid.edges) consider(edge.id, edge.from, edge.to);
  for (const link of doc.links ?? []) consider(link.id, link.from, link.to);
  if (!changed) return baseline && baseline !== doc.bends ? { ...doc, bends: baseline } : doc;
  return { ...doc, bends };
}

function nodeById(doc: MifaDocument, laid: Sheet, id: string): SheetNode | null {
  const found = laid.nodes.find((node) => node.id === id);
  if (found) return found;
  const mark = doc.marks?.find((item) => item.id === id);
  if (!mark) return null;
  return {
    id: mark.id,
    kind: "it",
    symbol: mark.symbol,
    label: mark.name,
    x: mark.x,
    y: mark.y,
    width: mark.width ?? SYMBOL_SIZE[mark.symbol].width,
    height: mark.height ?? SYMBOL_SIZE[mark.symbol].height,
    flowIds: [],
  };
}

function retargetBend(bend: LineBend, from: SheetNode, to: SheetNode, fromMoved: boolean, toMoved: boolean, shift: { x: number; y: number }): LineBend {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  if (!bend.corners?.length && !bend.from && !bend.to) {
    const horizontal = Math.abs(target.x + target.width / 2 - (source.x + source.width / 2)) >= Math.abs(target.y + target.height / 2 - (source.y + source.height / 2));
    const x = horizontal ? bend.x : 0;
    const y = horizontal ? 0 : bend.y;
    if (x === bend.x && y === bend.y) return bend;
    return { ...bend, x, y };
  }
  const fromPort = bend.from ?? (bend.corners?.length ? portFromApproach(source, bend.corners[0]) : undefined);
  const toPort = bend.to ?? (bend.corners?.length ? portFromApproach(target, bend.corners[bend.corners.length - 1]) : undefined);
  const nextFrom = fromPort && fromMoved ? movedPort(fromPort, shift, source) : fromPort;
  const nextTo = toPort && toMoved ? movedPort(toPort, shift, target) : toPort;
  const corners = bend.corners?.map((corner) => (fromMoved && toMoved ? { x: corner.x + shift.x, y: corner.y + shift.y } : { ...corner }));
  if (corners?.length && fromMoved && nextFrom) corners[0] = meetCorner(corners[0], nextFrom, source);
  if (corners?.length && toMoved && nextTo) corners[corners.length - 1] = meetCorner(corners[corners.length - 1], nextTo, target);
  if (!corners?.length && toMoved && nextTo && nextFrom) {
    const start = portPoint(source, nextFrom);
    const end = portPoint(target, nextTo);
    const straight = nextTo.side === "e" || nextTo.side === "w" ? Math.abs(start.y - end.y) < 0.5 : Math.abs(start.x - end.x) < 0.5;
    if (!straight) {
      const elbow = nextTo.side === "e" || nextTo.side === "w" ? { x: start.x, y: end.y } : { x: end.x, y: start.y };
      return { ...bend, ...(nextFrom ? { from: nextFrom } : {}), to: nextTo, corners: [elbow], shaped: true };
    }
  }
  if (samePort(nextFrom, bend.from) && samePort(nextTo, bend.to) && sameCorners(corners, bend.corners)) return bend;
  return { ...bend, ...(nextFrom ? { from: nextFrom } : {}), ...(nextTo ? { to: nextTo } : {}), ...(corners ? { corners } : {}) };
}

function movedPort(port: LinePort, shift: { x: number; y: number }, box: Outline): LinePort {
  const raw = port.side === "n" || port.side === "s" ? port.at + shift.x : port.at + shift.y;
  const across = port.side === "n" || port.side === "s";
  const origin = across ? box.x : box.y;
  const size = across ? box.width : box.height;
  return { side: port.side, at: clampPort(raw, origin, size) };
}

/** Keep the last step square to the symbol and outside it, so the arrow points into the side. */
function meetCorner(corner: Point, port: LinePort, box: Outline): Point {
  const stub = 24;
  if (port.side === "w") return { x: Math.min(corner.x, box.x - stub), y: port.at };
  if (port.side === "e") return { x: Math.max(corner.x, box.x + box.width + stub), y: port.at };
  if (port.side === "n") return { x: port.at, y: Math.min(corner.y, box.y - stub) };
  return { x: port.at, y: Math.max(corner.y, box.y + box.height + stub) };
}

function samePort(next: LinePort | undefined, previous: LinePort | undefined) {
  if (!next || !previous) return !next && !previous;
  return next.side === previous.side && Math.abs(next.at - previous.at) < 0.5;
}

function sameCorners(next: Point[] | undefined, previous: Point[] | undefined) {
  if (!next || !previous || next.length !== previous.length) return !next?.length && !previous?.length;
  return next.every((point, index) => Math.abs(point.x - previous[index].x) < 0.5 && Math.abs(point.y - previous[index].y) < 0.5);
}

/** Drop one displayed corner and keep the rest of the line where it is. */
export function removeLineCorner(from: SheetNode, to: SheetNode, bend: LineBend | undefined, index: number): LineBend {
  const route = edgeRoute(from, to, bend);
  const at = index + 1;
  if (at <= 0 || at >= route.points.length - 1) return bend ?? { x: 0, y: 0, shaped: true };
  const previous = route.points[at - 1];
  const removed = route.points[at];
  const following = route.points[at + 1];
  const bridged = bridgeAround(previous, following, removed);
  return shapeBend(from, to, [...route.points.slice(0, at - 1), ...bridged, ...route.points.slice(at + 2)]);
}

function bridgeAround(previous: { x: number; y: number }, following: { x: number; y: number }, removed: { x: number; y: number }) {
  if (Math.abs(previous.x - following.x) < 0.5 || Math.abs(previous.y - following.y) < 0.5) return [previous, following];
  const across = { x: following.x, y: previous.y };
  const down = { x: previous.x, y: following.y };
  const same = Math.abs(across.x - removed.x) < 0.5 && Math.abs(across.y - removed.y) < 0.5;
  return [previous, same ? down : across, following];
}

/** Split the segment under the pointer into a short step that can be dragged. */
export function addLineCorner(from: SheetNode, to: SheetNode, bend: LineBend | undefined, at: { x: number; y: number }): LineBend {
  const points = edgeRoute(from, to, bend).points;
  let best = 0;
  let bestDist = Infinity;
  let hit = points[0];
  for (let index = 0; index < points.length - 1; index += 1) {
    const projected = projectSegment(points[index], points[index + 1], at);
    if (projected.dist < bestDist) {
      bestDist = projected.dist;
      best = index;
      hit = projected;
    }
  }
  const start = points[best];
  const end = points[best + 1];
  const horizontal = Math.abs(end.y - start.y) <= Math.abs(end.x - start.x);
  const along = horizontal ? end.x - start.x : end.y - start.y;
  const sign = along >= 0 ? 1 : -1;
  const step = 32;
  const toward = horizontal ? (at.y >= hit.y ? 1 : -1) : (at.x >= hit.x ? 1 : -1);
  const origin = horizontal ? start.x : start.y;
  const limit = horizontal ? end.x : end.y;
  const low = Math.min(origin, limit);
  const high = Math.max(origin, limit);
  const raw = horizontal ? hit.x : hit.y;
  const place = snap(Math.min(high - 8, Math.max(low + 8, raw)));
  const next = snap(place + sign * step);
  const side = horizontal ? snap(start.y + toward * step) : snap(start.x + toward * step);
  const inserted = horizontal
    ? [
        { x: place, y: start.y },
        { x: place, y: side },
        { x: next, y: side },
        { x: next, y: start.y },
      ]
    : [
        { x: start.x, y: place },
        { x: side, y: place },
        { x: side, y: next },
        { x: start.x, y: next },
      ];
  return shapeBend(from, to, [...points.slice(0, best + 1), ...inserted, ...points.slice(best + 1)]);
}

/** Slide one corner. A corner next to a symbol takes that end of the line with it. */
export function dragLineCorner(from: SheetNode, to: SheetNode, bend: LineBend, index: number, point: { x: number; y: number }): LineBend {
  const route = edgeRoute(from, to, bend);
  const points = route.points.map((item) => ({ ...item }));
  const at = index + 1;
  if (at <= 0 || at >= points.length - 1) return bend;
  let target = { x: snap(point.x), y: snap(point.y) };
  const previous = points[at - 1];
  const following = points[at + 1];
  const current = points[at];
  const previousHorizontal = Math.abs(current.y - previous.y) <= Math.abs(current.x - previous.x);
  const nextHorizontal = Math.abs(following.y - current.y) <= Math.abs(following.x - current.x);
  if (at - 1 === 0) {
    const anchor = portPoint(symbolOutline(from), { side: route.from.side, at: previousHorizontal ? target.y : target.x });
    points[0] = anchor;
    target = previousHorizontal ? { x: target.x, y: anchor.y } : { x: anchor.x, y: target.y };
  } else {
    points[at - 1] = previousHorizontal ? { x: previous.x, y: target.y } : { x: target.x, y: previous.y };
  }
  if (at + 1 === points.length - 1) {
    const anchor = portPoint(symbolOutline(to), { side: route.to.side, at: nextHorizontal ? target.y : target.x });
    points[at + 1] = anchor;
    target = nextHorizontal ? { x: target.x, y: anchor.y } : { x: anchor.x, y: target.y };
  } else {
    points[at + 1] = nextHorizontal ? { x: following.x, y: target.y } : { x: target.x, y: following.y };
  }
  points[at] = target;
  return shapeBend(from, to, points);
}

/** Move where a line meets a symbol, along that edge or around onto another side. */
export function slideLineEnd(from: SheetNode, to: SheetNode, bend: LineBend | undefined, which: "from" | "to", point: { x: number; y: number }): LineBend {
  const route = edgeRoute(from, to, bend);
  const box = symbolOutline(which === "from" ? from : to);
  const port = portOnEdge(box, point);
  const tip = portPoint(box, port);
  const points = attachEnd(route.points, which, tip, port.side);
  return shapeBend(from, to, points);
}

function portOnEdge(box: Outline, point: Point): LinePort {
  const chosen = portFromApproach(box, point);
  const across = chosen.side === "n" || chosen.side === "s";
  const origin = across ? box.x : box.y;
  const size = across ? box.width : box.height;
  return { side: chosen.side, at: snap(clampPort(chosen.at, origin, size)) };
}

function leadOut(tip: Point, side: Side): Point {
  const stub = 24;
  if (side === "n") return { x: tip.x, y: tip.y - stub };
  if (side === "s") return { x: tip.x, y: tip.y + stub };
  if (side === "w") return { x: tip.x - stub, y: tip.y };
  return { x: tip.x + stub, y: tip.y };
}

/** Join the moved end to the rest of the line. The other symbol keeps the direction it already had. */
function attachEnd(points: Point[], which: "from" | "to", tip: Point, side: Side): Point[] {
  const outward = leadOut(tip, side);
  if (which === "to") {
    const keep = points.slice(0, -1);
    const previous = keep[keep.length - 1] ?? outward;
    const x = side === "n" || side === "s" ? (Math.abs(previous.x - tip.x) < 1 ? previous.x + 24 : previous.x) : outward.x;
    const y = side === "n" || side === "s" ? outward.y : Math.abs(previous.y - tip.y) < 1 ? previous.y + 24 : previous.y;
    return [...keep, { x, y }, outward, tip];
  }
  const keep = points.slice(1);
  const end = keep[keep.length - 1] ?? outward;
  const beforeEnd = keep.length > 1 ? keep[keep.length - 2] : points[0];
  const horizontal = Math.abs(end.y - beforeEnd.y) <= Math.abs(end.x - beforeEnd.x);
  const elbow = horizontal ? { x: outward.x, y: end.y } : { x: end.x, y: outward.y };
  const same = Math.abs(elbow.x - outward.x) < 1 && Math.abs(elbow.y - outward.y) < 1;
  return [tip, outward, ...(same ? [] : [elbow]), ...keep];
}

/** Move a shaped line without letting the automatic router redraw it. */
export function shiftLine(from: SheetNode, to: SheetNode, bend: LineBend, dx: number, dy: number): LineBend {
  const route = edgeRoute(from, to, bend);
  const points = route.points.map((point, index) => (index === 0 || index === route.points.length - 1 ? point : { x: point.x + dx, y: point.y + dy }));
  if (points.length > 2) {
    const departsHorizontal = Math.abs(route.points[1].y - route.points[0].y) <= Math.abs(route.points[1].x - route.points[0].x);
    points[1] = departsHorizontal ? { x: points[1].x, y: points[0].y } : { x: points[0].x, y: points[1].y };
    const last = points.length - 2;
    const arrivesHorizontal = Math.abs(route.points[last + 1].y - route.points[last].y) <= Math.abs(route.points[last + 1].x - route.points[last].x);
    points[last] = arrivesHorizontal ? { x: points[last].x, y: points[last + 1].y } : { x: points[last + 1].x, y: points[last].y };
  }
  return shapeBend(from, to, points);
}

function shapeBend(from: SheetNode, to: SheetNode, points: { x: number; y: number }[]): LineBend {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  const fromPort = pointToPort(source, points[0]);
  const toPort = pointToPort(target, points[points.length - 1]);
  const middle = points.slice(1, -1);
  const cleaned = dropColinear(orthogonalize(dedupe([portPoint(source, fromPort), ...middle, portPoint(target, toPort)])));
  const corners = cleaned.slice(1, -1);
  return { x: 0, y: 0, from: fromPort, to: toPort, ...(corners.length ? { corners } : {}), shaped: true };
}

function orthogonalize(points: { x: number; y: number }[]) {
  const out = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = out[out.length - 1];
    const next = points[index];
    if (Math.abs(next.x - previous.x) > 0.5 && Math.abs(next.y - previous.y) > 0.5) out.push({ x: next.x, y: previous.y });
    out.push(next);
  }
  return out;
}

function projectSegment(start: { x: number; y: number }, end: { x: number; y: number }, point: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const t = length < 1 ? 0 : Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length));
  const x = start.x + dx * t;
  const y = start.y + dy * t;
  return { x, y, dist: Math.hypot(point.x - x, point.y - y) };
}

export function bendFromMove(from: SheetNode, to: SheetNode, bend: LineBend | undefined, dx: number, dy: number): LineBend {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  const route = edgeRoute(from, to, bend);
  const jogAt = route.corners[0] ?? route.handle;
  const approachAt = route.corners[route.corners.length - 1] ?? route.handle;
  const movedJog = { x: jogAt.x + dx, y: jogAt.y + dy };
  const movedApproach = { x: approachAt.x + dx, y: approachAt.y + dy };
  const fromPort = portFromApproach(source, movedJog);
  const toPort = portFromApproach(target, movedApproach);
  const points = routeThrough(portPoint(source, fromPort), portPoint(target, toPort), fromPort.side, toPort.side, movedJog, movedApproach, source, target);
  return { x: 0, y: 0, from: fromPort, to: toPort, corners: points.slice(1, -1) };
}

type Outline = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

function routeThrough(start: Point, end: Point, fromSide: Side, toSide: Side, jogAt: Point, approachAt: Point, source: Outline, target: Outline) {
  const departH = fromSide === "e" || fromSide === "w";
  const arriveH = toSide === "e" || toSide === "w";
  const approach = alignOutside(end, toSide, approachAt);
  const elbow = simpleElbow(start, approach, end, departH, arriveH, jogAt);
  const simple = dropColinear(dedupe(elbow));
  if (legClean(simple, fromSide, toSide, source, target)) return simple;
  const last = simple[simple.length - 1];
  const prev = simple[simple.length - 2];
  const obstacle = crossesBox(simple, target) || !leavesToward(last, prev, toSide) ? target : source;
  const first = skirt(start, approach, end, fromSide, toSide, approachAt, obstacle, source, target);
  if (legClean(first, fromSide, toSide, source, target)) return first;
  const second = skirt(start, approach, end, fromSide, toSide, approachAt, obstacle === target ? source : target, source, target);
  return legClean(second, fromSide, toSide, source, target) ? second : first;
}

function skirt(start: Point, approach: Point, end: Point, fromSide: Side, toSide: Side, hint: Point, box: Outline, source: Outline, target: Outline) {
  const around = dedupe(aroundBox(start, approach, end, fromSide, toSide, hint, box));
  const cleaned = dropColinear(around);
  return legClean(cleaned, fromSide, toSide, source, target) ? cleaned : around;
}

function simpleElbow(start: Point, approach: Point, end: Point, departH: boolean, arriveH: boolean, jogAt: Point) {
  if (departH !== arriveH) {
    const elbow = departH ? { x: approach.x, y: start.y } : { x: start.x, y: approach.y };
    return [start, elbow, approach, end];
  }
  const jog = departH ? jogAt.x : jogAt.y;
  return departH
    ? [start, { x: jog, y: start.y }, { x: jog, y: approach.y }, approach, end]
    : [start, { x: start.x, y: jog }, { x: approach.x, y: jog }, approach, end];
}

function aroundBox(start: Point, approach: Point, end: Point, fromSide: Side, toSide: Side, hint: Point, box: Outline) {
  const gap = 16;
  const departH = fromSide === "e" || fromSide === "w";
  const arriveH = toSide === "e" || toSide === "w";
  if (departH === arriveH) {
    if (departH) {
      const laneY = outsideLane(box, hint, "y");
      const channel = leaveStub(start, fromSide, box, gap);
      return [start, channel, { x: channel.x, y: laneY }, { x: approach.x, y: laneY }, approach, end];
    }
    const laneX = outsideLane(box, hint, "x");
    const channel = leaveStub(start, fromSide, box, gap);
    return [start, channel, { x: laneX, y: channel.y }, { x: laneX, y: approach.y }, approach, end];
  }
  if (departH) {
    const laneX = clearAxis(start.x, fromSide, box.x, box.x + box.width, gap);
    return [start, { x: laneX, y: start.y }, { x: laneX, y: approach.y }, approach, end];
  }
  const laneY = clearAxis(start.y, fromSide, box.y, box.y + box.height, gap);
  return [start, { x: start.x, y: laneY }, { x: approach.x, y: laneY }, approach, end];
}

function leaveStub(start: Point, side: Side, box: Outline, gap: number): Point {
  if (side === "e" || side === "w") return { x: clearAxis(start.x, side, box.x, box.x + box.width, gap), y: start.y };
  return { x: start.x, y: clearAxis(start.y, side, box.y, box.y + box.height, gap) };
}

/** A coordinate just outside the box, on the side the line is travelling. */
function clearAxis(value: number, side: Side, lo: number, hi: number, gap: number) {
  if (side === "e" || side === "s") {
    if (value >= hi - 0.5) return value + gap;
    if (value <= lo) return lo - gap;
    return hi + gap;
  }
  if (value <= lo + 0.5) return value - gap;
  if (value >= hi) return hi + gap;
  return lo - gap;
}

function outsideLane(box: Outline, hint: Point, axis: "x" | "y") {
  const gap = 16;
  if (axis === "y") {
    const above = box.y - gap;
    const below = box.y + box.height + gap;
    if (hint.y <= box.y) return above;
    if (hint.y >= box.y + box.height) return below;
    return Math.abs(hint.y - box.y) <= Math.abs(hint.y - (box.y + box.height)) ? above : below;
  }
  const left = box.x - gap;
  const right = box.x + box.width + gap;
  if (hint.x <= box.x) return left;
  if (hint.x >= box.x + box.width) return right;
  return Math.abs(hint.x - box.x) <= Math.abs(hint.x - (box.x + box.width)) ? left : right;
}

function legClean(points: Point[], fromSide: Side, toSide: Side, source: Outline, target: Outline) {
  if (points.length < 2) return false;
  const end = points[points.length - 1];
  const prev = points[points.length - 2];
  return leavesToward(points[0], points[1], fromSide) && leavesToward(end, prev, toSide) && !crossesBox(points, source) && !crossesBox(points, target);
}

function leavesToward(from: Point, to: Point, side: Side) {
  if (side === "n") return to.y < from.y - 0.5;
  if (side === "s") return to.y > from.y + 0.5;
  if (side === "w") return to.x < from.x - 0.5;
  return to.x > from.x + 0.5;
}

function crossesBox(points: Point[], box: Outline) {
  const inset = { x: box.x + 0.5, y: box.y + 0.5, width: Math.max(0, box.width - 1), height: Math.max(0, box.height - 1) };
  if (inset.width <= 0 || inset.height <= 0) return false;
  for (let i = 0; i < points.length - 1; i += 1) {
    if (segmentInside(points[i], points[i + 1], inset)) return true;
  }
  return false;
}

function closerTo(point: Point, box: Outline, other: Outline) {
  const center = (item: Outline) => ({ x: item.x + item.width / 2, y: item.y + item.height / 2 });
  const here = center(box);
  const there = center(other);
  return Math.hypot(point.x - here.x, point.y - here.y) <= Math.hypot(point.x - there.x, point.y - there.y);
}

/** The size a transport icon has when it first sits on a line. */
export function fittedIconBox(natural: { width: number; height: number }) {
  const longest = Math.max(natural.width, natural.height);
  const fit = longest > 0 ? 72 / longest : 1;
  return { width: natural.width * fit, height: natural.height * fit };
}

/** Seat a transport icon beside the longest straight run, clear of the stroke and the corners. */
export function seatLineIcon(points: { x: number; y: number }[], natural: { width: number; height: number }, index: number, count: number) {
  let best = { a: points[0], b: points[Math.min(1, points.length - 1)], len: 0, horizontal: true };
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > best.len) best = { a, b, len, horizontal: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) };
  }
  const fitted = fittedIconBox(natural);
  const width = fitted.width;
  const height = fitted.height;
  const gap = 14;
  const span = count * (best.horizontal ? width : height) + 8 * Math.max(0, count - 1);
  const box = best.horizontal
    ? {
        x: (best.a.x + best.b.x) / 2 - span / 2 + index * (width + 8),
        y: (best.a.y + best.b.y) / 2 - height - gap,
        width,
        height,
      }
    : {
        x: (best.a.x + best.b.x) / 2 - width - gap,
        y: (best.a.y + best.b.y) / 2 - span / 2 + index * (height + 8),
        width,
        height,
      };
  for (let step = 0; step < 10 && routeHits(points, box); step += 1) {
    if (best.horizontal) box.y -= 8;
    else box.x -= 8;
  }
  return box;
}

function routeHits(points: { x: number; y: number }[], box: { x: number; y: number; width: number; height: number }) {
  const padded = { x: box.x - 4, y: box.y - 4, width: box.width + 8, height: box.height + 8 };
  for (let i = 0; i < points.length - 1; i += 1) {
    if (segmentInside(points[i], points[i + 1], padded)) return true;
  }
  return false;
}

/** Draw the stroke in pieces so it stops at a symbol instead of cutting through it. */
export function strokeAround(points: { x: number; y: number }[], boxes: { x: number; y: number; width: number; height: number }[]) {
  const pad = 4;
  const blocked = boxes.map((box) => ({ x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 }));
  const parts: string[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    let open: [number, number][] = [[0, 1]];
    for (const box of blocked) {
      const hit = segmentInside(a, b, box);
      if (!hit) continue;
      open = open.flatMap(([start, end]) => {
        const from = Math.max(start, hit[0]);
        const to = Math.min(end, hit[1]);
        if (from >= to) return [[start, end] as [number, number]];
        const next: [number, number][] = [];
        if (start < from) next.push([start, from]);
        if (to < end) next.push([to, end]);
        return next;
      });
    }
    for (const [start, end] of open) {
      if (end - start < 0.02) continue;
      const from = { x: a.x + (b.x - a.x) * start, y: a.y + (b.y - a.y) * start };
      const to = { x: a.x + (b.x - a.x) * end, y: a.y + (b.y - a.y) * end };
      if (Math.hypot(to.x - from.x, to.y - from.y) < 1) continue;
      parts.push(`M ${from.x} ${from.y} L ${to.x} ${to.y}`);
    }
  }
  return parts.join(" ");
}

function segmentInside(a: { x: number; y: number }, b: { x: number; y: number }, box: { x: number; y: number; width: number; height: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - box.x, box.x + box.width - a.x, a.y - box.y, box.y + box.height - a.y];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i += 1) {
    if (Math.abs(p[i]) < 1e-6) {
      if (q[i] < 0) return null;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [t0, t1] as [number, number];
}

function packRoute(points: { x: number; y: number }[], from: LinePort, to: LinePort) {
  const cleaned = dedupe(points);
  const corners = cleaned.slice(1, -1);
  const mid = cleaned[Math.floor(cleaned.length / 2)] ?? cleaned[0];
  const path = cleaned.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return { path, label: mid, handle: mid, corners, from, to, points: cleaned };
}

function dedupe(points: { x: number; y: number }[]) {
  return points.filter((point, index) => index === 0 || Math.abs(point.x - points[index - 1].x) > 0.5 || Math.abs(point.y - points[index - 1].y) > 0.5);
}

function dropColinear(points: { x: number; y: number }[]) {
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true;
    const prev = points[index - 1];
    const next = points[index + 1];
    const upright = Math.abs(prev.x - point.x) < 0.5 && Math.abs(point.x - next.x) < 0.5;
    const flat = Math.abs(prev.y - point.y) < 0.5 && Math.abs(point.y - next.y) < 0.5;
    return !upright && !flat;
  });
}

/** A point on the arrowhead, back from the tip along the line, where the head can be grabbed. */
export function arrowSeat(tip: { x: number; y: number }, previous: { x: number; y: number }, distance = 14) {
  const dx = tip.x - previous.x;
  const dy = tip.y - previous.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: tip.x - (dx / length) * distance, y: tip.y - (dy / length) * distance };
}

function portPoint(box: { x: number; y: number; width: number; height: number }, port: LinePort) {
  if (port.side === "n") return { x: clampPort(port.at, box.x, box.width), y: box.y };
  if (port.side === "s") return { x: clampPort(port.at, box.x, box.width), y: box.y + box.height };
  if (port.side === "w") return { x: box.x, y: clampPort(port.at, box.y, box.height) };
  return { x: box.x + box.width, y: clampPort(port.at, box.y, box.height) };
}

function alignOutside(anchor: { x: number; y: number }, side: Side, point: { x: number; y: number }) {
  const stub = 12;
  if (side === "n") return { x: anchor.x, y: Math.min(point.y, anchor.y - stub) };
  if (side === "s") return { x: anchor.x, y: Math.max(point.y, anchor.y + stub) };
  if (side === "w") return { x: Math.min(point.x, anchor.x - stub), y: anchor.y };
  return { x: Math.max(point.x, anchor.x + stub), y: anchor.y };
}

function portFromApproach(box: { x: number; y: number; width: number; height: number }, point: { x: number; y: number }): LinePort {
  const left = point.x < box.x;
  const right = point.x > box.x + box.width;
  const above = point.y < box.y;
  const below = point.y > box.y + box.height;
  if (above && !left && !right) return { side: "n", at: point.x };
  if (below && !left && !right) return { side: "s", at: point.x };
  if (left && !above && !below) return { side: "w", at: point.y };
  if (right && !above && !below) return { side: "e", at: point.y };
  if ((above || below) && (left || right)) {
    const vertical = above ? box.y - point.y : point.y - (box.y + box.height);
    const horizontal = left ? box.x - point.x : point.x - (box.x + box.width);
    if (vertical >= horizontal) return { side: above ? "n" : "s", at: point.x };
    return { side: left ? "w" : "e", at: point.y };
  }
  const distances: { side: Side; gap: number; at: number }[] = [
    { side: "n", gap: Math.abs(point.y - box.y), at: point.x },
    { side: "s", gap: Math.abs(point.y - (box.y + box.height)), at: point.x },
    { side: "w", gap: Math.abs(point.x - box.x), at: point.y },
    { side: "e", gap: Math.abs(point.x - (box.x + box.width)), at: point.y },
  ];
  distances.sort((a, b) => a.gap - b.gap);
  return { side: distances[0].side, at: distances[0].at };
}

function pointToPort(box: { x: number; y: number; width: number; height: number }, point: { x: number; y: number }): LinePort {
  const top = Math.abs(point.y - box.y);
  const bottom = Math.abs(point.y - (box.y + box.height));
  const west = Math.abs(point.x - box.x);
  const east = Math.abs(point.x - (box.x + box.width));
  const nearest = Math.min(top, bottom, west, east);
  if (nearest === top) return { side: "n", at: point.x };
  if (nearest === bottom) return { side: "s", at: point.x };
  if (nearest === west) return { side: "w", at: point.y };
  return { side: "e", at: point.y };
}

function clampPort(value: number, origin: number, size: number) {
  const inset = Math.min(8, size / 3);
  return clamp(value, origin + inset, origin + size - inset);
}

function fitPort(value: number, origin: number, size: number) {
  const inset = Math.min(8, size / 3);
  if (value < origin + inset || value > origin + size - inset) return null;
  return value;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isFlow(value: unknown): value is Flow {
  if (!value || typeof value !== "object") return false;
  const flow = value as Partial<Flow>;
  if (typeof flow.id !== "string") return false;
  if (flow.packaging !== "" && flow.packaging !== "SB" && flow.packaging !== "LV") return false;
  if (TEXT_KEYS.some((key) => typeof flow[key] !== "string")) return false;
  if (BOOL_KEYS.some((key) => typeof flow[key] !== "boolean")) return false;
  return true;
}

const SHARED_NUMBER = /(sequencing|warehouse):(?:LV|SB|X):/g;

/** Sequencing and a warehouse are one symbol per number, whichever packaging uses it. */
export function canonicalizeSequencers(doc: MifaDocument): MifaDocument {
  const rewrite = (id: string) => id.replace(SHARED_NUMBER, "$1:");
  const remap = <T>(record: Record<string, T> | undefined): Record<string, T> | undefined => {
    if (!record) return record;
    const entries = Object.entries(record);
    if (!entries.some(([id]) => rewrite(id) !== id)) return record;
    const next: Record<string, T> = {};
    for (const [id, value] of entries) {
      const key = rewrite(id);
      if (key === id) next[key] = value;
    }
    for (const [id, value] of entries) {
      const key = rewrite(id);
      if (key !== id && !(key in next)) next[key] = value;
    }
    return next;
  };
  const positions = remap(doc.positions) ?? doc.positions;
  const glyphs = remap(doc.glyphs);
  const sizes = remap(doc.sizes);
  const bends = remap(doc.bends);
  const strokes = remap(doc.strokes);
  const icons = remap(doc.icons);
  const poses = remap(doc.poses);
  const locks = remap(doc.locks);
  const links = doc.links?.map((link) => {
    const from = rewrite(link.from);
    const to = rewrite(link.to);
    return from === link.from && to === link.to ? link : { ...link, from, to };
  });
  const stack = doc.stack
    ? { back: doc.stack.back.map(rewrite), front: doc.stack.front.map(rewrite) }
    : undefined;
  const linksChanged = Boolean(doc.links && links?.some((link, index) => link !== doc.links?.[index]));
  const stackChanged = Boolean(doc.stack && stack && (stack.back.some((id, index) => id !== doc.stack?.back[index]) || stack.front.some((id, index) => id !== doc.stack?.front[index])));
  if (
    positions === doc.positions &&
    glyphs === doc.glyphs &&
    sizes === doc.sizes &&
    bends === doc.bends &&
    strokes === doc.strokes &&
    icons === doc.icons &&
    poses === doc.poses &&
    locks === doc.locks &&
    !linksChanged &&
    !stackChanged
  ) {
    return doc;
  }
  return {
    ...doc,
    positions,
    ...(glyphs ? { glyphs } : {}),
    ...(sizes ? { sizes } : {}),
    ...(bends ? { bends } : {}),
    ...(strokes ? { strokes } : {}),
    ...(icons ? { icons } : {}),
    ...(poses ? { poses } : {}),
    ...(locks ? { locks } : {}),
    ...(links ? { links } : {}),
    ...(stack ? { stack } : {}),
    ...(doc.canvas ? { canvas: doc.canvas } : {}),
  };
}

export function parseMifaDocument(value: unknown): MifaDocument | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Partial<MifaDocument>;
  if (!doc.project || typeof doc.project !== "object" || !Array.isArray(doc.flows)) return null;
  const project = doc.project as Partial<ProjectInfo>;
  const keys: (keyof ProjectInfo)[] = ["name", "plant", "shop", "scenario", "rate", "shifts", "perDay", "diversity", "updated"];
  if (keys.some((key) => typeof project[key] !== "string")) return null;
  if (!doc.flows.every(isFlow)) return null;
  const positions: MifaDocument["positions"] = {};
  if (doc.positions && typeof doc.positions === "object") {
    for (const [id, point] of Object.entries(doc.positions)) {
      if (!point || typeof point.x !== "number" || typeof point.y !== "number") continue;
      positions[id] = { x: point.x, y: point.y };
    }
  }
  return canonicalizeSequencers({
    project: { ...emptyProject(), ...project } as ProjectInfo,
    flows: doc.flows.map((flow) => ({ ...flow })),
    positions,
    glyphs: readGlyphs(doc.glyphs),
    marks: readMarks(doc.marks),
    sizes: readSizes(doc.sizes),
    bends: readBends(doc.bends),
    strokes: readStrokes(doc.strokes),
    links: readLinks(doc.links),
    stack: readStack(doc.stack),
    icons: readIcons(doc.icons),
    poses: readPoses(doc.poses),
    locks: readLocks(doc.locks),
    ...(readCanvas(doc.canvas) ? { canvas: readCanvas(doc.canvas) } : {}),
  });
}

function readCanvas(value: unknown): SheetBox | undefined {
  if (!value || typeof value !== "object") return undefined;
  const box = value as Partial<SheetBox>;
  if (typeof box.width !== "number" || typeof box.height !== "number" || box.width < MIN_SHEET_WIDTH || box.height < MIN_SHEET_HEIGHT) return undefined;
  return { x: typeof box.x === "number" ? box.x : 0, y: typeof box.y === "number" ? box.y : 0, width: box.width, height: box.height };
}

function readIcons(value: unknown): MifaDocument["icons"] {
  const icons: NonNullable<MifaDocument["icons"]> = {};
  if (!value || typeof value !== "object") return icons;
  for (const [id, box] of Object.entries(value)) {
    if (!box || typeof box.x !== "number" || typeof box.y !== "number" || typeof box.width !== "number" || typeof box.height !== "number") continue;
    if (box.width <= 0 || box.height <= 0) continue;
    const turn = readTurn(box.turn);
    icons[id] = { x: box.x, y: box.y, width: box.width, height: box.height, ...(box.flip === true ? { flip: true } : {}), ...(turn ? { turn } : {}), ...(box.placed === false ? { placed: false } : {}), ...(box.placed === true ? { placed: true } : {}) };
  }
  return icons;
}

function readLocks(value: unknown): MifaDocument["locks"] {
  if (!value || typeof value !== "object") return undefined;
  const locks: NonNullable<MifaDocument["locks"]> = {};
  for (const [id, locked] of Object.entries(value)) {
    if (locked === true) locks[id] = true;
  }
  return Object.keys(locks).length ? locks : undefined;
}

function readPoses(value: unknown): MifaDocument["poses"] {
  const poses: NonNullable<MifaDocument["poses"]> = {};
  if (!value || typeof value !== "object") return poses;
  for (const [id, pose] of Object.entries(value as Record<string, { flip?: unknown; turn?: unknown }>)) {
    const turn = readTurn(pose?.turn);
    const flip = pose?.flip === true;
    if (!flip && !turn) continue;
    poses[id] = { ...(flip ? { flip: true } : {}), ...(turn ? { turn } : {}) };
  }
  return poses;
}

function readTurn(value: unknown): QuarterTurn | undefined {
  if (value === 90 || value === 180 || value === 270) return value;
  return undefined;
}

function readStack(value: unknown): StackOrder {
  const empty = { back: [] as string[], front: [] as string[] };
  if (!value || typeof value !== "object") return empty;
  const stack = value as Partial<StackOrder>;
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((id): id is string => typeof id === "string" && id.length > 0) : []);
  return { back: ids(stack.back), front: ids(stack.front) };
}

function readStrokes(value: unknown): Record<string, StrokeStyle> {
  const strokes: Record<string, StrokeStyle> = {};
  if (!value || typeof value !== "object") return strokes;
  for (const [id, style] of Object.entries(value as Record<string, Partial<StrokeStyle>>)) {
    if (typeof style?.color !== "string" || typeof style.dash !== "string") continue;
    const arrow = style.arrow === "end" || style.arrow === "start" || style.arrow === "both" || style.arrow === "none" ? style.arrow : undefined;
    strokes[id] = { color: style.color, dash: style.dash, ...(arrow ? { arrow } : {}) };
  }
  return strokes;
}

function readLinks(value: unknown): DrawnLink[] {
  if (!Array.isArray(value)) return [];
  const kinds = new Set<string>(FLOW_KINDS.map((item) => item.id));
  const links: DrawnLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const link = item as Partial<DrawnLink>;
    if (typeof link.id !== "string" || typeof link.from !== "string" || typeof link.to !== "string") continue;
    if (typeof link.kind !== "string" || !kinds.has(link.kind)) continue;
    links.push({ id: link.id, from: link.from, to: link.to, kind: link.kind as FlowKind, label: typeof link.label === "string" ? link.label : "" });
  }
  return links;
}

function readBends(value: unknown): Record<string, LineBend> {
  const bends: Record<string, LineBend> = {};
  if (!value || typeof value !== "object") return bends;
  for (const [id, point] of Object.entries(value as Record<string, Partial<LineBend>>)) {
    if (typeof point?.x !== "number" || typeof point.y !== "number") continue;
    const corners = Array.isArray(point.corners)
      ? point.corners.filter((corner) => corner && typeof corner.x === "number" && typeof corner.y === "number").map((corner) => ({ x: corner.x, y: corner.y }))
      : [];
    const bend: LineBend = { x: point.x, y: point.y };
    const from = readPort(point.from);
    const to = readPort(point.to);
    if (from) bend.from = from;
    if (to) bend.to = to;
    if (corners.length) bend.corners = corners;
    if (point.shaped === true) bend.shaped = true;
    bends[id] = bend;
  }
  return bends;
}

function readPort(value: unknown): LinePort | undefined {
  if (!value || typeof value !== "object") return undefined;
  const port = value as Partial<LinePort>;
  if (port.side !== "n" && port.side !== "e" && port.side !== "s" && port.side !== "w") return undefined;
  if (typeof port.at !== "number") return undefined;
  return { side: port.side, at: port.at };
}

function readPaint(value: unknown): string | undefined {
  if (value === "none") return "none";
  if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  return undefined;
}

function readMarks(value: unknown): Mark[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>(SYMBOLS.map((item) => item.id));
  const marks: Mark[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const mark = item as Partial<Mark>;
    if (typeof mark.id !== "string" || typeof mark.name !== "string") continue;
    if (typeof mark.symbol !== "string" || !ids.has(mark.symbol)) continue;
    if (typeof mark.x !== "number" || typeof mark.y !== "number") continue;
    const width = typeof mark.width === "number" && mark.width > 0 ? mark.width : undefined;
    const height = typeof mark.height === "number" && mark.height > 0 ? mark.height : undefined;
    const shape = mark.shape === "text" || mark.shape === "rectangle" || mark.shape === "ellipse" ? mark.shape : undefined;
    const artwork = typeof mark.artwork === "string" && ART_BY_ID[mark.artwork] ? mark.artwork : undefined;
    const turn = readTurn(mark.turn);
    const align = mark.align === "left" || mark.align === "right" ? mark.align : undefined;
    const color = readPaint(mark.color);
    const fill = readPaint(mark.fill);
    const border = readPaint(mark.border);
    const weight = typeof mark.weight === "number" && mark.weight >= 0 && mark.weight <= 8 ? mark.weight : undefined;
    marks.push({
      id: mark.id,
      name: mark.name,
      symbol: mark.symbol as SymbolId,
      x: mark.x,
      y: mark.y,
      width,
      height,
      shape,
      ...(artwork ? { artwork } : {}),
      ...(mark.flip === true ? { flip: true } : {}),
      ...(turn ? { turn } : {}),
      ...(color && color !== "none" ? { color } : {}),
      ...(align ? { align } : {}),
      ...(mark.bold === true ? { bold: true } : {}),
      ...(typeof mark.font === "number" && mark.font > 0 ? { font: clampFont(mark.font) } : {}),
      ...(fill ? { fill } : {}),
      ...(border && border !== "none" ? { border } : {}),
      ...(weight !== undefined && weight !== 1 ? { weight } : {}),
    });
  }
  return marks;
}

function readSizes(value: unknown): Record<string, BoxSize> {
  const sizes: Record<string, BoxSize> = {};
  if (!value || typeof value !== "object") return sizes;
  for (const [id, box] of Object.entries(value as Record<string, Partial<BoxSize>>)) {
    if (typeof box?.width !== "number" || typeof box.height !== "number" || box.width <= 0 || box.height <= 0) continue;
    sizes[id] = { width: box.width, height: box.height };
  }
  return sizes;
}

function boxSize(doc: MifaDocument, id: string, symbol: SymbolId): BoxSize {
  const saved = doc.sizes?.[id];
  const base = SYMBOL_SIZE[symbol];
  return { width: saved?.width ?? base.width, height: saved?.height ?? base.height };
}

function readGlyphs(value: unknown): Record<string, SymbolId> {
  const glyphs: Record<string, SymbolId> = {};
  if (!value || typeof value !== "object") return glyphs;
  const ids = new Set<string>(SYMBOLS.map((item) => item.id));
  for (const [id, symbol] of Object.entries(value)) {
    if (typeof symbol === "string" && ids.has(symbol)) glyphs[id] = symbol as SymbolId;
  }
  return glyphs;
}
