import { IUserService } from "../../Domain/services/users/IUserService";
import { IUserRepository } from "../../Domain/repositories/users/IUserRepository";
import { UserDto } from "../../Domain/DTOs/users/UserDto";

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
}