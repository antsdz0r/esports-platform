import { ProMatch } from "../../models/ProMatch";

export interface IProMatchRepository {
  // Upsert po external_id (idempotentno pri ponovnom sync-u). Vraca id reda.
  upsert(match: ProMatch): Promise<number>;

  // Feed: live prvo, pa nadolazeci po vremenu, ogranicen brojem.
  findFeed(limit: number): Promise<ProMatch[]>;
}
