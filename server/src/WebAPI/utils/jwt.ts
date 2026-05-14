import jwt from "jsonwebtoken";
import { JwtPayload } from "../../Domain/types/JwtPayload";
const SECRET = process.env.JWT_SECRET || "super_secret_key";

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}