import { ProMatch } from "../../models/ProMatch";

export interface IProMatchRepository {
  // Upsert po external_id (idempotentno pri ponovnom sync-u). Vraca id reda.
  upsert(match: ProMatch): Promise<number>;

  // Feed: live prvo, pa nadolazeci po vremenu, ogranicen brojem.
  findFeed(limit: number): Promise<ProMatch[]>;

  // Da li mec sa datim id-em postoji (za validaciju pre dodavanja streama).
  exists(id: number): Promise<boolean>;

  // Mecevi kojima treba povuci PRAVI rezultat pojedinacno (getMatchById):
  //  - zaglavljeni 'live'/'upcoming' cije je vreme proslo (>6h) i nisu skoro osvezeni,
  //  - skoro zavrseni (u feed prozoru) koji odavno nisu osvezeni (mozda parcijalan skor).
  // Vraca ih (sa external_id), najnoviji prvi, ograniceno brojem.
  findMatchesNeedingResolve(limit: number): Promise<ProMatch[]>;

  // Fallback pomirenje: vrlo stare zaglavljene 'live'/'upcoming' koje nismo mogli da
  // razresimo -> 'finished'. Vraca broj ispravljenih redova.
  markStalePastMatchesAsFinished(olderThanHours: number): Promise<number>;
}
