import { Request, Response, Router } from "express";
import { IUserService } from "../../Domain/services/users/IUserService";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { authorize } from "../../Middlewares/authorization/AuthorizeMiddleware";
import { UserRole } from "../../Domain/enums/UserRole";
import { avatarUpload } from "../utils/upload";

export class UserController {
  private readonly router = Router();

  public constructor(
    private readonly userService: IUserService,
    private readonly auditLogService: IAuditLogService,
  ) {
    this.router.get("/users/me",         authenticate, this.getMe.bind(this));
    this.router.post("/users/me/avatar", authenticate, avatarUpload, this.uploadAvatar.bind(this));
    this.router.get("/users",            authenticate, authorize(UserRole.ADMIN), this.getAll.bind(this));
    this.router.get("/users/:id",        authenticate, authorize(UserRole.ADMIN), this.getById.bind(this));
    this.router.patch("/users/:id/deactivate", authenticate, authorize(UserRole.ADMIN), this.deactivate.bind(this));
    this.router.put("/users/:id/role",   authenticate, authorize(UserRole.ADMIN), this.changeRole.bind(this));
    this.router.get("/players",          authenticate, this.getPlayers.bind(this));
  }

  private async getMe(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.userService.getById(req.user!.id);
      if (user.id === 0) { res.status(404).json({ success: false, message: "Not found" }); return; }
      res.json({ success: true, data: {
        id: user.id,
        gamerTag: user.gamerTag,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      }});
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) { res.status(400).json({ success: false, message: "Fajl nije priložen" }); return; }
      const url = "/uploads/avatars/" + req.file.filename;
      const ok = await this.userService.updateProfilePicture(req.user!.id, url);
      if (!ok) { res.status(500).json({ success: false, message: "Greška pri snimanju" }); return; }
      res.json({ success: true, data: { profilePicture: url } });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.getAll();
      const safe = users.map(u => ({
        id: u.id,
        username: u.gamerTag,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
      }));
      res.status(200).json({ success: true, data: safe });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const user = await this.userService.getById(id);
      if (user.id === 0) { res.status(404).json({ success: false, message: "User not found" }); return; }
      res.status(200).json({ success: true, data: user });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const ok = await this.userService.deactivate(id);
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "DEACTIVATE_USER", "user", id, `Deaktiviran korisnik #${id}`, req.socket.remoteAddress ?? null);
      res.status(ok ? 200 : 500).json({ success: ok, message: ok ? "User deactivated" : "Failed" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async changeRole(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) { res.status(400).json({ success: false, message: "Invalid id" }); return; }
      const { role } = req.body;
      const validRoles = Object.values(UserRole);
      if (!role || !validRoles.includes(role)) { res.status(400).json({ success: false, message: "Neispravna uloga" }); return; }
      const ok = await this.userService.updateRole(id, role);
      if (ok) await this.auditLogService.log(req.user?.id ?? null, "CHANGE_ROLE", "user", id, `Promenjena uloga korisnika #${id} na ${role}`, req.socket.remoteAddress ?? null);
      res.status(ok ? 200 : 404).json({ success: ok, message: ok ? "Uloga promenjena" : "Korisnik nije pronađen" });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  private async getPlayers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.getAll();
      const safe = users.filter(u => u.isActive).map(u => ({ id: u.id, gamerTag: u.gamerTag, fullName: u.fullName }));
      res.status(200).json({ success: true, data: safe });
    } catch {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  public getRouter(): Router { return this.router; }
}
