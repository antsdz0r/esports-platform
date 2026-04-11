import { UserRole } from "../enums/UserRole";
export type JwtPayload = {
  id: number;
  gamerTag: string;
  role: UserRole;
};
