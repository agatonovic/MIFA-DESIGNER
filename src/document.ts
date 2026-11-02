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
  { id: "material", label: "Material", hint: "Full parts" },
  { id: "information", label: "Information", hint: "Signal" },
  { id: "empty", label: "Empty return", hint: "Packaging back" },
] as const;

export type FlowKind = (typeof FLOW_KINDS)[number]["id"];

export type MifaNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  symbol: SymbolId;
  label: string;
};

export type MifaEdge = {
  id: string;
  from: string;
  to: string;
  kind: FlowKind;
  label: string;
};

export type MifaDocument = {
  name: string;
  nodes: MifaNode[];
  edges: MifaEdge[];
};

export type PathSet = {
  nodes: Set<string>;
  edges: Set<string>;
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

const SYMBOL_IDS = new Set<string>(SYMBOLS.map((item) => item.id));
const FLOW_IDS = new Set<string>(FLOW_KINDS.map((item) => item.id));
const PLACEHOLDER_LABELS = new Set<string>(SYMBOLS.map((item) => item.label));

export function symbolLabel(symbol: SymbolId) {
  return SYMBOLS.find((item) => item.id === symbol)?.label ?? "Step";
}

export function isPlaceholderLabel(label: string) {
  return PLACEHOLDER_LABELS.has(label);
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function snap(value: number, grid = 8) {
  return Math.round(value / grid) * grid;
}

export function emptyDocument(): MifaDocument {
  return { name: "Untitled MIFA", nodes: [], edges: [] };
}

export function exampleDocument(): MifaDocument {
  const node = (
    id: string,
    symbol: SymbolId,
    x: number,
    y: number,
    label: string,
  ): MifaNode => {
    const size = SYMBOL_SIZE[symbol];
    return { id, symbol, x, y, width: size.width, height: size.height, label };
  };
  return {
    name: "Inbound example",
    nodes: [
      node("supplier", "supplier", 48, 248, "Supplier"),
      node("dock", "dock", 232, 256, "Dock"),
      node("warehouse", "warehouse", 424, 236, "Warehouse"),
      node("kitting", "kitting", 656, 132, "Kitting"),
      node("sequencing", "sequencing", 648, 360, "Sequencing"),
      node("line", "production", 880, 228, "Line"),
      node("empties", "empty", 904, 420, "Empties"),
      node("wms", "it", 438, 64, "WMS"),
    ],
    edges: [
      { id: "e1", from: "supplier", to: "dock", kind: "material", label: "Truck" },
      { id: "e2", from: "dock", to: "warehouse", kind: "material", label: "Forklift" },
      { id: "e3", from: "warehouse", to: "kitting", kind: "material", label: "" },
      { id: "e4", from: "warehouse", to: "sequencing", kind: "material", label: "" },
      { id: "e5", from: "kitting", to: "line", kind: "material", label: "Tugger" },
      { id: "e6", from: "sequencing", to: "line", kind: "material", label: "Tugger" },
      { id: "e7", from: "line", to: "empties", kind: "empty", label: "Return" },
      { id: "e8", from: "wms", to: "warehouse", kind: "information", label: "Kanban" },
    ],
  };
}

function walk(
  doc: MifaDocument,
  start: string,
  direction: "upstream" | "downstream",
  nodes: Set<string>,
  edges: Set<string>,
) {
  const queue = [start];
  const seen = new Set([start]);
  nodes.add(start);
  while (queue.length) {
    const id = queue.pop()!;
    for (const edge of doc.edges) {
      const next = direction === "upstream" ? (edge.to === id ? edge.from : null) : edge.from === id ? edge.to : null;
      if (!next) continue;
      edges.add(edge.id);
      if (seen.has(next)) continue;
      seen.add(next);
      nodes.add(next);
      queue.push(next);
    }
  }
}

export function pathThroughNode(doc: MifaDocument, nodeId: string): PathSet {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  if (!doc.nodes.some((node) => node.id === nodeId)) return { nodes, edges };
  walk(doc, nodeId, "upstream", nodes, edges);
  walk(doc, nodeId, "downstream", nodes, edges);
  return { nodes, edges };
}

export function pathThroughEdge(doc: MifaDocument, edgeId: string): PathSet {
  const edge = doc.edges.find((item) => item.id === edgeId);
  const nodes = new Set<string>();
  const edges = new Set<string>();
  if (!edge) return { nodes, edges };
  walk(doc, edge.from, "upstream", nodes, edges);
  walk(doc, edge.to, "downstream", nodes, edges);
  edges.add(edge.id);
  return { nodes, edges };
}

export function edgeRoute(from: MifaNode, to: MifaNode) {
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
  return {
    path,
    label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

export function parseMifaDocument(value: unknown): MifaDocument | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as Partial<MifaDocument>;
  if (typeof doc.name !== "string" || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) return null;
  for (const node of doc.nodes) {
    if (!node || typeof node !== "object") return null;
    const item = node as Partial<MifaNode>;
    if (typeof item.id !== "string" || typeof item.label !== "string") return null;
    if (typeof item.symbol !== "string" || !SYMBOL_IDS.has(item.symbol)) return null;
    if ([item.x, item.y, item.width, item.height].some((n) => typeof n !== "number" || !Number.isFinite(n))) return null;
  }
  const ids = new Set(doc.nodes.map((node) => node.id));
  for (const edge of doc.edges) {
    if (!edge || typeof edge !== "object") return null;
    const item = edge as Partial<MifaEdge>;
    if (typeof item.id !== "string" || typeof item.label !== "string") return null;
    if (typeof item.from !== "string" || typeof item.to !== "string") return null;
    if (!ids.has(item.from) || !ids.has(item.to) || item.from === item.to) return null;
    if (typeof item.kind !== "string" || !FLOW_IDS.has(item.kind)) return null;
  }
  return {
    name: doc.name,
    nodes: doc.nodes.map((node) => ({ ...node })),
    edges: doc.edges.map((edge) => ({ ...edge })),
  };
}
