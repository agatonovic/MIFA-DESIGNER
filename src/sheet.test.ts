import { describe, expect, it } from "vitest";
import { connectSymbols, linkNodes, omitSymbols, placeSymbol } from "./canvas";
import { addLineCorner, arrange, arrowOnScreen, arrowSeat, arrowTowardScreen, bendFromCorner, bendFromMove, bindFlowLine, bindFlowSymbol, bindTarget, blankFlow, buildSheet, canonicalizeSequencers, centerPortsOnMove, dragLineCorner, edgeRoute, pinOpenRoutes, emptyDocument, exampleDocument, fieldForConnection, fieldForNode, boxForPercent, clampFont, flowStory, lockToCenter, movePlaced, nestHosts, nextQuarter, paintLayers, orderedIds, containerOf, setLayerLock, symbolPercent, parseMifaDocument, pathForFlows, previewPath, quarterBox, removeLineCorner, placeTextFrame, rangeBold, resizeBox, resizeMembers, resizeSheet, runsText, scaleTextRange, styleTextRange, textFrameSize, textRuns, scaledBox, unionBox, scaledSymbol, seatLineIcon, slideLineEnd, straightenConnection, strokeAround, unlockNodes, type SheetNode } from "./document";
import { documentToWorkbook, workbookToDocument } from "./excel";
import { SYMBOL_ART, transportArtwork } from "./symbol-art";
import { BATCH_COLORS, carriedCellStroke, productionLineMetrics, SEQUENCE_COLORS } from "./symbol-shape";

describe("MIFA sheet built from the flow register", () => {
  const doc = exampleDocument();
  const sheet = buildSheet(doc);

  it("keeps the production line on the right and returns empties to the left", () => {
    const line = sheet.nodes.find((node) => node.kind === "line");
    const kit = sheet.nodes.find((node) => node.kind === "kitting");
    const empties = sheet.nodes.filter((node) => node.kind === "empties");
    const emptyDock = sheet.nodes.find((node) => node.kind === "emptiesDock");
    expect(line).toBeTruthy();
    expect(kit).toBeTruthy();
    expect(line!.x).toBeGreaterThan(kit!.x);
    expect(line!.height).toBeGreaterThan(line!.width);
    expect(empties.every((node) => node.x < line!.x)).toBe(true);
    expect(emptyDock && empties.every((node) => emptyDock.x < node.x)).toBe(true);
    expect(empties.every((node) => node.y > line!.y)).toBe(true);
  });

  it("draws the LV kitting chain and leaves sequencing off that flow", () => {
    const path = pathForFlows(sheet, ["f-lv"]);
    const labels = sheet.nodes.filter((node) => path.nodes.has(node.id)).map((node) => node.label);
    expect(labels).toContain("Kit 1");
    expect(labels).toContain("WH 1");
    expect(labels).not.toContain("Seq 1");
    expect(labels).toContain("WMS");
  });

  it("follows a tall production line at the height of the flow", () => {
    const from: SheetNode = { id: "sequencing:1", kind: "sequencing", symbol: "sequencing", label: "Seq 1", x: 1016, y: 128, width: 148, height: 80, flowIds: ["f-sb"] };
    const line: SheetNode = { id: "line:Line", kind: "line", symbol: "production", label: "Line", x: 2648, y: 8, width: 96, height: 1792, flowIds: ["f-sb"] };
    const route = edgeRoute(from, line);
    const start = route.points[0];
    const end = route.points[route.points.length - 1];
    expect(end.x).toBeCloseTo(line.x);
    expect(end.y).toBeCloseTo(start.y);
    expect(end.y).toBeGreaterThan(line.y);
    expect(end.y).toBeLessThan(from.y + from.height);
    expect(route.corners).toHaveLength(0);
    const remembered = edgeRoute(from, line, {
      x: 0,
      y: 0,
      from: { side: "e", at: 168 },
      to: { side: "w", at: 904 },
      corners: [
        { x: 1711, y: 168 },
        { x: 1711, y: 296 },
      ],
    });
    const arrival = remembered.points[remembered.points.length - 1];
    expect(arrival.y).toBeCloseTo(remembered.points[0].y);
    expect(arrival.x).toBeCloseTo(line.x);
  });

  it("keeps a note nested in a symbol with that symbol during preview", () => {
    const supplier = sheet.nodes.find((node) => node.kind === "supplier")!;
    const dock = sheet.nodes.find((node) => node.kind === "dock")!;
    const note = { id: "mark-note", x: supplier.x + 8, y: supplier.y + 10, width: 40, height: 16 };
    const frame = { id: "mark-frame", x: supplier.x + 4, y: supplier.y + 4, width: supplier.width - 8, height: 28 };
    const loose = { id: "mark-loose", x: dock.x + dock.width + 40, y: dock.y, width: 30, height: 12 };
    const hosts = nestHosts([
      { id: supplier.id, x: supplier.x, y: supplier.y, width: supplier.width, height: supplier.height },
      { id: dock.id, x: dock.x, y: dock.y, width: dock.width, height: dock.height },
      frame,
      note,
      loose,
    ]);
    expect(hosts.get(note.id)).toBe(supplier.id);
    expect(hosts.get(frame.id)).toBe(supplier.id);
    expect(hosts.has(loose.id)).toBe(false);
    const path = previewPath(sheet, supplier.id);
    expect(path.nodes.has(hosts.get(note.id)!)).toBe(true);
    expect(path.nodes.has(hosts.get(frame.id)!)).toBe(true);
  });

  it("continues from the hovered symbol to the line and then back", () => {
    const seq = sheet.nodes.find((node) => node.kind === "sequencing");
    const path = previewPath(sheet, seq!.id);
    const labels = sheet.nodes.filter((node) => path.nodes.has(node.id)).map((node) => node.label);
    expect(labels).toHaveLength(3);
    expect(labels).toEqual(expect.arrayContaining(["Seq 1", "Line", "Empties 2"]));
    expect(flowStory(sheet, seq!.id).steps).toEqual(["Seq 1", "Line", "Empties 2"]);
  });

  it("follows every route that leaves a shared symbol, and the return", () => {
    const supplier = sheet.nodes.find((node) => node.kind === "supplier");
    const path = previewPath(sheet, supplier!.id);
    const labels = sheet.nodes.filter((node) => path.nodes.has(node.id)).map((node) => node.label);
    expect(labels).not.toContain("WMS");
    expect(flowStory(sheet, supplier!.id).routes).toEqual([
      ["Supplier", "Dock 1", "WH 1", "Kit 1", "Line", "Empties 1", "Empty dock 2"],
      ["Supplier", "Dock 1", "WH 2", "Seq 1", "Line", "Empties 2"],
    ]);
    const dock = sheet.nodes.find((node) => node.label === "Dock 1");
    const fromDock = sheet.nodes.filter((node) => previewPath(sheet, dock!.id).nodes.has(node.id)).map((node) => node.label);
    expect(fromDock).not.toContain("Supplier");
    expect(fromDock).toContain("Kit 1");
    expect(fromDock).toContain("Seq 1");
    expect(fromDock).toContain("Line");
  });

  it("keeps the shared dock and line on both flows", () => {
    const dock = sheet.nodes.find((node) => node.label === "Dock 1");
    const line = sheet.nodes.find((node) => node.label === "Line");
    expect(dock?.flowIds.sort()).toEqual(["f-lv", "f-sb"]);
    expect(line?.flowIds.sort()).toEqual(["f-lv", "f-sb"]);
  });

  it("names the register column a symbol or a line comes from", () => {
    expect(fieldForNode("dock")).toBe("dock");
    expect(fieldForNode("kitting")).toBe("kitNumber");
    expect(fieldForNode("it")).toBe("system");
    expect(fieldForConnection("supplier", "dock", "material")).toBe("transportTruck");
    expect(fieldForConnection("warehouse", "sequencing", "material")).toBe("transportToSequencing");
    expect(fieldForConnection("sequencing", "line", "material")).toBe("transportSeqToLine");
    expect(fieldForConnection("line", "empties", "empty")).toBe("emptiesFromLine");
    expect(fieldForConnection("it", "warehouse", "information")).toBe("trigger");
    expect(fieldForConnection("empties", "emptiesDock", "empty")).toBeNull();
  });

  it("uses one sequencing symbol when both flows share the number", () => {
    const both = {
      ...doc,
      flows: doc.flows.map((flow) => ({ ...flow, direct: false, sequencing: true, sequencingNumber: "1" })),
      positions: { "sequencing:LV:1": { x: 400, y: 240 }, "sequencing:SB:1": { x: 80, y: 80 } },
    };
    const laid = buildSheet(canonicalizeSequencers(both));
    const seqs = laid.nodes.filter((node) => node.kind === "sequencing");
    expect(seqs).toHaveLength(1);
    expect(seqs[0]?.id).toBe("sequencing:1");
    expect(seqs[0]?.flowIds.sort()).toEqual(["f-lv", "f-sb"]);
    expect(seqs[0]?.x).toBe(400);
  });

  it("uses one warehouse symbol when several flows share the number", () => {
    const shared = {
      ...doc,
      flows: [
        ...doc.flows.map((flow) => ({ ...flow, warehouse: "2" })),
        { ...doc.flows[0], id: "f-x", flowNumber: "3", packaging: "" as const, warehouse: "2", kitting: false, sequencing: false },
      ],
      positions: { "warehouse:LV:2": { x: 500, y: 300 }, "warehouse:SB:2": { x: 40, y: 40 }, "warehouse:X:2": { x: 10, y: 10 } },
    };
    const laid = buildSheet(canonicalizeSequencers(shared));
    const warehouses = laid.nodes.filter((node) => node.kind === "warehouse");
    expect(warehouses).toHaveLength(1);
    expect(warehouses[0]?.id).toBe("warehouse:2");
    expect(warehouses[0]?.label).toBe("WH 2");
    expect(warehouses[0]?.flowIds.sort()).toEqual(["f-lv", "f-sb", "f-x"]);
    expect(warehouses[0]?.x).toBe(500);
  });

  it("holds a locked symbol at the layout center and releases its line icon", () => {
    const seq = sheet.nodes.find((node) => node.kind === "sequencing");
    expect(seq).toBeTruthy();
    const parked = buildSheet({ ...doc, positions: { [seq!.id]: { x: 20, y: 20 } } });
    expect(parked.nodes.find((node) => node.id === seq!.id)?.x).toBe(20);
    const held = buildSheet({ ...doc, positions: { [seq!.id]: { x: 20, y: 20 } }, locks: { [seq!.id]: true } });
    const node = held.nodes.find((item) => item.id === seq!.id);
    expect(node?.x).toBe(seq!.x);
    expect(node?.y).toBe(seq!.y);
    const edge = sheet.edges.find((item) => item.from === seq!.id || item.to === seq!.id);
    expect(edge).toBeTruthy();
    const key = `${edge!.id}::Forklift`;
    const locked = lockToCenter(
      { ...doc, positions: { [seq!.id]: { x: 20, y: 20 } }, icons: { [key]: { x: 10, y: 10, width: 40, height: 24 } } },
      [seq!.id],
      sheet.edges,
    );
    expect(locked.positions[seq!.id]).toBeUndefined();
    expect(locked.locks?.[seq!.id]).toBe(true);
    expect(locked.icons?.[key]).toMatchObject({ placed: false, width: 40, height: 24 });
    const again = workbookToDocument(documentToWorkbook(locked));
    expect(again?.locks?.[seq!.id]).toBe(true);
    expect(again?.positions[seq!.id]).toBeUndefined();
    expect(again?.icons?.[key]?.placed).toBe(false);
    const freed = unlockNodes(locked, [seq!.id], { [seq!.id]: { x: 48, y: 64 } });
    expect(freed.locks).toBeUndefined();
    expect(freed.positions[seq!.id]).toEqual({ x: 48, y: 64 });
  });

  it("places sequencing beside kitting, not after it", () => {
    const both = {
      ...doc,
      flows: doc.flows.map((flow) => ({ ...flow, packaging: "SB" as const, kitting: true, kitNumber: "1", sequencing: true, sequencingNumber: "1" })),
    };
    const laid = buildSheet(both);
    const kit = laid.nodes.find((node) => node.kind === "kitting");
    const seq = laid.nodes.find((node) => node.kind === "sequencing");
    expect(kit && seq && Math.abs(kit.x - seq.x) < 40).toBe(true);
    expect(kit && seq && seq.y).toBeGreaterThan(kit?.y ?? 0);
  });

  it("round-trips the register through Excel", () => {
    const restored = workbookToDocument(documentToWorkbook(doc));
    expect(restored.project.plant).toBe("Plant");
    expect(restored.flows).toHaveLength(2);
    expect(restored.flows[0].supplier).toBe("Supplier");
    expect(restored.flows[0].kitting).toBe(true);
    expect(restored.flows[1].packaging).toBe("SB");
    expect(restored.flows[1].trigger).toBe("Call box");
  });

  it("rejects a document that is not a flow register", () => {
    expect(parseMifaDocument({ nodes: [] })).toBeNull();
  });

  it("accepts a direct flow that skips preparation", () => {
    const flow = blankFlow("1");
    flow.supplier = "Press";
    flow.dock = "4";
    flow.direct = true;
    flow.kitting = true;
    flow.kitNumber = "9";
    flow.productionLine = "Line";
    const laid = buildSheet({ ...doc, flows: [flow], positions: {} });
    expect(laid.nodes.some((node) => node.kind === "kitting")).toBe(false);
    expect(laid.nodes.some((node) => node.kind === "line")).toBe(true);
  });

  it("places a symbol on the sheet and in the same flow", () => {
    const supplier = placeSymbol(emptyDocument(), null, "supplier", { x: 80, y: 200 });
    const dock = placeSymbol(supplier.document, supplier.flowId, "dock", { x: 240, y: 200 });
    const sheet = buildSheet(dock.document);
    expect(dock.document.flows).toHaveLength(1);
    expect(dock.document.flows[0].supplier).toBe("Supplier");
    expect(dock.document.flows[0].dock).toBe("1");
    expect(sheet.nodes.find((node) => node.id === supplier.nodeId)?.x).toBe(80);
    expect(sheet.edges.some((edge) => edge.from === supplier.nodeId && edge.to === "dock:1")).toBe(true);
  });

  it("starts another flow when the same step is placed again", () => {
    const first = placeSymbol(emptyDocument(), null, "supplier", { x: 40, y: 40 });
    const second = placeSymbol(first.document, first.flowId, "supplier", { x: 40, y: 160 });
    expect(second.document.flows).toHaveLength(2);
    expect(second.document.flows[1].supplier).toBe("Supplier 2");
  });

  it("joins an existing dock onto the flow that was drawn", () => {
    const added = placeSymbol(exampleDocument(), null, "production", { x: 20, y: 20 });
    const dock = buildSheet(exampleDocument()).nodes.find((node) => node.label === "Dock 1");
    const linked = linkNodes(added.document, dock!.id, added.nodeId, added.flowId, "material");
    const flow = linked.flows.find((item) => item.id === added.flowId);
    expect(flow?.dock).toBe("1");
    expect(flow?.productionLine).toBe("Line 2");
    const laid = buildSheet(linked);
    expect(laid.edges.some((edge) => edge.from === "dock:1" && edge.to === added.nodeId)).toBe(true);
  });

  it("writes the chosen means of transport onto the link", () => {
    const flow = blankFlow("1");
    flow.supplier = "Supplier";
    flow.dock = "1";
    const doc = { ...emptyDocument(), flows: [flow] };
    const laid = buildSheet(doc);
    const supplier = laid.nodes.find((node) => node.kind === "supplier");
    const dock = laid.nodes.find((node) => node.kind === "dock");
    const linked = linkNodes(doc, supplier!.id, dock!.id, flow.id, "material", "Truck");
    expect(linked.flows[0].transportTruck).toBe("Truck");
  });

  it("keeps placed library symbols through Excel", () => {
    const withMark = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [{ id: "mark-1", name: "Heijunka", symbol: "it" as const, x: 40, y: 80 }],
    };
    const restored = workbookToDocument(documentToWorkbook(withMark));
    expect(restored.marks?.[0]).toMatchObject({ name: "Heijunka", symbol: "it", x: 40, y: 80 });
    expect(parseMifaDocument(JSON.parse(JSON.stringify(withMark)))?.marks?.[0].name).toBe("Heijunka");
  });

  it("keeps a traced symbol drawing with the mark", () => {
    const folders = SYMBOL_ART.reduce<Record<string, number>>((counts, art) => ({ ...counts, [art.folder]: (counts[art.folder] ?? 0) + 1 }), {});
    expect(folders).toEqual({ Process: 11, Inventories: 26, Material: 36, Information: 12, SPECIFICS: 8, SPECIF_DESIGN: 12 });
    expect(SYMBOL_ART.every((art) => art.paths.length > 0 || (art.images?.length ?? 0) > 0)).toBe(true);
    expect(SYMBOL_ART.some((art) => art.folder.includes("/"))).toBe(false);
    const withArt = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [{ id: "mark-1", name: "Supplier", symbol: "rectangle" as const, x: 8, y: 16, artwork: "process-supplier" }],
    };
    expect(workbookToDocument(documentToWorkbook(withArt)).marks?.[0].artwork).toBe("process-supplier");
    expect(parseMifaDocument(JSON.parse(JSON.stringify(withArt)))?.marks?.[0].artwork).toBe("process-supplier");
  });

  it("turns a transport word into its symbol and keeps a moved icon", () => {
    expect(transportArtwork("Truck")?.id).toBe("materials-truck-transfer");
    expect(transportArtwork("FORKLIFT")?.id).toBe("materials-forklift-transfer");
    expect(transportArtwork("Tugger")?.id).toBe("materials-tugger-train-transfer-shelf-carts");
    expect(transportArtwork("Kanban")).toBeUndefined();
    const saved = { ...emptyDocument(), flows: [blankFlow("1")], icons: { "a>b:material::Truck": { x: 12, y: 20, width: 80, height: 36 } } };
    expect(workbookToDocument(documentToWorkbook(saved)).icons?.["a>b:material::Truck"]).toEqual({ x: 12, y: 20, width: 80, height: 36 });
  });

  it("seats a transport icon on the straight run and keeps the stroke out of it", () => {
    const points = [
      { x: 0, y: 40 },
      { x: 220, y: 40 },
      { x: 220, y: 180 },
      { x: 340, y: 180 },
    ];
    const seat = seatLineIcon(points, { width: 120, height: 48 }, 0, 1);
    expect(seat.y + seat.height).toBeLessThan(40);
    expect(seat.x + seat.width).toBeLessThan(220);
    const elbow = seatLineIcon(
      [
        { x: 0, y: 40 },
        { x: 90, y: 40 },
        { x: 90, y: 220 },
      ],
      { width: 100, height: 40 },
      0,
      1,
    );
    expect(elbow.x + elbow.width).toBeLessThanOrEqual(90);
    const through = strokeAround(
      [
        { x: 0, y: 20 },
        { x: 200, y: 20 },
      ],
      [{ x: 80, y: 0, width: 40, height: 40 }],
    );
    expect(through.startsWith("M 0 20")).toBe(true);
    expect(through.endsWith("L 200 20")).toBe(true);
    expect(through.split("M ").length).toBe(3);
  });

  it("removes a corner and centers the symbols on a straight line", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 40, y: 40, width: 48, height: 220, flowIds: [] };
    const to: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 280, y: 96, width: 120, height: 64, flowIds: [] };
    const bend = bendFromCorner(from, to, undefined, 0, { x: 160, y: 40 });
    const doc = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [
        { id: "mark-a", name: "", symbol: "rectangle" as const, x: 40, y: 40, width: 48, height: 220 },
        { id: "mark-b", name: "", symbol: "rectangle" as const, x: 280, y: 96, width: 120, height: 64 },
      ],
      bends: { "mark-a>mark-b:material": bend },
    };
    const next = straightenConnection(doc, "mark-a>mark-b:material", from, to);
    expect(next.bends?.["mark-a>mark-b:material"]).toBeUndefined();
    expect(next.marks?.find((mark) => mark.id === "mark-a")).toMatchObject({ x: 40, y: 40 });
    const moved = next.marks?.find((mark) => mark.id === "mark-b");
    expect(moved?.y).toBeCloseTo(118);
    const route = edgeRoute(from, { ...to, x: moved!.x, y: moved!.y });
    expect(route.corners).toHaveLength(0);
    expect(route.points[0].y).toBeCloseTo(150);
    expect(route.points[route.points.length - 1].y).toBeCloseTo(150);

    const left: SheetNode = { id: "mark-c", kind: "it", symbol: "rectangle", label: "", x: 0, y: 0, width: 80, height: 60, flowIds: [] };
    const right: SheetNode = { id: "mark-d", kind: "it", symbol: "rectangle", label: "", x: 240, y: 80, width: 80, height: 60, flowIds: [] };
    const paired = straightenConnection(
      {
        ...emptyDocument(),
        flows: [blankFlow("1")],
        marks: [
          { id: "mark-c", name: "", symbol: "rectangle" as const, x: 0, y: 0, width: 80, height: 60 },
          { id: "mark-d", name: "", symbol: "rectangle" as const, x: 240, y: 80, width: 80, height: 60 },
        ],
        bends: { "c>d:material": { x: 24, y: -16 } },
      },
      "c>d:material",
      left,
      right,
    );
    expect(paired.bends?.["c>d:material"]).toBeUndefined();
    expect(paired.marks?.map((mark) => mark.y)).toEqual([40, 40]);
    const even = edgeRoute({ ...left, y: 40 }, { ...right, y: 40 });
    expect(even.corners).toHaveLength(0);
    expect(even.points[0].y).toBeCloseTo(even.points[even.points.length - 1].y);
  });

  it("keeps the arrow pointing into the same side when a symbol moves", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "supplier", label: "", x: 0, y: 200, width: 120, height: 80, flowIds: [] };
    const bend = { x: 0, y: 0, shaped: true, from: { side: "n" as const, at: 60 }, to: { side: "w" as const, at: 112 }, corners: [{ x: 60, y: 112 }] };
    const doc = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [
        { id: "mark-a", name: "", symbol: "supplier" as const, x: 0, y: 200, width: 120, height: 80 },
        { id: "mark-b", name: "Process", symbol: "rectangle" as const, x: 360, y: 96, width: 140, height: 64 },
      ],
      links: [{ id: "link-1", from: "mark-a", to: "mark-b", kind: "material" as const, label: "" }],
      bends: { "link-1": bend },
    };
    const stayed = centerPortsOnMove(doc, ["mark-b"]);
    expect(stayed.bends?.["link-1"].to).toMatchObject({ side: "w", at: 112 });

    const far = {
      ...doc,
      marks: doc.marks?.map((mark) => (mark.id === "mark-b" ? { ...mark, y: 260 } : mark)),
    };
    const dropped = centerPortsOnMove(far, ["mark-b"], { x: 0, y: 164 }, doc.bends);
    expect(dropped.bends?.["link-1"].to).toMatchObject({ side: "w", at: 276 });
    expect(dropped.bends?.["link-1"].corners?.at(-1)?.y).toBeCloseTo(276);
    const target: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "Process", x: 360, y: 260, width: 140, height: 64, flowIds: [] };
    const route = edgeRoute(from, target, dropped.bends?.["link-1"]);
    const end = route.points[route.points.length - 1];
    const before = route.points[route.points.length - 2];
    expect(route.to.side).toBe("w");
    expect(before.y).toBeCloseTo(end.y);
    expect(before.x).toBeLessThan(end.x);

    const plain = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [
        { id: "mark-a", name: "", symbol: "rectangle" as const, x: 0, y: 40, width: 80, height: 60 },
        { id: "mark-b", name: "", symbol: "rectangle" as const, x: 240, y: 40, width: 80, height: 60 },
      ],
      links: [{ id: "link-2", from: "mark-a", to: "mark-b", kind: "material" as const, label: "" }],
    };
    const left: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 0, y: 40, width: 80, height: 60, flowIds: [] };
    const right: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 240, y: 120, width: 80, height: 60, flowIds: [] };
    const shifted = centerPortsOnMove(
      { ...plain, marks: plain.marks?.map((mark) => (mark.id === "mark-b" ? { ...mark, y: 120 } : mark)) },
      ["mark-b"],
      { x: 0, y: 80 },
      pinOpenRoutes(plain, ["mark-b"]),
    );
    const followed = edgeRoute(left, right, shifted.bends?.["link-2"]);
    const head = followed.points[followed.points.length - 1];
    const neck = followed.points[followed.points.length - 2];
    expect(followed.to.side).toBe("w");
    expect(neck.y).toBeCloseTo(head.y);
    expect(neck.x).toBeLessThan(head.x);
  });

  it("keeps the arrow entering the side when the other end slides", () => {
    const laid = buildSheet(exampleDocument());
    const supplier = laid.nodes.find((node) => node.kind === "supplier")!;
    const dock = laid.nodes.find((node) => node.kind === "dock")!;
    const before = edgeRoute(supplier, dock);
    const slid = slideLineEnd(supplier, dock, undefined, "from", { x: before.points[0].x + 20, y: before.points[0].y + 24 });
    const after = edgeRoute(supplier, dock, slid);
    const end = after.points[after.points.length - 1];
    const neck = after.points[after.points.length - 2];
    expect(after.from.side).toBe(before.from.side);
    expect(after.points[0].y).toBeGreaterThan(before.points[0].y + 8);
    expect(after.to.side).toBe(before.to.side);
    expect(neck.y).toBeCloseTo(end.y);
    expect(neck.x).toBeLessThan(end.x);
    const far = slideLineEnd(supplier, dock, undefined, "from", { x: before.points[0].x + 20, y: before.points[0].y + 200 });
    const dropped = edgeRoute(supplier, dock, far);
    const farEnd = dropped.points[dropped.points.length - 1];
    const farNeck = dropped.points[dropped.points.length - 2];
    expect(dropped.to.side).toBe("w");
    expect(farNeck.y).toBeCloseTo(farEnd.y);
    expect(farNeck.x).toBeLessThan(farEnd.x);
  });

  it("slides one line down the symbol while the other stays put", () => {
    const source: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 40, y: 80, width: 160, height: 140, flowIds: [] };
    const upper: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 320, y: 40, width: 180, height: 70, flowIds: [] };
    const lower: SheetNode = { id: "mark-c", kind: "it", symbol: "rectangle", label: "", x: 560, y: 80, width: 160, height: 160, flowIds: [] };
    const upperBend = slideLineEnd(source, upper, undefined, "from", { x: source.x + source.width + 12, y: source.y + 24 });
    const lowerBend = slideLineEnd(source, lower, undefined, "from", { x: source.x + source.width + 12, y: source.y + source.height - 24 });
    const upperRoute = edgeRoute(source, upper, upperBend);
    const lowerRoute = edgeRoute(source, lower, lowerBend);
    expect(upperRoute.from.side).toBe("e");
    expect(lowerRoute.from.side).toBe("e");
    expect(lowerRoute.points[0].y).toBeGreaterThan(upperRoute.points[0].y + 40);
    const switched = slideLineEnd(source, lower, lowerBend, "to", { x: lower.x + lower.width / 2, y: lower.y - 30 });
    const turned = edgeRoute(source, lower, switched);
    const tail = turned.points[turned.points.length - 1];
    const approach = turned.points[turned.points.length - 2];
    expect(turned.to.side).toBe("n");
    expect(approach.y).toBeLessThan(tail.y);
    expect(approach.x).toBeCloseTo(tail.x);
  });

  it("runs a line straight into the center of the symbol it reaches", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 0, y: 0, width: 40, height: 200, flowIds: [] };
    const to: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 220, y: 48, width: 120, height: 64, flowIds: [] };
    const route = edgeRoute(from, to);
    const end = route.points[route.points.length - 1];
    const start = route.points[0];
    expect(end.y).toBeCloseTo(to.y + to.height / 2);
    expect(start.y).toBeCloseTo(end.y);
    expect(route.corners).toHaveLength(0);
  });

  it("starts a line on the symbol outline", () => {
    const kit = sheet.nodes.find((node) => node.kind === "kitting");
    const line = sheet.nodes.find((node) => node.kind === "line");
    const route = edgeRoute(kit!, line!);
    const body = kit!.height;
    const right = kit!.x + kit!.width * 0.96;
    const top = kit!.y + body * 0.08;
    const bottom = top + body * 0.84;
    const match = /^M ([0-9.]+) ([0-9.]+)/.exec(route.path);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeCloseTo(right, 0);
    expect(Number(match![2])).toBeGreaterThanOrEqual(top);
    expect(Number(match![2])).toBeLessThanOrEqual(bottom);
  });

  it("leaves the bottom of a house when the next symbol is just to the right and below", () => {
    const from: SheetNode = { id: "supplier:Supplier", kind: "supplier", symbol: "supplier", label: "Supplier", x: 40, y: 40, width: 132, height: 88, flowIds: [] };
    const to: SheetNode = { id: "dock:1", kind: "dock", symbol: "dock", label: "Dock", x: 210, y: 170, width: 128, height: 76, flowIds: [] };
    const route = edgeRoute(from, to);
    expect(route.from.side).toBe("s");
    expect(route.to.side).toBe("w");
    expect(route.corners).toHaveLength(1);
    const outlineRight = from.x + from.width * 0.96;
    expect(route.points[0].x).toBeLessThan(outlineRight - 20);
    expect(route.points[1].x).toBeCloseTo(route.points[0].x);
    expect(route.points[1].y).toBeGreaterThan(route.points[0].y + 40);
  });

  it("drops out of the bottom when the next symbol is below and to the side", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 200, y: 80, width: 140, height: 48, flowIds: [] };
    const to: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 640, y: 260, width: 72, height: 36, flowIds: [] };
    const route = edgeRoute(from, to);
    expect(route.from.side).toBe("s");
    expect(route.to.side).toBe("w");
    expect(route.corners).toHaveLength(1);
    expect(route.points[0].x).toBeCloseTo(270);
    expect(route.points[0].y).toBeCloseTo(128);
    expect(route.points[1]).toMatchObject({ x: 270, y: 278 });
    expect(route.points[2].x).toBeCloseTo(640);
    const shoulder = {
      x: 0,
      y: 0,
      from: { side: "e" as const, at: 104 },
      to: { side: "w" as const, at: 278 },
      corners: [
        { x: 356, y: 104 },
        { x: 356, y: 278 },
      ],
    };
    const healed = edgeRoute(from, to, shoulder);
    expect(healed.from.side).toBe("s");
    expect(healed.to.side).toBe("w");
    expect(healed.corners).toHaveLength(1);
    expect(Math.hypot(healed.points[1].x - healed.points[0].x, healed.points[1].y - healed.points[0].y)).toBeGreaterThan(80);
  });

  it("turns the arrow onto the side the line is moved to", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 0, y: 80, width: 80, height: 60, flowIds: [] };
    const to: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 240, y: 200, width: 80, height: 60, flowIds: [] };
    const automatic = edgeRoute(from, to);
    expect(automatic.corners).toHaveLength(1);
    expect(automatic.from.side).toBe("s");
    expect(automatic.to.side).toBe("w");
    const fromLeft = bendFromCorner(from, to, undefined, automatic.corners.length - 1, { x: 200, y: 230 });
    const entered = edgeRoute(from, to, fromLeft);
    expect(entered.to.side).toBe("w");
    const end = entered.points[entered.points.length - 1];
    const before = entered.points[entered.points.length - 2];
    expect(end.x).toBeCloseTo(240);
    expect(before.x).toBeLessThan(end.x);
    const fromAbove = bendFromCorner(from, to, undefined, automatic.corners.length - 1, { x: 280, y: 140 });
    const dropped = edgeRoute(from, to, fromAbove);
    expect(dropped.to.side).toBe("n");
    const top = dropped.points[dropped.points.length - 1];
    const above = dropped.points[dropped.points.length - 2];
    expect(top.y).toBeCloseTo(200);
    expect(above.y).toBeLessThan(top.y);
    const shifted = bendFromMove(from, to, fromLeft, -40, 0);
    expect(edgeRoute(from, to, shifted).to.side).toBe("w");
    let bend = fromLeft;
    for (const point of [{ x: 180, y: 250 }, { x: 280, y: 140 }, { x: 320, y: 230 }, { x: 260, y: 280 }]) {
      const shown = edgeRoute(from, to, bend);
      bend = bendFromCorner(from, to, bend, Math.max(0, shown.corners.length - 1), point);
      expect(edgeRoute(from, to, bend).corners.length).toBeLessThanOrEqual(4);
    }
    const sides = [
      { side: "n" as const, at: { x: 280, y: 140 } },
      { side: "e" as const, at: { x: 360, y: 230 } },
      { side: "s" as const, at: { x: 280, y: 300 } },
      { side: "w" as const, at: { x: 200, y: 230 } },
    ];
    for (const { side, at } of sides) {
      const turned = bendFromCorner(from, to, undefined, automatic.corners.length - 1, at);
      const route = edgeRoute(from, to, turned);
      const tail = route.points[route.points.length - 1];
      const before = route.points[route.points.length - 2];
      expect(route.to.side).toBe(side);
      if (side === "n") expect(before.y).toBeLessThan(tail.y);
      if (side === "s") expect(before.y).toBeGreaterThan(tail.y);
      if (side === "w") expect(before.x).toBeLessThan(tail.x);
      if (side === "e") expect(before.x).toBeGreaterThan(tail.x);
    }
    const level: SheetNode = { ...to, y: from.y };
    const far = bendFromCorner(from, level, undefined, 0, { x: level.x + level.width + 40, y: level.y + level.height / 2 });
    const farRoute = edgeRoute(from, level, far);
    const farEnd = farRoute.points[farRoute.points.length - 1];
    const farBefore = farRoute.points[farRoute.points.length - 2];
    expect(farRoute.to.side).toBe("e");
    expect(farEnd.x).toBeCloseTo(level.x + level.width);
    expect(farBefore.x).toBeGreaterThan(farEnd.x);
    const stair: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 40, y: 80, width: 80, height: 40, flowIds: [] };
    const landing: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 360, y: 160, width: 80, height: 40, flowIds: [] };
    const extra = {
      x: 0,
      y: 0,
      shaped: true,
      from: { side: "e" as const, at: 100 },
      to: { side: "w" as const, at: 180 },
      corners: [
        { x: 200, y: 100 },
        { x: 200, y: 140 },
        { x: 240, y: 140 },
        { x: 240, y: 180 },
      ],
    };
    const shown = edgeRoute(stair, landing, extra);
    const simplified = removeLineCorner(stair, landing, extra, 1);
    const after = edgeRoute(stair, landing, simplified);
    expect(after.corners.length).toBeLessThan(shown.corners.length);
    expect(after.corners.some((corner) => corner.x === 200 && corner.y === 140)).toBe(false);
    const turned = removeLineCorner(stair, landing, extra, 0);
    expect(edgeRoute(stair, landing, turned).corners.some((corner) => corner.x === 200 && corner.y === 100)).toBe(false);
    expect(edgeRoute(stair, landing, simplified).corners).toEqual(after.corners);
    expect(simplified.shaped).toBe(true);
    const grown = addLineCorner(stair, landing, undefined, { x: 200, y: 100 });
    expect(edgeRoute(stair, landing, grown).corners.length).toBeGreaterThan(0);
    expect(grown.shaped).toBe(true);
    const moved = dragLineCorner(stair, landing, simplified, 0, { x: 160, y: 100 });
    expect(moved.shaped).toBe(true);
    expect(edgeRoute(stair, landing, moved).corners.length).toBeLessThanOrEqual(after.corners.length + 1);
    const kept = { ...emptyDocument(), flows: [blankFlow("1")], bends: { "a>b:material": simplified } };
    expect(workbookToDocument(documentToWorkbook(kept)).bends?.["a>b:material"].shaped).toBe(true);
    expect(parseMifaDocument(JSON.parse(JSON.stringify(kept)))?.bends?.["a>b:material"].corners).toEqual(simplified.corners);
    const crowded = { x: 0, y: 0, from: fromLeft.from, to: fromLeft.to, corners: [{ x: 120, y: 110 }, { x: 128, y: 118 }, { x: 150, y: 140 }, { x: 170, y: 160 }, { x: 190, y: 200 }, { x: 200, y: 230 }] };
    expect(edgeRoute(from, to, crowded).corners.length).toBeLessThanOrEqual(2);
    const saved = { ...emptyDocument(), flows: [blankFlow("1")], bends: { "a>b:material": fromLeft } };
    expect(workbookToDocument(documentToWorkbook(saved)).bends?.["a>b:material"].to).toEqual(fromLeft.to);
    expect(parseMifaDocument(JSON.parse(JSON.stringify(saved)))?.bends?.["a>b:material"].corners?.length).toBeGreaterThan(0);
  });

  it("deletes every symbol in the selection", () => {
    const laid = buildSheet(doc);
    const kit = laid.nodes.find((node) => node.kind === "kitting");
    const dock = laid.nodes.find((node) => node.kind === "dock");
    expect(kit && dock).toBeTruthy();
    const withMark = {
      ...doc,
      marks: [{ id: "mark-1", name: "Note", symbol: "rectangle" as const, x: 12, y: 24 }],
      links: [{ id: "link-1", from: kit!.id, to: dock!.id, kind: "material" as const, label: "Manual" }],
    };
    const next = omitSymbols(withMark, [kit!.id, dock!.id, "mark-1"]);
    const after = buildSheet(next);
    expect(after.nodes.some((node) => node.id === kit!.id)).toBe(false);
    expect(after.nodes.some((node) => node.id === dock!.id)).toBe(false);
    expect(after.nodes.some((node) => node.kind === "supplier")).toBe(true);
    expect(next.marks).toEqual([]);
    expect(next.links).toEqual([]);
  });

  it("slides a line away from its automatic route", () => {
    const edge = sheet.edges.find((item) => item.kind === "material");
    const from = sheet.nodes.find((node) => node.id === edge?.from);
    const to = sheet.nodes.find((node) => node.id === edge?.to);
    expect(from && to && edge).toBeTruthy();
    const automatic = edgeRoute(from!, to!);
    const moved = edgeRoute(from!, to!, { x: 48, y: -24 });
    expect(moved.path).not.toBe(automatic.path);
    const withBend = { ...exampleDocument(), bends: { [edge!.id]: { x: 48, y: -24 } } };
    const restored = workbookToDocument(documentToWorkbook(withBend));
    expect(restored.bends?.[edge!.id]).toEqual({ x: 48, y: -24 });
    expect(parseMifaDocument(JSON.parse(JSON.stringify(withBend)))?.bends?.[edge!.id]).toEqual({ x: 48, y: -24 });
  });

  it("keeps a symbol's flip, rotation, and the text style", () => {
    const saved = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [{ id: "mark-1", name: "Note", symbol: "rectangle" as const, x: 12, y: 24, width: 80, height: 40, shape: "text" as const, color: "#c5221f", align: "left" as const, bold: true, font: 24 }],
      poses: { "dock:1": { flip: true as const, turn: 90 as const } },
      icons: { "a>b:material::Forklift": { x: 4, y: 8, width: 40, height: 24, flip: true as const, turn: 180 as const } },
    };
    const restored = workbookToDocument(documentToWorkbook(saved));
    expect(restored.marks?.[0]).toMatchObject({ color: "#c5221f", align: "left", bold: true, font: 24 });
    expect(restored.poses?.["dock:1"]).toEqual({ flip: true, turn: 90 });
    expect(restored.icons?.["a>b:material::Forklift"]).toEqual({ x: 4, y: 8, width: 40, height: 24, flip: true, turn: 180 });
    expect(parseMifaDocument(JSON.parse(JSON.stringify(saved)))?.marks?.[0].bold).toBe(true);
    const sameShape = (next: { width: number; height: number }, prev: { width: number; height: number }) => {
      const ideal = next.width >= next.height ? (next.width * prev.height) / prev.width : (next.height * prev.width) / prev.height;
      return Math.abs(Math.min(next.width, next.height) - ideal) <= 1;
    };
    const grown = scaledBox({ x: 100, y: 100, width: 80, height: 40 }, 2);
    expect(grown).toMatchObject({ x: 64, y: 80, width: 160, height: 80 });
    const truck = { x: 40, y: 80, width: 72, height: 25 };
    const larger = scaledBox(truck, 5 / 4);
    const smaller = scaledBox(truck, 4 / 5);
    expect(larger.width).toBeGreaterThan(truck.width);
    expect(larger.height).toBeGreaterThan(truck.height);
    expect(smaller.width).toBeLessThan(truck.width);
    expect(smaller.height).toBeLessThan(truck.height);
    expect(sameShape(larger, truck)).toBe(true);
    expect(sameShape(smaller, truck)).toBe(true);
    const dock = scaledBox({ x: 0, y: 0, width: 128, height: 76 }, 4 / 5);
    const line = scaledBox({ x: 0, y: 0, width: 48, height: 280 }, 5 / 4);
    expect(dock.width).toBeLessThan(128);
    expect(dock.height).toBeLessThan(76);
    expect(sameShape(dock, { width: 128, height: 76 })).toBe(true);
    expect(line.width).toBeGreaterThan(48);
    expect(line.height).toBeGreaterThan(280);
    expect(sameShape(line, { width: 48, height: 280 })).toBe(true);
    const stretched = scaledSymbol({ x: 40, y: 80, width: 80, height: 40 }, 72, 25, undefined, 4 / 5);
    expect(stretched.width).not.toBe(80);
    expect(stretched.height).not.toBe(40);
    expect(sameShape(stretched, { width: 72, height: 25 })).toBe(true);
    const typed = boxForPercent({ x: 16, y: 24, width: 72, height: 25 }, 72, undefined, 50);
    expect(typed.height).toBeLessThan(28);
    expect(sameShape(typed, truck)).toBe(true);
    const tiny = scaledBox({ x: 0, y: 0, width: 40, height: 16 }, 4 / 5);
    expect(tiny.width).toBe(32);
    expect(tiny.height).toBeLessThan(16);
    expect(sameShape(tiny, { width: 40, height: 16 })).toBe(true);
    const turned = quarterBox({ x: 100, y: 100, width: 80, height: 40 }, 0, 90);
    expect(turned.width).toBe(40);
    expect(turned.height).toBe(80);
    expect(nextQuarter(270)).toBe(0);
    expect(clampFont(7.2)).toBe(8);
    expect(clampFont(24.4)).toBe(24);
    expect(symbolPercent({ width: 132, height: 88 }, 132)).toBe(100);
    expect(symbolPercent({ width: 88, height: 132 }, 132, 90)).toBe(100);
    const half = boxForPercent({ x: 16, y: 24, width: 132, height: 88 }, 132, undefined, 50);
    expect(symbolPercent(half, 132)).toBe(50);
    expect(half).toMatchObject({ width: 66, height: 44 });
  });

  it("binds a data cell to the symbol or line that was clicked", () => {
    const dock = sheet.nodes.find((node) => node.kind === "dock")!;
    const kit = sheet.nodes.find((node) => node.kind === "kitting")!;
    const line = sheet.edges.find((edge) => edge.kind === "material" && edge.label === "Forklift")!;
    const bound = bindFlowSymbol(doc, "f-sb", "warehouse", sheet.nodes.find((node) => node.id === "warehouse:1")!);
    expect(bound?.flows.find((flow) => flow.id === "f-sb")?.warehouse).toBe("1");
    const opened = {
      ...doc,
      flows: doc.flows.map((flow) => (flow.id === "f-sb" ? { ...flow, direct: true, sequencing: false, sequencingNumber: "" } : flow)),
    };
    const sequenced = bindFlowSymbol(opened, "f-sb", "sequencingNumber", sheet.nodes.find((node) => node.kind === "sequencing")!);
    expect(sequenced?.flows.find((flow) => flow.id === "f-sb")).toMatchObject({ sequencingNumber: "1", sequencing: true, direct: false });
    expect(bindFlowSymbol(doc, "f-lv", "dock", kit)).toBeNull();
    expect(bindFlowLine(doc, "f-lv", "transportToKitting", line)?.flows.find((flow) => flow.id === "f-lv")?.transportToKitting).toBe("Forklift");
    expect(bindFlowLine(doc, "f-lv", "emptiesFromLine", line)).toBeNull();
    expect(bindTarget("dock")?.kind).toBe("dock");
    expect(bindTarget("flowNumber")).toBeNull();
    expect(dock.label).toBe("Dock 1");
  });

  it("keeps a circle square while it shrinks, and remembers its fill and border", () => {
    const start = { x: 80, y: 80, width: 96, height: 96 };
    const smaller = resizeBox("se", start, -70, -8, { minWidth: 16, circle: true });
    expect(smaller.width).toBe(smaller.height);
    expect(smaller.width).toBe(24);
    const floor = resizeBox("se", start, -200, -200, { minWidth: 16, circle: true });
    expect(floor).toMatchObject({ width: 16, height: 16 });
    const symbol = resizeBox("se", { x: 0, y: 0, width: 80, height: 60 }, -100, -100, { minWidth: 8, minHeight: 8, ratio: 80 / 60 });
    expect(symbol).toMatchObject({ width: 8, height: 6 });
    const letters = textRuns({ name: "NOLA", bold: true, color: "#c5221f", font: 23 });
    expect(runsText(letters)).toBe("NOLA");
    const measured = textFrameSize(letters, 23, (text, font) => ({ width: text.length * font * 0.6, height: font * 1.25 }));
    expect(measured.height).toBe(Math.ceil(23 * 1.25));
    const rows = textFrameSize([{ text: "ONE\nTWO" }], 14, (_text, font) => ({ width: 40, height: font * 1.25 }));
    expect(rows.height).toBe(Math.ceil(14 * 1.25 * 2));
    const partial = styleTextRange(letters, 1, 3, { bold: false });
    expect(partial.map((run) => run.text).join("")).toBe("NOLA");
    expect(partial[1]).toMatchObject({ text: "OL", bold: false });
    expect(rangeBold(partial, 1, 3)).toBe(false);
    expect(rangeBold(partial, 0, 1)).toBe(true);
    expect(runsText(scaleTextRange(letters, 0, 2, 23, 2))).toBe("NOLA");
    expect(placeTextFrame({ x: 0, y: 0, width: 200, height: 80 }, { width: 40, height: 20 }, "center")).toEqual({ x: 80, y: 30, width: 40, height: 20 });
    const wide = resizeBox("e", { x: 16, y: 24, width: 80, height: 64 }, 48, 20, { minWidth: 8, minHeight: 8, ratio: 80 / 64 });
    expect(wide).toMatchObject({ x: 16, y: 24, width: 128, height: 64 });
    const members = { a: { x: 0, y: 0, width: 80, height: 80 }, b: { x: 80, y: 0, width: 80, height: 80 } };
    const outline = unionBox(Object.values(members));
    expect(outline).toEqual({ x: 0, y: 0, width: 160, height: 80 });
    const stretched = resizeBox("e", outline!, 80, 24, { minWidth: 16, minHeight: 16 });
    expect(resizeMembers(outline!, stretched, members)).toEqual({
      a: { x: 0, y: 0, width: 120, height: 80 },
      b: { x: 120, y: 0, width: 120, height: 80 },
    });
    const free = resizeBox("se", { x: 0, y: 0, width: 80, height: 60 }, -100, -100);
    expect(free).toMatchObject({ width: 40, height: 40 });
    const saved = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [{ id: "mark-1", name: "", symbol: "rectangle" as const, x: 16, y: 16, width: 96, height: 96, shape: "ellipse" as const, fill: "none", border: "#1b4f9c", weight: 4 }],
    };
    const restored = parseMifaDocument(JSON.parse(JSON.stringify(saved)));
    expect(restored?.marks?.[0]).toMatchObject({ fill: "none", border: "#1b4f9c", weight: 4, width: 96, height: 96 });
  });

  it("extends the sheet from the edge that is dragged", () => {
    const doc = exampleDocument();
    const wider = resizeSheet(doc, "e", 400, 0);
    expect(wider.canvas).toEqual({ x: 0, y: 0, width: 3200, height: 1800 });
    expect(buildSheet(wider).width).toBe(3200);
    const taller = resizeSheet(doc, "n", 0, -160);
    expect(taller.canvas).toEqual({ x: 0, y: -160, width: 2800, height: 1960 });
    const dock = buildSheet(doc).nodes.find((node) => node.label === "Dock 1");
    expect(buildSheet(taller).nodes.find((node) => node.label === "Dock 1")).toMatchObject({ x: dock?.x, y: dock?.y });
    const saved = parseMifaDocument(JSON.parse(JSON.stringify(wider)));
    expect(saved?.canvas).toEqual(wider.canvas);
    expect(workbookToDocument(documentToWorkbook(wider)).canvas).toEqual(wider.canvas);
  });

  it("keeps text, line color, and a drawn link", () => {
    const withExtras = {
      ...emptyDocument(),
      flows: [blankFlow("1")],
      marks: [{ id: "mark-1", name: "Note", symbol: "rectangle" as const, x: 12, y: 24, width: 80, height: 32, shape: "text" as const }],
      strokes: { "a>b:material": { color: "#c5221f", dash: "8 5" } },
      links: [{ id: "link-1", from: "mark-1", to: "dock:1", kind: "material" as const, label: "Manual" }],
    };
    const restored = workbookToDocument(documentToWorkbook(withExtras));
    expect(restored.marks?.[0]).toMatchObject({ name: "Note", shape: "text" });
    expect(restored.strokes?.["a>b:material"]).toEqual({ color: "#c5221f", dash: "8 5" });
    expect(restored.links?.[0]).toMatchObject({ from: "mark-1", to: "dock:1", label: "Manual" });
    expect(parseMifaDocument(JSON.parse(JSON.stringify(withExtras)))?.links?.[0].id).toBe("link-1");
  });

  it("sends a shape behind the symbols and can bring it to the front", () => {
    const ids = ["supplier:Supplier", "dock:1", "mark-1"];
    const behind = arrange(ids, undefined, "mark-1", "back");
    expect(paintLayers(ids, behind)).toEqual({ back: ["mark-1"], front: ["supplier:Supplier", "dock:1"] });
    const raised = arrange(ids, behind, "mark-1", "front");
    expect(paintLayers(ids, raised).front.at(-1)).toBe("mark-1");
    expect(paintLayers(ids, raised).back).toEqual([]);
    const withNew = paintLayers([...ids, "mark-2"], raised);
    expect(withNew.front.at(-1)).toBe("mark-1");
    expect(withNew.front.at(-2)).toBe("mark-2");
    const saved = { ...emptyDocument(), flows: [blankFlow("1")], stack: behind };
    expect(workbookToDocument(documentToWorkbook(saved)).stack).toEqual(behind);
    expect(parseMifaDocument(JSON.parse(JSON.stringify(saved)))?.stack).toEqual(behind);
    const paint = ["back", "middle", "front"];
    expect(orderedIds(["front", "back", "middle"], paint)).toEqual(["back", "middle", "front"]);
    const parent = containerOf([
      { id: "supplier:1", x: 0, y: 0, width: 200, height: 120 },
      { id: "mark-note", x: 20, y: 20, width: 40, height: 16 },
      { id: "icon:line", x: 80, y: 40, width: 24, height: 16 },
    ]);
    expect(parent.get("mark-note")).toBe("supplier:1");
    expect(parent.has("icon:line")).toBe(false);
    expect(parent.has("supplier:1")).toBe(false);
    const held = setLayerLock(emptyDocument(), ["mark-note"], true);
    expect(held.fixed?.["mark-note"]).toBe(true);
    expect(parseMifaDocument(JSON.parse(JSON.stringify(held)))?.fixed?.["mark-note"]).toBe(true);
    expect(setLayerLock(held, ["mark-note"], false).fixed).toBeUndefined();
  });

  it("draws one line between the two symbols that were clicked", () => {
    const doc = exampleDocument();
    const sheet = buildSheet(doc);
    const warehouse = sheet.nodes.find((node) => node.id === "warehouse:1");
    const seq = sheet.nodes.find((node) => node.kind === "sequencing");
    const before = sheet.edges.map((edge) => edge.id).sort();
    const throughRegister = buildSheet(linkNodes(doc, warehouse!.id, seq!.id, warehouse!.flowIds[0] ?? null, "material"));
    const invented = throughRegister.edges.map((edge) => edge.id).filter((id) => !before.includes(id));
    expect(invented).toEqual([`${warehouse!.id}>${seq!.id}:material`]);
    expect(throughRegister.nodes.filter((node) => node.kind === "sequencing")).toHaveLength(1);

    const connected = connectSymbols(doc, warehouse!.id, seq!.id, "material");
    expect(buildSheet(connected.document).edges.map((edge) => edge.id).sort()).toEqual(before);
    expect(connected.document.links).toHaveLength(1);
    expect(connected.document.links?.[0]).toMatchObject({ from: warehouse!.id, to: seq!.id, kind: "material" });
    const again = connectSymbols(connected.document, seq!.id, warehouse!.id, "material");
    expect(again.document.links).toHaveLength(2);
    expect(again.edgeId).not.toBe(connected.edgeId);
    expect(again.document.links?.[1]).toMatchObject({ from: seq!.id, to: warehouse!.id });

    const supplierToDock = connectSymbols(doc, "supplier:Supplier", "dock:1", "material");
    expect(supplierToDock.document.links).toHaveLength(1);
    expect(supplierToDock.edgeId).not.toBe("supplier:Supplier>dock:1:material");
  });

  it("puts the grab point on the arrowhead, outside the symbol", () => {
    const tip = { x: 240, y: 230 };
    const seat = arrowSeat(tip, { x: 180, y: 230 });
    expect(seat.y).toBeCloseTo(tip.y);
    expect(seat.x).toBeLessThan(tip.x);
    expect(seat.x).toBeGreaterThan(180);
    const dropped = arrowSeat(tip, { x: 240, y: 160 });
    expect(dropped.x).toBeCloseTo(tip.x);
    expect(dropped.y).toBeLessThan(tip.y);
  });

  it("steps a symbol by one pixel, and a note by a grid step", () => {
    const dock = sheet.nodes.find((node) => node.kind === "dock");
    expect(dock).toBeTruthy();
    const stepped = movePlaced(doc, { [dock!.id]: dock! }, 1, 0);
    expect(stepped.positions[dock!.id]).toEqual({ x: dock!.x + 1, y: dock!.y });
    const mark = { id: "mark-note", symbol: "rectangle" as const, name: "Note", x: 20, y: 30, width: 40, height: 24 };
    const shifted = movePlaced({ ...doc, marks: [mark] }, { [mark.id]: { x: mark.x, y: mark.y, width: mark.width, height: mark.height } }, 0, -8);
    expect(shifted.marks?.[0]).toMatchObject({ x: 20, y: 22 });
  });

  it("shows the arrow button that matches the head on the sheet", () => {
    const left: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 0, y: 40, width: 80, height: 60, flowIds: [] };
    const right: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 240, y: 40, width: 80, height: 60, flowIds: [] };
    const forward = arrowTowardScreen(edgeRoute(left, right).points);
    const back = arrowTowardScreen(edgeRoute(right, left).points);
    expect(forward).toBe("end");
    expect(back).toBe("start");
    expect(arrowOnScreen("start", back)).toBe("end");
    expect(arrowOnScreen("end", back)).toBe("start");
    expect(arrowOnScreen("end", forward)).toBe("end");
  });

  it("offsets a second line so the two arrows can pass each other", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 0, y: 40, width: 80, height: 60, flowIds: [] };
    const to: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 240, y: 40, width: 80, height: 60, flowIds: [] };
    const first = edgeRoute(from, to);
    const second = edgeRoute(to, from, undefined, 1);
    expect(first.points[0].y).not.toBeCloseTo(second.points[0].y);
  });

  it("keeps the arrow choice with the line color", () => {
    const saved = { ...emptyDocument(), flows: [blankFlow("1")], strokes: { "a>b:material": { color: "#1b4f9c", dash: "", arrow: "both" as const } } };
    expect(workbookToDocument(documentToWorkbook(saved)).strokes?.["a>b:material"]).toEqual({ color: "#1b4f9c", dash: "", arrow: "both" });
    expect(parseMifaDocument(JSON.parse(JSON.stringify(saved)))?.strokes?.["a>b:material"].arrow).toBe("both");
  });

  it("keeps production-line cars the same size when the line is stretched", () => {
    const narrow = productionLineMetrics(48);
    const wide = productionLineMetrics(96);
    expect(narrow.left).toBe(narrow.right);
    expect(wide.left).toBe(wide.right);
    expect(narrow.left).toBeCloseTo(1.7);
    expect(wide.left).toBe(narrow.left);
    expect(wide.carH).toBeGreaterThan(narrow.carH);
    expect(wide.pitch).toBeGreaterThan(wide.carH);
    expect(Math.ceil(900 / narrow.pitch)).toBeGreaterThan(Math.ceil(400 / narrow.pitch));
    expect(SEQUENCE_COLORS.filter((color) => color === "#969696")).toHaveLength(1);
    expect(SEQUENCE_COLORS.slice(0, 3).every((color) => color === "#d80000")).toBe(true);
    expect(BATCH_COLORS).toEqual(["#d80000", "#3ff200", "#666633", "#009999", "#969696"]);
  });
});

describe("forklift box stroke", () => {
  it("uses the standalone small-box line weight on the boxes and leaves other symbols alone", () => {
    const full = SYMBOL_ART.find((art) => art.id === "materials-forklift-sb-full");
    const empty = SYMBOL_ART.find((art) => art.id === "materials-forklift-sb-empty");
    const pallet = SYMBOL_ART.find((art) => art.id === "inventories-small-boxes-pallet-full");
    const stock = SYMBOL_ART.find((art) => art.id === "inventories-controlled-inventory-small-boxes-full");
    expect(full && empty && pallet && stock).toBeTruthy();
    const stroke = carriedCellStroke(full!);
    expect(stroke).toBeLessThan(full!.paths[0].width / 2);
    expect(carriedCellStroke(empty!)).toBeGreaterThan((stroke ?? 0) * 0.9);
    expect(carriedCellStroke(pallet!)).toBeNull();
    expect(carriedCellStroke(stock!)).toBeNull();
  });
});
