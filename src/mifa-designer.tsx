"use client";

import { SymbolShape } from "./symbol-shape";
import { Button, Hint, Input } from "./ui";
import {
  FLOW_KINDS,
  SYMBOLS,
  SYMBOL_SIZE,
  createId,
  edgeRoute,
  emptyDocument,
  exampleDocument,
  isPlaceholderLabel,
  parseMifaDocument,
  pathThroughEdge,
  pathThroughNode,
  snap,
  symbolLabel,
  type FlowKind,
  type MifaDocument,
  type MifaNode,
  type SymbolId,
} from "./document";
import { cn } from "./cn";
import { MousePointer2, Redo2, Spline, Square, Undo2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

const STORAGE_KEY = "mifa.canvas.v1";
const SHEET = { width: 2200, height: 1280 };

type Tool = "select" | "add" | "connect";
type Mode = "design" | "preview";
type Selection = { kind: "node" | "edge"; id: string } | null;
type History = { past: MifaDocument[]; present: MifaDocument; future: MifaDocument[] };

const FLOW_STROKE: Record<FlowKind, { stroke: string; dash?: string }> = {
  material: { stroke: "#202124" },
  information: { stroke: "#1b4f9c", dash: "5 4" },
  empty: { stroke: "#5f6368", dash: "7 4" },
};

function commitHistory(history: History, next: MifaDocument): History {
  if (next === history.present) return history;
  return { past: [...history.past, history.present].slice(-50), present: next, future: [] };
}

export function MifaDesigner() {
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<History>({ past: [], present: exampleDocument(), future: [] });
  const [tool, setTool] = useState<Tool>("select");
  const [mode, setMode] = useState<Mode>("design");
  const [flowKind, setFlowKind] = useState<FlowKind>("material");
  const [stamp, setStamp] = useState<SymbolId>("rectangle");
  const [selection, setSelection] = useState<Selection>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [hover, setHover] = useState<Selection>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    origin: MifaDocument;
    moved: boolean;
  } | null>(null);
  const resizeRef = useRef<{
    id: string;
    origin: MifaDocument;
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  const doc = history.present;
  const selectedNode = selection?.kind === "node" ? doc.nodes.find((node) => node.id === selection.id) ?? null : null;
  const selectedEdge = selection?.kind === "edge" ? doc.edges.find((edge) => edge.id === selection.id) ?? null : null;
  const activePath =
    mode === "preview" && hover
      ? hover.kind === "node"
        ? pathThroughNode(doc, hover.id)
        : pathThroughEdge(doc, hover.id)
      : null;

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

  function undo() {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
    setSelection(null);
    setConnectFrom(null);
  }

  function redo() {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: current.future.slice(1) };
    });
    setSelection(null);
    setConnectFrom(null);
  }

  function replace(next: MifaDocument) {
    setHistory((current) => commitHistory(current, next));
    setSelection(null);
    setConnectFrom(null);
    setHover(null);
  }

  function removeSelection() {
    if (!selection) return;
    const target = selection;
    commit((current) => ({
      ...current,
      nodes: target.kind === "node" ? current.nodes.filter((node) => node.id !== target.id) : current.nodes,
      edges: current.edges.filter((edge) =>
        target.kind === "edge" ? edge.id !== target.id : edge.from !== target.id && edge.to !== target.id,
      ),
    }));
    setSelection(null);
    if (target.kind === "node" && connectFrom === target.id) setConnectFrom(null);
  }

  function nudge(dx: number, dy: number) {
    if (selection?.kind !== "node") return;
    const id = selection.id;
    commit((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              x: clamp(node.x + dx, 0, SHEET.width - node.width),
              y: clamp(node.y + dy, 0, SHEET.height - node.height),
            }
          : node,
      ),
    }));
  }

  const actions = useRef({ undo, redo, removeSelection, nudge });
  actions.current = { undo, redo, removeSelection, nudge };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.current.redo();
        else actions.current.undo();
        return;
      }
      if (event.key === "Escape") {
        setTool("select");
        setConnectFrom(null);
        setSelection(null);
        return;
      }
      if (mode === "preview") return;
      if (event.key.toLowerCase() === "v") setTool("select");
      if (event.key.toLowerCase() === "a" && !event.metaKey && !event.ctrlKey) setTool("add");
      if (event.key.toLowerCase() === "c" && !event.metaKey && !event.ctrlKey) setTool("connect");
      if (event.key === "Backspace" || event.key === "Delete") actions.current.removeSelection();
      const step = event.shiftKey ? 1 : 8;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        actions.current.nudge(-step, 0);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        actions.current.nudge(step, 0);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        actions.current.nudge(0, -step);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        actions.current.nudge(0, step);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  function sheetPoint(event: { clientX: number; clientY: number }) {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function place(x: number, y: number) {
    const size = SYMBOL_SIZE[stamp];
    const node: MifaNode = {
      id: createId("n"),
      symbol: stamp,
      label: symbolLabel(stamp),
      width: size.width,
      height: size.height,
      x: clamp(snap(x - size.width / 2), 0, SHEET.width - size.width),
      y: clamp(snap(y - size.height / 2), 0, SHEET.height - size.height),
    };
    commit((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelection({ kind: "node", id: node.id });
  }

  function connect(id: string) {
    if (!connectFrom) {
      setConnectFrom(id);
      setSelection({ kind: "node", id });
      return;
    }
    if (connectFrom === id) {
      setConnectFrom(null);
      return;
    }
    const source = connectFrom;
    const existing = doc.edges.find((edge) => edge.from === source && edge.to === id);
    const edgeId = existing?.id ?? createId("e");
    commit((current) => {
      if (existing) {
        return {
          ...current,
          edges: current.edges.map((edge) => (edge.id === edgeId ? { ...edge, kind: flowKind } : edge)),
        };
      }
      return { ...current, edges: [...current.edges, { id: edgeId, from: source, to: id, kind: flowKind, label: "" }] };
    });
    setConnectFrom(id);
    setSelection({ kind: "edge", id: edgeId });
  }

  function chooseSymbol(symbol: SymbolId) {
    setStamp(symbol);
    if (!selectedNode) {
      setSelection(null);
      if (mode === "design") setTool("add");
      return;
    }
    const id = selectedNode.id;
    const size = SYMBOL_SIZE[symbol];
    commit((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.id !== id) return node;
        return {
          ...node,
          symbol,
          width: size.width,
          height: size.height,
          x: clamp(snap(node.x + node.width / 2 - size.width / 2), 0, SHEET.width - size.width),
          y: clamp(snap(node.y + node.height / 2 - size.height / 2), 0, SHEET.height - size.height),
          label: isPlaceholderLabel(node.label) ? symbolLabel(symbol) : node.label,
        };
      }),
    }));
  }

  function opacityFor(kind: "node" | "edge", id: string) {
    if (!activePath) return 1;
    const onPath = kind === "node" ? activePath.nodes.has(id) : activePath.edges.has(id);
    return onPath ? 1 : 0.16;
  }

  function onSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (mode === "preview") {
      setHover(null);
      return;
    }
    if (tool === "add") {
      const point = sheetPoint(event);
      place(point.x, point.y);
      return;
    }
    setSelection(null);
    setConnectFrom(null);
  }

  function onNodePointerDown(event: ReactPointerEvent<HTMLDivElement>, node: MifaNode) {
    if (mode === "preview") return;
    event.stopPropagation();
    if (tool === "connect") {
      connect(node.id);
      return;
    }
    if (tool === "add") {
      setSelection({ kind: "node", id: node.id });
      return;
    }
    const point = sheetPoint(event);
    dragRef.current = {
      id: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
      origin: doc,
      moved: false,
    };
    setSelection({ kind: "node", id: node.id });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onNodePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = sheetPoint(event);
    const node = doc.nodes.find((item) => item.id === drag.id);
    if (!node) return;
    const x = clamp(snap(point.x - drag.offsetX), 0, SHEET.width - node.width);
    const y = clamp(snap(point.y - drag.offsetY), 0, SHEET.height - node.height);
    if (x === node.x && y === node.y) return;
    drag.moved = true;
    setHistory((current) => ({
      ...current,
      present: {
        ...current.present,
        nodes: current.present.nodes.map((item) => (item.id === drag.id ? { ...item, x, y } : item)),
      },
    }));
  }

  function onNodePointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    const origin = drag.origin;
    setHistory((current) => ({
      past: [...current.past, origin].slice(-50),
      present: current.present,
      future: [],
    }));
  }

  function onResizePointerDown(event: ReactPointerEvent<HTMLDivElement>, node: MifaNode) {
    if (mode !== "design" || tool !== "select") return;
    event.stopPropagation();
    resizeRef.current = { id: node.id, origin: doc, width: node.width, height: node.height, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onResizePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;
    if (!resize) return;
    const width = clamp(snap(resize.width + event.clientX - resize.x), 72, 420);
    const height = clamp(snap(resize.height + event.clientY - resize.y), 56, 280);
    setHistory((current) => ({
      ...current,
      present: {
        ...current.present,
        nodes: current.present.nodes.map((node) => (node.id === resize.id ? { ...node, width, height } : node)),
      },
    }));
  }

  function onResizePointerUp() {
    const resize = resizeRef.current;
    resizeRef.current = null;
    if (!resize) return;
    const origin = resize.origin;
    setHistory((current) => {
      const changed = current.present.nodes.some((node) => {
        const before = origin.nodes.find((item) => item.id === node.id);
        return before && (before.width !== node.width || before.height !== node.height);
      });
      if (!changed) return current;
      return { past: [...current.past, origin].slice(-50), present: current.present, future: [] };
    });
  }

  const hint =
    mode === "preview"
      ? "Hover a shape or a line. Everything off that path fades."
      : tool === "add"
        ? "Click the sheet to place a shape."
        : tool === "connect"
          ? connectFrom
            ? "Click the shape this line goes to."
            : "Click the shape the line starts from."
          : "Drag a shape. Select one, then pick a symbol.";

  if (!ready) return <div className="h-full bg-background" />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <div className="w-48 shrink-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">MIFA</p>
          <Input
            aria-label="MIFA name"
            value={doc.name}
            onChange={(event) =>
              setHistory((current) => ({ ...current, present: { ...current.present, name: event.target.value } }))
            }
            className="h-7 border-transparent bg-transparent px-0 text-sm font-medium shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolButton active={tool === "select" && mode === "design"} label="Select" shortcut="V" disabled={mode === "preview"} onClick={() => setTool("select")}>
          <MousePointer2 />
        </ToolButton>
        <ToolButton active={tool === "add" && mode === "design"} label="Add shape" shortcut="A" disabled={mode === "preview"} onClick={() => setTool("add")}>
          <Square />
        </ToolButton>
        <ToolButton
          active={tool === "connect" && mode === "design"}
          label="Connect"
          shortcut="C"
          disabled={mode === "preview"}
          onClick={() => {
            setTool("connect");
            setConnectFrom(null);
          }}
        >
          <Spline />
        </ToolButton>
        <div className="mx-1 h-6 w-px bg-border" />
        <Hint label="Undo" shortcut="⌘Z">
          <Button variant="ghost" size="icon-sm" aria-label="Undo" disabled={!history.past.length} onClick={undo}>
            <Undo2 />
          </Button>
        </Hint>
        <Hint label="Redo" shortcut="⇧⌘Z">
          <Button variant="ghost" size="icon-sm" aria-label="Redo" disabled={!history.future.length} onClick={redo}>
            <Redo2 />
          </Button>
        </Hint>
        <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-0.5">
          <button
            type="button"
            className={cn(
              "h-7 rounded-md px-2.5 text-sm font-medium",
              mode === "design" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => {
              setMode("design");
              setHover(null);
            }}
          >
            Design
          </button>
          <button
            type="button"
            className={cn(
              "h-7 rounded-md px-2.5 text-sm font-medium",
              mode === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
            onClick={() => {
              setMode("preview");
              setTool("select");
              setSelection(null);
              setConnectFrom(null);
            }}
          >
            Preview
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div
          className="relative min-w-0 flex-1 overflow-auto bg-[#e6e9ed] p-8"
          onPointerMove={(event) => {
            if (connectFrom) setCursor(sheetPoint(event));
          }}
        >
          <div
            ref={sheetRef}
            data-sheet
            className={cn(
              "relative bg-white shadow-sm select-none",
              mode === "design" && tool === "add" && "cursor-crosshair",
              mode === "design" && tool === "connect" && "cursor-crosshair",
            )}
            style={{
              width: SHEET.width,
              height: SHEET.height,
              backgroundImage: "radial-gradient(#d5dbe3 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
            onPointerDown={onSheetPointerDown}
          >
            <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
              <defs>
                {(["material", "information", "empty"] as const).map((kind) => (
                  <marker key={kind} id={`arrow-${kind}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill={FLOW_STROKE[kind].stroke} />
                  </marker>
                ))}
              </defs>
              {doc.edges.map((edge) => {
                const from = doc.nodes.find((node) => node.id === edge.from);
                const to = doc.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const route = edgeRoute(from, to);
                const style = FLOW_STROKE[edge.kind];
                const selected = selection?.kind === "edge" && selection.id === edge.id;
                return (
                  <g
                    key={edge.id}
                    data-edge-id={edge.id}
                    style={{ opacity: opacityFor("edge", edge.id), transition: "opacity 140ms ease", pointerEvents: "auto" }}
                    onPointerEnter={() => {
                      if (mode === "preview") setHover({ kind: "edge", id: edge.id });
                    }}
                    onPointerLeave={() => {
                      if (mode === "preview") setHover((current) => (current?.id === edge.id ? null : current));
                    }}
                    onPointerDown={(event) => {
                      if (mode === "preview") return;
                      event.stopPropagation();
                      setSelection({ kind: "edge", id: edge.id });
                      setConnectFrom(null);
                    }}
                  >
                    <path d={route.path} fill="none" stroke="transparent" strokeWidth={16} style={{ pointerEvents: "stroke" }} />
                    <path
                      d={route.path}
                      fill="none"
                      stroke={selected ? "#1b4f9c" : style.stroke}
                      strokeWidth={selected ? 2.25 : 1.6}
                      strokeDasharray={style.dash}
                      markerEnd={`url(#arrow-${edge.kind})`}
                    />
                  </g>
                );
              })}
              {connectFrom && cursor ? (
                <line
                  x1={centerOf(doc.nodes.find((node) => node.id === connectFrom)).x}
                  y1={centerOf(doc.nodes.find((node) => node.id === connectFrom)).y}
                  x2={cursor.x}
                  y2={cursor.y}
                  stroke="#1b4f9c"
                  strokeDasharray="4 3"
                />
              ) : null}
            </svg>
            {doc.nodes.map((node) => (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={node.label}
                data-node-id={node.id}
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
                onPointerEnter={() => {
                  if (mode === "preview") setHover({ kind: "node", id: node.id });
                }}
                onPointerLeave={() => {
                  if (mode === "preview") setHover((current) => (current?.id === node.id ? null : current));
                }}
              >
                <SymbolShape
                  symbol={node.symbol}
                  width={node.width}
                  height={node.height}
                  label={node.label}
                  selected={selection?.kind === "node" && selection.id === node.id}
                  armed={connectFrom === node.id}
                />
                {mode === "design" && tool === "select" && selection?.kind === "node" && selection.id === node.id ? (
                  <div
                    className="absolute -right-1 -bottom-1 size-2.5 cursor-nwse-resize rounded-sm border border-[#1b4f9c] bg-white"
                    onPointerDown={(event) => onResizePointerDown(event, node)}
                    onPointerMove={onResizePointerMove}
                    onPointerUp={onResizePointerUp}
                  />
                ) : null}
              </div>
            ))}
            <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
              {doc.edges.map((edge) => {
                if (!edge.label) return null;
                const from = doc.nodes.find((node) => node.id === edge.from);
                const to = doc.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const route = edgeRoute(from, to);
                const textWidth = Math.max(28, edge.label.length * 6.4 + 12);
                return (
                  <g
                    key={edge.id}
                    transform={`translate(${route.label.x} ${route.label.y})`}
                    style={{ opacity: opacityFor("edge", edge.id), transition: "opacity 140ms ease" }}
                  >
                    <rect x={-textWidth / 2} y={-10} width={textWidth} height={18} rx={3} fill="#fff" stroke="#d0d7de" />
                    <text y={3} textAnchor="middle" fill="#202124" fontSize={11} fontFamily="inherit">
                      {edge.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            {doc.nodes.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Add a shape, then click the sheet.</p>
              </div>
            ) : null}
          </div>
        </div>
        <aside className="flex w-[280px] shrink-0 flex-col border-l border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium">Sheet</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>
          </div>
          <div className="flex-1 overflow-auto px-4 py-3">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Line</p>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {FLOW_KINDS.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  aria-pressed={flowKind === kind.id || selectedEdge?.kind === kind.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm",
                    (selectedEdge ? selectedEdge.kind === kind.id : flowKind === kind.id)
                      ? "border-[#1b4f9c] bg-[#e8f0fe]"
                      : "border-border hover:bg-muted",
                  )}
                  onClick={() => {
                    setFlowKind(kind.id);
                    if (selectedEdge) {
                      const id = selectedEdge.id;
                      commit((current) => ({
                        ...current,
                        edges: current.edges.map((edge) => (edge.id === id ? { ...edge, kind: kind.id } : edge)),
                      }));
                    } else if (mode === "design") {
                      setTool("connect");
                    }
                  }}
                >
                  <span
                    className="h-0.5 w-6"
                    style={{
                      background: FLOW_STROKE[kind.id].dash ? "transparent" : FLOW_STROKE[kind.id].stroke,
                      borderTop: FLOW_STROKE[kind.id].dash ? `2px ${kind.id === "information" ? "dotted" : "dashed"} ${FLOW_STROKE[kind.id].stroke}` : undefined,
                    }}
                  />
                  <span>{kind.label}</span>
                </button>
              ))}
            </div>
            {selectedEdge ? (
              <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                Line label
                <Input
                  aria-label="Line label"
                  value={selectedEdge.label}
                  placeholder="Truck, Kanban…"
                  className="mt-1"
                  onChange={(event) => {
                    const id = selectedEdge.id;
                    const label = event.target.value;
                    setHistory((current) => ({
                      ...current,
                      present: {
                        ...current.present,
                        edges: current.present.edges.map((edge) => (edge.id === id ? { ...edge, label } : edge)),
                      },
                    }));
                  }}
                />
              </label>
            ) : null}

            <p className="mt-5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Symbol</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {SYMBOLS.map((symbol) => {
                const active = selectedNode
                  ? selectedNode.symbol === symbol.id
                  : mode === "design" && stamp === symbol.id && !selectedEdge;
                const size = SYMBOL_SIZE[symbol.id];
                const previewWidth = 72;
                const previewHeight = Math.round((size.height / size.width) * previewWidth);
                return (
                  <button
                    key={symbol.id}
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center rounded-lg border px-1.5 py-1.5",
                      active ? "border-[#1b4f9c] bg-[#e8f0fe]" : "border-border hover:bg-muted",
                    )}
                    onClick={() => chooseSymbol(symbol.id)}
                  >
                    <SymbolShape symbol={symbol.id} width={previewWidth} height={Math.max(36, previewHeight)} />
                    <span className="mt-0.5 text-[11px] text-foreground">{symbol.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedNode ? (
              <label className="mt-3 block text-[11px] font-medium text-muted-foreground">
                Name
                <Input
                  aria-label="Shape name"
                  value={selectedNode.label}
                  className="mt-1"
                  onChange={(event) => {
                    const id = selectedNode.id;
                    const label = event.target.value;
                    setHistory((current) => ({
                      ...current,
                      present: {
                        ...current.present,
                        nodes: current.present.nodes.map((node) => (node.id === id ? { ...node, label } : node)),
                      },
                    }));
                  }}
                />
              </label>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 border-t border-border p-3">
            {selection ? (
              <Button variant="destructive" onClick={removeSelection}>
                Delete
              </Button>
            ) : null}
            <div className="flex gap-1">
              <Button variant="outline" className="flex-1" onClick={() => replace(emptyDocument())}>
                New
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => replace(exampleDocument())}>
                Example
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ToolButton({
  active,
  label,
  shortcut,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  shortcut: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Hint label={label} shortcut={shortcut}>
      <Button
        variant={active ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
    </Hint>
  );
}

function centerOf(node: MifaNode | undefined) {
  if (!node) return { x: 0, y: 0 };
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
