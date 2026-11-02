"use client";

import { SymbolShape } from "./symbol-shape";
import { Button, Input } from "./ui";
import { cn } from "./cn";
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
  type MifaDocument,
  type ProjectInfo,
  type SheetNode,
} from "./document";
import { downloadWorkbook, FLOW_COLUMNS, FLOW_GROUPS, readWorkbook } from "./excel";
import { Redo2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const STORAGE_KEY = "mifa.canvas.v2";

type History = { past: MifaDocument[]; present: MifaDocument; future: MifaDocument[] };
type Mode = "design" | "preview";

const FLOW_STROKE: Record<"material" | "information" | "empty", { stroke: string; dash?: string }> = {
  material: { stroke: "#202124" },
  information: { stroke: "#1b4f9c", dash: "5 4" },
  empty: { stroke: "#5f6368", dash: "7 4" },
};

const BOOL_KEYS = new Set<keyof Flow>(["direct", "unloadingBuffer", "kitting", "sequencing"]);

function commitHistory(history: History, next: MifaDocument): History {
  return { past: [...history.past, history.present].slice(-50), present: next, future: [] };
}

export function MifaDesigner() {
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<History>({ past: [], present: exampleDocument(), future: [] });
  const [mode, setMode] = useState<Mode>("design");
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [hoverFlowIds, setHoverFlowIds] = useState<string[] | null>(null);
  const [notice, setNotice] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; origin: MifaDocument; moved: boolean } | null>(null);

  const doc = history.present;
  const sheet = useMemo(() => buildSheet(doc), [doc]);
  const activeFlowIds = mode === "preview" ? hoverFlowIds : selectedFlowId ? [selectedFlowId] : hoverFlowIds;
  const activePath = activeFlowIds?.length ? pathForFlows(sheet, activeFlowIds) : null;

  useEffect(() => {
    try {
      const parsed = parseMifaDocument(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"));
      if (parsed) {
        setHistory({ past: [], present: parsed, future: [] });
        setSelectedFlowId(null);
      }
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

  const actions = useRef({ undo, redo });
  actions.current = { undo, redo };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.current.redo();
        else actions.current.undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    commit((current) => ({ ...current, flows: [...current.flows, flow] }));
    setSelectedFlowId(flow.id);
  }

  function deleteFlow(id: string) {
    commit((current) => ({ ...current, flows: current.flows.filter((flow) => flow.id !== id) }));
    setSelectedFlowId((current) => (current === id ? null : current));
  }

  function sheetPoint(event: { clientX: number; clientY: number }) {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onNodePointerDown(event: ReactPointerEvent<HTMLDivElement>, node: SheetNode) {
    if (mode === "preview") return;
    event.stopPropagation();
    setSelectedFlowId(node.flowIds[0] ?? null);
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

  if (!ready) return <div className="h-full bg-[#f4f6f8]" />;

  const project = doc.project;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f6f8]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#d0d7de] bg-white px-3">
        <div className="w-56 shrink-0">
          <p className="text-[11px] font-medium tracking-wide text-[#5f6368] uppercase">MIFA</p>
          <Input
            aria-label="MIFA name"
            value={project.name}
            onChange={(event) => patchProject("name", event.target.value)}
            className="h-7 border-transparent px-0 font-medium focus-visible:ring-0"
          />
        </div>
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
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Import Excel
          </Button>
          <Button variant="outline" onClick={() => downloadWorkbook(doc)}>
            Export Excel
          </Button>
          <div className="ml-1 flex items-center gap-1 rounded-lg bg-[#e8eaed] p-0.5">
            <button
              type="button"
              className={cn("h-7 rounded-md px-2.5 text-sm font-medium", mode === "design" ? "bg-white shadow-sm" : "text-[#5f6368]")}
              onClick={() => {
                setMode("design");
                setHoverFlowIds(null);
              }}
            >
              Design
            </button>
            <button
              type="button"
              className={cn("h-7 rounded-md px-2.5 text-sm font-medium", mode === "preview" ? "bg-white shadow-sm" : "text-[#5f6368]")}
              onClick={() => setMode("preview")}
            >
              Preview
            </button>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto p-6" onPointerDown={() => mode === "design" && setSelectedFlowId(null)}>
        <div
          ref={sheetRef}
          className="relative bg-white shadow-sm select-none"
          style={{
            width: sheet.width,
            height: sheet.height,
            backgroundImage: "radial-gradient(#d5dbe3 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
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
                  <path
                    d={route.path}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={1.7}
                    strokeDasharray={style.dash}
                    markerEnd={`url(#arrow-${edge.kind})`}
                  />
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
              className={cn("absolute", mode === "design" && "cursor-grab active:cursor-grabbing")}
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
          {doc.flows.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
              <p className="max-w-md text-sm text-[#5f6368]">Add a flow in the register, or import an Excel file. The sheet draws the MIFA from those rows.</p>
            </div>
          ) : null}
          <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-md border border-[#d0d7de] bg-white/95 px-2 py-1 text-[11px] text-[#202124]">
            <Legend swatch="#202124" label="Material" />
            <Legend swatch="#1b4f9c" label="Information" dashed />
            <Legend swatch="#5f6368" label="Empty return" dashed />
          </div>
        </div>
      </div>

      <section className="flex h-[320px] shrink-0 flex-col border-t border-[#d0d7de] bg-white">
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
            <p className="mr-2 text-[12px] text-[#5f6368]">{notice || (mode === "preview" ? "Hover a step to isolate its flows." : "Each row is one flow. The sheet shares docks, lines and systems.")}</p>
            <Button variant="outline" onClick={addFlow}>
              Add flow
            </Button>
            <Button variant="outline" onClick={() => replace(emptyDocument())}>
              New
            </Button>
            <Button variant="outline" onClick={() => replace(exampleDocument())}>
              Example
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
                  <tr key={flow.id} className={cn(selected && "bg-[#e8f0fe]")} onClick={() => setSelectedFlowId(flow.id)}>
                    {FLOW_COLUMNS.map((column) => (
                      <td key={column.key} className="border-r border-b border-[#e6e9ed] px-1 py-0.5 align-middle">
                        <FlowCell flow={flow} column={column.key} onChange={(value) => patchFlow(flow.id, column.key, value)} />
                      </td>
                    ))}
                    <td className="border-b border-[#e6e9ed] px-1">
                      <button type="button" className="px-1 text-[11px] text-[#c5221f]" onClick={() => deleteFlow(flow.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TitleBlock({ project }: { project: ProjectInfo }) {
  const line = [
    project.rate && `${project.rate} veh/h`,
    project.shifts && `${project.shifts} shifts`,
    project.perDay && `${project.perDay} veh/day`,
  ]
    .filter(Boolean)
    .join(" · ");
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
      <select
        aria-label="Packaging type"
        value={flow.packaging}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-16 bg-transparent text-[12px]"
      >
        <option value="">—</option>
        <option value="SB">SB</option>
        <option value="LV">LV</option>
      </select>
    );
  }
  return (
    <input
      aria-label={column}
      value={String(flow[column] ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 w-28 bg-transparent px-1 text-[12px] outline-none"
    />
  );
}

function Legend({ swatch, label, dashed = false }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-5 border-t-2" style={{ borderColor: swatch, borderStyle: dashed ? "dashed" : "solid" }} />
      {label}
    </span>
  );
}
