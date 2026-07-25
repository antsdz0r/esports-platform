import { ProStream } from "../../models/ProStream";

export interface IProStreamRepository {
  // Zamenjuje streamove datog izvora (npr. 'pandascore') za mec,
  // cime rucno dodati ('local') streamovi ostaju netaknuti.
  replaceForMatch(proMatchId: number, source: string, streams: ProStream[]): Promise<void>;

  findByMatchIds(matchIds: number[]): Promise<ProStream[]>;
}
