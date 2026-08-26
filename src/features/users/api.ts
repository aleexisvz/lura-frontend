import { apiClient } from "@/lib/apiClient";
import { pickNumber, pickString, unwrapObject } from "@/lib/adapters";
import type { BookReaderPreferences, Role, UserProfile } from "@/types/domain";

const MAX_DIMENSION = 768;
const OUTPUT_QUALITY = 0.84;

export async function getMe(): Promise<UserProfile> {
  const response = await apiClient.request<unknown>("/users/me");
  const source = unwrapObject(response);

  const role = pickString(source, ["role"], "USER");
  const profileImageUrl = pickString(source, ["profileImageUrl"], "");
  const createdAt = pickString(source, ["createdAt"], "");

  return {
    id: pickString(source, ["id"]),
    email: pickString(source, ["email"]),
    username: pickString(source, ["username"]),
    role: (role === "ADMIN" ? "ADMIN" : "USER") as Role,
    createdAt,
    profileImageUrl: profileImageUrl || null,
    readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
    readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
  };
}

export async function updateUsername(username: string): Promise<UserProfile> {
  const response = await apiClient.request<unknown>("/users/me", {
    method: "PATCH",
    body: { username },
  });
  const source = unwrapObject(response);

  const role = pickString(source, ["role"], "USER");
  const profileImageUrl = pickString(source, ["profileImageUrl"], "");
  const createdAt = pickString(source, ["createdAt"], "");

  return {
    id: pickString(source, ["id"]),
    email: pickString(source, ["email"]),
    username: pickString(source, ["username"]),
    role: (role === "ADMIN" ? "ADMIN" : "USER") as Role,
    createdAt,
    profileImageUrl: profileImageUrl || null,
    readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
    readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
  };
}

export async function uploadProfileImage(file: File) {
  const optimized = await optimizeImage(file);
  const formData = new FormData();
  formData.append("file", optimized, optimized.name);

  return apiClient.request<{ uploaded: boolean; profileImageUrl: string | null }>(
    "/users/me/upload-profile-image",
    {
      method: "POST",
      body: formData,
    }
  );
}

export async function getBookReaderPreferences(): Promise<BookReaderPreferences> {
  const response = await apiClient.request<unknown>("/users/me/book-reader-preferences");
  const source = unwrapObject(response);
  const mode = pickString(source, ["mode"], "PAGINATED");

  return {
    mode: mode === "SCROLL" ? "SCROLL" : "PAGINATED",
    theme: pickString(source, ["theme"], "light"),
    fontFamily: pickString(source, ["fontFamily"], "system-ui"),
    fontSize: Math.max(12, pickNumber(source, ["fontSize"], 18)),
    lineHeight: pickNumber(source, ["lineHeight"], 1.6),
    textAlign: pickString(source, ["textAlign"], "left"),
    pageWidth: pickNumber(source, ["pageWidth"], 720),
  };
}

export async function updateBookReaderPreferences(
  payload: BookReaderPreferences
): Promise<BookReaderPreferences> {
  const response = await apiClient.request<unknown>("/users/me/book-reader-preferences", {
    method: "PUT",
    body: payload,
  });

  const source = unwrapObject(response);
  const mode = pickString(source, ["mode"], "PAGINATED");

  return {
    mode: mode === "SCROLL" ? "SCROLL" : "PAGINATED",
    theme: pickString(source, ["theme"], "light"),
    fontFamily: pickString(source, ["fontFamily"], "system-ui"),
    fontSize: Math.max(12, pickNumber(source, ["fontSize"], 18)),
    lineHeight: pickNumber(source, ["lineHeight"], 1.6),
    textAlign: pickString(source, ["textAlign"], "left"),
    pageWidth: pickNumber(source, ["pageWidth"], 720),
  };
}

async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", OUTPUT_QUALITY);
    });

    if (!blob) {
      return file;
    }

    const basename = file.name.replace(/\.[^.]+$/, "") || "avatar";
    const optimizedFile = new File([blob], `${basename}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    // Keep the original when optimization does not reduce size.
    return optimizedFile.size < file.size ? optimizedFile : file;
  } catch {
    return file;
  }
}
