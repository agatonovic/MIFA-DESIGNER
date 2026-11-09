import { createId, parseMifaDocument, type MifaDocument } from "./document";

export const ARCHIVE_KEY = "mifa.archive.v1";

export type MifaVersion = {
  id: string;
  savedAt: string;
  name: string;
  document: MifaDocument;
};

export type MifaEntry = {
  id: string;
  document: MifaDocument;
  versions: MifaVersion[];
};

export type MifaFolder = {
  id: string;
  name: string;
  mifas: MifaEntry[];
};

export type Archive = {
  folders: MifaFolder[];
  openFolderId: string;
  openMifaId: string;
};

export function createArchive(document: MifaDocument, folderName = "Factory"): Archive {
  const folderId = createId("folder");
  const mifaId = createId("mifa");
  return {
    folders: [{ id: folderId, name: folderName, mifas: [{ id: mifaId, document: copyDocument(document), versions: [] }] }],
    openFolderId: folderId,
    openMifaId: mifaId,
  };
}

export function parseArchive(value: unknown): Archive | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Archive>;
  if (!Array.isArray(raw.folders) || typeof raw.openFolderId !== "string" || typeof raw.openMifaId !== "string") return null;
  const folders = raw.folders.flatMap((folder) => {
    if (!folder || typeof folder !== "object") return [];
    const item = folder as Partial<MifaFolder>;
    if (typeof item.id !== "string" || typeof item.name !== "string" || !Array.isArray(item.mifas)) return [];
    const mifas = item.mifas.flatMap((mifa) => {
      if (!mifa || typeof mifa !== "object") return [];
      const entry = mifa as Partial<MifaEntry>;
      const document = parseMifaDocument(entry.document);
      if (typeof entry.id !== "string" || !document) return [];
      const versions = (entry.versions ?? []).flatMap((version) => {
        if (!version || typeof version !== "object") return [];
        const saved = version as Partial<MifaVersion>;
        const snapshot = parseMifaDocument(saved.document);
        if (typeof saved.id !== "string" || typeof saved.savedAt !== "string" || typeof saved.name !== "string" || !snapshot) return [];
        return [{ id: saved.id, savedAt: saved.savedAt, name: saved.name, document: snapshot }];
      });
      return [{ id: entry.id, document, versions }];
    });
    return [{ id: item.id, name: item.name, mifas }];
  });
  if (!folders.some((folder) => folder.mifas.length)) return null;
  return settle({ folders, openFolderId: raw.openFolderId, openMifaId: raw.openMifaId });
}

export function openDocument(archive: Archive): MifaDocument {
  return copyDocument(requireOpen(settle(archive)).mifa.document);
}

export function remember(archive: Archive, document: MifaDocument): Archive {
  const current = settle(archive);
  const open = requireOpen(current);
  return mapMifa(current, open.folder.id, open.mifa.id, (mifa) => ({ ...mifa, document: copyDocument(document) }));
}

export function saveVersion(archive: Archive, document: MifaDocument): Archive {
  const current = remember(archive, document);
  const open = requireOpen(current);
  const snapshot = copyDocument(document);
  const newest = open.mifa.versions[0];
  if (newest && sameDocument(newest.document, snapshot)) return current;
  const version: MifaVersion = { id: createId("ver"), savedAt: new Date().toISOString(), name: document.project.name, document: snapshot };
  return mapMifa(current, open.folder.id, open.mifa.id, (mifa) => ({ ...mifa, versions: [version, ...mifa.versions] }));
}

export function restoreVersion(archive: Archive, versionId: string): Archive | null {
  const open = requireOpen(settle(archive));
  const version = open.mifa.versions.find((item) => item.id === versionId);
  if (!version) return null;
  const backedUp = saveVersion(archive, open.mifa.document);
  return remember(backedUp, version.document);
}

export function addFolder(archive: Archive, name: string): Archive {
  const current = settle(archive);
  const folder: MifaFolder = { id: createId("folder"), name: name.trim() || "Folder", mifas: [] };
  return { ...current, folders: [...current.folders, folder] };
}

export function renameFolder(archive: Archive, folderId: string, name: string): Archive {
  const trimmed = name.trim();
  if (!trimmed) return archive;
  return { ...archive, folders: archive.folders.map((folder) => (folder.id === folderId ? { ...folder, name: trimmed } : folder)) };
}

export function removeFolder(archive: Archive, folderId: string): Archive {
  if (archive.folders.length <= 1) return archive;
  const next = { ...archive, folders: archive.folders.filter((folder) => folder.id !== folderId) };
  const open = findOpen(next);
  if (!open) return archive;
  return { ...next, openFolderId: open.folder.id, openMifaId: open.mifa.id };
}

export function addMifa(archive: Archive, folderId: string, document: MifaDocument): Archive {
  if (!archive.folders.some((folder) => folder.id === folderId)) return archive;
  const mifa: MifaEntry = { id: createId("mifa"), document: copyDocument(document), versions: [] };
  return {
    ...archive,
    openFolderId: folderId,
    openMifaId: mifa.id,
    folders: archive.folders.map((folder) => (folder.id === folderId ? { ...folder, mifas: [...folder.mifas, mifa] } : folder)),
  };
}

export function renameMifa(archive: Archive, folderId: string, mifaId: string, name: string): Archive {
  return mapMifa(archive, folderId, mifaId, (mifa) => ({ ...mifa, document: { ...mifa.document, project: { ...mifa.document.project, name } } }));
}

export function removeMifa(archive: Archive, folderId: string, mifaId: string): Archive {
  const total = archive.folders.reduce((sum, folder) => sum + folder.mifas.length, 0);
  if (total <= 1) return archive;
  const next = {
    ...archive,
    folders: archive.folders.map((folder) => (folder.id === folderId ? { ...folder, mifas: folder.mifas.filter((mifa) => mifa.id !== mifaId) } : folder)),
  };
  const open = findOpen(next);
  if (!open) return archive;
  return { ...next, openFolderId: open.folder.id, openMifaId: open.mifa.id };
}

function settle(archive: Archive): Archive {
  const open = findOpen(archive);
  if (!open) return archive;
  if (open.folder.id === archive.openFolderId && open.mifa.id === archive.openMifaId) return archive;
  return { ...archive, openFolderId: open.folder.id, openMifaId: open.mifa.id };
}

function findOpen(archive: Archive) {
  const folder = archive.folders.find((item) => item.id === archive.openFolderId);
  const mifa = folder?.mifas.find((item) => item.id === archive.openMifaId);
  if (folder && mifa) return { folder, mifa };
  for (const candidate of archive.folders) {
    if (candidate.mifas[0]) return { folder: candidate, mifa: candidate.mifas[0] };
  }
  return null;
}

function requireOpen(archive: Archive) {
  const open = findOpen(archive);
  if (!open) throw new Error("Archive has no MIFA");
  return open;
}

function mapMifa(archive: Archive, folderId: string, mifaId: string, change: (mifa: MifaEntry) => MifaEntry): Archive {
  return {
    ...archive,
    folders: archive.folders.map((folder) =>
      folder.id === folderId ? { ...folder, mifas: folder.mifas.map((mifa) => (mifa.id === mifaId ? change(mifa) : mifa)) } : folder,
    ),
  };
}

function copyDocument(document: MifaDocument): MifaDocument {
  return JSON.parse(JSON.stringify(document)) as MifaDocument;
}

function sameDocument(left: MifaDocument, right: MifaDocument) {
  return JSON.stringify(left) === JSON.stringify(right);
}
