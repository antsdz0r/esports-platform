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
        res.status(400).json({ success: false, message: "gamerTag and password are required." });
        return;
      }

      const validation = validateLogin(gamerTag, password);
      if (!validation.valid) {
          res.status(400).json({ success: false, message: validation.message });
          return;
      }


      const result = await this.authService.login(gamerTag, password);

      if (result.id === 0) {
        res.status(401).json({ success: false, message: "Invalid credentials or the account is not active." });
        return;
      }

      const token = generateToken({
        id: result.id,
        gamerTag: result.gamerTag,
        role: result.role,
      });

      const loginIp = req.socket.remoteAddress ?? null;
      await this.auditLogService.log(result.id, "LOGIN", "user", result.id, `User ${result.gamerTag} logged in`, loginIp);

      res.status(200).json({
        success: true,
        message: "Logged in successfully.",
        data: {
          id: result.id,
          gamerTag: result.gamerTag,
          role: result.role,
          token,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Login failed.", error: err });
    }
  }

  private async register(req: Request, res: Response): Promise<void> {
    try {
      const { gamerTag, email, password,fullName, profilePicture } = req.body;

      if (!gamerTag || !email || !password) {
        res.status(400).json({
          success: false,
          message: "gamerTag, email and password are required.",
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
          message: "Registration failed. Gamer tag or email already exists.",
        });
        return;
      }

      const token = generateToken({
        id: result.id,
        gamerTag: result.gamerTag,
        role: result.role,
      });

      const registerIp = req.socket.remoteAddress ?? null;
      await this.auditLogService.log(result.id, "REGISTER", "user", result.id, `New user registered: ${result.gamerTag}`, registerIp);

      res.status(201).json({
        success: true,
        message: "Registered successfully.",
        data: {
          id: result.id,
          gamerTag: result.gamerTag,
          role: result.role,
          token,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Registration failed.", error: err });
    }
  }

  private async logout(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const ip = req.socket.remoteAddress ?? null;
    await this.auditLogService.log(userId, "LOGOUT", "user", userId, `User ${req.user!.gamerTag} logged out`, ip);
    res.json({ success: true, message: "Logged out successfully." });
  } catch {
    res.status(500).json({ success: false, message: "Logout failed." });
  }
}

  public getRouter(): Router {
    return this.router;
  }
}
