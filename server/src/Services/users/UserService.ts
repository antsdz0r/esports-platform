import { IUserService } from "../../Domain/services/users/IUserService";
import { IUserRepository } from "../../Domain/repositories/users/IUserRepository";
import { User } from "../../Domain/models/User";
import { UserRole } from "../../Domain/enums/UserRole";

export class UserService implements IUserService {
  public constructor(private readonly userRepo: IUserRepository) {}

  async getAll(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  async getById(id: number): Promise<User> {
    return this.userRepo.findById(id);
  }

  async deactivate(id: number): Promise<boolean> {
    return this.userRepo.deactivate(id);
  }

  async updateRole(id: number, role: string): Promise<boolean> {
    const user = await this.userRepo.findById(id);
    if (user.id === 0) return false;
    user.role = role as UserRole;
    return this.userRepo.update(user);
  }
}