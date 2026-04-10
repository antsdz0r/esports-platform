import { UserRole } from "../enums/UserRole";

export class User {
  constructor(
    public id: number        = 0,
    public gamerTag: string  = "",
    public email: string     = "",
    public role: UserRole    = UserRole.PLAYER,
    public passwordHash: string = "",
    public fullName: string   = "",
    public profilePicture: string | null = null,
   // public isActive: number  = 1,
  ) {}
}
