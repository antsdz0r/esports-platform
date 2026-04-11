import { User } from "../../models/User";

export interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: number): Promise<User>;
  findByGamerTag(gamerTag: string): Promise<User>;
  findByEmail(email: string): Promise<User>;
  findAll(): Promise<User[]>;
  update(user: User): Promise<boolean>;
  deactivate(id: number): Promise<boolean>;
  exists(id: number): Promise<boolean>;
}
