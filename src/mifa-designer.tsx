import { ArchivePanel } from "./archive-panel";
import { ARCHIVE_KEY, addFolder, addMifa, createArchive, openDocument, parseArchive, remember, removeFolder, removeMifa, renameFolder, restoreVersion, saveVersion, type Archive } from "./archive";
import { linePattern, ProductionLineArt, productionLineBox, SymbolShape, VectorArt } from "./symbol-shape";
import { Button, Input, Tip } from "./ui";
import { cn } from "./cn";
import { STAMPS, connectSymbols, omitSymbols, placeSymbol, retargetNode, type StampId } from "./canvas";
import {
  arrange,
  arrowOnScreen,
  arrowSeat,
  arrowTowardScreen,
  addLineCorner,
  bendFromCorner,
  bendFromMove,
  dragLineCorner,
  slideLineEnd,
  removeLineCorner,
  shiftLine,
  bindFlowLine,
  bindFlowSymbol,
  bindTarget,
  blankFlow,
  buildSheet,
  canonicalizeSequencers,
  movePlaced,
  lockToCenter,
  unlockNodes,
  edgeRoute,
  fieldForConnection,
  fieldForNode,
  seatLineIcon,
  strokeAround,
  emptyDocument,
  exampleDocument,
  paintLayers,
  parseMifaDocument,
  createId,
  boxForPercent,
  clampFont,
  fittedIconBox,
  nextQuarter,
  flowStory,
  nestHosts,
  previewPath,
  quarterBox,
  resizeSheet,
  resizeBox,
  scaledBox,
  scaledSymbol,
  symbolPercent,
  snap,
  SYMBOL_SIZE,
  type ArrowEnds,
  type Flow,
  type FlowKind,
  type LineBend,
  type Mark,
  type MifaDocument,
  type ProjectInfo,
  type QuarterTurn,
  type Sheet,
  type SheetBox,
  type SheetEdge,
  type SheetNode,
  type TextAlign,
} from "./document";
import { downloadWorkbook, FLOW_COLUMNS, FLOW_GROUPS, readWorkbook } from "./excel";
import type { LibraryItem } from "./library";
import { ART_BY_ID, SYMBOL_ART, artBounds, artBox, transportArtwork, type SymbolArt } from "./symbol-art";
import { Circle, Download, Eye, FlipHorizontal2, Folder, Link2, Lock, LockOpen, Minus, MousePointer2, PanelBottomClose, PanelBottomOpen, PenLine, Plus, Redo2, RotateCw, Shapes, Share2, Square, Trash2, Type, Undo2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

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

function shareFromLocation(): { mode: "preview" | "edit"; doc: MifaDocument } | null {
  const hash = window.location.hash;
  if (!hash.startsWith("#mifa=")) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(hash.slice("#mifa=".length))) as { mode?: unknown; doc?: unknown };
    const doc = parseMifaDocument(parsed.doc);
    if (!doc) return null;
    return { mode: parsed.mode === "edit" ? "edit" : "preview", doc };
  } catch {
    return null;
  }
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
  const [binding, setBinding] = useState<{ flowId: string; column: keyof Flow } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; at: { x: number; y: number }; id: string | null; edgeId: string | null; corner: number | null } | null>(null);
  const [dropAt, setDropAt] = useState<{ x: number; y: number } | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [group, setGroup] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [canPaste, setCanPaste] = useState(false);
  const [hover, setHover] = useState<{ id: string; label: string; flowIds: string[] } | null>(null);
  const [dataOpen, setDataOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareLock, setShareLock] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [view, setView] = useState<View>({ zoom: 1, pan: { x: 32, y: 16 } });
  const [notice, setNotice] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const sharedRef = useRef(false);
  const viewRef = useRef(view);
  const spaceRef = useRef(false);
  const panDrag = useRef<{ x: number; y: number; panX: number; panY: number; fromSheet?: boolean; moved?: boolean } | null>(null);
  const canvasRef = useRef<{ edge: string; x: number; y: number; origin: MifaDocument; moved: boolean } | null>(null);
  const pageRef = useRef<SheetBox>({ x: 0, y: 0, width: 2800, height: 1800 });
  const resizeRef = useRef<{
    id: string;
    handle: string;
    x: number;
    y: number;
    box: { x: number; y: number; width: number; height: number };
    origin: MifaDocument;
    moved: boolean;
    circle: boolean;
    ratio?: number;
    minWidth: number;
    minHeight: number;
  } | null>(null);
  const nudgeRef = useRef<{
    origin: MifaDocument;
    starts: Record<string, { x: number; y: number; width: number; height: number }>;
    iconStarts: Record<string, { x: number; y: number; width: number; height: number; flip?: boolean; turn?: QuarterTurn; placed?: boolean }>;
    dx: number;
    dy: number;
    moved: boolean;
    timer: number;
  } | null>(null);
  const arrowsDown = useRef(new Set<string>());
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    origin: MifaDocument;
    moved: boolean;
    width: number;
    height: number;
    starts?: Record<string, { x: number; y: number; width: number; height: number }>;
    iconStarts?: Record<string, { x: number; y: number; width: number; height: number; flip?: boolean; turn?: QuarterTurn; placed?: boolean }>;
  } | null>(null);
  const marqueeRef = useRef<{ x: number; y: number; moved: boolean; box: { x: number; y: number; width: number; height: number }; base: string[] } | null>(null);
  const boxesRef = useRef<{ id: string; x: number; y: number; width: number; height: number }[]>([]);
  const bendRef = useRef<{ id: string; index: number; origin: MifaDocument; moved: boolean; x: number; y: number } | null>(null);
  const textOrigin = useRef<MifaDocument | null>(null);
  const tableCellRef = useRef<HTMLTableCellElement | null>(null);
  viewRef.current = view;
  archiveRef.current = archive;

  const doc = useMemo(() => canonicalizeSequencers(history.present), [history.present]);
  const sheet = useMemo(() => buildSheet(doc), [doc]);
  pageRef.current = sheet;
  const marks = doc.marks ?? [];
  const drawnEdges: SheetEdge[] = (doc.links ?? []).map((link) => ({ id: link.id, from: link.from, to: link.to, kind: link.kind, label: link.label, flowIds: [] }));
  const layers = paintLayers([...sheet.nodes.map((node) => node.id), ...marks.map((mark) => mark.id)], doc.stack);
  const visibleEdges = [...sheet.edges, ...drawnEdges];
  const lanes = laneMap(visibleEdges);
  const lineIcons = iconsOnLines(doc, visibleEdges, nodeBox, lanes, sheet);
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
  const tableFocus = focusInTable(sheet, lineIcons, selectedNodeId, selectedEdgeId, selectedFlowId);
  tableCellRef.current = null;
  const sheetWidth = sheet.width;
  const sheetHeight = sheet.height;
  const activePath = mode === "preview" && hover ? previewPath(sheet, hover.id, drawnEdges) : null;

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
    const shared = shareFromLocation();
    sharedRef.current = Boolean(shared);
    const next = stored ?? createArchive(legacy ?? exampleDocument());
    archiveRef.current = next;
    setArchive(next);
    setBrowseFolderId(next.openFolderId);
    setHistory({ past: [], present: shared?.doc ?? openDocument(next), future: [] });
    if (shared) {
      setMode(shared.mode === "edit" ? "design" : "preview");
      setShareLock(shared.mode === "preview");
    }
    setReady(true);
  }, []);

  useEffect(() => {
    tableCellRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectedNodeId, selectedEdgeId, selectedFlowId]);

  useEffect(() => {
    if (!ready || sharedRef.current) return;
    const next = remember(archiveRef.current, doc);
    archiveRef.current = next;
    setArchive(next);
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }, [doc, ready]);

  function commit(recipe: (current: MifaDocument) => MifaDocument) {
    setHistory((current) => {
      const base = canonicalizeSequencers(current.present);
      return commitHistory(current, canonicalizeSequencers(recipe(base)));
    });
  }

  function resetSelection() {
    setSelectedFlowId(null);
    setSelectedNodeId(null);
    setGroup([]);
    setLinkFrom(null);
    setBinding(null);
    setHover(null);
    setSelectedEdgeId(null);
    setMenu(null);
    setDropAt(null);
    setArmed(null);
    setMarquee(null);
  }

  useEffect(() => {
    if (!shareOpen) return;
    function close(event: PointerEvent) {
      if (shareRef.current?.contains(event.target as Node)) return;
      setShareOpen(false);
    }
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [shareOpen]);

  function leaveShare() {
    if (!sharedRef.current && !shareLock) return;
    sharedRef.current = false;
    setShareLock(false);
    if (window.location.hash.startsWith("#mifa=")) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  function applyArchive(next: Archive, switchSheet: boolean) {
    archiveRef.current = next;
    setArchive(next);
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
    if (!switchSheet) return;
    leaveShare();
    setHistory({ past: [], present: openDocument(next), future: [] });
    resetSelection();
  }

  function replace(next: MifaDocument) {
    leaveShare();
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

  const clipboard = useRef<{ items: Mark[]; pasteCount: number } | null>(null);
  const actions = useRef({ undo, redo, removeSelection: () => {}, dismiss: () => {}, copy: (): boolean => false, paste: (): boolean => false, nudge: (_dx: number, _dy: number): boolean => false, finishNudge: () => {} });
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
    setEditingTextId(null);
    setSelectedFlowId(null);
  };
  actions.current.dismiss = () => {
    const cancelTool = Boolean(linkFrom || binding || armed || libraryOpen || tool !== "select");
    setMenu(null);
    setDropAt(null);
    setLibraryOpen(false);
    setLinkFrom(null);
    setBinding(null);
    setArmed(null);
    setTool("select");
    if (cancelTool) return;
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setGroup([]);
    setEditingTextId(null);
    setSelectedFlowId(null);
  };
  actions.current.copy = () => {
    const ids = group.length ? group : selectedNodeId ? [selectedNodeId] : [];
    const items = ids.map((id) => snapshotSymbol(doc, sheet.nodes, lineIcons, id)).filter((item): item is Mark => item !== null);
    if (!items.length) return false;
    clipboard.current = { items, pasteCount: 0 };
    setCanPaste(true);
    return true;
  };
  actions.current.paste = () => {
    const clip = clipboard.current;
    if (mode !== "design" || !clip?.items.length) return false;
    clip.pasteCount += 1;
    const step = 24 * clip.pasteCount;
    const page = pageRef.current;
    const copies = clip.items.map((item) => {
      const width = item.width ?? SYMBOL_SIZE[item.symbol].width;
      const height = item.height ?? SYMBOL_SIZE[item.symbol].height;
      const placed = fitOnSheet(snap(item.x + step), snap(item.y + step), width, height, page);
      return { ...item, id: createId("mark"), x: placed.x, y: placed.y };
    });
    commit((current) => ({ ...current, marks: [...(current.marks ?? []), ...copies] }));
    setSelectedNodeId(copies[0]?.id ?? null);
    setGroup(copies.map((item) => item.id));
    setSelectedEdgeId(null);
    setSelectedFlowId(null);
    setEditingTextId(null);
    setMenu(null);
    return true;
  };
  actions.current.nudge = (dx: number, dy: number) => {
    if (mode !== "design" || editingTextId || binding || linkFrom || dragRef.current) return false;
    const ids = (group.length ? group : selectedNodeId ? [selectedNodeId] : []).filter((id) => !doc.locks?.[id]);
    if (!ids.length) return false;
    let burst = nudgeRef.current;
    if (!burst) {
      const starts: Record<string, { x: number; y: number; width: number; height: number }> = {};
      for (const id of ids) {
        const found = boxesRef.current.find((item) => item.id === id);
        if (found) starts[id] = found;
      }
      if (!Object.keys(starts).length) return false;
      const moved = new Set(Object.keys(starts).filter((id) => !id.startsWith("mark-") && !id.startsWith("icon:")));
      const iconStarts: NonNullable<NonNullable<typeof nudgeRef.current>["iconStarts"]> = {};
      for (const edge of visibleEdges) {
        if (!moved.has(edge.from) && !moved.has(edge.to)) continue;
        const prefix = `${edge.id}::`;
        for (const [key, saved] of Object.entries(doc.icons ?? {})) {
          if (!key.startsWith(prefix) || saved.placed === false || starts[`icon:${key}`]) continue;
          iconStarts[key] = saved;
        }
      }
      for (const icon of lineIcons) {
        const edge = visibleEdges.find((item) => item.id === icon.edgeId);
        if (!edge || (!moved.has(edge.from) && !moved.has(edge.to))) continue;
        const key = icon.id.slice(5);
        if (iconStarts[key] || starts[icon.id]) continue;
        const saved = doc.icons?.[key];
        iconStarts[key] = {
          x: icon.x,
          y: icon.y,
          width: icon.width,
          height: icon.height,
          ...(icon.flip ? { flip: true } : {}),
          ...(icon.turn ? { turn: icon.turn } : {}),
          ...(saved?.placed === true ? { placed: true } : {}),
        };
      }
      burst = { origin: doc, starts, iconStarts, dx: 0, dy: 0, moved: false, timer: 0 };
      nudgeRef.current = burst;
    }
    let nextX = burst.dx + dx;
    let nextY = burst.dy + dy;
    for (const box of Object.values(burst.starts)) {
      nextX = Math.min(sheet.x + sheet.width - box.width - box.x, Math.max(sheet.x - box.x, nextX));
      nextY = Math.min(sheet.y + sheet.height - box.height - box.y, Math.max(sheet.y - box.y, nextY));
    }
    if (nextX === burst.dx && nextY === burst.dy) return burst.moved;
    burst.dx = nextX;
    burst.dy = nextY;
    burst.moved = true;
    const step = burst;
    setHistory((current) => ({
      ...current,
      present: movePlaced(current.present, step.starts, step.dx, step.dy, {
        origin: step.origin,
        iconStarts: step.iconStarts,
        lanes: (id) => lanes.get(id) ?? 0,
      }),
    }));
    window.clearTimeout(step.timer);
    step.timer = window.setTimeout(() => actions.current.finishNudge(), 400);
    return true;
  };
  actions.current.finishNudge = () => {
    const burst = nudgeRef.current;
    if (!burst) return;
    window.clearTimeout(burst.timer);
    nudgeRef.current = null;
    if (!burst.moved) return;
    setHistory((current) => ({ past: [...current.past, burst.origin].slice(-50), present: current.present, future: [] }));
  };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.code === "Space") {
        spaceRef.current = true;
        event.preventDefault();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.current.redo();
        else actions.current.undo();
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "c" && actions.current.copy()) event.preventDefault();
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "v" && actions.current.paste()) event.preventDefault();
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        actions.current.removeSelection();
      }
      if (event.key === "Escape") actions.current.dismiss();
      if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown") {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        const step = event.shiftKey ? 8 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        if (!actions.current.nudge(dx, dy)) return;
        arrowsDown.current.add(event.key);
        event.preventDefault();
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") spaceRef.current = false;
      if (!event.key.startsWith("Arrow")) return;
      arrowsDown.current.delete(event.key);
      if (arrowsDown.current.size === 0) actions.current.finishNudge();
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
      const extending = canvasRef.current;
      if (extending) {
        const zoom = viewRef.current.zoom || 1;
        const dx = (event.clientX - extending.x) / zoom;
        const dy = (event.clientY - extending.y) / zoom;
        if (Math.hypot(dx, dy) > 2) extending.moved = true;
        const next = resizeSheet(extending.origin, extending.edge, dx, dy);
        setHistory((current) => ({ ...current, present: next }));
        return;
      }
      const resizing = resizeRef.current;
      if (resizing) {
        const zoom = viewRef.current.zoom || 1;
        const dx = (event.clientX - resizing.x) / zoom;
        const dy = (event.clientY - resizing.y) / zoom;
        if (Math.hypot(dx, dy) > 2) resizing.moved = true;
        const box = fitBox(resizeBox(resizing.handle, resizing.box, dx, dy, { minWidth: resizing.minWidth, minHeight: resizing.minHeight, circle: resizing.circle, ratio: resizing.ratio }), pageRef.current);
        setHistory((current) => ({ ...current, present: applyBox(current.present, resizing.id, box) }));
        return;
      }
      const band = marqueeRef.current;
      if (band) {
        const point = sheetPoint(event);
        const x = point.x;
        const y = point.y;
        if (Math.hypot(x - band.x, y - band.y) > 16) band.moved = true;
        band.box = { x: Math.min(band.x, x), y: Math.min(band.y, y), width: Math.abs(x - band.x), height: Math.abs(y - band.y) };
        setMarquee(band.box);
        return;
      }
      const bending = bendRef.current;
      if (bending) {
        const point = sheetPoint(event);
        const origin = sheetPoint({ clientX: bending.x, clientY: bending.y });
        const x = point.x;
        const y = point.y;
        const x0 = origin.x;
        const y0 = origin.y;
        if (Math.hypot(x - x0, y - y0) > 2) bending.moved = true;
        if (!bending.moved) return;
        const ends = endsOf(bending.origin, bending.id);
        if (!ends) return;
        const base = bending.origin.bends?.[bending.id];
        const shaped = Boolean(base?.shaped && (bending.index < 0 || edgeRoute(ends.from, ends.to, base).corners.length > 0));
        const next = bending.index <= -2
          ? slideLineEnd(ends.from, ends.to, base, bending.index === -2 ? "from" : "to", { x: snap(x), y: snap(y) })
          : shaped
            ? bending.index < 0
              ? shiftLine(ends.from, ends.to, base!, x - x0, y - y0)
              : dragLineCorner(ends.from, ends.to, base!, bending.index, { x, y })
            : bending.index < 0
              ? bendFromMove(ends.from, ends.to, base, x - x0, y - y0)
              : bendFromCorner(ends.from, ends.to, base, bending.index, { x: snap(x), y: snap(y) });
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
      const extending = canvasRef.current;
      if (extending) {
        canvasRef.current = null;
        if (extending.moved) {
          const origin = extending.origin;
          setHistory((current) => (current.present === origin ? current : { past: [...current.past, origin].slice(-50), present: current.present, future: [] }));
        }
      }
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
          if (band.base.length) return;
          setSelectedFlowId(null);
          setSelectedNodeId(null);
          setGroup([]);
          setSelectedEdgeId(null);
          setLinkFrom(null);
          setArmed(null);
        } else {
          const found = boxesRef.current.filter((box) => box.x < band.box.x + band.box.width && box.x + box.width > band.box.x && box.y < band.box.y + band.box.height && box.y + box.height > band.box.y).map((box) => box.id);
          const hits = [...band.base, ...found.filter((id) => !band.base.includes(id))];
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
    const rect = viewportRef.current?.getBoundingClientRect();
    const zoom = viewRef.current.zoom || 1;
    const pan = viewRef.current.pan;
    if (!rect) return { x: 0, y: 0 };
    return { x: (event.clientX - rect.left - pan.x) / zoom, y: (event.clientY - rect.top - pan.y) / zoom };
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
      const size = chosenSize(item);
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
      const size = chosenSize(item);
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
    return arrowTowardScreen(edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0, sheet).points);
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
    setMenu({ x: Math.min(event.clientX, window.innerWidth - 220), y: Math.min(event.clientY, window.innerHeight - 280), at: sheetPoint(event), id, edgeId: null, corner: null });
  }

  function openEdgeMenu(event: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number }, edgeId: string, corner: number | null) {
    event.preventDefault();
    event.stopPropagation();
    const edge = visibleEdges.find((item) => item.id === edgeId);
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setGroup([]);
    setLinkFrom(null);
    setSelectedFlowId(edge?.flowIds[0] ?? null);
    setMenu({ x: Math.min(event.clientX, window.innerWidth - 220), y: Math.min(event.clientY, window.innerHeight - 280), at: sheetPoint(event), id: null, edgeId, corner });
  }

  function lineCorners(edgeId: string) {
    const edge = visibleEdges.find((item) => item.id === edgeId);
    const from = edge && nodeBox(edge.from);
    const to = edge && nodeBox(edge.to);
    if (!from || !to) return [];
    return edgeRoute(from, to, doc.bends?.[edgeId], 0, sheet).corners;
  }

  function editLine(edgeId: string, produce: (from: SheetNode, to: SheetNode, bend: LineBend | undefined) => LineBend | null) {
    const edge = visibleEdges.find((item) => item.id === edgeId);
    const from = edge && nodeBox(edge.from);
    const to = edge && nodeBox(edge.to);
    if (!from || !to) return;
    commit((current) => {
      const next = produce(from, to, current.bends?.[edgeId]);
      const bends = { ...(current.bends ?? {}) };
      if (!next) delete bends[edgeId];
      else bends[edgeId] = next;
      return { ...current, bends };
    });
    setMenu(null);
    setSelectedEdgeId(edgeId);
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
    setEditingTextId(null);
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
    const size = shape === "text" ? { width: 160, height: 40 } : shape === "ellipse" ? { width: 96, height: 96 } : { width: 128, height: 72 };
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
    setEditingTextId(shape === "text" ? mark.id : null);
    setSelectedFlowId(null);
    setSelectedEdgeId(null);
    setArmed(null);
    if (shape !== "text") setTool("select");
  }

  function nodeUnder(x: number, y: number) {
    for (const element of document.elementsFromPoint(x, y)) {
      const host = element.closest("[data-node]");
      const id = host?.getAttribute("data-node");
      if (!id) continue;
      const node = sheet.nodes.find((item) => item.id === id);
      if (node) return node;
    }
    return null;
  }

  function useBinding(target: SheetNode | SheetEdge) {
    if (!binding) return false;
    const column = FLOW_COLUMNS.find((item) => item.key === binding.column);
    const next = "from" in target ? bindFlowLine(doc, binding.flowId, binding.column, target) : bindFlowSymbol(doc, binding.flowId, binding.column, target);
    if (!next) {
      const expect = bindTarget(binding.column);
      const name = expect?.role === "line" ? `${expect.kind} line` : `${expect?.kind ?? "matching"} symbol`;
      setNotice(`${column?.header ?? "This cell"} needs a ${name}.`);
      return true;
    }
    commit(() => next);
    setNotice(`${column?.header ?? "Cell"} uses ${target.label}.`);
    setBinding(null);
    setSelectedFlowId(binding.flowId);
    setLinkFrom(null);
    if ("from" in target) {
      setSelectedEdgeId(target.id);
      setSelectedNodeId(null);
      setGroup([]);
    } else {
      setSelectedNodeId(target.id);
      setGroup([target.id]);
      setSelectedEdgeId(null);
    }
    return true;
  }

  function onEdgePointerDown(event: ReactPointerEvent<SVGPathElement | HTMLDivElement>, id: string, index = -1) {
    if (mode !== "design" || spaceRef.current || event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const edge = visibleEdges.find((item) => item.id === id);
    if (edge && binding && bindTarget(binding.column)?.role === "symbol") {
      const attached = index === -2 ? edge.from : index === -3 ? edge.to : "";
      const node = sheet.nodes.find((item) => item.id === attached) ?? nodeUnder(event.clientX, event.clientY);
      if (node) {
        useBinding(node);
        return;
      }
    }
    if (edge && useBinding(edge)) return;
    if (tool === "add") {
      placeChosen(armed, sheetPoint(event));
      return;
    }
    if (tool !== "select") return;
    if (index >= 0 && event.detail >= 2) {
      bendRef.current = null;
      const from = edge && nodeBox(edge.from);
      const to = edge && nodeBox(edge.to);
      if (from && to && edgeRoute(from, to, doc.bends?.[id]).corners.length > index) editLine(id, (start, end, bend) => removeLineCorner(start, end, bend, index));
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

  function onSheetEdge(edge: string, event: ReactPointerEvent<HTMLDivElement>) {
    canvasRef.current = { edge, x: event.clientX, y: event.clientY, origin: doc, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button === 2) return;
    setMenu(null);
    if (mode !== "design" || spaceRef.current || event.button === 1) return;
    if ((event.target as HTMLElement).closest?.("svg")) return;
    setLibraryOpen(false);
    setDropAt(null);
    if (binding) {
      setBinding(null);
      return;
    }
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
      const extend = event.shiftKey || event.metaKey || event.ctrlKey;
      marqueeRef.current = {
        x: point.x,
        y: point.y,
        moved: false,
        box: { x: point.x, y: point.y, width: 0, height: 0 },
        base: extend ? (group.length ? group : selectedNodeId ? [selectedNodeId] : []) : [],
      };
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
      setHover({ id: node.id, label: node.label, flowIds: node.flowIds });
      return;
    }
    setMenu(null);
    if (useBinding(node)) return;
    if (linkFrom && linkFrom !== node.id) {
      finishLink(linkFrom, node.id);
      return;
    }
    setSelectedEdgeId(null);
    if (tool === "text" || tool === "rectangle" || tool === "ellipse") {
      placeBasic(tool, sheetPoint(event));
      return;
    }
    if (tool === "add") {
      placeChosen(armed, sheetPoint(event));
      return;
    }
    if (tool !== "select") {
      setTool("select");
      setArmed(null);
    }
    setSelectedEdgeId(null);
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      event.preventDefault();
      toggleSelection(node.id);
      return;
    }
    const point = sheetPoint(event);
    beginMove(node.id, point, { x: node.x, y: node.y, width: node.width, height: node.height });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function toggleSelection(id: string) {
    const current = group.length ? group : selectedNodeId ? [selectedNodeId] : [];
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    setGroup(next);
    setSelectedNodeId(next.length === 1 ? next[0] : null);
    setSelectedEdgeId(null);
    setSelectedFlowId(next.length === 1 ? (sheet.nodes.find((node) => node.id === next[0])?.flowIds[0] ?? null) : null);
    setLinkFrom(null);
    setEditingTextId(null);
  }

  function beginMove(id: string, point: { x: number; y: number }, box: { x: number; y: number; width: number; height: number }) {
    const ids = group.includes(id) && group.length > 1 ? group : [id];
    if (ids.length === 1) {
      setSelectedNodeId(id);
      setGroup([id]);
      setSelectedFlowId(sheet.nodes.find((node) => node.id === id)?.flowIds[0] ?? null);
    }
    if (doc.locks?.[id]) return;
    const starts: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const itemId of ids) {
      if (doc.locks?.[itemId]) continue;
      const found = boxesRef.current.find((item) => item.id === itemId);
      if (found) starts[itemId] = found;
    }
    if (!starts[id]) return;
    const moved = new Set(Object.keys(starts).filter((itemId) => !itemId.startsWith("mark-") && !itemId.startsWith("icon:")));
    const iconStarts: NonNullable<NonNullable<typeof dragRef.current>["iconStarts"]> = {};
    for (const edge of visibleEdges) {
      if (!moved.has(edge.from) && !moved.has(edge.to)) continue;
      const prefix = `${edge.id}::`;
      for (const [key, saved] of Object.entries(doc.icons ?? {})) {
        if (!key.startsWith(prefix) || saved.placed === false || starts[`icon:${key}`]) continue;
        iconStarts[key] = saved;
      }
    }
    for (const icon of lineIcons) {
      const edge = visibleEdges.find((item) => item.id === icon.edgeId);
      if (!edge || (!moved.has(edge.from) && !moved.has(edge.to))) continue;
      const key = icon.id.slice(5);
      if (iconStarts[key] || starts[icon.id]) continue;
      const saved = doc.icons?.[key];
      iconStarts[key] = {
        x: icon.x,
        y: icon.y,
        width: icon.width,
        height: icon.height,
        ...(icon.flip ? { flip: true as const } : {}),
        ...(icon.turn ? { turn: icon.turn } : {}),
        ...(saved?.placed === true ? { placed: true as const } : {}),
      };
    }
    dragRef.current = { id, offsetX: point.x - box.x, offsetY: point.y - box.y, origin: doc, moved: false, width: box.width, height: box.height, starts, iconStarts };
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
      dx = Math.min(sheet.x + sheet.width - box.width - box.x, Math.max(sheet.x - box.x, dx));
      dy = Math.min(sheet.y + sheet.height - box.height - box.y, Math.max(sheet.y - box.y, dy));
    }
    drag.moved = true;
    const starts = drag.starts;
    setHistory((current) => ({
      ...current,
      present: movePlaced(current.present, starts, dx, dy, {
        origin: drag.origin,
        iconStarts: drag.iconStarts,
        lanes: (id) => lanes.get(id) ?? 0,
      }),
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

  const nestHost = nestHosts(boxesRef.current.filter((box) => !box.id.startsWith("icon:")));
  function opacityFor(kind: "node" | "edge", id: string) {
    if (!activePath) return 1;
    const host = kind === "node" ? nestHost.get(id) : undefined;
    if (host) return activePath.nodes.has(host) || activePath.edges.has(host) ? 1 : 0.05;
    const onPath = kind === "node" ? activePath.nodes.has(id) : activePath.edges.has(id);
    return onPath ? 1 : 0.05;
  }

  async function copyShare(permission: "preview" | "edit") {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#mifa=${encodeURIComponent(JSON.stringify({ mode: permission, doc }))}`;
    setShareOpen(false);
    if (url.length > 120000) {
      setNotice("This sheet is too large to share as a link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setNotice(permission === "preview" ? "Preview link copied." : "Edit link copied.");
    } catch {
      setNotice("Could not copy the link.");
    }
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
          data-node={node.id}
          title={doc.locks?.[node.id] ? "Locked at the center of the flow" : undefined}
          className={cn(
            "pointer-events-auto absolute",
            mode === "design" && linkFrom && linkFrom !== node.id && "cursor-crosshair ring-2 ring-[#1b4f9c]",
            mode === "design" && binding && "cursor-crosshair",
            mode === "design" && (tool === "add" || tool === "text" || tool === "rectangle" || tool === "ellipse") && "cursor-crosshair",
            mode === "design" && tool === "select" && !linkFrom && !binding && !doc.locks?.[node.id] && "cursor-grab active:cursor-grabbing",
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
          onPointerEnter={() => mode === "preview" && setHover({ id: node.id, label: node.label, flowIds: node.flowIds })}
          onPointerLeave={() => mode === "preview" && setHover(null)}
        >
          <SymbolShape
            symbol={node.symbol}
            width={node.width}
            height={node.height}
            pose={doc.poses?.[node.id]}
            selected={selectedNodeId === node.id || group.includes(node.id)}
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
        aria-label={mark.name || (mark.shape === "ellipse" ? "Circle" : mark.shape === "text" ? "Text" : mark.shape === "rectangle" ? "Rectangle" : "Symbol")}
        className={cn(
          mode === "preview" ? "pointer-events-none absolute" : "pointer-events-auto absolute",
          mode === "design" && linkFrom && linkFrom !== mark.id && "cursor-crosshair ring-2 ring-[#1b4f9c]",
          mode === "design" && (tool === "add" || tool === "text" || tool === "rectangle" || tool === "ellipse") && "cursor-crosshair",
          mode === "design" && tool === "select" && !linkFrom && "cursor-grab active:cursor-grabbing",
        )}
        style={{
          left: mark.x,
          top: mark.y,
          width: mark.width ?? SYMBOL_SIZE[mark.symbol].width,
          height: mark.height ?? SYMBOL_SIZE[mark.symbol].height,
          opacity: opacityFor("node", mark.id),
          transition: "opacity 140ms ease",
        }}
        onContextMenu={(event) => mode === "design" && openMenu(event, mark.id)}
        onPointerDown={(event) => {
          if (spaceRef.current || event.button === 1 || event.button === 2) return;
          event.stopPropagation();
          if (mode !== "design") return;
          setMenu(null);
          if (binding) {
            setNotice("Click a symbol that belongs to the flow.");
            return;
          }
          if (linkFrom && linkFrom !== mark.id) {
            finishLink(linkFrom, mark.id);
            return;
          }
          setSelectedEdgeId(null);
          if (tool === "text" || tool === "rectangle" || tool === "ellipse") {
            placeBasic(tool, sheetPoint(event));
            return;
          }
          if (tool === "add") {
            placeChosen(armed, sheetPoint(event));
            return;
          }
          if (tool !== "select") {
            setTool("select");
            setArmed(null);
          }
          if (event.shiftKey || event.metaKey || event.ctrlKey) {
            event.preventDefault();
            toggleSelection(mark.id);
            return;
          }
          const width = mark.width ?? SYMBOL_SIZE[mark.symbol].width;
          const height = mark.height ?? SYMBOL_SIZE[mark.symbol].height;
          beginMove(mark.id, sheetPoint(event), { x: mark.x, y: mark.y, width, height });
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onDoubleClick={(event) => {
          if (mark.shape !== "text" || mode !== "design") return;
          event.stopPropagation();
          setSelectedNodeId(mark.id);
          setGroup([mark.id]);
          setEditingTextId(mark.id);
        }}
        onPointerMove={onNodePointerMove}
        onPointerUp={onNodePointerUp}
      >
        {mark.artwork && linePattern(mark.artwork) ? (
          <Posed width={mark.width ?? 48} height={mark.height ?? 280} pose={mark}>
            <ProductionLineArt
              width={innerSize(mark.width ?? 48, mark.height ?? 280, mark.turn).width}
              height={innerSize(mark.width ?? 48, mark.height ?? 280, mark.turn).height}
              pattern={linePattern(mark.artwork) ?? "sequence"}
              frame={selectedNodeId === mark.id || group.includes(mark.id)}
            />
          </Posed>
        ) : mark.artwork && ART_BY_ID[mark.artwork] ? (
          <Posed width={mark.width ?? 128} height={mark.height ?? 72} pose={mark}>
            <VectorArt art={ART_BY_ID[mark.artwork]} width={innerSize(mark.width ?? 128, mark.height ?? 72, mark.turn).width} height={innerSize(mark.width ?? 128, mark.height ?? 72, mark.turn).height} selected={selectedNodeId === mark.id || group.includes(mark.id)} />
          </Posed>
        ) : mark.shape ? (
          <BasicShape
            shape={mark.shape}
            width={mark.width ?? 128}
            height={mark.height ?? 72}
            name={mark.name}
            color={mark.color}
            align={mark.align}
            bold={mark.bold}
            font={mark.font}
            fill={mark.fill}
            border={mark.border}
            weight={mark.weight}
            editing={editingTextId === mark.id}
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
              setEditingTextId((current) => (current === mark.id ? null : current));
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
            pose={mark}
            armed={selectedNodeId === mark.id || group.includes(mark.id)}
          />
        )}
      </div>
    );
  }

  const chosen = group.length ? group : selectedNodeId ? [selectedNodeId] : [];
  const picked = chosen.map((id) => describeObject(doc, sheet.nodes, marks, lineIcons, id));
  const kind = picked.length > 0 && picked.every((item) => item && item.kind === picked[0]?.kind) ? picked[0]!.kind : null;
  const textItems = kind === "text" ? picked.filter((item): item is ObjectPick => item !== null) : [];
  const shapeItems = kind === "shape" ? picked.filter((item): item is ObjectPick => item !== null) : [];
  const symbolItems = kind === "symbol" ? picked.filter((item): item is ObjectPick => item !== null) : [];
  const flowSymbols = symbolItems.length > 0 && symbolItems.every((item) => !item.id.startsWith("mark-") && !item.id.startsWith("icon:"));

  function resizePicked(items: ObjectPick[], factor: number) {
    commit((current) => items.reduce((next, item) => applyBox(next, item.id, scaledPick(item, factor)), current));
  }

  function scaledPick(item: ObjectPick, factor: number) {
    const laidOut = !item.id.startsWith("mark-") && !item.id.startsWith("icon:");
    if (laidOut) return scaledBox(item.box, factor, sheet);
    return scaledSymbol(item.box, item.natural.width, item.natural.height, item.pose.turn, factor, sheet);
  }

  function setTextSize(items: ObjectPick[], font: number) {
    writeTextFont(items, () => font);
  }

  function stepTextSize(items: ObjectPick[], factor: number) {
    writeTextFont(items, (item) => (item.font ?? 14) * factor);
  }

  function writeTextFont(items: ObjectPick[], fontFor: (item: ObjectPick) => number) {
    const nextFont = new Map(items.map((item) => [item.id, clampFont(fontFor(item))]));
    commit((current) => ({
      ...current,
      marks: (current.marks ?? []).map((mark) => {
        const font = nextFont.get(mark.id);
        if (font == null) return mark;
        const next = { ...mark };
        if (font === 14) delete next.font;
        else next.font = font;
        return next;
      }),
    }));
  }

  function setSymbolSize(items: ObjectPick[], percent: number) {
    commit((current) =>
      items.reduce((next, item) => {
        const laidOut = !item.id.startsWith("mark-") && !item.id.startsWith("icon:");
        const height = laidOut ? undefined : item.natural.height;
        return applyBox(next, item.id, boxForPercent(item.box, item.natural.width, item.pose.turn, percent, sheet, height));
      }, current),
    );
  }

  function flipPicked(items: ObjectPick[]) {
    const on = items.every((item) => item.pose.flip);
    commit((current) =>
      items.reduce((next, item) => {
        const seeded = item.id.startsWith("icon:") && !next.icons?.[item.id.slice(5)] ? applyBox(next, item.id, item.box) : next;
        return writePose(seeded, item.id, { flip: !on, turn: item.pose.turn });
      }, current),
    );
  }

  function holdSymbols(items: ObjectPick[]) {
    const ids = items.map((item) => item.id).filter((id) => !id.startsWith("mark-") && !id.startsWith("icon:"));
    if (!ids.length) return;
    const edges = visibleEdges.map((edge) => ({ id: edge.id, from: edge.from, to: edge.to }));
    if (ids.every((id) => doc.locks?.[id])) {
      const at: Record<string, { x: number; y: number }> = {};
      for (const id of ids) {
        const node = sheet.nodes.find((item) => item.id === id);
        if (node) at[id] = { x: node.x, y: node.y };
      }
      commit((current) => unlockNodes(current, ids, at));
      return;
    }
    commit((current) => lockToCenter(current, ids, edges));
  }

  function rotatePicked(items: ObjectPick[]) {
    commit((current) =>
      items.reduce((next, item) => {
        const from = item.pose.turn ?? 0;
        const to = nextQuarter(from);
        return writePose(applyBox(next, item.id, quarterBox(item.box, from, to, sheet)), item.id, { flip: item.pose.flip, turn: to });
      }, current),
    );
  }

  function paintShape(patch: { fill?: string; border?: string; weight?: number }) {
    const ids = new Set(shapeItems.map((item) => item.id));
    commit((current) => ({
      ...current,
      marks: (current.marks ?? []).map((mark) => {
        if (!ids.has(mark.id)) return mark;
        const next = { ...mark, ...patch };
        if (!next.fill || next.fill.toLowerCase() === "#ffffff") delete next.fill;
        if (!next.border || next.border.toLowerCase() === "#202124") delete next.border;
        if (next.weight === undefined || next.weight === 1) delete next.weight;
        return next;
      }),
    }));
  }

  function paintText(patch: { color?: string; align?: TextAlign; bold?: boolean }) {
    const ids = new Set(textItems.map((item) => item.id));
    commit((current) => ({
      ...current,
      marks: (current.marks ?? []).map((mark) => {
        if (!ids.has(mark.id)) return mark;
        const next = { ...mark, ...patch };
        if (!next.color || next.color.toLowerCase() === "#202124") delete next.color;
        if (!next.align || next.align === "center") delete next.align;
        if (!next.bold) delete next.bold;
        return next;
      }),
    }));
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
          <div className="ml-1 flex items-center gap-0.5 rounded-lg bg-[#e8eaed] p-0.5">
            <Tip label={shareLock ? "This link is for looking only" : "Edit"}>
            <button
              type="button"
                aria-label="Edit"
                disabled={shareLock}
                className={cn("flex size-7 items-center justify-center rounded-md", mode === "design" ? "bg-white shadow-sm" : "text-[#5f6368]", shareLock && "cursor-default opacity-40")}
              onClick={() => {
                  if (shareLock) return;
                setMode("design");
                  setHover(null);
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
          <div className="relative" ref={shareRef}>
            <button
              type="button"
              aria-label="Share"
              aria-expanded={shareOpen}
              title="Share this sheet"
              className={cn("flex h-8 items-center gap-1.5 rounded-md bg-[#1b4f9c] px-3 text-[13px] font-medium text-white", shareOpen && "bg-[#174ea6]")}
              onClick={() => setShareOpen((open) => !open)}
            >
              <Share2 className="size-3.5" />
              Share
            </button>
            {shareOpen ? (
              <div className="absolute top-full right-0 z-50 mt-1 w-64 rounded-lg border border-[#d0d7de] bg-white p-1 shadow-lg">
                <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-[#e8eaed]" onClick={() => void copyShare("preview")}>
                  <span className="block text-sm font-medium">Preview only</span>
                  <span className="block text-[12px] text-[#5f6368]">The link opens the sheet to look at.</span>
                </button>
                <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-[#e8eaed]" onClick={() => void copyShare("edit")}>
                  <span className="block text-sm font-medium">Can edit</span>
                  <span className="block text-[12px] text-[#5f6368]">The link opens the sheet ready to change.</span>
                </button>
              </div>
            ) : null}
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
            onDrop={(item, client) => {
              const viewport = viewportRef.current;
              const hit = document.elementFromPoint(client.clientX, client.clientY);
              if (!viewport || !hit || !viewport.contains(hit)) return;
              const point = sheetPoint(client);
              const size = chosenSize(item);
              placeChosen(item, { x: point.x - size.width / 2, y: point.y - size.height / 2 });
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
        <div style={{ transform: `translate(${view.pan.x + sheet.x * view.zoom}px, ${view.pan.y + sheet.y * view.zoom}px)`, transformOrigin: "0 0" }}>
        <div
          ref={sheetRef}
            className={cn(
              "relative bg-white shadow-sm select-none",
              mode === "design" && (tool === "add" || tool === "text" || tool === "rectangle" || tool === "ellipse") && "cursor-crosshair",
            )}
          style={{
              width: sheetWidth,
              height: sheetHeight,
              transform: `scale(${view.zoom})`,
              transformOrigin: "0 0",
            backgroundImage: "radial-gradient(#d5dbe3 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
            onPointerDown={onSheetPointerDown}
            onContextMenu={(event) => mode === "design" && openMenu(event, null)}
        >
          <TitleBlock project={project} />
            <div className="absolute inset-0" style={{ transform: `translate(${-sheet.x}px, ${-sheet.y}px)` }}>
            <div className="pointer-events-none absolute inset-0">
              {layers.back.map((id) => renderPiece(id))}
            </div>
            <svg className="absolute inset-0 z-[1] h-full w-full overflow-visible" style={{ pointerEvents: "none" }}>
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
                const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0, sheet);
                const style = lookOf(edge);
                const selected = selectedEdgeId === edge.id;
                const marker = markerId(style.stroke);
                const drawn = strokeAround(
                  route.points,
                  lineIcons.filter((icon) => icon.edgeId === edge.id),
                );
              return (
                <g
                  key={edge.id}
                  style={{ opacity: opacityFor("edge", edge.id), transition: "opacity 140ms ease", pointerEvents: "auto" }}
                    onPointerEnter={() => mode === "preview" && setHover({ id: edge.id, label: edge.label || "Line", flowIds: edge.flowIds })}
                    onPointerLeave={() => mode === "preview" && setHover(null)}
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
                      onContextMenu={(event) => mode === "design" && openEdgeMenu(event, edge.id, null)}
                    >
                      {mode === "design" ? <title>Right-click to add or remove a corner</title> : null}
                    </path>
                    {selected ? <path d={drawn || route.path} fill="none" stroke="#1b4f9c" strokeWidth={6} opacity={0.2} style={{ pointerEvents: "none" }} /> : null}
                    <path
                      d={drawn || route.path}
                    fill="none"
                    stroke={style.stroke}
                      strokeWidth={activePath?.edges.has(edge.id) ? 2.4 / Math.max(view.zoom, 0.05) : 1.7}
                      strokeDasharray={style.dash || undefined}
                      style={{ pointerEvents: "none" }}
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
                  marks.find((mark) => mark.id === selectedNodeId)?.symbol === "production" ||
                  linePattern(marks.find((mark) => mark.id === selectedNodeId)?.artwork)
                    ? ["n", "s"]
                    : undefined
                }
                onResizeStart={(handle, event) => {
                  const box = boxFor(sheet.nodes, marks, selectedNodeId, lineIcons);
                  if (!box) return;
                  event.stopPropagation();
                  event.preventDefault();
                  const shaped = marks.find((mark) => mark.id === selectedNodeId);
                  const node = sheet.nodes.find((item) => item.id === selectedNodeId);
                  const basic = shaped?.shape === "rectangle" || shaped?.shape === "ellipse";
                  const stretch = node?.symbol === "production" || shaped?.symbol === "production" || linePattern(shaped?.artwork);
                  resizeRef.current = {
                    id: selectedNodeId,
                    handle,
                    x: event.clientX,
                    y: event.clientY,
                    box,
                    origin: doc,
                    moved: false,
                    circle: shaped?.shape === "ellipse",
                    ratio: basic || stretch ? undefined : box.width / Math.max(box.height, 1),
                    minWidth: basic ? 16 : stretch ? 40 : 8,
                    minHeight: basic ? 16 : stretch ? 40 : 8,
                  };
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
            {mode === "design" && tool === "select"
              ? visibleEdges.flatMap((edge) => {
                  const from = nodeBox(edge.from);
                  const to = nodeBox(edge.to);
                  if (!from || !to) return [];
                  const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0, sheet);
                  const selected = edge.id === selectedEdgeId;
                  const arrow = lookOf(edge).arrow;
                  const start = route.points[0];
                  const end = route.points[route.points.length - 1];
                  const heads: { key: string; at: { x: number; y: number }; index: number; label: string }[] = [];
                  if (arrow === "start" || arrow === "both") heads.push({ key: "start", at: arrowSeat(start, route.points[1] ?? end), index: -2, label: "Move line start" });
                  else if (selected) heads.push({ key: "start", at: start, index: -2, label: "Move line start" });
                  if (arrow === "end" || arrow === "both") heads.push({ key: "end", at: arrowSeat(end, route.points[route.points.length - 2] ?? start), index: -3, label: "Move line end" });
                  else if (selected) heads.push({ key: "end", at: end, index: -3, label: "Move line end" });
                  const corners = selected ? (route.corners.length ? route.corners : [route.handle]) : [];
                  return [
                    ...heads.map((head) => (
                      <div
                        key={`${edge.id}-${head.key}`}
                        aria-label={head.label}
                        title="Drag the arrow around the symbol to change the side it points to."
                        className={cn(
                          "absolute z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center active:cursor-grabbing",
                          selected ? "size-7" : "size-6",
                        )}
                        style={{ left: head.at.x, top: head.at.y }}
                        onPointerDown={(event) => onEdgePointerDown(event, edge.id, head.index)}
                      >
                        {selected ? <span className="size-3 rounded-sm border border-[#1b4f9c] bg-white" /> : <span className="size-4 rounded-full hover:bg-[#1b4f9c]/20" />}
                      </div>
                    )),
                    ...corners.map((corner, index) => (
                      <div
                        key={`${edge.id}-corner-${index}`}
                        aria-label="Move corner"
                        title={route.corners.length ? "Drag to move this corner. The end on the symbol moves with it. Right-click to remove it." : "Drag to bend this line. Right-click to add a corner."}
                        className="absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-[#1b4f9c] bg-white active:cursor-grabbing"
                        style={{ left: corner.x, top: corner.y }}
                        onPointerDown={(event) => onEdgePointerDown(event, edge.id, index)}
                        onContextMenu={(event) => openEdgeMenu(event, edge.id, route.corners.length ? index : null)}
                      />
                    )),
                  ];
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
                  if (spaceRef.current || event.button !== 0) return;
                  if (mode === "design" && (tool === "text" || tool === "rectangle" || tool === "ellipse")) {
                    event.stopPropagation();
                    placeBasic(tool, sheetPoint(event));
                    return;
                  }
                  if (mode === "design" && tool === "add") {
                    event.stopPropagation();
                    placeChosen(armed, sheetPoint(event));
                    return;
                  }
                  if (mode !== "design" || (tool !== "select" && !binding)) return;
                  event.stopPropagation();
                  if (binding) {
                    const under = bindTarget(binding.column)?.role === "symbol" ? nodeUnder(event.clientX, event.clientY) : null;
                    if (under) {
                      useBinding(under);
                      return;
                    }
                    const edge = visibleEdges.find((item) => item.id === icon.edgeId);
                    if (edge) useBinding(edge);
                    return;
                  }
                  setSelectedEdgeId(null);
                  setLinkFrom(null);
                  if (event.shiftKey || event.metaKey || event.ctrlKey) {
                    event.preventDefault();
                    toggleSelection(icon.id);
                    return;
                  }
                  beginMove(icon.id, sheetPoint(event), icon);
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              onPointerMove={onNodePointerMove}
              onPointerUp={onNodePointerUp}
              >
                <Posed width={icon.width} height={icon.height} pose={icon}>
                  <VectorArt art={icon.art} width={innerSize(icon.width, icon.height, icon.turn).width} height={innerSize(icon.width, icon.height, icon.turn).height} selected={selectedNodeId === icon.id || group.includes(icon.id)} />
                </Posed>
            </div>
          ))}
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
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
                const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0, sheet);
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
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-[#d0d7de] bg-white/95 px-1.5 py-1">
              <LineGlyph kind="material" title="Material" />
              <LineGlyph kind="information" title="Information" />
              <LineGlyph kind="empty" title="Empty return" />
          </div>
            {mode === "design" ? <SheetEdges zoom={view.zoom} onResizeStart={onSheetEdge} /> : null}
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
        {mode === "design" && binding ? (
          <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#1b4f9c] bg-white px-3 py-2 text-sm shadow-sm">
            Click the {bindTarget(binding.column)?.role === "line" ? "line" : "symbol"} this {FLOW_COLUMNS.find((column) => column.key === binding.column)?.header ?? "cell"} should use.
            <Tip label="Cancel binding">
              <button type="button" className="font-medium text-[#1b4f9c]" onClick={() => setBinding(null)}>
                Cancel
              </button>
            </Tip>
          </div>
        ) : null}
        {mode === "design" && linkFrom && !binding ? (
          <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#1b4f9c] bg-white px-3 py-2 text-sm shadow-sm">
            Click the symbol this line should reach.
            <Tip label="Cancel line">
              <button type="button" className="font-medium text-[#1b4f9c]" onClick={() => setLinkFrom(null)}>
                Cancel
              </button>
            </Tip>
          </div>
        ) : null}
        {mode === "design" && !linkFrom && textItems.length ? (
          <TextStyleBar
            color={sameValue(textItems.map((item) => (item.color ?? "#202124").toLowerCase())) ?? ""}
            align={sameValue(textItems.map((item) => item.align ?? "center"))}
            bold={textItems.every((item) => item.bold)}
            size={sameValue(textItems.map((item) => item.font ?? 14))}
            onSmaller={() => stepTextSize(textItems, 4 / 5)}
            onLarger={() => stepTextSize(textItems, 5 / 4)}
            onSize={(font) => setTextSize(textItems, font)}
            onAlign={(align) => paintText({ align })}
            onBold={() => paintText({ bold: !textItems.every((item) => item.bold) })}
            onColor={(color) => paintText({ color })}
          />
        ) : null}
        {mode === "design" && !linkFrom && shapeItems.length ? (
          <ShapeStyleBar
            fill={sameValue(shapeItems.map((item) => (item.fill ?? "#ffffff").toLowerCase())) ?? ""}
            border={sameValue(shapeItems.map((item) => (item.border ?? "#202124").toLowerCase())) ?? ""}
            weight={sameValue(shapeItems.map((item) => item.weight ?? 1))}
            onFill={(fill) => paintShape({ fill })}
            onBorder={(border) => paintShape({ border, ...(shapeItems.every((item) => (item.weight ?? 1) === 0) ? { weight: 1 } : {}) })}
            onWeight={(weight) => paintShape({ weight })}
          />
        ) : null}
        {mode === "design" && !linkFrom && symbolItems.length ? (
          <SymbolStyleBar
            flipped={symbolItems.every((item) => item.pose.flip)}
            size={sameValue(symbolItems.map((item) => symbolPercent(item.box, item.natural.width, item.pose.turn)))}
            onSmaller={() => resizePicked(symbolItems, 4 / 5)}
            onLarger={() => resizePicked(symbolItems, 5 / 4)}
            onSize={(percent) => setSymbolSize(symbolItems, percent)}
            onFlip={() => flipPicked(symbolItems)}
            onRotate={() => rotatePicked(symbolItems)}
            locked={flowSymbols ? symbolItems.every((item) => doc.locks?.[item.id]) : null}
            onLock={() => holdSymbols(symbolItems)}
          />
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
        {mode === "preview" && hover ? <FlowNote sheet={sheet} hover={hover} links={drawnEdges} /> : null}
      </div>

      {mode === "design" && dataOpen ? (
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
              <Button variant="outline" size="icon-sm" className="size-8" title="Hide the data bar" aria-label="Hide data" onClick={() => setDataOpen(false)}>
                <PanelBottomClose />
              </Button>
              <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
              <Button variant="outline" size="icon-sm" className="size-8" title="Add flow" aria-label="Add flow" onClick={addFlow}>
                <Plus />
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
                    <th
                      key={column.key}
                      title={column.header}
                      className={cn(
                        "border-r border-b border-[#d0d7de] px-2 py-1 font-medium whitespace-nowrap text-[#202124]",
                        tableFocus.column === column.key && "bg-[#c6dafc] text-[#174ea6]",
                      )}
                    >
                    {column.short}
                  </th>
                ))}
                <th className="border-b border-[#d0d7de] px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {doc.flows.map((flow) => {
                  const rowOn = tableFocus.flows.includes(flow.id);
                return (
                    <tr
                      key={flow.id}
                      className={cn(rowOn && "bg-[#e8f0fe]")}
                      onClick={() => {
                        setSelectedFlowId(flow.id);
                        setSelectedNodeId(null);
                        setSelectedEdgeId(null);
                        setGroup([]);
                      }}
                    >
                      {FLOW_COLUMNS.map((column) => {
                        const cellOn = rowOn && tableFocus.column === column.key;
                        return (
                          <td
                            key={column.key}
                            ref={
                              cellOn
                                ? (element) => {
                                    if (element && !tableCellRef.current) tableCellRef.current = element;
                                  }
                                : undefined
                            }
                            className={cn(
                              "group relative border-r border-b border-[#e6e9ed] px-1 py-0.5 align-middle",
                              bindTarget(column.key) && "pr-6",
                              tableFocus.column === column.key && "bg-[#e8f0fe]",
                              cellOn && "bg-[#c6dafc] outline outline-2 -outline-offset-2 outline-[#1b4f9c]",
                              binding?.flowId === flow.id && binding.column === column.key && "bg-[#d2e3fc]",
                            )}
                          >
                        <FlowCell flow={flow} column={column.key} onChange={(value) => patchFlow(flow.id, column.key, value)} />
                            {mode === "design" && bindTarget(column.key) ? (
                              <Tip label="Bind to a symbol">
                                <button
                                  type="button"
                                  aria-label={`Bind ${column.header}`}
                                  aria-pressed={binding?.flowId === flow.id && binding.column === column.key}
                                  className={cn(
                                    "absolute top-1/2 right-0.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-[#1b4f9c]",
                                    binding?.flowId === flow.id && binding.column === column.key
                                      ? "bg-[#1b4f9c] text-white"
                                      : "opacity-0 group-hover:opacity-100 hover:bg-[#e8f0fe]",
                                  )}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedFlowId(flow.id);
                                    setSelectedNodeId(null);
                                    setSelectedEdgeId(null);
                                    setGroup([]);
                                    setLinkFrom(null);
                                    setTool("select");
                                    setArmed(null);
                                    setBinding({ flowId: flow.id, column: column.key });
                                    setNotice("");
                                  }}
                                >
                                  <Link2 className="size-3" />
                                </button>
                              </Tip>
                            ) : null}
                      </td>
                        );
                      })}
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
      ) : mode === "design" ? (
        <div className="flex h-10 shrink-0 items-center justify-end border-t border-[#d0d7de] bg-white px-3">
          <Button variant="outline" size="icon-sm" className="size-8" title="Show the data bar" aria-label="Show data" onClick={() => setDataOpen(true)}>
            <PanelBottomOpen />
          </Button>
        </div>
      ) : null}
      </div>
      </div>
      {menu ? (
        <div
          className="fixed z-50 w-52 rounded-lg border border-[#d0d7de] bg-white py-1 shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {menu.edgeId ? (
            <>
              <MenuItem label="Add a corner" onClick={() => menu.edgeId && editLine(menu.edgeId, (from, to, bend) => addLineCorner(from, to, bend, menu.at))} />
              {menu.corner !== null ? (
                <MenuItem label="Remove this corner" onClick={() => menu.edgeId && menu.corner !== null && editLine(menu.edgeId, (from, to, bend) => removeLineCorner(from, to, bend, menu.corner!))} />
              ) : lineCorners(menu.edgeId).length ? (
                <MenuItem
                  label="Remove nearest corner"
                  onClick={() => {
                    const edgeId = menu.edgeId;
                    if (!edgeId) return;
                    const corners = lineCorners(edgeId);
                    let nearest = 0;
                    let distance = Infinity;
                    corners.forEach((corner, index) => {
                      const gap = Math.hypot(corner.x - menu.at.x, corner.y - menu.at.y);
                      if (gap < distance) {
                        distance = gap;
                        nearest = index;
                      }
                    });
                    editLine(edgeId, (start, end, bend) => removeLineCorner(start, end, bend, nearest));
                  }}
                />
              ) : null}
              {doc.bends?.[menu.edgeId] ? <MenuItem label="Reset the line" onClick={() => menu.edgeId && editLine(menu.edgeId, () => null)} /> : null}
              {(doc.links ?? []).some((link) => link.id === menu.edgeId) ? (
                <MenuItem
                  label="Delete line"
                  onClick={() => {
                    const edgeId = menu.edgeId;
                    if (!edgeId) return;
                    commit((current) => {
                      const bends = { ...(current.bends ?? {}) };
                      delete bends[edgeId];
                      return { ...current, links: (current.links ?? []).filter((link) => link.id !== edgeId), bends };
                    });
                    setMenu(null);
                    setSelectedEdgeId(null);
                  }}
                />
              ) : null}
            </>
          ) : null}
          {!menu.edgeId && menu.id && linkFrom && linkFrom !== menu.id ? <MenuItem label="Connect the line here" onClick={() => { const id = menu.id; setMenu(null); if (id) finishLink(linkFrom, id); }} /> : null}
          {!menu.edgeId && menu.id ? <MenuItem label="Draw a line" onClick={() => { const id = menu.id; setMenu(null); if (!id) return; setLinkFrom(id); setSelectedNodeId(id); setGroup([id]); setSelectedEdgeId(null); setTool("select"); }} /> : null}
          {!menu.edgeId && menu.id ? <MenuItem label="Copy" onClick={() => actions.current.copy()} /> : null}
          {!menu.edgeId && canPaste ? <MenuItem label="Paste" onClick={() => actions.current.paste()} /> : null}
          {!menu.edgeId && menu.id ? <MenuItem label="Bring to front" onClick={() => menu.id && restack(menu.id, "front")} /> : null}
          {!menu.edgeId && menu.id ? <MenuItem label="Send to back" onClick={() => menu.id && restack(menu.id, "back")} /> : null}
          {!menu.edgeId && menu.id ? <MenuItem label="Delete" onClick={() => menu.id && deleteSymbol(menu.id)} /> : null}
          {!menu.edgeId && !menu.id && linkFrom ? <MenuItem label="Cancel line" onClick={() => { setLinkFrom(null); setMenu(null); }} /> : null}
          {!menu.edgeId && !menu.id ? <MenuItem label="Add symbol" onClick={() => { setDropAt(menu.at); setMenu(null); setLibraryOpen(true); setTool("select"); setArmed(null); setLinkFrom(null); }} /> : null}
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

function snapshotSymbol(
  doc: MifaDocument,
  nodes: SheetNode[],
  icons: { id: string; art: SymbolArt; x: number; y: number; width: number; height: number; flip?: boolean; turn?: QuarterTurn }[],
  id: string,
): Mark | null {
  const mark = doc.marks?.find((item) => item.id === id);
  if (mark) return { ...mark };
  const node = nodes.find((item) => item.id === id);
  if (node) {
    const pose = doc.poses?.[id];
    return {
      id: node.id,
      name: node.label,
      symbol: node.symbol,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      ...(pose?.flip ? { flip: true } : {}),
      ...(pose?.turn ? { turn: pose.turn } : {}),
    };
  }
  const icon = icons.find((item) => item.id === id);
  if (!icon) return null;
  return {
    id: icon.id,
    name: icon.art.name,
    symbol: "rectangle",
    artwork: icon.art.id,
    x: icon.x,
    y: icon.y,
    width: icon.width,
    height: icon.height,
    ...(icon.flip ? { flip: true } : {}),
    ...(icon.turn ? { turn: icon.turn } : {}),
  };
}

function fitOnSheet(x: number, y: number, width: number, height: number, page: SheetBox) {
  return {
    x: Math.min(Math.max(page.x, x), Math.max(page.x, page.x + page.width - width)),
    y: Math.min(Math.max(page.y, y), Math.max(page.y, page.y + page.height - height)),
  };
}

function fitBox(box: { x: number; y: number; width: number; height: number }, page: SheetBox) {
  const width = Math.min(box.width, page.width);
  const height = Math.min(box.height, page.height);
  return { ...fitOnSheet(box.x, box.y, width, height, page), width, height };
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
  if (id.startsWith("icon:")) {
    const key = id.slice(5);
    const prev = doc.icons?.[key];
    return { ...doc, icons: { ...doc.icons, [key]: { ...box, ...(prev?.flip ? { flip: true } : {}), ...(prev?.turn ? { turn: prev.turn } : {}), ...(prev?.placed === false ? { placed: false as const } : {}), ...(prev?.placed === true ? { placed: true as const } : {}) } } };
  }
  if (id.startsWith("mark-")) {
    return { ...doc, marks: (doc.marks ?? []).map((mark) => (mark.id === id ? { ...mark, ...box } : mark)) };
  }
  return {
    ...doc,
    positions: { ...doc.positions, [id]: { x: box.x, y: box.y } },
    sizes: { ...(doc.sizes ?? {}), [id]: { width: box.width, height: box.height } },
  };
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
        ? "Click to place text. The tool stays on, including over a symbol."
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
      <RailButton label="Circle" title="Circle" active={tool === "ellipse"} onClick={() => onBasic("ellipse")}>
        <Circle />
      </RailButton>
      <div className="mt-auto flex flex-col items-center gap-2 px-1.5 pb-2">
        {armed ? (
          <div className="flex flex-col items-center gap-1" title={armed.name}>
            {armed.artwork && linePattern(armed.artwork) ? (
              <ProductionLineArt width={18} height={52} pattern={linePattern(armed.artwork) ?? "sequence"} />
            ) : armed.artwork && ART_BY_ID[armed.artwork] ? (
              <VectorArt art={ART_BY_ID[armed.artwork]} {...fittedArt(ART_BY_ID[armed.artwork], 40, 30)} />
            ) : armed.link ? (
              <LineGlyph kind={armed.link.kind} />
            ) : armed.symbol === "production" ? (
              <ProductionLineArt width={18} height={52} />
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
  { id: "Inventories", name: "Inventories" },
  { id: "Material", name: "Material" },
  { id: "Information", name: "Information" },
  { id: "Others", name: "Others" },
  { id: "SPECIFICS", name: "SPECIFICS" },
  { id: "SPECIF_DESIGN", name: "SPECIF_DESIGN" },
];

function chosenSize(item: LibraryItem) {
  if (item.artwork && linePattern(item.artwork)) return productionLineBox();
  if (item.artwork && ART_BY_ID[item.artwork]) return artBox(ART_BY_ID[item.artwork]);
  return SYMBOL_SIZE[item.symbol];
}

function artLibraryItem(art: SymbolArt): LibraryItem {
  const family = art.folder === "Inventories" || art.folder === "Material" || art.folder === "Information" ? art.folder : "Process";
  return { id: `art:${art.id}`, name: art.name, fr: art.folder, family, symbol: "rectangle", artwork: art.id };
}

function SymbolLibrary({
  armedId,
  onPick,
  onDrop,
  onClose,
}: {
  armedId: string | null;
  onPick: (item: LibraryItem) => void;
  onDrop: (item: LibraryItem, client: { clientX: number; clientY: number }) => void;
  onClose: () => void;
}) {
  const [folder, setFolder] = useState("Process");
  const [query, setQuery] = useState("");
  const [ghost, setGhost] = useState<{ item: LibraryItem; x: number; y: number } | null>(null);
  const drag = useRef<{ item: LibraryItem; x: number; y: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const q = query.trim().toLowerCase();
  const drawings = SYMBOL_ART.filter((art) => (q ? `${art.name} ${art.folder}`.toLowerCase().includes(q) : art.folder === folder)).map(artLibraryItem);
  const items = drawings;

  useEffect(() => {
    if (!ghost) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [ghost]);

  function onTilePointerDown(event: ReactPointerEvent<HTMLButtonElement>, item: LibraryItem) {
    if (event.button !== 0) return;
    drag.current = { item, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onTilePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 4) return;
    current.moved = true;
    setGhost({ item: current.item, x: event.clientX, y: event.clientY });
  }

  function onTilePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    drag.current = null;
    setGhost(null);
    if (!current?.moved) return;
    swallowClick.current = true;
    onDrop(current.item, { clientX: event.clientX, clientY: event.clientY });
  }

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
              {items.map((item) => (
                <Tip key={item.id} label={item.artwork ? item.name : `${item.name} · ${item.fr}`}>
                  <button
                    type="button"
                    aria-label={item.name}
                    aria-pressed={armedId === item.id}
                    onPointerDown={(event) => onTilePointerDown(event, item)}
                    onPointerMove={onTilePointerMove}
                    onPointerUp={onTilePointerUp}
                    onClick={() => {
                      if (swallowClick.current) {
                        swallowClick.current = false;
                        return;
                      }
                      onPick(item);
                    }}
                    className={cn(
                      "flex h-full cursor-grab flex-col items-center gap-2 rounded-lg border bg-white px-2 py-3 text-center active:cursor-grabbing",
                      armedId === item.id ? "border-[#1b4f9c] ring-1 ring-[#1b4f9c]" : "border-[#d0d7de] hover:bg-[#f8f9fa]",
                    )}
                  >
                    <span className="flex h-14 items-center justify-center">
                      <SymbolPreview item={item} width={88} height={52} />
                    </span>
                    <span className="text-[13px] leading-tight text-[#202124]">{item.name}</span>
                    <span className="text-[11px] leading-tight text-[#5f6368]">{q && item.artwork ? item.fr : item.artwork ? "" : item.fr}</span>
                  </button>
                </Tip>
              ))}
            </div>
          ) : (
            <p className="px-2 py-6 text-sm text-[#5f6368]">{q ? "No symbols match that search." : "No symbols in this folder yet."}</p>
          )}
        </div>
      </div>
      {ghost
        ? createPortal(
            <div className="pointer-events-none fixed z-[80]" style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -50%)" }}>
              <div className="rounded-lg border border-[#1b4f9c] bg-white/90 p-2 shadow-md">
                <SymbolPreview item={ghost.item} width={72} height={48} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function fittedArt(art: SymbolArt, width: number, height: number) {
  const bounds = artBounds(art);
  const fit = Math.min(width / bounds.width, height / bounds.height);
  return { width: bounds.width * fit, height: bounds.height * fit };
}

function SymbolPreview({ item, width, height }: { item: LibraryItem; width: number; height: number }) {
  const art = item.artwork ? ART_BY_ID[item.artwork] : undefined;
  const pattern = item.artwork ? linePattern(item.artwork) : item.symbol === "production" ? "sequence" : null;
  if (pattern) return <ProductionLineArt width={Math.min(28, width)} height={height} pattern={pattern} />;
  if (art) return <VectorArt art={art} {...fittedArt(art, width, height)} />;
  if (item.link) return <LineGlyph kind={item.link.kind} />;
  return <SymbolShape symbol={item.symbol} width={width} height={height} />;
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

type ObjectPick = {
  id: string;
  kind: "text" | "symbol" | "shape";
  box: Box;
  natural: { width: number; height: number };
  pose: { flip?: boolean; turn?: QuarterTurn };
  color?: string;
  align?: TextAlign;
  bold?: boolean;
  font?: number;
  fill?: string;
  border?: string;
  weight?: number;
};

function describeObject(
  doc: MifaDocument,
  nodes: SheetNode[],
  marks: Mark[],
  icons: { id: string; art?: SymbolArt; x: number; y: number; width: number; height: number; flip?: boolean; turn?: QuarterTurn }[],
  id: string,
): ObjectPick | null {
  const icon = icons.find((item) => item.id === id);
  if (icon) {
    const natural = icon.art ? fittedIconBox(artBounds(icon.art)) : { width: icon.width, height: icon.height };
    return { id, kind: "symbol", box: icon, natural, pose: { flip: icon.flip, turn: icon.turn } };
  }
  const mark = marks.find((item) => item.id === id);
  if (mark) {
    const box = {
      x: mark.x,
      y: mark.y,
      width: mark.width ?? SYMBOL_SIZE[mark.symbol].width,
      height: mark.height ?? SYMBOL_SIZE[mark.symbol].height,
    };
    const art = mark.artwork ? ART_BY_ID[mark.artwork] : undefined;
    const natural = art ? artBox(art) : SYMBOL_SIZE[mark.symbol];
    if (mark.shape === "rectangle" || mark.shape === "ellipse") {
      return { id, kind: "shape", box, natural: { width: box.width, height: box.height }, pose: {}, fill: mark.fill, border: mark.border, weight: mark.weight };
    }
    if (mark.shape === "text") return { id, kind: "text", box, natural, pose: {}, color: mark.color, align: mark.align, bold: mark.bold, font: mark.font };
    return { id, kind: "symbol", box, natural, pose: { flip: mark.flip, turn: mark.turn } };
  }
  const node = nodes.find((item) => item.id === id);
  if (!node) return null;
  return { id, kind: "symbol", box: node, natural: SYMBOL_SIZE[node.symbol], pose: doc.poses?.[id] ?? {} };
}

function writePose(doc: MifaDocument, id: string, pose: { flip?: boolean; turn?: QuarterTurn }): MifaDocument {
  const flip = pose.flip ? true : undefined;
  const turn = pose.turn || undefined;
  if (id.startsWith("icon:")) {
    const key = id.slice(5);
    const box = doc.icons?.[key];
    if (!box) return doc;
    const next = { ...box };
    if (flip) next.flip = true;
    else delete next.flip;
    if (turn) next.turn = turn;
    else delete next.turn;
    return { ...doc, icons: { ...doc.icons, [key]: next } };
  }
  if (id.startsWith("mark-")) {
    return {
      ...doc,
      marks: (doc.marks ?? []).map((mark) => {
        if (mark.id !== id) return mark;
        const next = { ...mark };
        if (flip) next.flip = true;
        else delete next.flip;
        if (turn) next.turn = turn;
        else delete next.turn;
        return next;
      }),
    };
  }
  const poses = { ...(doc.poses ?? {}) };
  if (!flip && !turn) delete poses[id];
  else poses[id] = { ...(flip ? { flip } : {}), ...(turn ? { turn } : {}) };
  return { ...doc, poses };
}

function sameValue<T>(values: T[]): T | null {
  if (!values.length || values.some((value) => value !== values[0])) return null;
  return values[0];
}

function innerSize(width: number, height: number, turn: QuarterTurn | undefined) {
  return turn === 90 || turn === 270 ? { width: height, height: width } : { width, height };
}

function Posed({ width, height, pose, children }: { width: number; height: number; pose?: { flip?: boolean; turn?: QuarterTurn }; children: ReactNode }) {
  const turn = pose?.turn ?? 0;
  const inner = innerSize(width, height, turn);
  if (!turn && !pose?.flip) return children;
  return (
    <div className="grid h-full w-full place-items-center">
      <div style={{ width: inner.width, height: inner.height, transform: `rotate(${turn}deg) scaleX(${pose?.flip ? -1 : 1})` }}>{children}</div>
    </div>
  );
}

function SizeField({
  value,
  unit,
  label,
  onSmaller,
  onLarger,
  onValue,
}: {
  value: number | null;
  unit: string;
  label: string;
  onSmaller: () => void;
  onLarger: () => void;
  onValue: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value == null ? "" : String(value));

  function commitDraft() {
    const raw = draft;
    setDraft(null);
    if (raw == null) return;
    const parsed = Number(raw);
    if (!raw.trim() || !Number.isFinite(parsed)) return;
    onValue(parsed);
  }

  return (
    <>
      <Tip label="Smaller">
        <button
          type="button"
          aria-label="Smaller"
          className="flex size-7 items-center justify-center rounded-md hover:bg-[#e8eaed]"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraft(null);
            onSmaller();
          }}
        >
          <Minus className="size-3.5" />
        </button>
      </Tip>
      <Tip label={label}>
        <span className="flex h-7 items-center rounded-md px-0.5 hover:bg-[#e8eaed] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#1b4f9c]">
          <input
            aria-label={label}
            inputMode="numeric"
            value={shown}
            placeholder="—"
            className="h-7 w-9 bg-transparent text-center text-[12px] font-medium tabular-nums outline-none"
            onChange={(event) => setDraft(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setDraft(null);
            }}
          />
          <span className="pr-1 text-[10px] text-[#5f6368]">{unit}</span>
        </span>
      </Tip>
      <Tip label="Larger">
        <button
          type="button"
          aria-label="Larger"
          className="flex size-7 items-center justify-center rounded-md hover:bg-[#e8eaed]"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setDraft(null);
            onLarger();
          }}
        >
          <Plus className="size-3.5" />
        </button>
      </Tip>
    </>
  );
}

function TextStyleBar({
  size,
  color,
  align,
  bold,
  onSmaller,
  onLarger,
  onSize,
  onAlign,
  onBold,
  onColor,
}: {
  size: number | null;
  color: string;
  align: TextAlign | null;
  bold: boolean;
  onSmaller: () => void;
  onLarger: () => void;
  onSize: (size: number) => void;
  onAlign: (align: TextAlign) => void;
  onBold: () => void;
  onColor: (color: string) => void;
}) {
  const aligns: { id: TextAlign; label: string }[] = [
    { id: "left", label: "Align left" },
    { id: "center", label: "Align center" },
    { id: "right", label: "Align right" },
  ];
  return (
    <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#d0d7de] bg-white p-1 shadow-sm">
      <SizeField value={size} unit="px" label="Text size" onSmaller={onSmaller} onLarger={onLarger} onValue={onSize} />
      <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
      {aligns.map((item) => (
        <Tip key={item.id} label={item.label}>
          <button
            type="button"
            aria-label={item.label}
            aria-pressed={align === item.id}
            className={cn("flex size-7 items-center justify-center rounded-md", align === item.id ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")}
            onClick={() => onAlign(item.id)}
          >
            <AlignGlyph align={item.id} />
          </button>
        </Tip>
      ))}
      <Tip label="Bold">
        <button type="button" aria-label="Bold" aria-pressed={bold} className={cn("flex size-7 items-center justify-center rounded-md text-sm font-bold", bold ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")} onClick={onBold}>
          B
        </button>
      </Tip>
      <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
      {LINE_COLORS.map((item) => (
        <Tip key={item.id} label={item.label}>
          <button
            type="button"
            aria-label={item.label}
            aria-pressed={color === item.color}
            className={cn("size-5 rounded-full border", color === item.color ? "border-[#1b4f9c] ring-2 ring-[#1b4f9c]" : "border-[#d0d7de]")}
            style={{ background: item.color }}
            onClick={() => onColor(item.color)}
          />
        </Tip>
      ))}
    </div>
  );
}

function FlowNote({ sheet, hover, links }: { sheet: Sheet; hover: { id: string; label: string; flowIds: string[] }; links: SheetEdge[] }) {
  const story = flowStory(sheet, hover.id, links);
  const edge = sheet.edges.find((item) => item.id === hover.id);
  const ends = new Set(
    edge
      ? [sheet.nodes.find((node) => node.id === edge.from)?.label, sheet.nodes.find((node) => node.id === edge.to)?.label].filter((label): label is string => Boolean(label))
      : [hover.label],
  );
  const lineName = sheet.nodes.find((node) => node.kind === "line" && story.routes.some((route) => route.includes(node.label)))?.label;
  const reached = lineName && !ends.has(lineName) ? lineName : "";
  return (
    <aside className="pointer-events-none absolute top-3 right-3 z-30 w-72 rounded-lg border border-[#d0d7de] bg-white p-3 shadow-sm" aria-live="polite">
      <p className="text-sm font-medium text-[#202124]">{hover.label}</p>
      {story.routes.map((route) => (
        <p key={route.join("→")} className="mt-1 text-[13px] leading-5 text-[#3c4043]">
          {route.map((step, index) => {
            const previous = route[index - 1];
            const marked = ends.has(step);
            const link = Boolean(edge && previous && ends.has(step) && ends.has(previous));
            return (
              <span key={`${step}-${index}`}>
                {index > 0 ? <span className={link ? "font-medium text-[#1b4f9c]" : undefined}> → </span> : null}
                <span className={marked ? "rounded bg-[#d2e3fc] px-1 font-medium text-[#1b4f9c]" : undefined}>{step}</span>
              </span>
            );
          })}
        </p>
      ))}
      {reached ? <p className="mt-1 text-[12px] text-[#5f6368]">Material reaches {reached}.</p> : null}
      {story.systems.length ? <p className="mt-1 text-[12px] text-[#5f6368]">Information from {story.systems.join(", ")}.</p> : null}
    </aside>
  );
}

function SymbolStyleBar({
  size,
  flipped,
  locked,
  onSmaller,
  onLarger,
  onSize,
  onFlip,
  onRotate,
  onLock,
}: {
  size: number | null;
  flipped: boolean;
  locked: boolean | null;
  onSmaller: () => void;
  onLarger: () => void;
  onSize: (size: number) => void;
  onFlip: () => void;
  onRotate: () => void;
  onLock: () => void;
}) {
  return (
    <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#d0d7de] bg-white p-1 shadow-sm">
      <SizeField value={size} unit="%" label="Symbol size" onSmaller={onSmaller} onLarger={onLarger} onValue={onSize} />
      <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
      <Tip label="Flip horizontal">
        <button type="button" aria-label="Flip horizontal" aria-pressed={flipped} className={cn("flex size-7 items-center justify-center rounded-md", flipped ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")} onClick={onFlip}>
          <FlipHorizontal2 className="size-3.5" />
        </button>
      </Tip>
      <Tip label="Rotate">
        <button type="button" aria-label="Rotate" className="flex size-7 items-center justify-center rounded-md hover:bg-[#e8eaed]" onClick={onRotate}>
          <RotateCw className="size-3.5" />
        </button>
      </Tip>
      {locked === null ? null : (
        <>
          <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
          <Tip label={locked ? "Unlock to move this symbol" : "Lock to the center of the flow"}>
            <button type="button" aria-label={locked ? "Unlock" : "Lock to center"} aria-pressed={locked} className={cn("flex size-7 items-center justify-center rounded-md", locked ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")} onClick={onLock}>
              {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </button>
          </Tip>
        </>
      )}
    </div>
  );
}

function AlignGlyph({ align }: { align: TextAlign }) {
  const rows = align === "left" ? [14, 10, 8] : align === "right" ? [10, 8, 6] : [10, 8, 6];
  const start = align === "left" ? 2 : align === "right" ? 16 : 9;
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
      {rows.map((length, index) => {
        const x1 = align === "right" ? start - length : align === "center" ? start - length / 2 : start;
        return <line key={index} x1={x1} y1={2 + index * 4} x2={x1 + length} y2={2 + index * 4} stroke="#202124" strokeWidth="1.4" />;
      })}
    </svg>
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

function TextEditor({
  name,
  style,
  onChange,
  onFocus,
  onBlur,
}: {
  name: string;
  style: { color: string; textAlign: TextAlign; fontWeight: number; fontSize: number; lineHeight: number; fontFamily: string; whiteSpace: "pre" };
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.textContent = name;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    onFocus();
  }, []);
  return (
    <span
      ref={ref}
      role="textbox"
      aria-label="Text"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onInput={(event) => onChange(event.currentTarget.textContent ?? "")}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventDefault();
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.currentTarget.blur();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className="outline-none"
      style={style}
    />
  );
}

function BasicShape({
  shape,
  width,
  height,
  name,
  color,
  align,
  bold,
  font,
  fill,
  border,
  weight,
  editing,
  onChange,
  onFocus,
  onBlur,
}: {
  shape: "text" | "rectangle" | "ellipse";
  width: number;
  height: number;
  name: string;
  color?: string;
  align?: TextAlign;
  bold?: boolean;
  font?: number;
  fill?: string;
  border?: string;
  weight?: number;
  editing: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  if (shape === "text") {
    const fontSize = clampFont(font ?? 14);
    const style = { color: color ?? "#202124", textAlign: align ?? "center", fontWeight: bold ? 700 : 400, fontSize, lineHeight: 1.25, fontFamily: "inherit", whiteSpace: "pre" } as const;
    const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
    return (
      <div className="flex h-full w-full items-center overflow-visible px-1" style={{ justifyContent: justify }}>
        {editing ? (
          <TextEditor name={name} style={style} onChange={onChange} onFocus={onFocus} onBlur={onBlur} />
        ) : (
          <span style={style}>{name || "Text"}</span>
        )}
      </div>
    );
  }
  const stroke = weight ?? 1;
  const inset = stroke / 2;
  const paint = fill === "none" ? "none" : (fill ?? "#ffffff");
  const line = stroke <= 0 ? "none" : (border ?? "#202124");
  return (
    <svg width={width} height={height} aria-hidden="true">
      {shape === "ellipse" ? (
        <ellipse cx={width / 2} cy={height / 2} rx={Math.max(0, width / 2 - inset)} ry={Math.max(0, height / 2 - inset)} fill={paint} stroke={line} strokeWidth={stroke} />
      ) : (
        <rect x={inset} y={inset} width={Math.max(0, width - stroke)} height={Math.max(0, height - stroke)} rx={2} fill={paint} stroke={line} strokeWidth={stroke} />
      )}
    </svg>
  );
}

const SHAPE_FILLS = [{ id: "white", label: "White", color: "#ffffff" }, ...LINE_COLORS] as const;
const SHAPE_WEIGHTS = [1, 2, 4] as const;

function ShapeStyleBar({
  fill,
  border,
  weight,
  onFill,
  onBorder,
  onWeight,
}: {
  fill: string;
  border: string;
  weight: number | null;
  onFill: (fill: string) => void;
  onBorder: (border: string) => void;
  onWeight: (weight: number) => void;
}) {
  return (
    <div className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#d0d7de] bg-white p-1 shadow-sm">
      <span className="px-1 text-[11px] text-[#5f6368]">Fill</span>
      <Tip label="No fill">
        <button
          type="button"
          aria-label="No fill"
          aria-pressed={fill === "none"}
          className={cn("flex size-5 items-center justify-center rounded-full border text-[11px]", fill === "none" ? "border-[#1b4f9c] ring-2 ring-[#1b4f9c]" : "border-[#d0d7de]")}
          onClick={() => onFill("none")}
        >
          ∅
        </button>
      </Tip>
      {SHAPE_FILLS.map((item) => (
        <Tip key={item.id} label={item.label}>
          <button
            type="button"
            aria-label={`Fill ${item.label.toLowerCase()}`}
            aria-pressed={fill === item.color}
            className={cn("size-5 rounded-full border", fill === item.color ? "border-[#1b4f9c] ring-2 ring-[#1b4f9c]" : "border-[#d0d7de]")}
            style={{ background: item.color }}
            onClick={() => onFill(item.color)}
          />
        </Tip>
      ))}
      <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
      <span className="px-1 text-[11px] text-[#5f6368]">Border</span>
      {LINE_COLORS.map((item) => (
        <Tip key={item.id} label={item.label}>
          <button
            type="button"
            aria-label={`Border ${item.label.toLowerCase()}`}
            aria-pressed={border === item.color && weight !== 0}
            className={cn("size-5 rounded-full border-2 bg-white", border === item.color && weight !== 0 ? "ring-2 ring-[#1b4f9c]" : "")}
            style={{ borderColor: item.color }}
            onClick={() => onBorder(item.color)}
          />
        </Tip>
      ))}
      <span className="mx-1 h-5 w-px bg-[#d0d7de]" />
      <Tip label="No border">
        <button
          type="button"
          aria-label="No border"
          aria-pressed={weight === 0}
          className={cn("flex h-7 items-center rounded-md px-1.5 text-[12px]", weight === 0 ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")}
          onClick={() => onWeight(0)}
        >
          None
        </button>
      </Tip>
      {SHAPE_WEIGHTS.map((item) => (
        <Tip key={item} label={`Border ${item}px`}>
          <button
            type="button"
            aria-label={`Border ${item}px`}
            aria-pressed={weight === item}
            className={cn("flex h-7 w-8 items-center justify-center rounded-md", weight === item ? "bg-[#e8f0fe]" : "hover:bg-[#e8eaed]")}
            onClick={() => onWeight(item)}
          >
            <span className="w-4 rounded-full bg-[#202124]" style={{ height: item }} />
          </button>
        </Tip>
      ))}
    </div>
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

function focusInTable(
  sheet: { nodes: SheetNode[]; edges: SheetEdge[] },
  icons: { id: string; edgeId: string }[],
  nodeId: string | null,
  edgeId: string | null,
  flowId: string | null,
) {
  const connection = (edge: SheetEdge) => {
    const from = sheet.nodes.find((node) => node.id === edge.from);
    const to = sheet.nodes.find((node) => node.id === edge.to);
    return { flows: edge.flowIds, column: from && to ? fieldForConnection(from.kind, to.kind, edge.kind) : null };
  };
  const node = nodeId ? sheet.nodes.find((item) => item.id === nodeId) : undefined;
  if (node) return { flows: node.flowIds, column: fieldForNode(node.kind) };
  if (nodeId?.startsWith("icon:")) {
    const icon = icons.find((item) => item.id === nodeId);
    const edge = icon && sheet.edges.find((item) => item.id === icon.edgeId);
    if (edge) return connection(edge);
  }
  if (edgeId) {
    const edge = sheet.edges.find((item) => item.id === edgeId);
    if (edge) return connection(edge);
  }
  if (flowId) return { flows: [flowId], column: null };
  return { flows: [] as string[], column: null };
}

function iconSeat(saved: { x: number; y: number; width: number; height: number; placed?: boolean } | undefined, seat: { x: number; y: number; width: number; height: number }) {
  if (saved && saved.placed !== false) return saved;
  if (!saved) return seat;
  return { x: seat.x + (seat.width - saved.width) / 2, y: seat.y + (seat.height - saved.height) / 2, width: saved.width, height: saved.height };
}

function iconsOnLines(doc: MifaDocument, edges: SheetEdge[], nodeBox: (id: string) => SheetNode | null, lanes: Map<string, number>, page: SheetBox) {
  const icons: { id: string; edgeId: string; art: SymbolArt; x: number; y: number; width: number; height: number; flip?: boolean; turn?: QuarterTurn }[] = [];
  for (const edge of edges) {
    const parts = edge.label
      .split(" · ")
      .map((part) => part.trim())
      .filter((part) => transportArtwork(part));
    if (!parts.length) continue;
    const from = nodeBox(edge.from);
    const to = nodeBox(edge.to);
    if (!from || !to) continue;
    const route = edgeRoute(from, to, doc.bends?.[edge.id], lanes.get(edge.id) ?? 0, page);
    parts.forEach((part, index) => {
      const art = transportArtwork(part)!;
      const key = `${edge.id}::${part}`;
      const saved = doc.icons?.[key];
      const seat = iconSeat(saved, seatLineIcon(route.points, artBox(art), index, parts.length));
      icons.push({ id: `icon:${key}`, edgeId: edge.id, art, x: seat.x, y: seat.y, width: seat.width, height: seat.height, ...(saved?.flip ? { flip: true } : {}), ...(saved?.turn ? { turn: saved.turn } : {}) });
    });
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

const SHEET_EDGES = [
  { id: "n", cursor: "ns-resize" },
  { id: "s", cursor: "ns-resize" },
  { id: "e", cursor: "ew-resize" },
  { id: "w", cursor: "ew-resize" },
  { id: "nw", cursor: "nwse-resize" },
  { id: "ne", cursor: "nesw-resize" },
  { id: "se", cursor: "nwse-resize" },
  { id: "sw", cursor: "nesw-resize" },
] as const;

function SheetEdges({ zoom, onResizeStart }: { zoom: number; onResizeStart: (edge: string, event: ReactPointerEvent<HTMLDivElement>) => void }) {
  const band = 10 / Math.max(zoom, 0.05);
  const place: Record<(typeof SHEET_EDGES)[number]["id"], { left?: number; right?: number; top?: number; bottom?: number; width?: number; height?: number }> = {
    n: { left: band, right: band, top: -band / 2, height: band },
    s: { left: band, right: band, bottom: -band / 2, height: band },
    e: { top: band, bottom: band, right: -band / 2, width: band },
    w: { top: band, bottom: band, left: -band / 2, width: band },
    nw: { left: -band / 2, top: -band / 2, width: band, height: band },
    ne: { right: -band / 2, top: -band / 2, width: band, height: band },
    se: { right: -band / 2, bottom: -band / 2, width: band, height: band },
    sw: { left: -band / 2, bottom: -band / 2, width: band, height: band },
  };
  return (
    <>
      {SHEET_EDGES.map((edge) => (
        <div
          key={edge.id}
          aria-label={`Extend the sheet ${edge.id}`}
          title="Drag to extend the sheet"
          className="absolute z-40 hover:bg-[#1b4f9c]/35"
          style={{ ...place[edge.id], cursor: edge.cursor }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            event.preventDefault();
            onResizeStart(edge.id, event);
          }}
        />
      ))}
    </>
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
