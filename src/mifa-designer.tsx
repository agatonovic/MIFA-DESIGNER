import { ArchivePanel } from "./archive-panel";
import { ARCHIVE_KEY, addFolder, addMifa, createArchive, openDocument, parseArchive, remember, removeFolder, removeMifa, renameFolder, restoreVersion, saveVersion, type Archive } from "./archive";
import { SymbolShape, VectorArt } from "./symbol-shape";
import { Button, Input, Tip } from "./ui";
import { cn } from "./cn";
import { STAMPS, connectSymbols, omitSymbols, placeSymbol, retargetNode, type StampId } from "./canvas";
import {
  arrange,
  arrowOnScreen,
  arrowTowardScreen,
  bendFromCorner,
  bendFromMove,
  blankFlow,
  buildSheet,
  centerPortsOnMove,
  edgeRoute,
  emptyDocument,
  exampleDocument,
  paintLayers,
  parseMifaDocument,
  createId,
  pathForFlows,
  snap,
  straightenConnection,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  SYMBOL_SIZE,
  type ArrowEnds,
  type Flow,
  type FlowKind,
  type Mark,
  type MifaDocument,
  type ProjectInfo,
  type SheetEdge,
  type SheetNode,
} from "./document";
import { downloadWorkbook, FLOW_COLUMNS, FLOW_GROUPS, readWorkbook } from "./excel";
import { LIBRARY, type LibraryItem } from "./library";
import { ART_BY_ID, SYMBOL_ART, artBox, transportArtwork, type SymbolArt } from "./symbol-art";
import { BookOpen, Circle, Download, Eye, FilePlus, Folder, Minus, MousePointer2, PenLine, Plus, Redo2, Shapes, Square, Table2, Trash2, Type, Undo2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const STORAGE_KEY = "mifa.canvas.v2";

type History = { past: MifaDocument[]; present: MifaDocument; future: MifaDocument[] };
type Mode = "design" | "preview";
type Tool = "select" | "add" | "connect" | "text" | "rectangle" | "ellipse";
type Box = { x: number; y: number; width: number; height: number };
type View = { zoom: number; pan: { x: number; y: number } };

const FLOW_STROKE: Record<FlowKind, { stroke: string; dash?: string }> = {
  material: { stroke: "#202124" },
  information: { stroke: "#1b4f9c", dash: "5 4" },
  empty: { stroke: "#5f6368", dash: "7 4" },
};

const LINE_DASHES = [
  { id: "solid", label: "Solid", dash: "" },
  { id: "dashed", label: "Dashed", dash: "7 4" },
  { id: "dotted", label: "Dotted", dash: "5 4" },
  { id: "fine", label: "Fine dots", dash: "2 3" },
] as const;

const LINE_COLORS = [
  { id: "black", label: "Black", color: "#202124" },
  { id: "blue", label: "Blue", color: "#1b4f9c" },
  { id: "gray", label: "Gray", color: "#5f6368" },
  { id: "red", label: "Red", color: "#c5221f" },
  { id: "green", label: "Green", color: "#188038" },
  { id: "orange", label: "Orange", color: "#e37400" },
] as const;

const BOOL_KEYS = new Set<keyof Flow>(["direct", "unloadingBuffer", "kitting", "sequencing"]);

function commitHistory(history: History, next: MifaDocument): History {
  return { past: [...history.past, history.present].slice(-50), present: next, future: [] };
}

function clampZoom(value: number) {
  return Math.min(2.5, Math.max(0.3, value));
}

export function MifaDesigner() {
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<History>({ past: [], present: exampleDocument(), future: [] });
  const [archive, setArchive] = useState<Archive>(() => createArchive(exampleDocument()));
  const archiveRef = useRef(archive);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("design");
  const [tool, setTool] = useState<Tool>("select");
  const [stamp, setStamp] = useState<StampId>("supplier");
  const [armed, setArmed] = useState<LibraryItem | null>(null);
  const [linkKind, setLinkKind] = useState<FlowKind>("material");
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; at: { x: number; y: number }; id: string | null } | null>(null);
  const [dropAt, setDropAt] = useState<{ x: number; y: number } | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [group, setGroup] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoverFlowIds, setHoverFlowIds] = useState<string[] | null>(null);
  const [dataOpen, setDataOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [view, setView] = useState<View>({ zoom: 1, pan: { x: 32, y: 16 } });
  const [notice, setNotice] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef(view);
  const spaceRef = useRef(false);
  const panDrag = useRef<{ x: number; y: number; panX: number; panY: number; fromSheet?: boolean; moved?: boolean } | null>(null);
  const resizeRef = useRef<{
    id: string;
    handle: string;
    x: number;
    y: number;
    box: { x: number; y: number; width: number; height: number };
    origin: MifaDocument;
    moved: boolean;
  } | null>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    origin: MifaDocument;
    moved: boolean;
    width: number;
    height: number;
    starts?: Record<string, { x: number; y: number; width: number; height: number }>;
  } | null>(null);
  const marqueeRef = useRef<{ x: number; y: number; moved: boolean; box: { x: number; y: number; width: number; height: number } } | null>(null);
  const boxesRef = useRef<{ id: string; x: number; y: number; width: number; height: number }[]>([]);
  const bendRef = useRef<{ id: string; index: number; origin: MifaDocument; moved: boolean; x: number; y: number } | null>(null);
  const textOrigin = useRef<MifaDocument | null>(null);
  viewRef.current = view;
  archiveRef.current = archive;

  const doc = history.present;
  const sheet = useMemo(() => buildSheet(doc), [doc]);
  const marks = doc.marks ?? [];
  const drawnEdges: SheetEdge[] = (doc.links ?? []).map((link) => ({ id: link.id, from: link.from, to: link.to, kind: link.kind, label: link.label, flowIds: [] }));
  const layers = paintLayers([...sheet.nodes.map((node) => node.id), ...marks.map((mark) => mark.id)], doc.stack);
  const visibleEdges = [...sheet.edges, ...drawnEdges];
  const lanes = laneMap(visibleEdges);
  const lineIcons = iconsOnLines(doc, visibleEdges, nodeBox, lanes);
  boxesRef.current = [
    ...sheet.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, width: node.width, height: node.height })),
    ...marks.map((mark) => ({
      id: mark.id,
      x: mark.x,
      y: mark.y,
      width: mark.width ?? SYMBOL_SIZE[mark.symbol].width,
      height: mark.height ?? SYMBOL_SIZE[mark.symbol].height,
    })),
    ...lineIcons.map((icon) => ({ id: icon.id, x: icon.x, y: icon.y, width: icon.width, height: icon.height })),
  ];
  const selectedEdge = visibleEdges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const sheetWidth = SHEET_WIDTH;
  const sheetHeight = SHEET_HEIGHT;
  const activeFlowIds = mode === "preview" ? hoverFlowIds : null;
  const activePath = activeFlowIds?.length ? pathForFlows(sheet, activeFlowIds) : null;

  useEffect(() => {
    let legacy: MifaDocument | null = null;
    try {
      legacy = parseMifaDocument(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"));
    } catch {
      /* keep the example */
    }
    let stored: Archive | null = null;
    try {
      stored = parseArchive(JSON.parse(window.localStorage.getItem(ARCHIVE_KEY) || "null"));
    } catch {
      /* start a library from the sheet that is already saved */
    }
    const next = stored ?? createArchive(legacy ?? exampleDocument());
    archiveRef.current = next;
    setArchive(next);
    setBrowseFolderId(next.openFolderId);
    setHistory({ past: [], present: openDocument(next), future: [] });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const next = remember(archiveRef.current, doc);
    archiveRef.current = next;
    setArchive(next);
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }, [doc, ready]);

  function commit(recipe: (current: MifaDocument) => MifaDocument) {
    setHistory((current) => commitHistory(current, recipe(current.present)));
  }

  function resetSelection() {
    setSelectedFlowId(null);
    setSelectedNodeId(null);
    setGroup([]);
    setLinkFrom(null);
    setHoverFlowIds(null);
    setSelectedEdgeId(null);
    setMenu(null);
    setDropAt(null);
    setArmed(null);
    setMarquee(null);
  }

  function applyArchive(next: Archive, switchSheet: boolean) {
    archiveRef.current = next;
    setArchive(next);
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
    if (!switchSheet) return;
    setHistory({ past: [], present: openDocument(next), future: [] });
    resetSelection();
  }

  function replace(next: MifaDocument) {
    setHistory((current) => commitHistory(current, next));
    resetSelection();
    setNotice("");
  }

  function createFolder(name: string) {
    const next = addFolder(archiveRef.current, name);
    applyArchive(next, false);
    setBrowseFolderId(next.folders.at(-1)?.id ?? next.openFolderId);
  }

  function createMifa(folderId: string) {
    const next = addMifa(archiveRef.current, folderId, emptyDocument());
    applyArchive(next, true);
    setBrowseFolderId(folderId);
    setArchiveOpen(true);
    setNotice("Started a new MIFA");
  }

  function saveCurrentVersion() {
    const next = saveVersion(archiveRef.current, doc);
    applyArchive(next, false);
    setNotice(`Saved ${doc.project.name}`);
  }

  function restoreSaved(versionId: string) {
    const next = restoreVersion(archiveRef.current, versionId);
    if (!next) return;
    applyArchive(next, true);
    setNotice("Restored a saved version");
  }

  function openStoredMifa(folderId: string, mifaId: string) {
    const previous = archiveRef.current.openMifaId;
    const next = { ...archiveRef.current, openFolderId: folderId, openMifaId: mifaId };
    applyArchive(next, next.openMifaId !== previous);
    setBrowseFolderId(folderId);
  }

  function deleteStoredFolder(folderId: string) {
    const previous = archiveRef.current.openMifaId;
    const next = removeFolder(archiveRef.current, folderId);
    applyArchive(next, next.openMifaId !== previous);
    setBrowseFolderId((current) => (current === folderId ? next.openFolderId : current));
  }

  function deleteStoredMifa(folderId: string, mifaId: string) {
    const previous = archiveRef.current.openMifaId;
    const next = removeMifa(archiveRef.current, folderId, mifaId);
    applyArchive(next, next.openMifaId !== previous);
  }

  function undo() {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  }

  function redo() {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: current.future.slice(1) };
    });
  }

  const actions = useRef({ undo, redo, removeSelection: () => {}, dismiss: () => {} });
  actions.current.undo = undo;
  actions.current.redo = redo;
  actions.current.removeSelection = () => {
    if (selectedEdgeId && (doc.links ?? []).some((link) => link.id === selectedEdgeId)) {
      const id = selectedEdgeId;
      commit((current) => ({ ...current, links: (current.links ?? []).filter((link) => link.id !== id) }));
      setSelectedEdgeId(null);
      return;
    }
    if (selectedEdgeId) {
      const id = selectedEdgeId;
      commit((current) => {
        const bends = { ...(current.bends ?? {}) };
        delete bends[id];
        return { ...current, bends };
      });
      return;
    }
    const ids = group.length ? group : selectedNodeId ? [selectedNodeId] : [];
    if (!ids.length) return;
    commit((current) => omitSymbols(current, ids));
    setSelectedNodeId(null);
    setGroup([]);
    setSelectedFlowId(null);
  };
  actions.current.dismiss = () => {
    const cancelTool = Boolean(linkFrom || armed || libraryOpen || tool !== "select");
    setMenu(null);
    setDropAt(null);
    setLibraryOpen(false);
    setLinkFrom(null);
    setArmed(null);
    setTool("select");
    if (cancelTool) return;
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setGroup([]);
    setSelectedFlowId(null);
  };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (event.code === "Space") {
        spaceRef.current = true;
        event.preventDefault();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.current.redo();
        else actions.current.undo();
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        actions.current.removeSelection();
      }
      if (event.key === "Escape") actions.current.dismiss();
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") spaceRef.current = false;
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const current = viewRef.current;
      if (event.ctrlKey || event.metaKey) {
        const zoom = clampZoom(current.zoom * Math.exp(-event.deltaY * 0.01));
        const rect = viewport!.getBoundingClientRect();
        const ox = event.clientX - rect.left;
        const oy = event.clientY - rect.top;
        const scale = zoom / current.zoom;
        const next = { zoom, pan: { x: ox - (ox - current.pan.x) * scale, y: oy - (oy - current.pan.y) * scale } };
        viewRef.current = next;
        setView(next);
        return;
      }
      const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
      const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY;
      const next = { zoom: current.zoom, pan: { x: current.pan.x - dx, y: current.pan.y - dy } };
      viewRef.current = next;
      setView(next);
    }
    function onMove(event: PointerEvent) {
      const resizing = resizeRef.current;
      if (resizing) {
        const zoom = viewRef.current.zoom || 1;
        const dx = (event.clientX - resizing.x) / zoom;
        const dy = (event.clientY - resizing.y) / zoom;
        if (Math.hypot(dx, dy) > 2) resizing.moved = true;
        const box = fitBox(resizedBox(resizing.handle, resizing.box, dx, dy));
        setHistory((current) => ({ ...current, present: applyBox(current.present, resizing.id, box) }));
        return;
      }
      const band = marqueeRef.current;
      if (band) {
        const rect = sheetRef.current?.getBoundingClientRect();
        const zoom = viewRef.current.zoom || 1;
        if (!rect) return;
        const x = (event.clientX - rect.left) / zoom;
        const y = (event.clientY - rect.top) / zoom;
        if (Math.hypot(x - band.x, y - band.y) > 16) band.moved = true;
        band.box = { x: Math.min(band.x, x), y: Math.min(band.y, y), width: Math.abs(x - band.x), height: Math.abs(y - band.y) };
        setMarquee(band.box);
        return;
      }
      const bending = bendRef.current;
      if (bending) {
        const rect = sheetRef.current?.getBoundingClientRect();
        const zoom = viewRef.current.zoom || 1;
        if (!rect) return;
        const x = (event.clientX - rect.left) / zoom;
        const y = (event.clientY - rect.top) / zoom;
        const x0 = (bending.x - rect.left) / zoom;
        const y0 = (bending.y - rect.top) / zoom;
        if (Math.hypot(x - x0, y - y0) > 2) bending.moved = true;
        if (!bending.moved) return;
        const ends = endsOf(bending.origin, bending.id);
        if (!ends) return;
        const base = bending.origin.bends?.[bending.id];
        const next = bending.index < 0 ? bendFromMove(ends.from, ends.to, base, x - x0, y - y0) : bendFromCorner(ends.from, ends.to, base, bending.index, { x: snap(x), y: snap(y) });
        setHistory((current) => ({
          ...current,
          present: { ...current.present, bends: { ...current.present.bends, [bending.id]: next } },
        }));
        return;
      }
      const drag = panDrag.current;
      if (!drag) return;
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
      if (drag.fromSheet && !drag.moved) return;
      const next = { zoom: viewRef.current.zoom, pan: { x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y } };
      viewRef.current = next;
      setView(next);
    }
    function onUp() {
      const resizing = resizeRef.current;
      if (resizing) {
        resizeRef.current = null;
        if (resizing.moved) {
          const origin = resizing.origin;
          setHistory((current) => ({ past: [...current.past, origin].slice(-50), present: current.present, future: [] }));
        }
      }
      const bending = bendRef.current;
      if (bending) {
        bendRef.current = null;
        if (bending.moved) {
          const origin = bending.origin;
          setHistory((current) => ({ past: [...current.past, origin].slice(-50), present: current.present, future: [] }));
        }
      }
      const band = marqueeRef.current;
      if (band) {
        marqueeRef.current = null;
        setMarquee(null);
        if (!band.moved) {
          setSelectedFlowId(null);
          setSelectedNodeId(null);
          setGroup([]);
          setSelectedEdgeId(null);
          setLinkFrom(null);
          setArmed(null);
        } else {
          const hits = boxesRef.current.filter((box) => box.x < band.box.x + band.box.width && box.x + box.width > band.box.x && box.y < band.box.y + band.box.height && box.y + box.height > band.box.y).map((box) => box.id);
          setGroup(hits);
          setSelectedNodeId(hits.length === 1 ? hits[0] : null);
          setSelectedEdgeId(null);
          setSelectedFlowId(null);
          setLinkFrom(null);
        }
      }
      const drag = panDrag.current;
      panDrag.current = null;
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      viewport.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [ready, mode]);

  function patchProject(key: keyof ProjectInfo, value: string) {
    setHistory((current) => ({
      ...current,
      present: { ...current.present, project: { ...current.present.project, [key]: value } },
    }));
  }

  function patchFlow(id: string, key: keyof Flow, value: string | boolean) {
    setHistory((current) => ({
      ...current,
      present: {
        ...current.present,
        flows: current.present.flows.map((flow) => (flow.id === id ? { ...flow, [key]: value } : flow)),
      },
    }));
  }

  function addFlow() {
    const flow = blankFlow(String(doc.flows.length + 1));
    flow.building = doc.project.shop;
    commit((current) => ({ ...current, flows: [...current.flows, flow] }));
    setSelectedFlowId(flow.id);
    setSelectedNodeId(null);
  }

  function deleteFlow(id: string) {
    commit((current) => ({ ...current, flows: current.flows.filter((flow) => flow.id !== id) }));
    setSelectedFlowId((current) => (current === id ? null : current));
    setSelectedNodeId(null);
  }

  function sheetPoint(event: { clientX: number; clientY: number }) {
    const rect = sheetRef.current?.getBoundingClientRect();
    const zoom = viewRef.current.zoom || 1;
    if (!rect) return { x: 0, y: 0 };
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  }

  function chooseLibrary(item: LibraryItem) {
    if (item.artwork) {
      setArmed(item);
      setTool("add");
      setLinkFrom(null);
      setMode("design");
      return;
    }
    setArmed(item);
    if (item.link) {
      setLinkKind(item.link.kind);
      setTool("select");
      setLinkFrom(null);
      setMode("design");
      return;
    }
    if (item.stamp && tool === "select" && selectedNodeId && selectedFlowId && !selectedNodeId.startsWith("mark-")) {
      const node = sheet.nodes.find((entry) => entry.id === selectedNodeId);
      if (node) {
        const placed = retargetNode(doc, node.id, selectedFlowId, item.stamp, { x: node.x, y: node.y });
        commit(() => placed.document);
        setSelectedFlowId(placed.flowId);
        setSelectedNodeId(placed.nodeId);
        setGroup([placed.nodeId]);
        setStamp(item.stamp);
        setArmed(null);
        setTool("select");
        setMode("design");
        return;
      }
    }
    if (item.stamp) setStamp(item.stamp);
    setTool("add");
    setLinkFrom(null);
    setMode("design");
  }

  function placeChosen(item: LibraryItem | null, point: { x: number; y: number }) {
    if (item?.link) return;
    if (item?.artwork && ART_BY_ID[item.artwork]) {
      const size = artBox(ART_BY_ID[item.artwork]);
      const mark: Mark = { id: createId("mark"), name: item.name, symbol: "rectangle", artwork: item.artwork, x: snap(point.x), y: snap(point.y), width: size.width, height: size.height };
      commit((current) => ({ ...current, marks: [...(current.marks ?? []), mark] }));
      setSelectedNodeId(mark.id);
      setGroup([mark.id]);
      setSelectedFlowId(null);
      setSelectedEdgeId(null);
      setArmed(null);
      setTool("select");
      return;
    }
    if (item && !item.stamp) {
      const size = SYMBOL_SIZE[item.symbol];
      const mark = { id: createId("mark"), name: "", symbol: item.symbol, x: snap(point.x), y: snap(point.y), width: size.width, height: size.height };
      commit((current) => ({ ...current, marks: [...(current.marks ?? []), mark] }));
      setSelectedNodeId(mark.id);
      setGroup([mark.id]);
      setSelectedFlowId(null);
      setSelectedEdgeId(null);
      setArmed(null);
      setTool("select");
      return;
    }
    const placed = placeSymbol(doc, selectedFlowId, item?.stamp ?? stamp, point);
    commit(() => placed.document);
    setSelectedFlowId(placed.flowId);
    setSelectedNodeId(placed.nodeId);
    setGroup([placed.nodeId]);
    setSelectedEdgeId(null);
    if (item?.stamp) setStamp(item.stamp);
    setArmed(null);
    setTool("select");
  }

  function nodeBox(id: string): SheetNode | null {
    const node = sheet.nodes.find((item) => item.id === id);
    if (node) return node;
    const mark = marks.find((item) => item.id === id);
    if (!mark) return null;
    const width = mark.width ?? SYMBOL_SIZE[mark.symbol].width;
    const height = mark.height ?? SYMBOL_SIZE[mark.symbol].height;
    return { id: mark.id, kind: "it", symbol: mark.symbol, label: mark.name, x: mark.x, y: mark.y, width, height, flowIds: [] };
  }

  function screenArrow(edge: SheetEdge) {
    const from = nodeBox(edge.from);
    const to = nodeBox(edge.to);
    if (!from || !to) return "end" as const;
    return arrowTowardScreen(edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0).points);
  }

  function lookOf(edge: SheetEdge) {
    const base = FLOW_STROKE[edge.kind];
    const over = doc.strokes?.[edge.id];
    return { stroke: over?.color ?? base.stroke, dash: over ? over.dash : (base.dash ?? ""), arrow: over?.arrow ?? "end" as ArrowEnds };
  }

  function paintEdge(patch: Partial<{ color: string; dash: string; arrow: ArrowEnds }>) {
    if (!selectedEdgeId) return;
    const edge = visibleEdges.find((item) => item.id === selectedEdgeId);
    if (!edge) return;
    const base = FLOW_STROKE[edge.kind];
    const current = doc.strokes?.[edge.id] ?? { color: base.stroke, dash: base.dash ?? "" };
    const id = edge.id;
    const arrow = patch.arrow ?? current.arrow;
    const next = { color: patch.color ?? current.color, dash: patch.dash ?? current.dash, ...(arrow ? { arrow } : {}) };
    commit((currentDoc) => ({
      ...currentDoc,
      strokes: { ...currentDoc.strokes, [id]: next },
    }));
  }

  function finishLink(fromId: string, toId: string) {
    const label = armed?.link?.kind === linkKind ? armed.link.label : "";
    const connected = connectSymbols(doc, fromId, toId, linkKind, label);
    if (connected.document !== doc) commit(() => connected.document);
    setSelectedFlowId(null);
    setSelectedNodeId(null);
    setGroup([]);
    setSelectedEdgeId(connected.edgeId || null);
    setLinkFrom(null);
    setArmed(null);
    setMenu(null);
    setTool("select");
  }

  function openMenu(event: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number }, id: string | null) {
    event.preventDefault();
    event.stopPropagation();
    if (id) {
      setSelectedNodeId(id);
      setGroup(group.includes(id) && group.length > 1 ? group : [id]);
      setSelectedEdgeId(null);
      const node = sheet.nodes.find((item) => item.id === id);
      setSelectedFlowId(node?.flowIds[0] ?? null);
    }
    setMenu({ x: Math.min(event.clientX, window.innerWidth - 220), y: Math.min(event.clientY, window.innerHeight - 240), at: sheetPoint(event), id });
  }

  function restack(id: string, where: "front" | "back") {
    setMenu(null);
    commit((current) => {
      const laid = buildSheet(current);
      const ids = [...laid.nodes.map((node) => node.id), ...(current.marks ?? []).map((mark) => mark.id)];
      return { ...current, stack: arrange(ids, current.stack, id, where) };
    });
  }

  function deleteSymbol(id: string) {
    const ids = group.includes(id) && group.length > 1 ? group : [id];
    commit((current) => omitSymbols(current, ids));
    setMenu(null);
    setSelectedNodeId(null);
    setGroup([]);
    setSelectedFlowId(null);
  }

  function onPort(id: string) {
    if (mode !== "design") return;
    setLibraryOpen(false);
    setDropAt(null);
    setTool("select");
    if (!linkFrom || linkFrom === id) {
      setLinkFrom(linkFrom === id ? null : id);
      setSelectedNodeId(id);
      setGroup([id]);
      setSelectedEdgeId(null);
      return;
    }
    finishLink(linkFrom, id);
  }

  function placeBasic(shape: "text" | "rectangle" | "ellipse", point: { x: number; y: number }) {
    const size = shape === "text" ? { width: 160, height: 40 } : shape === "ellipse" ? { width: 128, height: 80 } : { width: 128, height: 72 };
    const mark: Mark = {
      id: createId("mark"),
      name: shape === "text" ? "Text" : shape === "rectangle" ? "" : "",
      symbol: "rectangle",
      shape,
      x: snap(point.x),
      y: snap(point.y),
      width: size.width,
      height: size.height,
    };
    commit((current) => ({ ...current, marks: [...(current.marks ?? []), mark] }));
    setSelectedNodeId(mark.id);
    setGroup([mark.id]);
    setSelectedFlowId(null);
    setSelectedEdgeId(null);
    setArmed(null);
    setTool("select");
  }

  function onEdgePointerDown(event: ReactPointerEvent<SVGPathElement | HTMLDivElement>, id: string, index = -1) {
    if (mode !== "design" || tool !== "select" || spaceRef.current || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const edge = visibleEdges.find((item) => item.id === id);
    if (index >= 0 && event.detail >= 2) {
      bendRef.current = null;
      const from = edge && nodeBox(edge.from);
      const to = edge && nodeBox(edge.to);
      if (from && to) commit((current) => straightenConnection(current, id, from, to));
      setSelectedEdgeId(id);
      setSelectedNodeId(null);
      setGroup([]);
      setLinkFrom(null);
      setSelectedFlowId(edge?.flowIds[0] ?? null);
      return;
    }
    setSelectedEdgeId(id);
    setSelectedNodeId(null);
    setGroup([]);
    setLinkFrom(null);
    setSelectedFlowId(edge?.flowIds[0] ?? null);
    bendRef.current = { id, index, origin: doc, moved: false, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button === 2) return;
    setMenu(null);
    if (mode !== "design" || spaceRef.current || event.button === 1) return;
    if ((event.target as HTMLElement).closest?.("svg")) return;
    setLibraryOpen(false);
    setDropAt(null);
    if (tool === "text" || tool === "rectangle" || tool === "ellipse") {
      placeBasic(tool, sheetPoint(event));
      return;
    }
    if (tool === "add") {
      placeChosen(armed, sheetPoint(event));
      return;
    }
    if (tool === "select") {
      const point = sheetPoint(event);
      marqueeRef.current = { x: point.x, y: point.y, moved: false, box: { x: point.x, y: point.y, width: 0, height: 0 } };
      setMarquee(marqueeRef.current.box);
      return;
    }
    setSelectedFlowId(null);
    setSelectedNodeId(null);
    setLinkFrom(null);
  }

  function onNodePointerDown(event: ReactPointerEvent<HTMLDivElement>, node: SheetNode) {
    if (spaceRef.current || event.button === 1 || event.button === 2) return;
    event.stopPropagation();
    if (mode === "preview") {
      setHoverFlowIds(node.flowIds);
      return;
    }
    setMenu(null);
    if (linkFrom && linkFrom !== node.id) {
      finishLink(linkFrom, node.id);
      return;
    }
    setSelectedEdgeId(null);
    if (tool === "add") {
      const nextStamp = armed?.stamp ?? stamp;
      const flowId = selectedFlowId && node.flowIds.includes(selectedFlowId) ? selectedFlowId : node.flowIds[0];
      if (armed?.stamp && flowId && STAMPS.find((item) => item.id === nextStamp)?.symbol !== node.symbol) {
        const placed = retargetNode(doc, node.id, flowId, nextStamp, { x: node.x, y: node.y });
        commit(() => placed.document);
        setSelectedFlowId(placed.flowId);
        setSelectedNodeId(placed.nodeId);
        setGroup([placed.nodeId]);
        setArmed(null);
        setTool("select");
        return;
      }
      setSelectedNodeId(node.id);
      setGroup([node.id]);
      setSelectedFlowId(flowId ?? null);
      setArmed(null);
      setTool("select");
      return;
    }
    if (tool !== "select") {
      setTool("select");
      setArmed(null);
    }
    setSelectedEdgeId(null);
    const point = sheetPoint(event);
    beginMove(node.id, point, { x: node.x, y: node.y, width: node.width, height: node.height });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function beginMove(id: string, point: { x: number; y: number }, box: { x: number; y: number; width: number; height: number }) {
    const ids = group.includes(id) && group.length > 1 ? group : [id];
    if (ids.length === 1) {
      setSelectedNodeId(id);
      setGroup([id]);
      setSelectedFlowId(sheet.nodes.find((node) => node.id === id)?.flowIds[0] ?? null);
    }
    const starts: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const itemId of ids) {
      const found = boxesRef.current.find((item) => item.id === itemId);
      if (found) starts[itemId] = found;
    }
    dragRef.current = { id, offsetX: point.x - box.x, offsetY: point.y - box.y, origin: doc, moved: false, width: box.width, height: box.height, starts };
  }

  function onNodePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag?.starts) return;
    const point = sheetPoint(event);
    const primary = drag.starts[drag.id];
    if (!primary) return;
    let dx = snap(point.x - drag.offsetX) - primary.x;
    let dy = snap(point.y - drag.offsetY) - primary.y;
    for (const box of Object.values(drag.starts)) {
      dx = Math.min(SHEET_WIDTH - box.width - box.x, Math.max(-box.x, dx));
      dy = Math.min(SHEET_HEIGHT - box.height - box.y, Math.max(-box.y, dy));
    }
    drag.moved = true;
    const starts = drag.starts;
    setHistory((current) => ({
      ...current,
      present: centerPortsOnMove(
        {
          ...current.present,
          positions: {
            ...current.present.positions,
            ...Object.fromEntries(Object.entries(starts).filter(([itemId]) => !itemId.startsWith("mark-") && !itemId.startsWith("icon:")).map(([itemId, box]) => [itemId, { x: box.x + dx, y: box.y + dy }])),
          },
          marks: (current.present.marks ?? []).map((mark) => (starts[mark.id] ? { ...mark, x: starts[mark.id].x + dx, y: starts[mark.id].y + dy } : mark)),
          icons: {
            ...current.present.icons,
            ...Object.fromEntries(
              Object.entries(starts)
                .filter(([itemId]) => itemId.startsWith("icon:"))
                .map(([itemId, box]) => [itemId.slice(5), { x: box.x + dx, y: box.y + dy, width: box.width, height: box.height }]),
            ),
          },
        },
        Object.keys(starts).filter((id) => !id.startsWith("icon:")),
      ),
    }));
  }

  function onNodePointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    const origin = drag.origin;
    setHistory((current) => ({ past: [...current.past, origin].slice(-50), present: current.present, future: [] }));
  }

  function onViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 1 && !spaceRef.current) return;
    event.preventDefault();
    panDrag.current = { x: event.clientX, y: event.clientY, panX: viewRef.current.pan.x, panY: viewRef.current.pan.y };
  }

  function opacityFor(kind: "node" | "edge", id: string) {
    if (!activePath) return 1;
    const onPath = kind === "node" ? activePath.nodes.has(id) : activePath.edges.has(id);
    return onPath ? 1 : 0.16;
  }

  async function onImport(file: File) {
    try {
      replace(readWorkbook(await file.arrayBuffer()));
      setNotice(`Imported ${file.name}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not read that workbook.");
    }
  }

  function zoomBy(factor: number) {
    const current = viewRef.current;
    const viewport = viewportRef.current?.getBoundingClientRect();
    const zoom = clampZoom(current.zoom * factor);
    const ox = (viewport?.width ?? 0) / 2;
    const oy = (viewport?.height ?? 0) / 2;
    const scale = zoom / current.zoom;
    const next = { zoom, pan: { x: ox - (ox - current.pan.x) * scale, y: oy - (oy - current.pan.y) * scale } };
    viewRef.current = next;
    setView(next);
  }

  if (!ready) return <div className="h-full bg-[#f4f6f8]" />;

  const project = doc.project;

  function renderPiece(id: string) {
    const node = sheet.nodes.find((item) => item.id === id);
    if (node) {
      return (
        <div
          key={node.id}
          role="button"
          tabIndex={0}
          aria-label={node.label}
          className={cn(
            "pointer-events-auto absolute",
            mode === "design" && linkFrom && linkFrom !== node.id && "cursor-crosshair ring-2 ring-[#1b4f9c]",
            mode === "design" && tool === "select" && !linkFrom && "cursor-grab active:cursor-grabbing",
          )}
          style={{
            left: node.x,
            top: node.y,
            width: node.width,
            height: node.height,
            opacity: opacityFor("node", node.id),
            transition: "opacity 140ms ease",
          }}
          onPointerDown={(event) => onNodePointerDown(event, node)}
          onContextMenu={(event) => mode === "design" && openMenu(event, node.id)}
          onPointerMove={onNodePointerMove}
          onPointerUp={onNodePointerUp}
          onPointerEnter={() => mode === "preview" && setHoverFlowIds(node.flowIds)}
          onPointerLeave={() => mode === "preview" && setHoverFlowIds(null)}
        >
          <SymbolShape
            symbol={node.symbol}
            width={node.width}
            height={node.height}
            selected={selectedNodeId === node.id || (group.length > 1 && group.includes(node.id))}
            armed={linkFrom === node.id && selectedNodeId !== node.id}
          />
        </div>
      );
    }
    const mark = marks.find((item) => item.id === id);
    if (!mark) return null;
    return (
      <div
        key={mark.id}
        role="button"
        tabIndex={0}
        aria-label={mark.name || (mark.shape === "ellipse" ? "Ellipse" : mark.shape === "text" ? "Text" : mark.shape === "rectangle" ? "Rectangle" : "Symbol")}
        className={cn(
          "pointer-events-auto absolute",
          mode === "design" && linkFrom && linkFrom !== mark.id && "cursor-crosshair ring-2 ring-[#1b4f9c]",
          mode === "design" && tool === "select" && !linkFrom && "cursor-grab active:cursor-grabbing",
        )}
        style={{ left: mark.x, top: mark.y, width: mark.width ?? SYMBOL_SIZE[mark.symbol].width, height: mark.height ?? SYMBOL_SIZE[mark.symbol].height }}
        onContextMenu={(event) => mode === "design" && openMenu(event, mark.id)}
        onPointerDown={(event) => {
          if (spaceRef.current || event.button === 1 || event.button === 2) return;
          event.stopPropagation();
          if (mode !== "design") return;
          setMenu(null);
          if (linkFrom && linkFrom !== mark.id) {
            finishLink(linkFrom, mark.id);
            return;
          }
          setSelectedEdgeId(null);
          if (tool !== "select") {
            setTool("select");
            setArmed(null);
          }
          const width = mark.width ?? SYMBOL_SIZE[mark.symbol].width;
          const height = mark.height ?? SYMBOL_SIZE[mark.symbol].height;
          beginMove(mark.id, sheetPoint(event), { x: mark.x, y: mark.y, width, height });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={onNodePointerMove}
        onPointerUp={onNodePointerUp}
      >
        {mark.artwork && ART_BY_ID[mark.artwork] ? (
          <VectorArt art={ART_BY_ID[mark.artwork]} width={mark.width ?? 128} height={mark.height ?? 72} selected={selectedNodeId === mark.id} />
        ) : mark.shape ? (
          <BasicShape
            shape={mark.shape}
            width={mark.width ?? 128}
            height={mark.height ?? 72}
            name={mark.name}
            editing={selectedNodeId === mark.id && mark.shape === "text"}
            onChange={(value) => {
              setHistory((current) => ({
                ...current,
                present: {
                  ...current.present,
                  marks: (current.present.marks ?? []).map((item) => (item.id === mark.id ? { ...item, name: value } : item)),
                },
              }));
            }}
            onFocus={() => {
              textOrigin.current = doc;
            }}
            onBlur={() => {
              const origin = textOrigin.current;
              textOrigin.current = null;
              if (!origin || origin.marks?.find((item) => item.id === mark.id)?.name === mark.name) return;
              setHistory((current) => ({ past: [...current.past, origin].slice(-50), present: current.present, future: [] }));
            }}
          />
        ) : (
          <SymbolShape
            symbol={mark.symbol}
            width={mark.width ?? SYMBOL_SIZE[mark.symbol].width}
            height={mark.height ?? SYMBOL_SIZE[mark.symbol].height}
            armed={selectedNodeId === mark.id}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6f8] text-[#202124]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#d0d7de] bg-white px-3">
        <Button variant={archiveOpen ? "secondary" : "outline"} size="default" className="h-8 max-w-52 overflow-hidden" title={archiveOpen ? "Hide MIFAs" : "Show MIFAs"} aria-label="MIFAs" aria-pressed={archiveOpen} onClick={() => setArchiveOpen((open) => !open)}>
          <Folder />
          <span className="truncate">{archive.folders.find((folder) => folder.id === archive.openFolderId)?.name ?? "MIFAs"}</span>
        </Button>
        <Input
          aria-label="MIFA name"
          value={project.name}
          onChange={(event) => patchProject("name", event.target.value)}
          className="h-8 w-52 border-transparent px-1 font-medium focus-visible:ring-0"
        />
        {notice ? <p className="truncate text-[12px] text-[#5f6368]">{notice}</p> : null}
        <Button variant="ghost" size="icon-sm" aria-label="Undo" title="Undo (⌘Z)" disabled={!history.past.length} onClick={undo}>
          <Undo2 />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!history.future.length} onClick={redo}>
          <Redo2 />
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onImport(file);
            }}
          />
          <Button variant="outline" size="icon-sm" className="size-8" title="Import Excel" aria-label="Import Excel" onClick={() => fileRef.current?.click()}>
            <Upload />
          </Button>
          <Button variant="outline" size="icon-sm" className="size-8" title="Export Excel" aria-label="Export Excel" onClick={() => downloadWorkbook(doc)}>
            <Download />
          </Button>
          <Button
            variant={dataOpen ? "secondary" : "outline"}
            size="icon-sm"
            className="size-8"
            title={dataOpen ? "Hide data" : "Show data"}
            aria-label={dataOpen ? "Hide data" : "Show data"}
            aria-pressed={dataOpen}
            onClick={() => setDataOpen((open) => !open)}
          >
            <Table2 />
          </Button>
          <div className="ml-1 flex items-center gap-0.5 rounded-lg bg-[#e8eaed] p-0.5">
            <Tip label="Edit">
              <button
                type="button"
                aria-label="Edit"
                className={cn("flex size-7 items-center justify-center rounded-md", mode === "design" ? "bg-white shadow-sm" : "text-[#5f6368]")}
                onClick={() => {
                  setMode("design");
                  setHoverFlowIds(null);
                }}
              >
                <PenLine className="size-4" />
              </button>
            </Tip>
            <Tip label="Preview">
              <button
                type="button"
                aria-label="Preview"
                className={cn("flex size-7 items-center justify-center rounded-md", mode === "preview" ? "bg-white shadow-sm" : "text-[#5f6368]")}
                onClick={() => setMode("preview")}
              >
                <Eye className="size-4" />
              </button>
            </Tip>
          </div>
        </div>
      </header>
      {archiveOpen ? (
        <ArchivePanel
          archive={archive}
          browseFolderId={browseFolderId && archive.folders.some((folder) => folder.id === browseFolderId) ? browseFolderId : archive.openFolderId}
          onBrowse={setBrowseFolderId}
          onOpen={openStoredMifa}
          onAddFolder={createFolder}
          onRenameFolder={(folderId, name) => applyArchive(renameFolder(archiveRef.current, folderId, name), false)}
          onRemoveFolder={deleteStoredFolder}
          onAddMifa={createMifa}
          onRemoveMifa={deleteStoredMifa}
          onSave={saveCurrentVersion}
          onRestore={restoreSaved}
        />
      ) : null}

      <div className="relative flex min-h-0 flex-1">
      {mode === "design" ? (
        <SymbolRail
          tool={tool}
          armed={armed}
          libraryOpen={libraryOpen}
          onSelect={() => {
            setTool("select");
            setLinkFrom(null);
            setArmed(null);
            setMenu(null);
            setDropAt(null);
            setLibraryOpen(false);
          }}
          onSymbols={() => {
            setDropAt(null);
            setLibraryOpen((open) => !open);
          }}
          onBasic={(next) => {
            setTool(next);
            setLinkFrom(null);
            setArmed(null);
            setDropAt(null);
            setLibraryOpen(false);
          }}
        />
      ) : null}
      {libraryOpen && mode === "design" ? (
        <div className="absolute top-0 bottom-0 left-[4.75rem] z-40 w-[680px] border-r border-[#d0d7de] bg-white shadow-lg">
          <SymbolLibrary
            armedId={armed?.id ?? null}
            onClose={() => {
              setDropAt(null);
              setLibraryOpen(false);
            }}
            onPick={(item) => {
              const at = dropAt;
              setDropAt(null);
              setLibraryOpen(false);
              if (at && !item.link) {
                placeChosen(item, at);
                return;
              }
              chooseLibrary(item);
            }}
          />
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ touchAction: "none", cursor: spaceRef.current ? "grab" : undefined }}
        onPointerDown={onViewportPointerDown}
      >
        <div style={{ transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}>
          <div
            ref={sheetRef}
            className={cn(
              "relative bg-white shadow-sm select-none",
              mode === "design" && (tool === "add" || tool === "text" || tool === "rectangle" || tool === "ellipse") && "cursor-crosshair",
            )}
            style={{
              width: sheetWidth,
              height: sheetHeight,
              backgroundImage: "radial-gradient(#d5dbe3 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
            onPointerDown={onSheetPointerDown}
            onContextMenu={(event) => mode === "design" && openMenu(event, null)}
          >
            <TitleBlock project={project} />
            <div className="pointer-events-none absolute inset-0">
              {layers.back.map((id) => renderPiece(id))}
            </div>
            <svg className="absolute inset-0 z-[1] h-full w-full" style={{ pointerEvents: "none" }}>
              <defs>
                {[...new Set(visibleEdges.map((edge) => lookOf(edge).stroke))].map((color) => (
                  <g key={color}>
                    <marker id={`arrow-end-${markerId(color)}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 Z" fill={color} />
                    </marker>
                    <marker id={`arrow-start-${markerId(color)}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
                      <path d="M0,0 L8,4 L0,8 Z" fill={color} />
                    </marker>
                  </g>
                ))}
              </defs>
              {visibleEdges.map((edge) => {
                const from = nodeBox(edge.from);
                const to = nodeBox(edge.to);
                if (!from || !to) return null;
                const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0);
                const style = lookOf(edge);
                const selected = selectedEdgeId === edge.id;
                const marker = markerId(style.stroke);
                return (
                  <g
                    key={edge.id}
                    style={{ opacity: opacityFor("edge", edge.id), transition: "opacity 140ms ease", pointerEvents: "auto" }}
                    onPointerEnter={() => mode === "preview" && setHoverFlowIds(edge.flowIds)}
                    onPointerLeave={() => mode === "preview" && setHoverFlowIds(null)}
                  >
                    <path
                      d={route.path}
                      role="button"
                      aria-label={`${edge.kind === "empty" ? "Empty return" : edge.kind === "information" ? "Information" : "Material"} line${edge.label ? `, ${edge.label}` : ""}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={16}
                      style={{ pointerEvents: "stroke", cursor: mode === "design" && tool === "select" ? "grab" : undefined }}
                      onPointerDown={(event) => onEdgePointerDown(event, edge.id)}
                    />
                    {selected ? <path d={route.path} fill="none" stroke="#1b4f9c" strokeWidth={6} opacity={0.2} /> : null}
                    <path
                      d={route.path}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth={1.7}
                      strokeDasharray={style.dash || undefined}
                      markerEnd={style.arrow === "end" || style.arrow === "both" ? `url(#arrow-end-${marker})` : undefined}
                      markerStart={style.arrow === "start" || style.arrow === "both" ? `url(#arrow-start-${marker})` : undefined}
                    />
                  </g>
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 z-[2]">
            {layers.front.map((id) => renderPiece(id))}
            </div>
            {mode === "design" && tool === "select" && selectedNodeId ? (
              <ResizeHandles
                box={boxFor(sheet.nodes, marks, selectedNodeId, lineIcons)}
                handles={
                  sheet.nodes.find((node) => node.id === selectedNodeId)?.symbol === "production" ||
                  marks.find((mark) => mark.id === selectedNodeId)?.symbol === "production"
                    ? ["n", "s"]
                    : undefined
                }
                onResizeStart={(handle, event) => {
                  const box = boxFor(sheet.nodes, marks, selectedNodeId, lineIcons);
                  if (!box) return;
                  event.stopPropagation();
                  event.preventDefault();
                  resizeRef.current = { id: selectedNodeId, handle, x: event.clientX, y: event.clientY, box, origin: doc, moved: false };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            ) : null}
            {mode === "design"
              ? boxesRef.current
                  .filter((item) => (item.id === selectedNodeId || item.id === linkFrom) && !item.id.startsWith("icon:"))
                  .map((item) => (
                    <EdgePorts key={`port-${item.id}`} box={item} armed={Boolean(linkFrom) || selectedNodeId === item.id} onConnect={() => onPort(item.id)} />
                  ))
              : null}
            {group.length > 1 && boxesRef.current.some((box) => group.includes(box.id)) ? (
              <div
                className="pointer-events-none absolute z-20 border border-[#1b4f9c]"
                style={(() => {
                  const boxes = boxesRef.current.filter((box) => group.includes(box.id));
                  const x = Math.min(...boxes.map((box) => box.x));
                  const y = Math.min(...boxes.map((box) => box.y));
                  const right = Math.max(...boxes.map((box) => box.x + box.width));
                  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
                  return { left: x, top: y, width: right - x, height: bottom - y };
                })()}
              />
            ) : null}
            {marquee && (marquee.width > 0 || marquee.height > 0) ? (
              <div className="pointer-events-none absolute z-30 border border-[#1b4f9c] bg-[#1b4f9c]/10" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />
            ) : null}
            {mode === "design" && tool === "select" && selectedEdgeId
              ? visibleEdges.flatMap((edge) => {
                  if (edge.id !== selectedEdgeId) return [];
                  const from = nodeBox(edge.from);
                  const to = nodeBox(edge.to);
                  if (!from || !to) return [];
                  const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0);
                  const corners = route.corners.length ? route.corners : [route.handle];
                  return corners.map((corner, index) => (
                    <div
                      key={`${edge.id}-corner-${index}`}
                      aria-label="Move corner"
                      title="Double-click to remove this point"
                      className="absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-[#1b4f9c] bg-white active:cursor-grabbing"
                      style={{ left: corner.x, top: corner.y }}
                      onPointerDown={(event) => onEdgePointerDown(event, edge.id, index)}
                    />
                  ));
                })
              : null}
            {lineIcons.map((icon) => (
              <div
                key={icon.id}
                role="button"
                tabIndex={0}
                aria-label={icon.art.name}
                className={cn("absolute z-[12]", mode === "design" && tool === "select" && "cursor-grab active:cursor-grabbing")}
                style={{ left: icon.x, top: icon.y, width: icon.width, height: icon.height, opacity: opacityFor("edge", icon.edgeId) }}
                onPointerDown={(event) => {
                  if (mode !== "design" || tool !== "select" || event.button !== 0) return;
                  event.stopPropagation();
                  setSelectedEdgeId(null);
                  setLinkFrom(null);
                  beginMove(icon.id, sheetPoint(event), icon);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
              >
                <VectorArt art={icon.art} width={icon.width} height={icon.height} selected={selectedNodeId === icon.id} />
              </div>
            ))}
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
              {visibleEdges.map((edge) => {
                const caption = edge.label
                  .split(" · ")
                  .map((part) => part.trim())
                  .filter((part) => part && !transportArtwork(part))
                  .join(" · ");
                if (!caption) return null;
                const from = nodeBox(edge.from);
                const to = nodeBox(edge.to);
                if (!from || !to) return null;
                const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0);
                const textWidth = Math.max(28, caption.length * 6.4 + 12);
                return (
                  <g key={edge.id} transform={`translate(${route.label.x} ${route.label.y})`} style={{ opacity: opacityFor("edge", edge.id) }}>
                    <rect x={-textWidth / 2} y={-10} width={textWidth} height={18} rx={3} fill="#fff" stroke="#d0d7de" />
                    <text y={3} textAnchor="middle" fill="#202124" fontSize={11} fontFamily="inherit">
                      {caption}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-[#d0d7de] bg-white/95 px-1.5 py-1">
              <LineGlyph kind="material" title="Material" />
              <LineGlyph kind="information" title="Information" />
              <LineGlyph kind="empty" title="Empty return" />
            </div>
          </div>
        </div>
        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg border border-[#d0d7de] bg-white p-0.5 shadow-sm">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" title="Zoom out" onClick={() => zoomBy(1 / 1.15)}>
            <Minus />
          </Button>
          <Tip label="Reset zoom">
            <button
              type="button"
              className="h-7 min-w-12 rounded-md px-1 text-[12px] font-medium tabular-nums hover:bg-[#e8eaed]"
              aria-label="Reset zoom"
              onClick={() => {
                const next = { zoom: 1, pan: { x: 32, y: 16 } };
                viewRef.current = next;
                setView(next);
              }}
            >
              {Math.round(view.zoom * 100)}%
            </button>
          </Tip>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" title="Zoom in" onClick={() => zoomBy(1.15)}>
            <Plus />
          </Button>
        </div>
        {mode === "design" && linkFrom ? (
          <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#1b4f9c] bg-white px-3 py-2 text-sm shadow-sm">
            Click the symbol this line should reach.
            <Tip label="Cancel line">
              <button type="button" className="font-medium text-[#1b4f9c]" onClick={() => setLinkFrom(null)}>
                Cancel
              </button>
            </Tip>
          </div>
        ) : null}
        {mode === "design" && selectedEdge && !linkFrom ? (
          <LineStyleBar
            dash={lookOf(selectedEdge).dash}
            color={lookOf(selectedEdge).stroke}
            arrow={arrowOnScreen(lookOf(selectedEdge).arrow, screenArrow(selectedEdge))}
            onDash={(dash) => paintEdge({ dash })}
            onColor={(color) => paintEdge({ color })}
            onArrow={(arrow) => paintEdge({ arrow: arrowOnScreen(arrow, screenArrow(selectedEdge)) })}
          />
        ) : null}
      </div>

      {dataOpen ? (
        <section className="flex h-[300px] shrink-0 flex-col border-t border-[#d0d7de] bg-white">
          <div className="flex flex-wrap items-end gap-2 border-b border-[#d0d7de] px-3 py-2">
            <Field label="Plant" value={project.plant} onChange={(value) => patchProject("plant", value)} />
            <Field label="Shop" value={project.shop} onChange={(value) => patchProject("shop", value)} />
            <label className="grid gap-0.5 text-[10px] font-medium tracking-wide text-[#5f6368] uppercase">
              Scenario
              <select
                aria-label="Scenario"
                value={project.scenario}
                onChange={(event) => patchProject("scenario", event.target.value)}
                className="h-7 rounded-md border border-[#d0d7de] bg-white px-1.5 text-sm text-[#202124]"
              >
                {["Current", "Future", "Ideal"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <Field label="veh/h" value={project.rate} onChange={(value) => patchProject("rate", value)} width="w-16" />
            <Field label="Shifts" value={project.shifts} onChange={(value) => patchProject("shifts", value)} width="w-16" />
            <Field label="veh/day" value={project.perDay} onChange={(value) => patchProject("perDay", value)} width="w-20" />
            <Field label="Diversity" value={project.diversity} onChange={(value) => patchProject("diversity", value)} width="w-36" />
            <Field label="Updated" value={project.updated} onChange={(value) => patchProject("updated", value)} width="w-28" />
            <div className="ml-auto flex items-center gap-1">
              <Button variant="outline" size="icon-sm" className="size-8" title="Add flow" aria-label="Add flow" onClick={addFlow}>
                <Plus />
              </Button>
              <Button variant="outline" size="icon-sm" className="size-8" title="New MIFA" aria-label="New MIFA" onClick={() => createMifa(archive.openFolderId)}>
                <FilePlus />
              </Button>
              <Button variant="outline" size="icon-sm" className="size-8" title="Example" aria-label="Example" onClick={() => replace(exampleDocument())}>
                <BookOpen />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="border-collapse text-left text-[12px]">
              <thead className="sticky top-0 z-10 bg-[#f4f6f8]">
                <tr>
                  {FLOW_GROUPS.map((group) => (
                    <th key={group.name} colSpan={group.count} className="border-r border-b border-[#d0d7de] px-2 py-1 text-[10px] font-semibold tracking-wide text-[#5f6368] uppercase">
                      {group.name}
                    </th>
                  ))}
                  <th className="border-b border-[#d0d7de]" />
                </tr>
                <tr>
                  {FLOW_COLUMNS.map((column) => (
                    <th key={column.key} title={column.header} className="border-r border-b border-[#d0d7de] px-2 py-1 font-medium whitespace-nowrap text-[#202124]">
                      {column.short}
                    </th>
                  ))}
                  <th className="border-b border-[#d0d7de] px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {doc.flows.map((flow) => {
                  const selected = flow.id === selectedFlowId;
                  return (
                    <tr
                      key={flow.id}
                      className={cn(selected && "bg-[#e8f0fe]")}
                      onClick={() => {
                        setSelectedFlowId(flow.id);
                        setSelectedNodeId(null);
                      }}
                    >
                      {FLOW_COLUMNS.map((column) => (
                        <td key={column.key} className="border-r border-b border-[#e6e9ed] px-1 py-0.5 align-middle">
                          <FlowCell flow={flow} column={column.key} onChange={(value) => patchFlow(flow.id, column.key, value)} />
                        </td>
                      ))}
                      <td className="border-b border-[#e6e9ed] px-1">
                        <Tip label="Delete flow">
                          <button type="button" aria-label="Delete flow" className="flex size-6 items-center justify-center rounded text-[#c5221f] hover:bg-[#c5221f]/10" onClick={() => deleteFlow(flow.id)}>
                            <Trash2 className="size-3.5" />
                          </button>
                        </Tip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      </div>
      </div>
      {menu ? (
        <div
          className="fixed z-50 w-52 rounded-lg border border-[#d0d7de] bg-white py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {menu.id && linkFrom && linkFrom !== menu.id ? <MenuItem label="Connect the line here" onClick={() => { const id = menu.id; setMenu(null); if (id) finishLink(linkFrom, id); }} /> : null}
          {menu.id ? <MenuItem label="Draw a line" onClick={() => { const id = menu.id; setMenu(null); if (!id) return; setLinkFrom(id); setSelectedNodeId(id); setGroup([id]); setSelectedEdgeId(null); setTool("select"); }} /> : null}
          {menu.id ? <MenuItem label="Bring to front" onClick={() => menu.id && restack(menu.id, "front")} /> : null}
          {menu.id ? <MenuItem label="Send to back" onClick={() => menu.id && restack(menu.id, "back")} /> : null}
          {menu.id ? <MenuItem label="Delete" onClick={() => menu.id && deleteSymbol(menu.id)} /> : null}
          {!menu.id && linkFrom ? <MenuItem label="Cancel line" onClick={() => { setLinkFrom(null); setMenu(null); }} /> : null}
          {!menu.id ? <MenuItem label="Add symbol" onClick={() => { setDropAt(menu.at); setMenu(null); setLibraryOpen(true); setTool("select"); setArmed(null); setLinkFrom(null); }} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tip label={label}>
      <button type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-[#e8f0fe]" onClick={onClick}>
        {label}
      </button>
    </Tip>
  );
}

function endsOf(doc: MifaDocument, id: string) {
  const laid = buildSheet(doc);
  const linked = (doc.links ?? []).find((link) => link.id === id);
  const edge = laid.edges.find((item) => item.id === id);
  const fromId = edge?.from ?? linked?.from;
  const toId = edge?.to ?? linked?.to;
  if (!fromId || !toId) return null;
  const node = (nodeId: string): SheetNode | null => {
    const found = laid.nodes.find((item) => item.id === nodeId);
    if (found) return found;
    const mark = doc.marks?.find((item) => item.id === nodeId);
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
  };
  const from = node(fromId);
  const to = node(toId);
  if (!from || !to) return null;
  return { from, to };
}

function fitOnSheet(x: number, y: number, width: number, height: number) {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, SHEET_WIDTH - width)),
    y: Math.min(Math.max(0, y), Math.max(0, SHEET_HEIGHT - height)),
  };
}

function fitBox(box: { x: number; y: number; width: number; height: number }) {
  const width = Math.min(box.width, SHEET_WIDTH);
  const height = Math.min(box.height, SHEET_HEIGHT);
  return { ...fitOnSheet(box.x, box.y, width, height), width, height };
}

function boxFor(
  nodes: SheetNode[],
  marks: { id: string; symbol: SheetNode["symbol"]; x: number; y: number; width?: number; height?: number }[],
  id: string | null,
  icons: { id: string; x: number; y: number; width: number; height: number }[] = [],
) {
  if (!id) return null;
  const icon = icons.find((item) => item.id === id);
  if (icon) return { x: icon.x, y: icon.y, width: icon.width, height: icon.height };
  const node = nodes.find((item) => item.id === id);
  if (node) return { x: node.x, y: node.y, width: node.width, height: node.height };
  const mark = marks.find((item) => item.id === id);
  if (!mark) return null;
  return {
    x: mark.x,
    y: mark.y,
    width: mark.width ?? SYMBOL_SIZE[mark.symbol].width,
    height: mark.height ?? SYMBOL_SIZE[mark.symbol].height,
  };
}

function applyBox(doc: MifaDocument, id: string, box: { x: number; y: number; width: number; height: number }): MifaDocument {
  if (id.startsWith("icon:")) return { ...doc, icons: { ...doc.icons, [id.slice(5)]: box } };
  if (id.startsWith("mark-")) {
    return { ...doc, marks: (doc.marks ?? []).map((mark) => (mark.id === id ? { ...mark, ...box } : mark)) };
  }
  return {
    ...doc,
    positions: { ...doc.positions, [id]: { x: box.x, y: box.y } },
    sizes: { ...(doc.sizes ?? {}), [id]: { width: box.width, height: box.height } },
  };
}

function resizedBox(handle: string, origin: { x: number; y: number; width: number; height: number }, dx: number, dy: number) {
  let { x, y, width, height } = origin;
  const minW = 40;
  const minH = 36;
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
  return { x: snap(x), y: snap(y), width: Math.max(minW, snap(width)), height: Math.max(minH, snap(height)) };
}

const RESIZE_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

function ResizeHandles({
  box,
  handles,
  onResizeStart,
}: {
  box: { x: number; y: number; width: number; height: number } | null;
  handles?: readonly (typeof RESIZE_HANDLES)[number][];
  onResizeStart: (handle: string, event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  if (!box) return null;
  const cursor: Record<(typeof RESIZE_HANDLES)[number], string> = {
    nw: "nwse-resize",
    se: "nwse-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
  };
  const point: Record<(typeof RESIZE_HANDLES)[number], { left: number; top: number }> = {
    nw: { left: box.x, top: box.y },
    n: { left: box.x + box.width / 2, top: box.y },
    ne: { left: box.x + box.width, top: box.y },
    e: { left: box.x + box.width, top: box.y + box.height / 2 },
    se: { left: box.x + box.width, top: box.y + box.height },
    s: { left: box.x + box.width / 2, top: box.y + box.height },
    sw: { left: box.x, top: box.y + box.height },
    w: { left: box.x, top: box.y + box.height / 2 },
  };
  return (
    <>
      {(handles ?? RESIZE_HANDLES).map((handle) => (
        <Tip key={handle} label="Resize">
          <div
            aria-label={`Resize ${handle}`}
            className="absolute z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-[#1b4f9c] bg-white"
            style={{ left: point[handle].left, top: point[handle].top, cursor: cursor[handle] }}
            onPointerDown={(event) => onResizeStart(handle, event)}
          />
        </Tip>
      ))}
    </>
  );
}

function SymbolRail({
  tool,
  armed,
  libraryOpen,
  onSelect,
  onSymbols,
  onBasic,
}: {
  tool: Tool;
  armed: LibraryItem | null;
  libraryOpen: boolean;
  onSelect: () => void;
  onSymbols: () => void;
  onBasic: (tool: "text" | "rectangle" | "ellipse") => void;
}) {
  const hint =
    tool === "add"
      ? "Click the sheet once to place it. Select returns after that."
      : tool === "text"
        ? "Click the sheet once to place text. Select returns after that."
        : tool === "rectangle" || tool === "ellipse"
          ? "Click the sheet once to place the shape. Select returns after that."
          : armed?.link
            ? `Select stays on. The next line is ${armed.name}.`
            : "Drag a symbol, or right-click it to draw a line.";
  return (
    <aside className="flex w-[4.75rem] shrink-0 flex-col items-center border-r border-[#d0d7de] bg-white py-2">
      <RailButton label="Select" active={tool === "select"} onClick={onSelect}>
        <MousePointer2 />
      </RailButton>
      <RailButton label="Symbols" active={libraryOpen} onClick={onSymbols}>
        <Shapes />
      </RailButton>
      <RailButton label="Text" active={tool === "text"} onClick={() => onBasic("text")}>
        <Type />
      </RailButton>
      <RailButton label="Rect" title="Rectangle" active={tool === "rectangle"} onClick={() => onBasic("rectangle")}>
        <Square />
      </RailButton>
      <RailButton label="Oval" title="Ellipse" active={tool === "ellipse"} onClick={() => onBasic("ellipse")}>
        <Circle />
      </RailButton>
      <div className="mt-auto flex flex-col items-center gap-2 px-1.5 pb-2">
        {armed ? (
          <div className="flex flex-col items-center gap-1" title={armed.name}>
            {armed.artwork && ART_BY_ID[armed.artwork] ? (
              <VectorArt art={ART_BY_ID[armed.artwork]} width={40} height={30} />
            ) : armed.link ? (
              <LineGlyph kind={armed.link.kind} />
            ) : (
              <SymbolShape symbol={armed.symbol} width={40} height={30} />
            )}
            <span className="text-center text-[10px] leading-tight text-[#202124]">{armed.name}</span>
          </div>
        ) : null}
        <p className="text-center text-[10px] leading-snug text-[#5f6368]">{hint}</p>
      </div>
    </aside>
  );
}

const SYMBOL_NAV: { id: string; name: string; children?: { id: string; name: string }[] }[] = [
  { id: "Process", name: "Process" },
  {
    id: "Inventories",
    name: "Inventories",
    children: [
      { id: "Inventories/Big Container", name: "Big Container" },
      { id: "Inventories/Contolled inventory", name: "Contolled inventory" },
      { id: "Inventories/Small Box (Pallet)", name: "Small Box (Pallet)" },
      { id: "Inventories/Uncontroled Inventory", name: "Uncontroled Inventory" },
    ],
  },
  {
    id: "Materials",
    name: "Materials",
    children: [
      { id: "Materials/Forklift LV Delivery", name: "Forklift LV Delivery" },
      { id: "Materials/Forklift SB Delivery", name: "Forklift SB Delivery" },
    ],
  },
  { id: "Information", name: "Information" },
];

function artLibraryItem(art: SymbolArt): LibraryItem {
  const family = art.folder.startsWith("Inventories") ? "Inventories" : art.folder.startsWith("Materials") ? "Material" : "Process";
  return { id: `art:${art.id}`, name: art.name, fr: art.folder, family, symbol: "rectangle", artwork: art.id };
}

function SymbolLibrary({ armedId, onPick, onClose }: { armedId: string | null; onPick: (item: LibraryItem) => void; onClose: () => void }) {
  const [folder, setFolder] = useState("Process");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const family = folder === "Process" || folder === "Inventories" || folder === "Information" ? folder : folder === "Materials" ? "Material" : null;
  const drawings = SYMBOL_ART.filter((art) => (q ? `${art.name} ${art.folder}`.toLowerCase().includes(q) : art.folder === folder)).map(artLibraryItem);
  const legacy = LIBRARY.filter((item) => {
    const haystack = `${item.name} ${item.fr} ${item.family}`.toLowerCase();
    if (q) return haystack.includes(q);
    return family !== null && item.family === family;
  });
  const items = [...drawings, ...legacy];
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#d0d7de] px-3 py-2">
        <span className="text-sm font-medium">Symbols</span>
        <Tip label="Close symbols">
          <button type="button" aria-label="Close symbols" className="flex size-7 items-center justify-center rounded-md hover:bg-[#e8eaed]" onClick={onClose}>
            <X className="size-4" />
          </button>
        </Tip>
      </div>
      <div className="border-b border-[#d0d7de] px-3 py-2">
        <Input aria-label="Search symbols" placeholder="Search symbols" value={query} onChange={(event) => setQuery(event.target.value)} className="h-8" />
      </div>
      <div className="flex min-h-0 flex-1">
        <nav aria-label="Symbol folders" className="w-52 shrink-0 overflow-auto border-r border-[#d0d7de] py-2">
          {SYMBOL_NAV.map((group) => (
            <div key={group.id}>
              <FolderButton name={group.name} selected={!q && folder === group.id} onClick={() => { setFolder(group.id); setQuery(""); }} />
              {group.children?.map((child) => (
                <FolderButton key={child.id} name={child.name} nested selected={!q && folder === child.id} onClick={() => { setFolder(child.id); setQuery(""); }} />
              ))}
            </div>
          ))}
        </nav>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {items.length ? (
            <div className="grid grid-cols-2 gap-2">
              {items.map((item) => {
                const art = item.artwork ? ART_BY_ID[item.artwork] : undefined;
                const fit = art ? Math.min(88 / art.width, 52 / art.height) : 1;
                return (
                  <Tip key={item.id} label={item.artwork ? item.name : `${item.name} · ${item.fr}`}>
                    <button
                      type="button"
                      aria-label={item.name}
                      aria-pressed={armedId === item.id}
                      onClick={() => onPick(item)}
                      className={cn(
                        "flex h-full flex-col items-center gap-2 rounded-lg border bg-white px-2 py-3 text-center",
                        armedId === item.id ? "border-[#1b4f9c] ring-1 ring-[#1b4f9c]" : "border-[#d0d7de] hover:bg-[#f8f9fa]",
                      )}
                    >
                      <span className="flex h-14 items-center justify-center">
                        {art ? <VectorArt art={art} width={art.width * fit} height={art.height * fit} /> : item.link ? <LineGlyph kind={item.link.kind} /> : <SymbolShape symbol={item.symbol} width={72} height={48} />}
                      </span>
                      <span className="text-[13px] leading-tight text-[#202124]">{item.name}</span>
                      <span className="text-[11px] leading-tight text-[#5f6368]">{q && item.artwork ? item.fr : item.artwork ? "" : item.fr}</span>
                    </button>
                  </Tip>
                );
              })}
            </div>
          ) : (
            <p className="px-2 py-6 text-sm text-[#5f6368]">{q ? "No symbols match that search." : "No symbols in this folder yet."}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderButton({ name, selected, nested = false, onClick }: { name: string; selected: boolean; nested?: boolean; onClick: () => void }) {
  return (
    <Tip label={name}>
      <button
        type="button"
        aria-current={selected ? "page" : undefined}
        className={cn("block w-full truncate px-3 py-1.5 text-left text-sm", nested && "pl-6 text-[13px]", selected ? "bg-[#e8f0fe] font-medium text-[#1b4f9c]" : "text-[#202124] hover:bg-[#f4f6f8]")}
        onClick={onClick}
      >
        {name}
      </button>
    </Tip>
  );
}

function LineStyleBar({
  dash,
  color,
  arrow,
  onDash,
  onColor,
  onArrow,
}: {
  dash: string;
  color: string;
  arrow: ArrowEnds;
  onDash: (dash: string) => void;
  onColor: (color: string) => void;
  onArrow: (arrow: ArrowEnds) => void;
}) {
  const arrows: { id: ArrowEnds; label: string }[] = [
    { id: "none", label: "No arrow" },
    { id: "end", label: "Arrow forward" },
    { id: "start", label: "Arrow back" },
    { id: "both", label: "Arrows both ways" },
  ];
  return (
    <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#d0d7de] bg-white p-1 shadow-sm">
      {arrows.map((item) => (
        <Tip key={item.id} label={item.label}>
          <button
            type="button"
            aria-label={item.label}
            aria-pressed={arrow === item.id}
            className={cn("flex h-7 w-8 items-center justify-center rounded-md", arrow === item.id ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")}
            onClick={() => onArrow(item.id)}
          >
            <ArrowGlyph mode={item.id} color={color} />
          </button>
        </Tip>
      ))}
      <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
      {LINE_DASHES.map((item) => (
        <Tip key={item.id} label={item.label}>
          <button
            type="button"
            aria-label={item.label}
            aria-pressed={dash === item.dash}
            className={cn("flex h-7 w-10 items-center justify-center rounded-md", dash === item.dash ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")}
            onClick={() => onDash(item.dash)}
          >
            <svg width="28" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="27" y2="4" stroke={color} strokeWidth="1.8" strokeDasharray={item.dash || undefined} />
            </svg>
          </button>
        </Tip>
      ))}
      <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
      {LINE_COLORS.map((item) => (
        <Tip key={item.id} label={item.label}>
          <button
            type="button"
            aria-label={item.label}
            aria-pressed={color.toLowerCase() === item.color}
            className={cn("size-5 rounded-full border", color.toLowerCase() === item.color ? "border-[#1b4f9c] ring-2 ring-[#1b4f9c]" : "border-[#d0d7de]")}
            style={{ background: item.color }}
            onClick={() => onColor(item.color)}
          />
        </Tip>
      ))}
    </div>
  );
}

function EdgePorts({ box, armed, onConnect }: { box: Box; armed: boolean; onConnect: () => void }) {
  const [hot, setHot] = useState<"n" | "e" | "s" | "w" | null>(null);
  const insetX = box.width * 0.05;
  const insetY = box.height * 0.05;
  const sides = {
    n: { strip: { left: box.x + insetX, top: box.y - 28, width: box.width - insetX * 2, height: 18 }, dot: { left: box.x + box.width / 2, top: box.y - 16 } },
    s: { strip: { left: box.x + insetX, top: box.y + box.height + 10, width: box.width - insetX * 2, height: 18 }, dot: { left: box.x + box.width / 2, top: box.y + box.height + 16 } },
    e: { strip: { left: box.x + box.width + 10, top: box.y + insetY, width: 18, height: box.height - insetY * 2 }, dot: { left: box.x + box.width + 16, top: box.y + box.height / 2 } },
    w: { strip: { left: box.x - 28, top: box.y + insetY, width: 18, height: box.height - insetY * 2 }, dot: { left: box.x - 16, top: box.y + box.height / 2 } },
  } as const;
  return (
    <>
      {(Object.keys(sides) as (keyof typeof sides)[]).map((side) => {
        const { strip, dot } = sides[side];
        return (
          <Tip key={side} label="Draw a line">
          <div
            aria-label={`Connect ${side}`}
            className="absolute z-30 cursor-crosshair"
            style={strip}
            onPointerEnter={() => setHot(side)}
            onPointerLeave={() => setHot((current) => (current === side ? null : current))}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onConnect();
            }}
          >
            {armed || hot === side ? (
              <span className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1b4f9c] bg-white", armed ? "size-3.5" : "size-2.5")} style={{ left: dot.left - strip.left, top: dot.top - strip.top }} />
            ) : null}
          </div>
          </Tip>
        );
      })}
    </>
  );
}

function BasicShape({
  shape,
  width,
  height,
  name,
  editing,
  onChange,
  onFocus,
  onBlur,
}: {
  shape: "text" | "rectangle" | "ellipse";
  width: number;
  height: number;
  name: string;
  editing: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  if (shape === "text") {
    if (editing) {
      return (
        <textarea
          autoFocus
          aria-label="Text"
          value={name}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          onPointerDown={(event) => event.stopPropagation()}
          className="h-full w-full resize-none bg-transparent px-1 text-center text-sm leading-8 text-[#202124] outline-none"
        />
      );
    }
    return <div className="flex h-full w-full items-center justify-center border border-dashed border-[#d0d7de] px-1 text-center text-sm text-[#202124]">{name || "Text"}</div>;
  }
  return (
    <svg width={width} height={height} aria-hidden="true">
      {shape === "ellipse" ? (
        <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - 1} ry={height / 2 - 1} fill="#fff" stroke="#202124" strokeWidth={1.5} />
      ) : (
        <rect x={1} y={1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} rx={2} fill="#fff" stroke="#202124" strokeWidth={1.5} />
      )}
    </svg>
  );
}

function RailButton({ label, title, active, onClick, children }: { label: string; title?: string; active: boolean; onClick: () => void; children: ReactNode }) {
  const name = title ?? label;
  return (
    <Tip label={name}>
      <button
        type="button"
        aria-label={name}
        aria-pressed={active}
        className={cn(
          "flex w-full flex-col items-center gap-0.5 rounded-md py-1 text-[10px] leading-none [&_svg]:size-4",
          active ? "bg-[#e8f0fe] text-[#1b4f9c]" : "text-[#202124] hover:bg-[#e8eaed]",
        )}
        onClick={onClick}
      >
        {children}
        <span>{label}</span>
      </button>
    </Tip>
  );
}

function ArrowGlyph({ mode, color }: { mode: ArrowEnds; color: string }) {
  const head = (x: number, pointRight: boolean) => (pointRight ? `M${x},2 L${x + 6},6 L${x},10` : `M${x + 6},2 L${x},6 L${x + 6},10`);
  return (
    <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
      <line x1={mode === "start" || mode === "both" ? 7 : 2} y1="6" x2={mode === "end" || mode === "both" ? 15 : 20} y2="6" stroke={color} strokeWidth="1.6" />
      {mode === "end" || mode === "both" ? <path d={head(14, true)} fill="none" stroke={color} strokeWidth="1.6" /> : null}
      {mode === "start" || mode === "both" ? <path d={head(2, false)} fill="none" stroke={color} strokeWidth="1.6" /> : null}
    </svg>
  );
}

function iconsOnLines(doc: MifaDocument, edges: SheetEdge[], nodeBox: (id: string) => SheetNode | null, lanes: Map<string, number>) {
  const icons: { id: string; edgeId: string; art: SymbolArt; x: number; y: number; width: number; height: number }[] = [];
  for (const edge of edges) {
    const parts = edge.label
      .split(" · ")
      .map((part) => part.trim())
      .filter((part) => transportArtwork(part));
    if (!parts.length) continue;
    const from = nodeBox(edge.from);
    const to = nodeBox(edge.to);
    if (!from || !to) continue;
    const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0);
    const start = route.points[0];
    const end = route.points[route.points.length - 1];
    const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
    const sized = parts.map((part) => {
      const art = transportArtwork(part)!;
      const key = `${edge.id}::${part}`;
      const saved = doc.icons?.[key];
      const natural = artBox(art);
      return { art, key, saved, width: saved?.width ?? natural.width, height: saved?.height ?? natural.height };
    });
    const gap = 8;
    const total = sized.reduce((sum, item) => sum + (horizontal ? item.width : item.height), 0) + gap * Math.max(0, sized.length - 1);
    let cursor = horizontal ? route.label.x - total / 2 : route.label.y - total / 2;
    for (const item of sized) {
      const x = item.saved ? item.saved.x : horizontal ? cursor : route.label.x - item.width - 12;
      const y = item.saved ? item.saved.y : horizontal ? route.label.y - item.height - 12 : cursor;
      cursor += (horizontal ? item.width : item.height) + gap;
      icons.push({ id: `icon:${item.key}`, edgeId: edge.id, art: item.art, x, y, width: item.width, height: item.height });
    }
  }
  return icons;
}

function laneMap(edges: SheetEdge[]) {
  const order: string[][] = [];
  const index = new Map<string, number>();
  for (const edge of edges) {
    const key = [edge.from, edge.to].sort().join("\0");
    const at = index.get(key);
    if (at === undefined) {
      index.set(key, order.length);
      order.push([edge.id]);
    } else order[at].push(edge.id);
  }
  const lanes = new Map<string, number>();
  for (const ids of order) {
    ids.forEach((id, place) => {
      const step = Math.ceil(place / 2);
      lanes.set(id, place === 0 ? 0 : place % 2 === 1 ? step : -step);
    });
  }
  return lanes;
}

function markerId(color: string) {
  return color.replace(/[^a-z0-9]/gi, "").toLowerCase() || "line";
}

function LineGlyph({ kind, title }: { kind: FlowKind; title?: string }) {
  const style = FLOW_STROKE[kind];
  return (
    <svg width="22" height="12" viewBox="0 0 22 12" style={{ width: 22, height: 12 }} aria-hidden={title ? undefined : true} role={title ? "img" : undefined} aria-label={title}>
      <title>{title}</title>
      <line x1="1" y1="6" x2="15" y2="6" stroke={style.stroke} strokeWidth="1.6" strokeDasharray={style.dash} />
      <path d="M13 2.5 L20 6 L13 9.5" fill="none" stroke={style.stroke} strokeWidth="1.6" />
    </svg>
  );
}

function TitleBlock({ project }: { project: ProjectInfo }) {
  const line = [project.rate && `${project.rate} veh/h`, project.shifts && `${project.shifts} shifts`, project.perDay && `${project.perDay} veh/day`].filter(Boolean).join(" · ");
  return (
    <div className="pointer-events-none absolute top-4 left-4 max-w-md text-[#202124]">
      <p className="text-[11px] tracking-wide text-[#5f6368] uppercase">{[project.plant, project.shop].filter(Boolean).join(" · ") || "MIFA"}</p>
      <p className="text-sm font-semibold">{project.name}</p>
      <p className="text-[12px] text-[#5f6368]">
        {[project.scenario, line, project.diversity].filter(Boolean).join(" · ")}
        {project.updated ? ` · ${project.updated}` : ""}
      </p>
    </div>
  );
}

function Field({ label, value, onChange, width = "w-28" }: { label: string; value: string; onChange: (value: string) => void; width?: string }) {
  return (
    <label className={cn("grid gap-0.5 text-[10px] font-medium tracking-wide text-[#5f6368] uppercase", width)}>
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-full rounded-md border border-[#d0d7de] bg-white px-1.5 text-sm font-normal tracking-normal text-[#202124] normal-case"
      />
    </label>
  );
}

function FlowCell({ flow, column, onChange }: { flow: Flow; column: keyof Flow; onChange: (value: string | boolean) => void }) {
  if (BOOL_KEYS.has(column)) {
    const checked = Boolean(flow[column]);
    return <input aria-label={column} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />;
  }
  if (column === "packaging") {
    return (
      <select aria-label="Packaging type" value={flow.packaging} onChange={(event) => onChange(event.target.value)} className="h-7 w-16 bg-transparent text-[12px]">
        <option value="">—</option>
        <option value="SB">SB</option>
        <option value="LV">LV</option>
      </select>
    );
  }
  return (
    <input aria-label={column} value={String(flow[column] ?? "")} onChange={(event) => onChange(event.target.value)} className="h-7 w-28 bg-transparent px-1 text-[12px] outline-none" />
  );
}
