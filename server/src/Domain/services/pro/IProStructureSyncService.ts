export interface IProStructureSyncService {
  // Dnevni sync strukture: povlaci turnire (running/upcoming/past) i iz njih upsertuje
  // lige, serije i turnire. Opcioni filter po igrama; prazno = sve iz feed-a.
  syncStructure(gameSlugs?: string[]): Promise<{
    ok: boolean;
    leagues: number;
    series: number;
    tournaments: number;
    error?: string;
  }>;
}
