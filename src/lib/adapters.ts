export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function unwrapArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value)) {
    const candidateKeys = ["data", "items", "results", "list"];
    for (const key of candidateKeys) {
      const candidate = value[key];
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
  }

  return [];
}

export function unwrapObject(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    const candidateKeys = ["data", "item", "result"];
    for (const key of candidateKeys) {
      const candidate = value[key];
      if (isRecord(candidate)) {
        return candidate;
      }
    }

    return value;
  }

  return {};
}

export function pickString(
  source: Record<string, unknown>,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

export function pickNumber(
  source: Record<string, unknown>,
  keys: string[],
  fallback = 0
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

