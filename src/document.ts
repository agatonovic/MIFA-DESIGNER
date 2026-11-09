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
  icons?: Record<string, { x: number; y: number; width: number; height: number }>;
};

export type Side = "n" | "e" | "s" | "w";

export type LinePort = { side: Side; at: number };

export type LineBend = {
  x: number;
  y: number;
  from?: LinePort;
  to?: LinePort;
  corners?: { x: number; y: number }[];
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
  width: number;
  height: number;
};

export const SHEET_WIDTH = 2800;
export const SHEET_HEIGHT = 1800;

export const SYMBOL_SIZE: Record<SymbolId, { width: number; height: number }> = {
  rectangle: { width: 148, height: 64 },
  supplier: { width: 132, height: 88 },
  dock: { width: 128, height: 76 },
  warehouse: { width: 156, height: 92 },
  supermarket: { width: 156, height: 88 },
  kitting: { width: 132, height: 80 },
  sequencing: { width: 148, height: 80 },
  production: { width: 92, height: 280 },
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
    const warehouseId = warehouse
      ? ensureNode(nodes, "warehouse", `${pack}:${warehouse}`, `${pack === "X" ? "WH" : pack} ${warehouse}`, lane, flow.id)
      : "";
    const kitId = kit ? ensureNode(nodes, "kitting", `${pack}:${kit}`, named("Kit", kit), lane, flow.id) : "";
    const seqId = seq ? ensureNode(nodes, "sequencing", `${pack}:${seq}`, named("Seq", seq), lane, flow.id) : "";
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
      const override = doc.positions[node.id];
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
    const pos = doc.positions[node.id];
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
    const pos = doc.positions[node.id];
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
    const override = doc.positions[node.id];
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

  return { nodes: sheetNodes, edges: sheetEdges, width: SHEET_WIDTH, height: SHEET_HEIGHT };
}

export function pathForFlows(sheet: Sheet, flowIds: Iterable<string>) {
  const wanted = new Set(flowIds);
  return {
    nodes: new Set(sheet.nodes.filter((node) => node.flowIds.some((id) => wanted.has(id))).map((node) => node.id)),
    edges: new Set(sheet.edges.filter((edge) => edge.flowIds.some((id) => wanted.has(id))).map((edge) => edge.id)),
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

export function edgeRoute(from: SheetNode, to: SheetNode, bend?: LineBend, lane = 0) {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  if (bend?.corners?.length) {
    const fromPort = bend.from ?? portFromApproach(source, bend.corners[0]);
    const toPort = bend.to ?? portFromApproach(target, bend.corners[bend.corners.length - 1]);
    const points = routeThrough(portPoint(source, fromPort), portPoint(target, toPort), fromPort.side, toPort.side, bend.corners[0], bend.corners[bend.corners.length - 1]);
    return packRoute(points, fromPort, toPort);
  }
  const fromCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const toCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const placed = Math.abs(bend?.x ?? 0) > 0.5 || Math.abs(bend?.y ?? 0) > 0.5;
  const laneShift = placed ? 0 : lane * 16;
  const shiftX = (bend?.x ?? 0) + (horizontal ? 0 : laneShift);
  const shiftY = (bend?.y ?? 0) + (horizontal ? laneShift : 0);
  const centeredY = Math.abs(shiftY) < 0.5 ? fitPort(toCenter.y, source.y, source.height) : null;
  const centeredX = Math.abs(shiftX) < 0.5 ? fitPort(toCenter.x, source.x, source.width) : null;
  const start = horizontal
    ? { x: dx >= 0 ? source.x + source.width : source.x, y: centeredY ?? clampPort(fromCenter.y + shiftY, source.y, source.height) }
    : { x: centeredX ?? clampPort(fromCenter.x + shiftX, source.x, source.width), y: dy >= 0 ? source.y + source.height : source.y };
  const end = horizontal
    ? { x: dx >= 0 ? target.x : target.x + target.width, y: centeredY ?? clampPort(toCenter.y + shiftY, target.y, target.height) }
    : { x: centeredX ?? clampPort(toCenter.x + shiftX, target.x, target.width), y: dy >= 0 ? target.y : target.y + target.height };
  const midX = clamp((start.x + end.x) / 2 + shiftX, 8, SHEET_WIDTH - 8);
  const midY = clamp((start.y + end.y) / 2 + shiftY, 8, SHEET_HEIGHT - 8);
  const points = horizontal
    ? [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
    : [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
  return packRoute(dropColinear(dedupe(points)), pointToPort(source, start), pointToPort(target, end));
}

export function bendFromCorner(from: SheetNode, to: SheetNode, bend: LineBend | undefined, index: number, point: { x: number; y: number }): LineBend {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  const route = edgeRoute(from, to, bend);
  const atEnd = route.corners.length === 0 || index >= route.corners.length - 1;
  const fromPort = atEnd ? route.from : portFromApproach(source, point);
  const toPort = atEnd ? portFromApproach(target, point) : route.to;
  const jogAt = atEnd ? (route.corners[0] ?? point) : point;
  const approachAt = atEnd ? point : (route.corners[route.corners.length - 1] ?? route.handle);
  const points = routeThrough(portPoint(source, fromPort), portPoint(target, toPort), fromPort.side, toPort.side, jogAt, approachAt);
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

function moveNode(doc: MifaDocument, node: SheetNode, at: { x: number; y: number }): MifaDocument {
  const x = Math.min(Math.max(0, at.x), Math.max(0, SHEET_WIDTH - node.width));
  const y = Math.min(Math.max(0, at.y), Math.max(0, SHEET_HEIGHT - node.height));
  if (node.id.startsWith("mark-")) {
    return { ...doc, marks: (doc.marks ?? []).map((mark) => (mark.id === node.id ? { ...mark, x, y } : mark)) };
  }
  return { ...doc, positions: { ...doc.positions, [node.id]: { x, y } } };
}

export function centerPortsOnMove(doc: MifaDocument, movedIds: string[]): MifaDocument {
  if (!doc.bends || movedIds.length === 0) return doc;
  const moved = new Set(movedIds);
  const laid = buildSheet(doc);
  let bends = doc.bends;
  let changed = false;
  const consider = (id: string, fromId: string, toId: string) => {
    const bend = bends[id];
    if (!bend) return;
    const fromMoved = moved.has(fromId);
    const toMoved = moved.has(toId);
    if (!fromMoved && !toMoved) return;
    const from = nodeById(doc, laid, fromId);
    const to = nodeById(doc, laid, toId);
    if (!from || !to) return;
    const next = retargetBend(bend, from, to, fromMoved, toMoved);
    if (next === bend) return;
    if (!changed) bends = { ...bends };
    bends[id] = next;
    changed = true;
  };
  for (const edge of laid.edges) consider(edge.id, edge.from, edge.to);
  for (const link of doc.links ?? []) consider(link.id, link.from, link.to);
  return changed ? { ...doc, bends } : doc;
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

function retargetBend(bend: LineBend, from: SheetNode, to: SheetNode, fromMoved: boolean, toMoved: boolean): LineBend {
  const source = symbolOutline(from);
  const target = symbolOutline(to);
  if (!bend.corners?.length && !bend.from && !bend.to) {
    const horizontal = Math.abs(target.x + target.width / 2 - (source.x + source.width / 2)) >= Math.abs(target.y + target.height / 2 - (source.y + source.height / 2));
    const x = horizontal ? bend.x : 0;
    const y = horizontal ? 0 : bend.y;
    if (x === bend.x && y === bend.y) return bend;
    return { ...bend, x, y };
  }
  let fromPort = bend.from;
  let toPort = bend.to;
  if (bend.corners?.length) {
    fromPort = fromPort ?? portFromApproach(source, bend.corners[0]);
    toPort = toPort ?? portFromApproach(target, bend.corners[bend.corners.length - 1]);
  }
  const nextFrom = fromPort && fromMoved ? portAfterMove(fromPort, source) : fromPort;
  const nextTo = toPort && toMoved ? portAfterMove(toPort, target) : toPort;
  if (nextFrom === bend.from && nextTo === bend.to) return bend;
  return { ...bend, ...(nextFrom ? { from: nextFrom } : {}), ...(nextTo ? { to: nextTo } : {}) };
}

function portAfterMove(port: LinePort, box: { x: number; y: number; width: number; height: number }): LinePort {
  const across = port.side === "n" || port.side === "s";
  const origin = across ? box.x : box.y;
  const size = across ? box.width : box.height;
  const center = origin + size / 2;
  if (Math.abs(center - port.at) < 0.5) return port;
  return { side: port.side, at: center };
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
  const points = routeThrough(portPoint(source, fromPort), portPoint(target, toPort), fromPort.side, toPort.side, movedJog, movedApproach);
  return { x: 0, y: 0, from: fromPort, to: toPort, corners: points.slice(1, -1) };
}

function routeThrough(start: { x: number; y: number }, end: { x: number; y: number }, fromSide: Side, toSide: Side, jogAt: { x: number; y: number }, approachAt: { x: number; y: number }) {
  const departH = fromSide === "e" || fromSide === "w";
  const arriveH = toSide === "e" || toSide === "w";
  const approach = alignOutside(end, toSide, approachAt);
  if (departH !== arriveH) {
    const elbow = departH ? { x: approach.x, y: start.y } : { x: start.x, y: approach.y };
    return dropColinear(dedupe([start, elbow, approach, end]));
  }
  const jog = departH ? jogAt.x : jogAt.y;
  const points = departH
    ? [start, { x: jog, y: start.y }, { x: jog, y: approach.y }, approach, end]
    : [start, { x: start.x, y: jog }, { x: approach.x, y: jog }, approach, end];
  return dropColinear(dedupe(points));
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
  return {
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
  };
}

function readIcons(value: unknown): MifaDocument["icons"] {
  const icons: NonNullable<MifaDocument["icons"]> = {};
  if (!value || typeof value !== "object") return icons;
  for (const [id, box] of Object.entries(value)) {
    if (!box || typeof box.x !== "number" || typeof box.y !== "number" || typeof box.width !== "number" || typeof box.height !== "number") continue;
    if (box.width <= 0 || box.height <= 0) continue;
    icons[id] = { x: box.x, y: box.y, width: box.width, height: box.height };
  }
  return icons;
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
    marks.push({ id: mark.id, name: mark.name, symbol: mark.symbol as SymbolId, x: mark.x, y: mark.y, width, height, shape, ...(artwork ? { artwork } : {}) });
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
