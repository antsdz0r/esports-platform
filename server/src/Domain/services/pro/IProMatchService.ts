import { ProMatchDto } from "../../DTOs/pro/ProMatchDto";

export interface IProMatchService {
  getFeed(limit: number): Promise<ProMatchDto[]>;
}
