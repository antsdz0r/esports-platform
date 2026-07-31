import {
  ProLeagueDto,
  ProSerieDto,
  ProTournamentListDto,
  ProTournamentDetailDto,
} from "../../DTOs/pro/ProStructureDtos";

export interface IProTournamentService {
  getGames(): Promise<string[]>;
  getLeagues(gameSlug: string): Promise<ProLeagueDto[]>;
  getActiveTournaments(gameSlug: string): Promise<ProTournamentListDto[]>;

  // Serije jedne lige (izdanja/godine) — po potrebi povlaci sa izvora i kesira.
  getSeries(leagueExternalId: string): Promise<ProSerieDto[]>;
  // Turniri (faze) jedne serije — po potrebi povlaci sa izvora i kesira.
  getTournaments(serieExternalId: string): Promise<ProTournamentListDto[]>;

  // Detalj turnira: mecevi (bracket/lista) + standings. Osvezava sa izvora na zahtev.
  getTournamentDetail(externalId: string): Promise<ProTournamentDetailDto | null>;
}
