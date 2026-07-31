export type ProSyncKind = "running" | "upcoming" | "past";

export interface IProSyncService {
  // Pun sync: live + nadolazeci + skoro zavrseni. Opcioni game slug filtrira po igri.
  sync(gameSlug?: string): Promise<{ ok: boolean; synced: number; error?: string }>;

  // Ciljani sync samo za odredjene tipove (npr. ["running","past"] za live+zavrsene).
  syncKinds(kinds: ProSyncKind[], gameSlug?: string): Promise<{ ok: boolean; synced: number; error?: string }>;
}
