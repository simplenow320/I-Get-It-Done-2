import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production (min 32 characters)");
  }
  
  console.warn("WARNING: Using auto-generated JWT_SECRET. Set JWT_SECRET env var for production.");
  return crypto.createHash("sha256").update(process.env.REPL_ID || "dev-fallback-" + Date.now()).digest("hex");
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = "7d";

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  const cookieToken = req.cookies?.authToken;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  
  req.user = payload;
  next();
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  
  next();
}

export function validateUserAccess(req: AuthenticatedRequest, paramName: string = "userId"): boolean {
  const paramUserId = req.params[paramName] || req.body?.[paramName];
  
  if (!req.user) {
    return false;
  }
  
  return req.user.userId === paramUserId;
}
