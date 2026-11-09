import { describe, expect, it } from "vitest";
import { addFolder, addMifa, createArchive, openDocument, parseArchive, remember, removeFolder, removeMifa, renameFolder, restoreVersion, saveVersion } from "./archive";
import { emptyDocument } from "./document";

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

  it("leaves the last MIFA and the last folder in place", () => {
    const archive = createArchive(emptyDocument());
    expect(removeMifa(archive, archive.openFolderId, archive.openMifaId)).toBe(archive);
    expect(removeFolder(archive, archive.openFolderId)).toBe(archive);
    const extra = addFolder(archive, "Empty");
    expect(extra.folders).toHaveLength(2);
    expect(removeFolder(extra, extra.folders[1].id).folders).toHaveLength(1);
  });
});
