import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "super_secret_key";

export function generateToken(payload: any): string {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}