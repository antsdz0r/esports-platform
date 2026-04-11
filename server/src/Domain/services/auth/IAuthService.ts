import { AuthUserDto } from "../../DTOs/auth/AuthUserDto";
import { UserRole } from "../../enums/UserRole";

export interface IAuthService {
  login(gamerTag: string, password: string): Promise<AuthUserDto>;
  register(
    gamerTag: string,
    email: string,
    password: string,
    role?: UserRole,
    fullName?: string,
    profilePicture?: string | null,
  ): Promise<AuthUserDto>;
}
