import { blankFlow, buildSheet, createId, snap, type Flow, type FlowKind, type MifaDocument, type SymbolId } from "./document";

export const STAMPS = [
  { id: "supplier", label: "Supplier", symbol: "supplier" },
  { id: "dock", label: "Dock", symbol: "dock" },
  { id: "buffer", label: "Buffer", symbol: "stock" },
  { id: "warehouse", label: "Warehouse", symbol: "warehouse" },
  { id: "supermarket", label: "Supermarket", symbol: "supermarket" },
  { id: "kitting", label: "Kitting", symbol: "kitting" },
  { id: "sequencing", label: "Sequencing", symbol: "sequencing" },
  { id: "production", label: "Line", symbol: "production" },
  { id: "empties", label: "Empties", symbol: "empty" },
  { id: "emptiesDock", label: "Empty dock", symbol: "dock" },
  { id: "it", label: "IT", symbol: "it" },
] as const;

export type StampId = (typeof STAMPS)[number]["id"];

export type Placement = {
  document: MifaDocument;
  flowId: string;
  nodeId: string;
};

function splitNode(id: string) {
  const index = id.indexOf(":");
  return { kind: id.slice(0, index), rest: id.slice(index + 1) };
}

function packAndNumber(rest: string) {
  const index = rest.indexOf(":");
  if (index === -1) return { pack: "", number: rest };
  return { pack: rest.slice(0, index), number: rest.slice(index + 1) };
}

function nextFree(used: Set<string>) {
  let number = 1;
  while (used.has(String(number))) number += 1;
  return String(number);
}

function nextName(used: Set<string>, base: string) {
  if (!used.has(base)) return base;
  let number = 2;
  while (used.has(`${base} ${number}`)) number += 1;
  return `${base} ${number}`;
}

function packOf(flow: Flow) {
  return flow.packaging === "LV" ? "LV" : "SB";
}

export function nodeMatches(flow: Flow, id: string) {
  const { kind, rest } = splitNode(id);
  const packed = packAndNumber(rest);
  const pack = flow.packaging || "X";
  if (kind === "supplier") return flow.supplier.trim() === rest;
  if (kind === "dock") return flow.dock.trim() === rest;
  if (kind === "buffer") return flow.unloadingBuffer && flow.bufferNumber.trim() === packed.number && pack === packed.pack;
  if (kind === "warehouse") return flow.warehouse.trim() === packed.number && pack === packed.pack;
  if (kind === "kitting") return !flow.direct && flow.kitting && flow.kitNumber.trim() === packed.number && pack === packed.pack;
  if (kind === "sequencing") return !flow.direct && flow.sequencing && flow.sequencingNumber.trim() === packed.number && pack === packed.pack;
  if (kind === "line") return flow.productionLine.trim() === rest;
  if (kind === "empties") return flow.emptiesStore.trim() === packed.number && pack === packed.pack;
  if (kind === "emptiesDock") return flow.emptiesDock.trim() === rest;
  if (kind === "it") return flow.system.trim() === rest;
  return false;
}

export function omitSymbols(doc: MifaDocument, ids: string[]): MifaDocument {
  const gone = new Set(ids.filter(Boolean));
  if (!gone.size) return doc;
  let flows = doc.flows;
  const positions = { ...doc.positions };
  const glyphs = { ...(doc.glyphs ?? {}) };
  const sizes = doc.sizes ? { ...doc.sizes } : undefined;
  for (const id of gone) {
    if (id.startsWith("mark-")) continue;
    flows = flows.map((flow) => stripNode(flow, id));
    if (!flows.some((flow) => nodeMatches(flow, id))) {
      delete positions[id];
      delete glyphs[id];
      if (sizes) delete sizes[id];
    }
  }
  const marks = doc.marks?.filter((mark) => !gone.has(mark.id));
  const links = doc.links?.filter((link) => !gone.has(link.from) && !gone.has(link.to));
  const stack = doc.stack
    ? { back: doc.stack.back.filter((id) => !gone.has(id)), front: doc.stack.front.filter((id) => !gone.has(id)) }
    : undefined;
  return { ...doc, flows, positions, glyphs, ...(sizes ? { sizes } : {}), ...(marks ? { marks } : {}), ...(links ? { links } : {}), ...(stack ? { stack } : {}) };
}

export function stripNode(flow: Flow, id: string): Flow {
  if (!nodeMatches(flow, id)) return flow;
  const next = { ...flow };
  const { kind } = splitNode(id);
  if (kind === "supplier") next.supplier = "";
  else if (kind === "dock") next.dock = "";
  else if (kind === "buffer") {
    next.unloadingBuffer = false;
    next.bufferNumber = "";
  } else if (kind === "warehouse") next.warehouse = "";
  else if (kind === "kitting") {
    next.kitting = false;
    next.kitNumber = "";
  } else if (kind === "sequencing") {
    next.sequencing = false;
    next.sequencingNumber = "";
  } else if (kind === "line") next.productionLine = "";
  else if (kind === "empties") next.emptiesStore = "";
  else if (kind === "emptiesDock") next.emptiesDock = "";
  else if (kind === "it") next.system = "";
  return next;
}

function absorb(flow: Flow, id: string): Flow {
  const next = { ...flow };
  const { kind, rest } = splitNode(id);
  const packed = packAndNumber(rest);
  const applyPack = () => {
    if (packed.pack === "SB" || packed.pack === "LV") next.packaging = packed.pack;
  };
  if (kind === "supplier") next.supplier = rest;
  else if (kind === "dock") next.dock = rest;
  else if (kind === "buffer") {
    next.unloadingBuffer = true;
    next.bufferNumber = packed.number;
    applyPack();
  } else if (kind === "warehouse") {
    next.warehouse = packed.number;
    applyPack();
  } else if (kind === "kitting") {
    next.kitting = true;
    next.direct = false;
    next.kitNumber = packed.number;
    applyPack();
  } else if (kind === "sequencing") {
    next.sequencing = true;
    next.direct = false;
    next.sequencingNumber = packed.number;
    applyPack();
  } else if (kind === "line") next.productionLine = rest;
  else if (kind === "empties") {
    next.emptiesStore = packed.number;
    applyPack();
  } else if (kind === "emptiesDock") next.emptiesDock = rest;
  else if (kind === "it") next.system = rest;
  return next;
}

function slotFilled(flow: Flow, stamp: StampId) {
  if (stamp === "supplier") return Boolean(flow.supplier.trim());
  if (stamp === "dock") return Boolean(flow.dock.trim());
  if (stamp === "buffer") return flow.unloadingBuffer && Boolean(flow.bufferNumber.trim());
  if (stamp === "warehouse" || stamp === "supermarket") return Boolean(flow.warehouse.trim());
  if (stamp === "kitting") return flow.kitting && Boolean(flow.kitNumber.trim());
  if (stamp === "sequencing") return flow.sequencing && Boolean(flow.sequencingNumber.trim());
  if (stamp === "production") return Boolean(flow.productionLine.trim());
  if (stamp === "empties") return Boolean(flow.emptiesStore.trim());
  if (stamp === "emptiesDock") return Boolean(flow.emptiesDock.trim());
  return Boolean(flow.system.trim());
}

function assignStamp(flow: Flow, stamp: StampId, doc: MifaDocument) {
  const next = { ...flow };
  let glyph: SymbolId | undefined;
  const names = (read: (flow: Flow) => string) => new Set(doc.flows.map(read).map((value) => value.trim()).filter(Boolean));

  if (stamp === "supplier") {
    next.supplier = nextName(names((item) => item.supplier), "Supplier");
  } else if (stamp === "dock") {
    next.dock = nextFree(names((item) => item.dock));
  } else if (stamp === "production") {
    next.productionLine = nextName(names((item) => item.productionLine), "Line");
  } else if (stamp === "emptiesDock") {
    next.emptiesDock = nextFree(names((item) => item.emptiesDock));
  } else if (stamp === "it") {
    next.system = nextName(names((item) => item.system), "IT");
  } else {
    if (!next.packaging) next.packaging = "SB";
    const pack = packOf(next);
    const numbers = new Set(
      doc.flows
        .filter((item) => packOf(item) === pack)
        .map((item) => {
          if (stamp === "buffer") return item.unloadingBuffer ? item.bufferNumber : "";
          if (stamp === "kitting") return item.kitting ? item.kitNumber : "";
          if (stamp === "sequencing") return item.sequencing ? item.sequencingNumber : "";
          if (stamp === "empties") return item.emptiesStore;
          return item.warehouse;
        })
        .map((value) => value.trim())
        .filter(Boolean),
    );
    const number = nextFree(numbers);
    if (stamp === "buffer") {
      next.unloadingBuffer = true;
      next.bufferNumber = number;
    } else if (stamp === "kitting") {
      next.kitting = true;
      next.direct = false;
      next.kitNumber = number;
    } else if (stamp === "sequencing") {
      next.sequencing = true;
      next.direct = false;
      next.sequencingNumber = number;
    } else if (stamp === "empties") {
      next.emptiesStore = number;
    } else {
      next.warehouse = number;
      if (stamp === "supermarket") glyph = "supermarket";
    }
  }

  return { flow: next, nodeId: nodeIdFor(next, stamp), glyph };
}

function nodeIdFor(flow: Flow, stamp: StampId) {
  const pack = flow.packaging || "X";
  if (stamp === "supplier") return `supplier:${flow.supplier.trim()}`;
  if (stamp === "dock") return `dock:${flow.dock.trim()}`;
  if (stamp === "buffer") return `buffer:${pack}:${flow.bufferNumber.trim()}`;
  if (stamp === "warehouse" || stamp === "supermarket") return `warehouse:${pack}:${flow.warehouse.trim()}`;
  if (stamp === "kitting") return `kitting:${pack}:${flow.kitNumber.trim()}`;
  if (stamp === "sequencing") return `sequencing:${pack}:${flow.sequencingNumber.trim()}`;
  if (stamp === "production") return `line:${flow.productionLine.trim()}`;
  if (stamp === "empties") return `empties:${pack}:${flow.emptiesStore.trim()}`;
  if (stamp === "emptiesDock") return `emptiesDock:${flow.emptiesDock.trim()}`;
  return `it:${flow.system.trim()}`;
}

function remember(doc: MifaDocument, nodeId: string, at: { x: number; y: number }, glyph?: SymbolId): MifaDocument {
  const glyphs = { ...(doc.glyphs ?? {}) };
  if (glyph) glyphs[nodeId] = glyph;
  return {
    ...doc,
    positions: { ...doc.positions, [nodeId]: { x: snap(at.x), y: snap(at.y) } },
    glyphs,
  };
}

export function placeSymbol(doc: MifaDocument, flowId: string | null, stamp: StampId, at: { x: number; y: number }): Placement {
  const selected = flowId ? doc.flows.find((flow) => flow.id === flowId) : undefined;
  let flow: Flow;
  let flows = doc.flows;
  if (!selected || slotFilled(selected, stamp)) {
    flow = blankFlow(String(doc.flows.length + 1));
    flow.building = selected?.building || doc.project.shop || "";
    flow.packaging = selected?.packaging || "";
    flows = [...doc.flows, flow];
  } else {
    flow = { ...selected };
  }
  const assigned = assignStamp(flow, stamp, doc);
  flow = assigned.flow;
  const document = remember(
    { ...doc, flows: flows.map((item) => (item.id === flow.id ? flow : item)) },
    assigned.nodeId,
    at,
    assigned.glyph,
  );
  return { document, flowId: flow.id, nodeId: assigned.nodeId };
}

export function retargetNode(doc: MifaDocument, nodeId: string, flowId: string, stamp: StampId, at: { x: number; y: number }): Placement {
  const flows = doc.flows.map((flow) => (flow.id === flowId ? stripNode(flow, nodeId) : flow));
  let next: MifaDocument = { ...doc, flows };
  if (!flows.some((flow) => nodeMatches(flow, nodeId))) {
    const positions = { ...next.positions };
    const glyphs = { ...(next.glyphs ?? {}) };
    delete positions[nodeId];
    delete glyphs[nodeId];
    next = { ...next, positions, glyphs };
  }
  return placeSymbol(next, flowId, stamp, at);
}

function writeTransport(flow: Flow, key: keyof Flow, label: string) {
  if (!String(flow[key]).trim()) (flow as unknown as Record<string, string>)[key] = label;
}

function applyLink(flow: Flow, fromId: string, toId: string, kind: FlowKind, label = "") {
  const next = { ...flow };
  const fromKind = splitNode(fromId).kind;
  const toKind = splitNode(toId).kind;
  if (kind === "information") {
    if (!next.system.trim()) {
      next.system = fromKind === "it" ? splitNode(fromId).rest : toKind === "it" ? splitNode(toId).rest : "IT";
    }
    if (!next.trigger.trim()) next.trigger = label || "Info";
  }
  if (kind === "empty") {
    const word = label || "Return";
    if (fromKind === "line" && !next.emptiesFromLine.trim()) next.emptiesFromLine = word;
    if (fromKind === "kitting" && !next.emptiesFromKitting.trim()) next.emptiesFromKitting = word;
    if (fromKind === "sequencing" && !next.emptiesFromSequencing.trim()) next.emptiesFromSequencing = word;
  }
  if (kind === "material" && label) {
    if (fromKind === "supplier" || toKind === "dock" || toKind === "buffer") writeTransport(next, "transportTruck", label);
    else if (toKind === "warehouse") writeTransport(next, "transportToWarehouse", label);
    else if (toKind === "kitting") writeTransport(next, "transportToKitting", label);
    else if (toKind === "sequencing") writeTransport(next, "transportToSequencing", label);
    else if (toKind === "line" && fromKind === "sequencing") writeTransport(next, "transportSeqToLine", label);
    else if (toKind === "line") writeTransport(next, "transportKitToLine", label);
  }
  return next;
}

export function connectSymbols(doc: MifaDocument, fromId: string, toId: string, kind: FlowKind, label = ""): { document: MifaDocument; edgeId: string } {
  if (!fromId || !toId || fromId === toId) return { document: doc, edgeId: "" };
  const id = createId("link");
  return {
    document: { ...doc, links: [...(doc.links ?? []), { id, from: fromId, to: toId, kind, label }] },
    edgeId: id,
  };
}

export function linkNodes(doc: MifaDocument, fromId: string, toId: string, flowId: string | null, kind: FlowKind, label = ""): MifaDocument {
  if (!fromId || !toId || fromId === toId) return doc;
  let flow = (flowId ? doc.flows.find((item) => item.id === flowId) : undefined) ?? doc.flows.find((item) => nodeMatches(item, fromId));
  let flows = doc.flows;
  if (!flow) {
    flow = blankFlow(String(doc.flows.length + 1));
    flow.building = doc.project.shop || "";
    flows = [...doc.flows, flow];
  }
  const next = applyLink(absorb(absorb({ ...flow }, fromId), toId), fromId, toId, kind, label);
  return { ...doc, flows: flows.map((item) => (item.id === next.id ? next : item)) };
}
