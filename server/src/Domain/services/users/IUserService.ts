
import { User } from "../../models/User";

export interface IUserService {
  getAll(): Promise<User[]>;
  getById(id: number): Promise<User>;
  deactivate(id: number): Promise<boolean>;
  updateRole(id: number, role: string): Promise<boolean>;
}
