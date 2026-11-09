import { useState } from "react";
import { FolderPlus, RotateCcw, Save, Trash2 } from "lucide-react";
import type { Archive } from "./archive";
import { Button, Tip } from "./ui";

export function ArchivePanel({
  archive,
  browseFolderId,
  onBrowse,
  onOpen,
  onAddFolder,
  onRenameFolder,
  onRemoveFolder,
  onAddMifa,
  onRemoveMifa,
  onSave,
  onRestore,
}: {
  archive: Archive;
  browseFolderId: string;
  onBrowse: (folderId: string) => void;
  onOpen: (folderId: string, mifaId: string) => void;
  onAddFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onRemoveFolder: (folderId: string) => void;
  onAddMifa: (folderId: string) => void;
  onRemoveMifa: (folderId: string, mifaId: string) => void;
  onSave: () => void;
  onRestore: (versionId: string) => void;
}) {
  const [folderName, setFolderName] = useState("");
  const [pending, setPending] = useState<{ kind: "folder" | "mifa"; folderId: string; mifaId?: string } | null>(null);
  const folder = archive.folders.find((item) => item.id === browseFolderId) ?? archive.folders[0];
  const open = archive.folders.flatMap((item) => item.mifas.map((mifa) => ({ folder: item, mifa }))).find((item) => item.mifa.id === archive.openMifaId);
  const mifaCount = archive.folders.reduce((sum, item) => sum + item.mifas.length, 0);

  return (
    <section aria-label="MIFA library" className="grid h-72 shrink-0 grid-cols-3 border-b border-[#d0d7de] bg-white">
      <div className="flex min-h-0 flex-col border-r border-[#d0d7de]">
        <header className="border-b border-[#d0d7de] px-3 py-2 text-[11px] font-semibold tracking-wide text-[#5f6368] uppercase">Folders</header>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {archive.folders.map((item) => (
            <div key={item.id} className={item.id === folder?.id ? "mb-1 rounded-md bg-[#e8f0fe]" : "mb-1 rounded-md"}>
              <Tip label={item.name}>
                <button type="button" className="w-full truncate px-2 py-1.5 text-left text-sm" onClick={() => onBrowse(item.id)}>
                  {item.name}
                </button>
              </Tip>
              {item.id === folder?.id ? (
                <div className="flex items-center gap-1 px-2 pb-2">
                  <input
                    aria-label="Folder name"
                    value={item.name}
                    onChange={(event) => onRenameFolder(item.id, event.target.value)}
                    className="h-7 min-w-0 flex-1 rounded-md border border-[#d0d7de] px-2 text-sm"
                  />
                  <Button variant="ghost" size="icon-sm" title="Delete folder" aria-label={`Delete folder ${item.name}`} disabled={!canRemoveFolder(archive, item.id)} onClick={() => setPending({ kind: "folder", folderId: item.id })}>
                    <Trash2 />
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <form
          className="flex items-center gap-1 border-t border-[#d0d7de] p-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAddFolder(folderName);
            setFolderName("");
          }}
        >
          <input
            aria-label="New folder name"
            value={folderName}
            placeholder="Factory name"
            onChange={(event) => setFolderName(event.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-[#d0d7de] px-2 text-sm"
          />
          <Button type="submit" variant="outline" size="icon-sm" className="size-8" aria-label="Add folder" title="Add folder">
            <FolderPlus />
          </Button>
        </form>
      </div>
      <div className="flex min-h-0 flex-col border-r border-[#d0d7de]">
        <header className="flex items-center justify-between border-b border-[#d0d7de] px-3 py-2">
          <span className="text-[11px] font-semibold tracking-wide text-[#5f6368] uppercase">MIFAs</span>
          <Button variant="outline" size="default" className="h-7" title="New MIFA" onClick={() => folder && onAddMifa(folder.id)}>
            New MIFA
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {folder?.mifas.length ? (
            folder.mifas.map((mifa) => {
              const editing = mifa.id === archive.openMifaId;
              return (
                <div key={mifa.id} className={editing ? "mb-1 rounded-md border border-[#1b4f9c] px-2 py-1.5" : "mb-1 rounded-md border border-transparent px-2 py-1.5 hover:bg-[#f4f6f8]"}>
                  <div className="flex items-center gap-2">
                    <Tip label={mifa.document.project.name || "Untitled MIFA"}>
                      <button type="button" className="min-w-0 flex-1 truncate text-left text-sm font-medium" onClick={() => onOpen(folder.id, mifa.id)}>
                        {mifa.document.project.name || "Untitled MIFA"}
                      </button>
                    </Tip>
                    <Button variant="ghost" size="icon-sm" title="Delete MIFA" aria-label={`Delete ${mifa.document.project.name || "MIFA"}`} disabled={mifaCount <= 1} onClick={() => setPending({ kind: "mifa", folderId: folder.id, mifaId: mifa.id })}>
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="text-[11px] text-[#5f6368]">{editing ? "Editing" : "Open"} · {mifa.versions.length} saved</p>
                </div>
              );
            })
          ) : (
            <p className="px-2 py-3 text-sm text-[#5f6368]">This folder is empty. Add a MIFA to start a sheet here.</p>
          )}
          {pending ? (
            <div className="mt-2 rounded-md border border-[#d0d7de] bg-[#f4f6f8] p-2 text-sm">
              <p>{pending.kind === "folder" ? "Delete this folder and the MIFAs inside it?" : "Delete this MIFA and its saved versions?"}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="destructive"
                  title="Delete"
                  onClick={() => {
                    if (pending.kind === "folder") onRemoveFolder(pending.folderId);
                    else if (pending.mifaId) onRemoveMifa(pending.folderId, pending.mifaId);
                    setPending(null);
                  }}
                >
                  Delete
                </Button>
                <Button variant="ghost" title="Cancel" onClick={() => setPending(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-[#d0d7de] px-3 py-2">
          <span className="min-w-0 truncate text-[11px] font-semibold tracking-wide text-[#5f6368] uppercase">{open ? open.mifa.document.project.name : "Versions"}</span>
          <Button variant="outline" size="default" className="h-7" title="Save version" onClick={onSave}>
            <Save />
            Save version
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {open?.mifa.versions.length ? (
            open.mifa.versions.map((version) => (
              <div key={version.id} className="mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#f4f6f8]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{version.name || "Untitled MIFA"}</p>
                  <p className="text-[11px] text-[#5f6368]">{formatSavedAt(version.savedAt)}</p>
                </div>
                <Button variant="ghost" size="default" className="h-7" title="Restore" onClick={() => onRestore(version.id)}>
                  <RotateCcw />
                  Restore
                </Button>
              </div>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-[#5f6368]">No saved versions yet. Save version keeps a copy you can restore later. The sheet you are editing stays open.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function canRemoveFolder(archive: Archive, folderId: string) {
  if (archive.folders.length <= 1) return false;
  const folder = archive.folders.find((item) => item.id === folderId);
  if (!folder?.mifas.length) return true;
  return archive.folders.some((item) => item.id !== folderId && item.mifas.length > 0);
}

function formatSavedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
