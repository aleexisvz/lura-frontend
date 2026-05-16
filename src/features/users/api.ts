import { apiClient } from "@/lib/apiClient";
import { pickString, unwrapObject } from "@/lib/adapters";
import type { Role, UserProfile } from "@/types/domain";

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
