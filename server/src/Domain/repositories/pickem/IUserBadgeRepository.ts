import { UserBadge } from "../../models/UserBadge";

export interface IUserBadgeRepository {
  // Osvojeni bedževi korisnika (sa datumom, za prikaz).
  listForUser(userId: number): Promise<UserBadge[]>;
  // Samo kodovi osvojenih bedževa (za brzu proveru šta fali).
  listCodesForUser(userId: number): Promise<string[]>;
  // Dodeli bedž (INSERT IGNORE) — vraća true ako je tek sada osvojen.
  award(userId: number, code: string): Promise<boolean>;
}
