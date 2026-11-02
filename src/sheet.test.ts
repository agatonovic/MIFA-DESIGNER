import { describe, expect, it } from "vitest";
import { linkNodes, placeSymbol } from "./canvas";
import { blankFlow, buildSheet, emptyDocument, exampleDocument, parseMifaDocument, pathForFlows } from "./document";
import { documentToWorkbook, workbookToDocument } from "./excel";

describe("MIFA sheet built from the flow register", () => {
  const doc = exampleDocument();
  const sheet = buildSheet(doc);

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
});
