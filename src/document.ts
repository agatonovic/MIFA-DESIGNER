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

export type MifaDocument = {
  project: ProjectInfo;
  flows: Flow[];
  positions: Record<string, { x: number; y: number }>;
};

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

export const SYMBOL_SIZE: Record<SymbolId, { width: number; height: number }> = {
  rectangle: { width: 148, height: 64 },
  supplier: { width: 132, height: 88 },
  dock: { width: 128, height: 76 },
  warehouse: { width: 156, height: 92 },
  supermarket: { width: 156, height: 88 },
  kitting: { width: 132, height: 80 },
  sequencing: { width: 148, height: 80 },
  production: { width: 188, height: 72 },
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
    const sorted = [...group].sort((a, b) => {
      const lane = Math.min(...a.lanes) - Math.min(...b.lanes);
      if (lane !== 0) return lane;
      if (a.kind !== b.kind) return a.kind === "kitting" ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    const cursor = [top, top + 280];
    for (const node of sorted) {
      const size = SYMBOL_SIZE[KIND_SYMBOL[node.kind]];
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

  itNodes.forEach((node, index) => {
    const size = SYMBOL_SIZE.it;
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
      symbol: KIND_SYMBOL[node.kind],
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

  const maxX = sheetNodes.reduce((max, node) => Math.max(max, node.x + node.width), 900);
  const maxY = sheetNodes.reduce((max, node) => Math.max(max, node.y + node.height), 640);
  return { nodes: sheetNodes, edges: sheetEdges, width: Math.max(1680, maxX + 120), height: Math.max(860, maxY + 120) };
}

export function pathForFlows(sheet: Sheet, flowIds: Iterable<string>) {
  const wanted = new Set(flowIds);
  return {
    nodes: new Set(sheet.nodes.filter((node) => node.flowIds.some((id) => wanted.has(id))).map((node) => node.id)),
    edges: new Set(sheet.edges.filter((edge) => edge.flowIds.some((id) => wanted.has(id))).map((edge) => edge.id)),
  };
}

export function edgeRoute(from: SheetNode, to: SheetNode) {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const start = horizontal
    ? { x: dx >= 0 ? from.x + from.width : from.x, y: fromCenter.y }
    : { x: fromCenter.x, y: dy >= 0 ? from.y + from.height : from.y };
  const end = horizontal
    ? { x: dx >= 0 ? to.x : to.x + to.width, y: toCenter.y }
    : { x: toCenter.x, y: dy >= 0 ? to.y : to.y + to.height };
  const path = horizontal
    ? `M ${start.x} ${start.y} L ${(start.x + end.x) / 2} ${start.y} L ${(start.x + end.x) / 2} ${end.y} L ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} L ${start.x} ${(start.y + end.y) / 2} L ${end.x} ${(start.y + end.y) / 2} L ${end.x} ${end.y}`;
  return { path, label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } };
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
  };
}
