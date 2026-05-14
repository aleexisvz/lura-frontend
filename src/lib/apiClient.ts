import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/storage";
import { ApiErrorPayload } from "@/types/api";

type RequestOptions = Omit<RequestInit, "body"> & {
  auth?: boolean;
  body?: unknown;
};

type UnauthorizedHandler = () => void;

export class ApiError extends Error {
  code: string;
  details: unknown;
  status: number;

  constructor(payload: ApiErrorPayload, status: number) {
    super(payload.message);
    this.code = payload.code;
    this.details = payload.details;
    this.status = status;
  }
}

class ApiClient {
  private unauthorizedHandler: UnauthorizedHandler | null = null;

  setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
    this.unauthorizedHandler = handler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { auth = true, body, headers, ...rest } = options;
    const token = getToken();
    const finalHeaders = new Headers(headers);

    if (auth && token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }

    const isFormData = body instanceof FormData;
    if (body && !isFormData) {
      finalHeaders.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: finalHeaders,
      body: body
        ? isFormData
          ? body
          : JSON.stringify(body)
        : undefined
    });

    if (response.status === 401 && this.unauthorizedHandler) {
      this.unauthorizedHandler();
    }

    if (!response.ok) {
      throw new ApiError(await this.parseError(response), response.status);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async fetchBlob(path: string, options: RequestOptions = {}) {
    const { auth = true, headers, body: _ignoredBody, ...rest } = options;
    const token = getToken();
    const finalHeaders = new Headers(headers);

    if (auth && token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: finalHeaders
    });

    if (response.status === 401 && this.unauthorizedHandler) {
      this.unauthorizedHandler();
    }

    if (!response.ok) {
      throw new ApiError(await this.parseError(response), response.status);
    }

    return response.blob();
  }

  private async parseError(response: Response): Promise<ApiErrorPayload> {
    try {
      const parsed = (await response.json()) as Partial<ApiErrorPayload>;
      return {
        code: parsed.code ?? "UNKNOWN_ERROR",
        message: parsed.message ?? "Error inesperado",
        details: parsed.details ?? null
      };
    } catch {
      return {
        code: "NETWORK_ERROR",
        message: "No fue posible procesar la respuesta del servidor",
        details: null
      };
    }
  }
}

export const apiClient = new ApiClient();
