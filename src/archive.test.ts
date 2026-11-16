import { describe, expect, it } from "vitest";
import { addFolder, addMifa, createArchive, openDocument, parseArchive, remember, removeFolder, removeMifa, renameFolder, restoreVersion, saveVersion } from "./archive";
import { emptyDocument } from "./document";
import { adoptPublished, applyShippedUpdates, publishedLibrary } from "./published-library";

describe("MIFA folders and versions", () => {
  it("keeps several MIFAs in a folder and a saved copy of each sheet", () => {
    const first = emptyDocument();
    first.project.name = "Inbound";
    let archive = createArchive(first, "Factory");
    archive = renameFolder(archive, archive.openFolderId, "FACTORY KRAGUJEVAC");
    const second = emptyDocument();
    second.project.name = "Outbound";
    archive = addMifa(archive, archive.openFolderId, second);
    expect(openDocument(archive).project.name).toBe("Outbound");
    const saved = saveVersion(archive, openDocument(archive));
    const edited = openDocument(saved);
    edited.project.name = "Outbound draft";
    const working = remember(saved, edited);
    expect(openDocument(working).project.name).toBe("Outbound draft");
    const version = working.folders[0].mifas.find((mifa) => mifa.document.project.name === "Outbound draft")?.versions[0];
    expect(version?.document.project.name).toBe("Outbound");
    const restored = restoreVersion(working, version!.id);
    expect(restored && openDocument(restored).project.name).toBe("Outbound");
    expect(restored?.folders[0].mifas.find((mifa) => mifa.id === restored.openMifaId)?.versions.length).toBe(2);
    const roundTrip = parseArchive(JSON.parse(JSON.stringify(restored)));
    expect(roundTrip && openDocument(roundTrip).project.name).toBe("Outbound");
    expect(roundTrip?.folders[0].name).toBe("FACTORY KRAGUJEVAC");
  });

  it("ships FACTORY KRAGUJEVAC and adds it beside a library that does not have it yet", () => {
    const published = publishedLibrary();
    expect(published.folders.map((folder) => folder.name)).toEqual(["Factory", "FACTORY KRAGUJEVAC"]);
    expect(openDocument(published).project.name).toBe("Inbound example");
    const kragujevac = published.folders[1];
    expect(kragujevac.mifas.map((mifa) => mifa.document.project.name)).toEqual(["Untitled MIFA", "MIFA GA MELFI"]);
    expect(kragujevac.mifas[0].versions.map((version) => version.name)).toEqual(["Draft", "Untitled MIFA"]);
    const melfi = kragujevac.mifas[1].document;
    expect(melfi.marks?.some((mark) => mark.name === "NOLA")).toBe(true);
    expect(melfi.marks?.some((mark) => mark.name === "SIT WAREHOUSE (MAF + MEP)")).toBe(true);
    expect(melfi.marks).toHaveLength(84);
    const stale = publishedLibrary();
    const previous = stale.folders[1].mifas[1];
    previous.document = { ...previous.document, marks: previous.document.marks?.slice(0, 2) };
    const refreshed = applyShippedUpdates(stale, {});
    expect(refreshed.archive.folders[1].mifas[1].document.marks).toHaveLength(84);
    const kept = applyShippedUpdates(refreshed.archive, refreshed.seen);
    kept.archive.folders[1].mifas[1].document.marks = kept.archive.folders[1].mifas[1].document.marks?.slice(0, 3);
    const leftAlone = applyShippedUpdates(kept.archive, kept.seen);
    expect(leftAlone.archive).toBe(kept.archive);
    expect(leftAlone.archive.folders[1].mifas[1].document.marks).toHaveLength(3);
    const older = publishedLibrary();
    older.folders[1].mifas = older.folders[1].mifas.filter((mifa) => mifa.document.project.name !== "MIFA GA MELFI");
    const gained = adoptPublished(older);
    expect(gained.folders[1].mifas.map((mifa) => mifa.document.project.name)).toEqual(["Untitled MIFA", "MIFA GA MELFI"]);
    const local = createArchive(emptyDocument(), "Other plant");
    local.folders[0].mifas[0].document.project.name = "Kept sheet";
    const merged = adoptPublished(local);
    expect(merged.openMifaId).toBe(local.openMifaId);
    expect(merged.folders.map((folder) => folder.name)).toEqual(["Other plant", "Factory", "FACTORY KRAGUJEVAC"]);
    expect(openDocument(merged).project.name).toBe("Kept sheet");
    const again = adoptPublished(merged);
    expect(again.folders).toHaveLength(3);
    expect(again).toBe(merged);
  });

  it("leaves the last MIFA and the last folder in place", () => {
    const archive = createArchive(emptyDocument());
    expect(removeMifa(archive, archive.openFolderId, archive.openMifaId)).toBe(archive);
    expect(removeFolder(archive, archive.openFolderId)).toBe(archive);
    const extra = addFolder(archive, "Empty");
    expect(extra.folders).toHaveLength(2);
    expect(removeFolder(extra, extra.folders[1].id).folders).toHaveLength(1);
  });
});
