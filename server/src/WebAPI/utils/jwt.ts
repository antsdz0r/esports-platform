import jwt from "jsonwebtoken";
import { JwtPayload } from "../../Domain/types/JwtPayload";

function requireSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET nije definisan u environment varijablama");
  }
  return secret;
}

const SECRET = requireSecret();

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}
