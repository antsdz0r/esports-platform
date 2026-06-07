import { Request, Response, Router } from "express";
import { IAuthService } from "../../Domain/services/auth/IAuthService";
import { generateToken } from "../utils/jwt";
import { validateLogin } from "../validators/auth/validateLogin";
import { validateRegister } from "../validators/auth/validateRegister";
import { authenticate } from "../../Middlewares/authentification/AuthMiddleware";
import { IAuditLogService } from "../../Domain/services/audit_logs/IAuditLogService";

export class AuthController {
  private readonly router: Router;

  public constructor(
  private readonly authService: IAuthService,
  private readonly auditLogService: IAuditLogService,
) {
  this.router = Router();
  this.initializeRoutes();
}

  private initializeRoutes(): void {

    this.router.post("/auth/login", this.login.bind(this));
    this.router.post("/auth/register", this.register.bind(this));
    this.router.post("/auth/logout", authenticate, this.logout.bind(this));
  }

  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { gamerTag, password } = req.body;

      if (!gamerTag || !password) {
        res.status(400).json({ success: false, message: "gamerTag i password su obavezni." });
        return;
      }

      const validation = validateLogin(gamerTag, password);
      if (!validation.valid) {
          res.status(400).json({ success: false, message: validation.message });
          return;
      }


      const result = await this.authService.login(gamerTag, password);

      if (result.id === 0) {
        res.status(401).json({ success: false, message: "Neispravni kredencijali ili nalog nije aktivan." });
        return;
      }

      const token = generateToken({
        id: result.id,
        gamerTag: result.gamerTag,
        role: result.role,
      });

      const loginIp = req.socket.remoteAddress ?? null;
      await this.auditLogService.log(result.id, "LOGIN", "user", result.id, `Korisnik ${result.gamerTag} se prijavio`, loginIp);

      res.status(200).json({
        success: true,
        message: "Uspešna prijava.",
        data: {
          id: result.id,
          gamerTag: result.gamerTag,
          role: result.role,
          token,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Greška pri prijavi.", error: err });
    }
  }

  private async register(req: Request, res: Response): Promise<void> {
    try {
      const { gamerTag, email, password,fullName, profilePicture } = req.body;

      if (!gamerTag || !email || !password) {
        res.status(400).json({
          success: false,
          message: "gamerTag, email i password su obavezni.",
        });
        return;
      }


      const validation = validateRegister(gamerTag, email, password);
      if (!validation.valid) {
        res.status(400).json({ success: false, message: validation.message });
        return;
      }



      const result = await this.authService.register(
          gamerTag,
          email,
          password,
          fullName,
          profilePicture
        );

      if (result.id === 0) {
        res.status(400).json({
          success: false,
          message: "Registracija nije uspela. Gamer tag ili email već postoje.",
        });
        return;
      }

      const token = generateToken({
        id: result.id,
        gamerTag: result.gamerTag,
        role: result.role,
      });

      const registerIp = req.socket.remoteAddress ?? null;
      await this.auditLogService.log(result.id, "REGISTER", "user", result.id, `Nov korisnik registrovan: ${result.gamerTag}`, registerIp);

      res.status(201).json({
        success: true,
        message: "Uspešna registracija.",
        data: {
          id: result.id,
          gamerTag: result.gamerTag,
          role: result.role,
          token,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Greška pri registraciji.", error: err });
    }
  }

  private async logout(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const ip = req.socket.remoteAddress ?? null;
    await this.auditLogService.log(userId, "LOGOUT", "user", userId, `Korisnik ${req.user!.gamerTag} se odjavio`, ip);
    res.json({ success: true, message: "Uspešna odjava." });
  } catch {
    res.status(500).json({ success: false, message: "Greška pri odjavi." });
  }
}

  public getRouter(): Router {
    return this.router;
  }
}
