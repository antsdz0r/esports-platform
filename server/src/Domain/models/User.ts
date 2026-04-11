import { UserRole } from "../enums/UserRole";

export class User {
  constructor(
    public id: number        = 0,
    public gamerTag: string  = "",
    public email: string     = "",
    public role: UserRole    = UserRole.PLAYER,
    public isActive: boolean = true,
    public passwordHash: string = "",
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public fullName: string   = "",
    public profilePicture: string | null = null,
  ) {}
}
