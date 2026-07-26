import { ProStream } from "../../models/ProStream";

export interface IProStreamRepository {
  // Zamenjuje streamove datog izvora (npr. 'pandascore') za mec,
  // cime rucno dodati ('local') streamovi ostaju netaknuti.
  replaceForMatch(proMatchId: number, source: string, streams: ProStream[]): Promise<void>;

  findByMatchIds(matchIds: number[]): Promise<ProStream[]>;

  // Svi streamovi jednog meca (uklj. source) — za admin pregled.
  findForMatch(proMatchId: number): Promise<ProStream[]>;

  // Ubacuje jedan stream i vraca njegov id (0 pri gresci).
  create(stream: ProStream): Promise<number>;

  // Brise samo rucno dodat ('local') stream; vraca true ako je nesto obrisano.
  deleteLocal(streamId: number): Promise<boolean>;
}
