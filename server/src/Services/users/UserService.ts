import { IUserService } from "../../Domain/services/users/IUserService";
import { IUserRepository } from "../../Domain/repositories/users/IUserRepository";
import { UserDto } from "../../Domain/DTOs/users/UserDto";
import { UserRole } from "../../Domain/enums/UserRole";

export class UserService implements IUserService {
  public constructor(private readonly userRepo: IUserRepository) {}

  async getAll(): Promise<UserDto[]> {
    const users = await this.userRepo.findAll();
    return users.map(
      (u) =>
        new UserDto(
          u.id,
          u.gamerTag,
          u.email,
          u.role,
          u.isActive,
          u.fullName,
          u.profilePicture
        )
    );
  }

  async getById(id: number): Promise<UserDto | null> {
    const u = await this.userRepo.findById(id);
    if (u.id === 0) return null;

    return new UserDto(
      u.id,
      u.gamerTag,
      u.email,
      u.role,
      u.isActive,
      u.fullName,
      u.profilePicture
    );
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