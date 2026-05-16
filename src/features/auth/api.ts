import { apiClient } from "@/lib/apiClient";
import { isRecord } from "@/lib/adapters";

type AuthResponse = {
  token?: string;
  accessToken?: string;
  jwt?: string;
  access_token?: string;
  data?: {
    token?: string;
    accessToken?: string;
    jwt?: string;
    access_token?: string;
  };
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  username: string;
  password: string;
  role?: "USER" | "ADMIN";
};

function extractToken(data: AuthResponse) {
  const token =
    data.token ??
    data.accessToken ??
    data.jwt ??
    data.access_token ??
    data.data?.token ??
    data.data?.accessToken ??
    data.data?.jwt ??
    data.data?.access_token;

  if (!token) {
    throw new Error("El backend no devolvió un token JWT");
  }

  return token;
}

export async function login(payload: LoginPayload) {
  const result = await apiClient.request<AuthResponse | string>("/auth/login", {
    method: "POST",
    auth: false,
    body: payload
  });

  if (typeof result === "string") {
    return result;
  }

  return extractToken(result);
}

export async function promoteUser(email: string) {
  return apiClient.request<{ id: string; email: string; role: string }>(
    "/auth/promote",
    {
      method: "POST",
      auth: true,
      body: { email }
    }
  );
}

export async function register(payload: RegisterPayload) {
  const result = await apiClient.request<AuthResponse | Record<string, unknown>>(
    "/auth/register",
    {
      method: "POST",
      auth: false,
      body: payload
    }
  );

  if (typeof result === "string") {
    return result;
  }

  if (isRecord(result)) {
    try {
      return extractToken(result as AuthResponse);
    } catch {
      return login({ email: payload.email, password: payload.password });
    }
  }

  return login({ email: payload.email, password: payload.password });
}
