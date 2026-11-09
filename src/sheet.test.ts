import { describe, expect, it } from "vitest";
import { connectSymbols, linkNodes, omitSymbols, placeSymbol } from "./canvas";
import { arrange, arrowOnScreen, arrowTowardScreen, bendFromCorner, bendFromMove, blankFlow, buildSheet, centerPortsOnMove, edgeRoute, emptyDocument, exampleDocument, paintLayers, parseMifaDocument, pathForFlows, straightenConnection, type SheetNode } from "./document";
import { documentToWorkbook, workbookToDocument } from "./excel";

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
    expect(labels).toContain("LV 1");
    expect(labels).not.toContain("Seq 1");
    expect(labels).toContain("WMS");
  });

  it("keeps the shared dock and line on both flows", () => {
    const dock = sheet.nodes.find((node) => node.label === "Dock 1");
    const line = sheet.nodes.find((node) => node.label === "Line");
    expect(dock?.flowIds.sort()).toEqual(["f-lv", "f-sb"]);
    expect(line?.flowIds.sort()).toEqual(["f-lv", "f-sb"]);
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

  it("puts the arrow back in the middle when the moved symbol still meets the line", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "supplier", label: "", x: 0, y: 200, width: 120, height: 80, flowIds: [] };
    const bend = { x: 0, y: 0, from: { side: "n" as const, at: 60 }, to: { side: "w" as const, at: 112 }, corners: [{ x: 60, y: 112 }] };
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
    const next = centerPortsOnMove(doc, ["mark-b"]);
    expect(next.bends?.["link-1"].to?.at).toBeCloseTo(128);
    const route = edgeRoute(from, { ...from, id: "mark-b", x: 360, y: 96, width: 140, height: 64, label: "Process" }, next.bends?.["link-1"]);
    expect(route.to.side).toBe("w");
    expect(route.points[route.points.length - 1].y).toBeCloseTo(128);

    const far = {
      ...doc,
      marks: doc.marks?.map((mark) => (mark.id === "mark-b" ? { ...mark, y: 260 } : mark)),
    };
    const dropped = centerPortsOnMove(far, ["mark-b"]);
    expect(dropped.bends?.["link-1"].to).toMatchObject({ side: "w", at: 292 });
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

  it("turns the arrow onto the side the line is moved to", () => {
    const from: SheetNode = { id: "mark-a", kind: "it", symbol: "rectangle", label: "", x: 0, y: 80, width: 80, height: 60, flowIds: [] };
    const to: SheetNode = { id: "mark-b", kind: "it", symbol: "rectangle", label: "", x: 240, y: 200, width: 80, height: 60, flowIds: [] };
    const automatic = edgeRoute(from, to);
    expect(automatic.corners.length).toBeGreaterThan(1);
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
      bend = bendFromCorner(from, to, bend, shown.corners.length - 1, point);
      expect(edgeRoute(from, to, bend).corners.length).toBeLessThanOrEqual(2);
    }
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
  });

  it("draws one line between the two symbols that were clicked", () => {
    const doc = exampleDocument();
    const sheet = buildSheet(doc);
    const warehouse = sheet.nodes.find((node) => node.id === "warehouse:LV:1");
    const seq = sheet.nodes.find((node) => node.kind === "sequencing");
    const before = sheet.edges.map((edge) => edge.id).sort();
    const invented = buildSheet(linkNodes(doc, warehouse!.id, seq!.id, warehouse!.flowIds[0] ?? null, "material"))
      .edges.map((edge) => edge.id)
      .filter((id) => !before.includes(id));
    expect(invented.length).toBeGreaterThan(1);

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
});
