import { SymbolShape } from "./symbol-shape";
import { Button, Input } from "./ui";
import { cn } from "./cn";
import { STAMPS, linkNodes, nodeMatches, placeSymbol, retargetNode, stripNode, type StampId } from "./canvas";
import {
  blankFlow,
  buildSheet,
  edgeRoute,
  emptyDocument,
  exampleDocument,
  parseMifaDocument,
  pathForFlows,
  snap,
  type Flow,
  type FlowKind,
  type MifaDocument,
  type ProjectInfo,
  type SheetNode,
} from "./document";
import { downloadWorkbook, FLOW_COLUMNS, FLOW_GROUPS, readWorkbook } from "./excel";
import { BookOpen, Download, Eye, FilePlus, Minus, MousePointer2, PenLine, Plus, Redo2, Table2, Trash2, Undo2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const STORAGE_KEY = "mifa.canvas.v2";

type History = { past: MifaDocument[]; present: MifaDocument; future: MifaDocument[] };
type Mode = "design" | "preview";
type Tool = "select" | "add" | "connect";
type View = { zoom: number; pan: { x: number; y: number } };

const FLOW_STROKE: Record<FlowKind, { stroke: string; dash?: string }> = {
  material: { stroke: "#202124" },
  information: { stroke: "#1b4f9c", dash: "5 4" },
  empty: { stroke: "#5f6368", dash: "7 4" },
};

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
  const [mode, setMode] = useState<Mode>("design");
  const [tool, setTool] = useState<Tool>("select");
  const [stamp, setStamp] = useState<StampId>("supplier");
  const [linkKind, setLinkKind] = useState<FlowKind>("material");
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoverFlowIds, setHoverFlowIds] = useState<string[] | null>(null);
  const [dataOpen, setDataOpen] = useState(true);
  const [view, setView] = useState<View>({ zoom: 1, pan: { x: 32, y: 16 } });
  const [notice, setNotice] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef(view);
  const spaceRef = useRef(false);
  const panDrag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; origin: MifaDocument; moved: boolean } | null>(null);
  viewRef.current = view;

  const doc = history.present;
  const sheet = useMemo(() => buildSheet(doc), [doc]);
  const activeFlowIds = mode === "preview" ? hoverFlowIds : selectedFlowId ? [selectedFlowId] : hoverFlowIds;
  const activePath = activeFlowIds?.length ? pathForFlows(sheet, activeFlowIds) : null;

  useEffect(() => {
    try {
      const parsed = parseMifaDocument(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"));
      if (parsed) setHistory({ past: [], present: parsed, future: [] });
    } catch {
      /* keep the example */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  }, [doc, ready]);

  function commit(recipe: (current: MifaDocument) => MifaDocument) {
    setHistory((current) => commitHistory(current, recipe(current.present)));
  }

  function replace(next: MifaDocument) {
    setHistory((current) => commitHistory(current, next));
    setSelectedFlowId(null);
    setSelectedNodeId(null);
    setLinkFrom(null);
    setHoverFlowIds(null);
    setNotice("");
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

  const actions = useRef({ undo, redo, removeSelection: () => {} });
  actions.current.undo = undo;
  actions.current.redo = redo;
  actions.current.removeSelection = () => {
    if (!selectedNodeId || !selectedFlowId) return;
    const nodeId = selectedNodeId;
    const flowId = selectedFlowId;
    commit((current) => {
      const flows = current.flows.map((flow) => (flow.id === flowId ? stripNode(flow, nodeId) : flow));
      const positions = { ...current.positions };
      const glyphs = { ...(current.glyphs ?? {}) };
      if (!flows.some((flow) => nodeMatches(flow, nodeId))) {
        delete positions[nodeId];
        delete glyphs[nodeId];
      }
      return { ...current, flows, positions, glyphs };
    });
    setSelectedNodeId(null);
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
      const next = { zoom: current.zoom, pan: { x: current.pan.x - event.deltaX, y: current.pan.y - event.deltaY } };
      viewRef.current = next;
      setView(next);
    }
    function onMove(event: PointerEvent) {
      const drag = panDrag.current;
      if (!drag) return;
      const next = { zoom: viewRef.current.zoom, pan: { x: drag.panX + event.clientX - drag.x, y: drag.panY + event.clientY - drag.y } };
      viewRef.current = next;
      setView(next);
    }
    function onUp() {
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
  }, [ready]);

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

  function chooseStamp(id: StampId) {
    setStamp(id);
    if (tool === "select" && selectedNodeId && selectedFlowId) {
      const node = sheet.nodes.find((item) => item.id === selectedNodeId);
      if (!node) {
        setTool("add");
        return;
      }
      const placed = retargetNode(doc, node.id, selectedFlowId, id, { x: node.x, y: node.y });
      commit(() => placed.document);
      setSelectedFlowId(placed.flowId);
      setSelectedNodeId(placed.nodeId);
      return;
    }
    setTool("add");
    setLinkFrom(null);
  }

  function onSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (mode !== "design" || spaceRef.current || event.button === 1) return;
    if ((event.target as HTMLElement).closest?.("svg")) return;
    if (tool === "add") {
      const point = sheetPoint(event);
      const placed = placeSymbol(doc, selectedFlowId, stamp, point);
      commit(() => placed.document);
      setSelectedFlowId(placed.flowId);
      setSelectedNodeId(placed.nodeId);
      return;
    }
    setSelectedFlowId(null);
    setSelectedNodeId(null);
    setLinkFrom(null);
  }

  function onNodePointerDown(event: ReactPointerEvent<HTMLDivElement>, node: SheetNode) {
    if (spaceRef.current || event.button === 1) return;
    event.stopPropagation();
    if (mode === "preview") {
      setHoverFlowIds(node.flowIds);
      return;
    }
    if (tool === "add") {
      const flowId = selectedFlowId && node.flowIds.includes(selectedFlowId) ? selectedFlowId : node.flowIds[0];
      if (flowId && STAMPS.find((item) => item.id === stamp)?.symbol !== node.symbol) {
        const placed = retargetNode(doc, node.id, flowId, stamp, { x: node.x, y: node.y });
        commit(() => placed.document);
        setSelectedFlowId(placed.flowId);
        setSelectedNodeId(placed.nodeId);
        return;
      }
      setSelectedNodeId(node.id);
      setSelectedFlowId(flowId ?? null);
      return;
    }
    if (tool === "connect") {
      if (!linkFrom || linkFrom === node.id) {
        setLinkFrom(linkFrom === node.id ? null : node.id);
        setSelectedNodeId(node.id);
        setSelectedFlowId(node.flowIds[0] ?? null);
        return;
      }
      const flowId = selectedFlowId ?? node.flowIds[0] ?? null;
      commit((current) => linkNodes(current, linkFrom, node.id, flowId, linkKind));
      setSelectedFlowId(flowId);
      setSelectedNodeId(node.id);
      setLinkFrom(null);
      return;
    }
    setSelectedFlowId(node.flowIds[0] ?? null);
    setSelectedNodeId(node.id);
    const point = sheetPoint(event);
    dragRef.current = { id: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y, origin: doc, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onNodePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = sheetPoint(event);
    const x = snap(point.x - drag.offsetX);
    const y = snap(point.y - drag.offsetY);
    drag.moved = true;
    setHistory((current) => ({
      ...current,
      present: { ...current.present, positions: { ...current.present.positions, [drag.id]: { x, y } } },
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6f8] text-[#202124]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#d0d7de] bg-white px-3">
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
            title="Data"
            aria-label={dataOpen ? "Hide data" : "Show data"}
            aria-pressed={dataOpen}
            onClick={() => setDataOpen((open) => !open)}
          >
            <Table2 />
          </Button>
          <div className="ml-1 flex items-center gap-0.5 rounded-lg bg-[#e8eaed] p-0.5">
            <button
              type="button"
              title="Design"
              aria-label="Design"
              className={cn("flex size-7 items-center justify-center rounded-md", mode === "design" ? "bg-white shadow-sm" : "text-[#5f6368]")}
              onClick={() => {
                setMode("design");
                setHoverFlowIds(null);
              }}
            >
              <PenLine className="size-4" />
            </button>
            <button
              type="button"
              title="Preview"
              aria-label="Preview"
              className={cn("flex size-7 items-center justify-center rounded-md", mode === "preview" ? "bg-white shadow-sm" : "text-[#5f6368]")}
              onClick={() => setMode("preview")}
            >
              <Eye className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
      {mode === "design" ? (
        <SymbolRail
          tool={tool}
          stamp={stamp}
          linkKind={linkKind}
          onSelect={() => {
            setTool("select");
            setLinkFrom(null);
          }}
          onStamp={chooseStamp}
          onLink={(kind) => {
            setLinkKind(kind);
            setTool("connect");
          }}
        />
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
            className={cn("relative bg-white shadow-sm select-none", mode === "design" && tool === "add" && "cursor-crosshair")}
            style={{
              width: sheet.width,
              height: sheet.height,
              backgroundImage: "radial-gradient(#d5dbe3 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
            onPointerDown={onSheetPointerDown}
          >
            <TitleBlock project={project} />
            <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
              <defs>
                {(["material", "information", "empty"] as const).map((kind) => (
                  <marker key={kind} id={`arrow-${kind}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill={FLOW_STROKE[kind].stroke} />
                  </marker>
                ))}
              </defs>
              {sheet.edges.map((edge) => {
                const from = sheet.nodes.find((node) => node.id === edge.from);
                const to = sheet.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const route = edgeRoute(from, to);
                const style = FLOW_STROKE[edge.kind];
                return (
                  <g
                    key={edge.id}
                    style={{ opacity: opacityFor("edge", edge.id), transition: "opacity 140ms ease", pointerEvents: "auto" }}
                    onPointerEnter={() => mode === "preview" && setHoverFlowIds(edge.flowIds)}
                    onPointerLeave={() => mode === "preview" && setHoverFlowIds(null)}
                  >
                    <path d={route.path} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: "stroke" }} />
                    <path d={route.path} fill="none" stroke={style.stroke} strokeWidth={1.7} strokeDasharray={style.dash} markerEnd={`url(#arrow-${edge.kind})`} />
                  </g>
                );
              })}
            </svg>
            {sheet.nodes.map((node) => (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={node.label}
                className={cn("absolute", mode === "design" && tool === "select" && "cursor-grab active:cursor-grabbing")}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  opacity: opacityFor("node", node.id),
                  transition: "opacity 140ms ease",
                }}
                onPointerDown={(event) => onNodePointerDown(event, node)}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onPointerEnter={() => mode === "preview" && setHoverFlowIds(node.flowIds)}
                onPointerLeave={() => mode === "preview" && setHoverFlowIds(null)}
              >
                <SymbolShape
                  symbol={node.symbol}
                  width={node.width}
                  height={node.height}
                  label={node.label}
                  selected={Boolean(selectedFlowId && node.flowIds.includes(selectedFlowId) && mode === "design")}
                  armed={linkFrom === node.id || selectedNodeId === node.id}
                />
              </div>
            ))}
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
              {sheet.edges.map((edge) => {
                if (!edge.label) return null;
                const from = sheet.nodes.find((node) => node.id === edge.from);
                const to = sheet.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const route = edgeRoute(from, to);
                const textWidth = Math.max(28, edge.label.length * 6.4 + 12);
                return (
                  <g key={edge.id} transform={`translate(${route.label.x} ${route.label.y})`} style={{ opacity: opacityFor("edge", edge.id) }}>
                    <rect x={-textWidth / 2} y={-10} width={textWidth} height={18} rx={3} fill="#fff" stroke="#d0d7de" />
                    <text y={3} textAnchor="middle" fill="#202124" fontSize={11} fontFamily="inherit">
                      {edge.label}
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
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.15)}>
            <Minus />
          </Button>
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
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => zoomBy(1.15)}>
            <Plus />
          </Button>
        </div>
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
              <Button variant="outline" size="icon-sm" className="size-8" title="New" aria-label="New" onClick={() => replace(emptyDocument())}>
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
                        <button type="button" title="Delete flow" aria-label="Delete flow" className="flex size-6 items-center justify-center rounded text-[#c5221f] hover:bg-[#c5221f]/10" onClick={() => deleteFlow(flow.id)}>
                          <Trash2 className="size-3.5" />
                        </button>
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
    </div>
  );
}

function SymbolRail({
  tool,
  stamp,
  linkKind,
  onSelect,
  onStamp,
  onLink,
}: {
  tool: Tool;
  stamp: StampId;
  linkKind: FlowKind;
  onSelect: () => void;
  onStamp: (id: StampId) => void;
  onLink: (kind: FlowKind) => void;
}) {
  return (
    <aside className="flex w-16 shrink-0 flex-col items-center border-r border-[#d0d7de] bg-white py-2">
      <RailButton label="Select" active={tool === "select"} onClick={onSelect}>
        <MousePointer2 />
      </RailButton>
      <div className="my-1.5 h-px w-6 bg-[#d0d7de]" />
      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto">
        {STAMPS.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={tool === "add" && stamp === item.id}
            className={cn(
              "flex h-10 w-12 shrink-0 items-center justify-center rounded-md",
              item.id === "emptiesDock" && "outline outline-dashed outline-[#5f6368]/70",
              tool === "add" && stamp === item.id ? "bg-[#e8f0fe] ring-1 ring-[#1b4f9c]" : "hover:bg-[#e8eaed]",
            )}
            onClick={() => onStamp(item.id)}
          >
            <SymbolShape symbol={item.symbol} width={40} height={30} />
          </button>
        ))}
      </div>
      <div className="my-1.5 h-px w-6 bg-[#d0d7de]" />
      {(["material", "information", "empty"] as const).map((kind) => (
        <RailButton key={kind} label={kind === "empty" ? "Empty return" : kind === "information" ? "Information" : "Material"} active={tool === "connect" && linkKind === kind} onClick={() => onLink(kind)}>
          <LineGlyph kind={kind} />
        </RailButton>
      ))}
    </aside>
  );
}

function RailButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", active ? "bg-[#e8f0fe] text-[#1b4f9c]" : "text-[#202124] hover:bg-[#e8eaed]")}
      onClick={onClick}
    >
      {children}
    </button>
  );
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
