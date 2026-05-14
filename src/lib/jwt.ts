import { Role } from "@/types/domain";

type JwtPayload = {
  exp?: number;
  role?: string;
  email?: string;
  sub?: string;
  [key: string]: unknown;
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(normalized);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = decodeBase64Url(parts[1]);
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export function tokenIsExpired(token: string) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

export function extractRoleFromToken(token: string): Role {
  const payload = decodeJwtPayload(token);
  return payload?.role === "ADMIN" ? "ADMIN" : "USER";
}

