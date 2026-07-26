export interface IProSyncService {
  // Povlaci live + nadolazece + skoro zavrsene meceve sa eksternog izvora i upsertuje ih.
  // Opcioni game slug ('league-of-legends', 'cs-go'...) filtrira po igri.
  sync(gameSlug?: string): Promise<{ ok: boolean; synced: number; error?: string }>;
}
