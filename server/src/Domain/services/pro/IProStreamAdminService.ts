import { ProStream } from "../../models/ProStream";
import { StreamPlatform } from "../../enums/StreamPlatform";

export interface IProStreamAdminService {
  // Svi streamovi meca (uklj. source) — za admin pregled.
  listForMatch(proMatchId: number): Promise<ProStream[]>;

  // Rucno dodaje 'local' stream (kaster/co-stream) koji preživljava auto-sync.
  addLocal(
    proMatchId: number, platform: StreamPlatform, channel: string, language: string
  ): Promise<{ ok: boolean; stream?: ProStream; error?: string }>;

  // Brise samo rucno dodat stream.
  removeLocal(streamId: number): Promise<boolean>;
}
