import bcrypt from "bcryptjs";
import { AuthUserDto } from "../../Domain/DTOs/auth/AuthUserDto";
import { UserRole } from "../../Domain/enums/UserRole";
import { User } from "../../Domain/models/User";
import { IUserRepository } from "../../Domain/repositories/users/IUserRepository";
import { IAuthService } from "../../Domain/services/auth/IAuthService";
 
export class AuthService implements IAuthService {
  public constructor(private readonly userRepo: IUserRepository) {}
 
  async login(gamerTag: string, password: string): Promise<AuthUserDto> {
    const user = await this.userRepo.findByGamerTag(gamerTag);
 
    if (user.id === 0) return new AuthUserDto();
    if (!user.isActive) return new AuthUserDto();
 
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return new AuthUserDto();
 
    return new AuthUserDto(user.id, user.gamerTag, user.role);
  }
 
  async register(
    gamerTag: string,
    email: string,
    password: string,
    role?: UserRole,
    fullName?: string,
    profilePicture?: string | null,
  ): Promise<AuthUserDto> {
    const byTag = await this.userRepo.findByGamerTag(gamerTag);
    if (byTag.id !== 0) return new AuthUserDto();
 
    const byEmail = await this.userRepo.findByEmail(email);
    if (byEmail.id !== 0) return new AuthUserDto();
 
    const hash = await bcrypt.hash(password, 10);
    const userRole = role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.PLAYER;
 
    const created = await this.userRepo.create(
      new User(
        0,
        gamerTag,
        email,
        userRole,
        true,
        hash,
        new Date(),
        new Date(),
        fullName ?? "",
        profilePicture ?? null
      )
    );
 
    if (created.id === 0) return new AuthUserDto();
 
    return new AuthUserDto(created.id, created.gamerTag, created.role);
  }
}