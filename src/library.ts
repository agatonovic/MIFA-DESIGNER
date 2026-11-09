import type { StampId } from "./canvas";
import type { FlowKind, SymbolId } from "./document";

export type LibraryFamily = "Process" | "Inventories" | "Material" | "Information";

export type LibraryItem = {
  id: string;
  name: string;
  fr: string;
  family: LibraryFamily;
  symbol: SymbolId;
  stamp?: StampId;
  link?: { kind: FlowKind; label: string };
};

export const LIBRARY_FAMILIES: LibraryFamily[] = ["Process", "Inventories", "Material", "Information"];

/** Names follow Symbols_MIFA_Internal_Logistics_Library.xlsx (English, with the French plant name). */
export const LIBRARY: LibraryItem[] = [
  { id: "supplier", name: "Supplier", fr: "Fournisseur", family: "Process", symbol: "supplier", stamp: "supplier" },
  { id: "line", name: "Production line", fr: "Ligne de production", family: "Process", symbol: "production", stamp: "production" },
  { id: "logistics", name: "Logistics area", fr: "Zone logistique", family: "Process", symbol: "warehouse", stamp: "warehouse" },
  { id: "external-wh", name: "External warehouse", fr: "Magasin extérieur", family: "Process", symbol: "warehouse", stamp: "warehouse" },
  { id: "truck-prep", name: "Truck preparation", fr: "Préparation camion", family: "Process", symbol: "dock", stamp: "dock" },
  { id: "process", name: "Process", fr: "Processus", family: "Process", symbol: "rectangle" },
  { id: "assembly", name: "Assembly", fr: "Assemblage", family: "Process", symbol: "rectangle" },
  { id: "control", name: "Control, check", fr: "Contrôle", family: "Process", symbol: "rectangle" },
  { id: "wait", name: "Wait", fr: "Attente", family: "Process", symbol: "stock" },
  { id: "operator", name: "Operator", fr: "Opérateur", family: "Process", symbol: "rectangle" },

  { id: "uncontrolled", name: "Uncontrolled stock", fr: "Stock non maîtrisé", family: "Inventories", symbol: "stock", stamp: "buffer" },
  { id: "controlled", name: "Controlled stock", fr: "Stock maîtrisé", family: "Inventories", symbol: "supermarket", stamp: "supermarket" },
  { id: "sequenced", name: "Sequenced stock", fr: "Stock en séquence", family: "Inventories", symbol: "sequencing", stamp: "sequencing" },
  { id: "fifo", name: "FIFO lane", fr: "Couloir FIFO", family: "Inventories", symbol: "warehouse" },
  { id: "crossdock", name: "Cross-dock", fr: "Transbordement", family: "Inventories", symbol: "dock", stamp: "dock" },
  { id: "safety", name: "Safety stock", fr: "Stock de sécurité", family: "Inventories", symbol: "stock" },
  { id: "trailer", name: "Trailer yard", fr: "Parc remorques", family: "Inventories", symbol: "dock" },
  { id: "conveyor", name: "Conveyor stock", fr: "Convoyeur", family: "Inventories", symbol: "warehouse" },
  { id: "lv-pair", name: "Large volume, full / empty", fr: "Gros volume plein / vide", family: "Inventories", symbol: "warehouse" },
  { id: "sb-pair", name: "Small boxes, full / empty", fr: "Petit colis plein / vide", family: "Inventories", symbol: "kitting" },
  { id: "empties", name: "Empty store", fr: "Stock vide", family: "Inventories", symbol: "empty", stamp: "empties" },
  { id: "empty-dock", name: "Empty dock", fr: "Quai vide", family: "Inventories", symbol: "dock", stamp: "emptiesDock" },
  { id: "kitting", name: "Kitting", fr: "Préparation kit", family: "Inventories", symbol: "kitting", stamp: "kitting" },

  { id: "material", name: "Material flow", fr: "Flux physique", family: "Material", symbol: "rectangle", link: { kind: "material", label: "" } },
  { id: "push", name: "Push", fr: "Flux poussé", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Push" } },
  { id: "pull", name: "Pull", fr: "Flux tiré", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Pull" } },
  { id: "fifo-move", name: "FIFO transfer", fr: "Transfert FIFO", family: "Material", symbol: "rectangle", link: { kind: "material", label: "FIFO" } },
  { id: "sils", name: "SILS", fr: "Flux synchrone", family: "Material", symbol: "rectangle", link: { kind: "material", label: "SILS" } },
  { id: "truck", name: "Truck", fr: "Camion", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Truck" } },
  { id: "forklift", name: "Forklift", fr: "Cariste", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Forklift" } },
  { id: "tugger", name: "Tugger train", fr: "Petit train", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Tugger" } },
  { id: "br", name: "Tugger cart", fr: "Train de BR", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Tugger cart" } },
  { id: "manual", name: "Manual", fr: "Manuel", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Manual" } },
  { id: "agc", name: "AGC", fr: "AGV", family: "Material", symbol: "rectangle", link: { kind: "material", label: "AGC" } },
  { id: "cart", name: "Push cart", fr: "Chariot poussé", family: "Material", symbol: "rectangle", link: { kind: "material", label: "Cart" } },
  { id: "empty-return", name: "Empty return", fr: "Retour vide", family: "Material", symbol: "empty", link: { kind: "empty", label: "Return" } },

  { id: "info", name: "Information", fr: "Flux d'information", family: "Information", symbol: "it", link: { kind: "information", label: "Info" } },
  { id: "oral", name: "Oral", fr: "Oral", family: "Information", symbol: "it", link: { kind: "information", label: "Oral" } },
  { id: "visual", name: "Visual", fr: "Visuel", family: "Information", symbol: "it", link: { kind: "information", label: "Visual" } },
  { id: "paper", name: "Paper", fr: "Papier", family: "Information", symbol: "it", link: { kind: "information", label: "Paper" } },
  { id: "mail", name: "Mail", fr: "Email", family: "Information", symbol: "it", link: { kind: "information", label: "Mail" } },
  { id: "it-system", name: "IT system", fr: "Système d'information", family: "Information", symbol: "it", stamp: "it" },
  { id: "electronic", name: "Electronic", fr: "Électronique", family: "Information", symbol: "it", link: { kind: "information", label: "Electronic" } },
  { id: "printer", name: "Printer", fr: "Imprimante", family: "Information", symbol: "it", link: { kind: "information", label: "Printer" } },
  { id: "heijunka", name: "Heijunka", fr: "Panneau de lissage", family: "Information", symbol: "it" },
  { id: "kanban", name: "Kanban card", fr: "Carte kanban", family: "Information", symbol: "rectangle" },
  { id: "kanban-box", name: "Kanban box", fr: "Boîte kanban", family: "Information", symbol: "kitting" },
];
