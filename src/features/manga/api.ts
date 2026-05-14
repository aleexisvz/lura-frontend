import { apiClient } from "@/lib/apiClient";
import {
  isRecord,
  pickNumber,
  pickString,
  unwrapArray,
  unwrapObject
} from "@/lib/adapters";
import { Manga, MangaPage, MangaProgress, Volume } from "@/types/domain";

function adaptManga(value: unknown): Manga {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id", "mangaId"]),
    title: pickString(source, ["title", "name"], "Untitled manga"),
    description: pickString(source, ["description", "summary"])
  };
}

function adaptVolume(value: unknown): Volume {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id", "volumeId"]),
    title: pickString(source, ["title", "name"], "Volume"),
    number: pickNumber(source, ["number", "index"], 0)
  };
}

function adaptPage(value: unknown): MangaPage {
  const source = unwrapObject(value);
  return {
    pageNumber: pickNumber(source, ["index", "pageNumber", "page", "number"], 1),
    imageUrl: pickString(source, ["imageUrl", "image_url", "url"])
  };
}

export async function getMangaList() {
  const response = await apiClient.request<unknown>("/manga");
  return unwrapArray(response).map(adaptManga);
}

export async function getMangaById(mangaId: string) {
  const response = await apiClient.request<unknown>(`/manga/${mangaId}`);
  return adaptManga(response);
}

export async function getVolumes(mangaId: string) {
  const response = await apiClient.request<unknown>(`/manga/${mangaId}/volumes`);
  return unwrapArray(response).map(adaptVolume);
}

export async function getPages(mangaId: string, volumeId: string) {
  const response = await apiClient.request<unknown>(
    `/manga/${mangaId}/volumes/${volumeId}/pages`
  );
  const raw = isRecord(response) && Array.isArray((response as Record<string, unknown>).pages)
    ? (response as Record<string, unknown>).pages
    : unwrapArray(response);
  const pages = (raw as unknown[]).map(adaptPage);
  return pages.sort((a, b) => a.pageNumber - b.pageNumber);
}

export async function getPageImageBlob(
  mangaId: string,
  volumeId: string,
  pageNumber: number
) {
  return apiClient.fetchBlob(
    `/manga/${mangaId}/volumes/${volumeId}/pages/${pageNumber}/image`
  );
}

export async function getProgress(mangaId: string): Promise<MangaProgress | null> {
  const response = await apiClient.request<unknown>(`/manga/${mangaId}/progress`);
  const source = unwrapObject(response);
  if (!Object.keys(source).length) {
    return null;
  }
  return {
    mangaId,
    volumeId: pickString(source, ["volumeId"], ""),
    pageNumber: pickNumber(source, ["pageNumber", "currentPage", "page"], 1),
    completed: source.completed === true,
  };
}

export async function saveProgress(payload: {
  mangaId: string;
  volumeId: string;
  pageNumber: number;
}) {
  const { mangaId, volumeId, pageNumber } = payload;
  return apiClient.request(`/manga/${mangaId}/progress`, {
    method: "POST",
    body: { volumeId, page: pageNumber }
  });
}

export async function getVolumeCompletion(mangaId: string, volumeId: string): Promise<{ completed: boolean; completedAt: string | null }> {
  const response = await apiClient.request<unknown>(`/manga/${mangaId}/volumes/${volumeId}/complete`);
  const source = unwrapObject(response);
  return {
    completed: source.completed === true,
    completedAt: typeof source.completedAt === "string" ? source.completedAt : null,
  };
}

export async function markVolumeCompleted(mangaId: string, volumeId: string) {
  return apiClient.request(`/manga/${mangaId}/volumes/${volumeId}/complete`, {
    method: "POST",
  });
}

export async function resetVolumeCompletion(mangaId: string, volumeId: string) {
  return apiClient.request(`/manga/${mangaId}/volumes/${volumeId}/complete`, {
    method: "DELETE",
  });
}

export async function createManga(payload: { title: string; description?: string }) {
  return apiClient.request("/manga", {
    method: "POST",
    body: payload
  });
}

export async function createVolume(payload: {
  mangaId: string;
  title: string;
  number?: number;
}) {
  const { mangaId, ...body } = payload;
  return apiClient.request(`/manga/${mangaId}/volumes`, {
    method: "POST",
    body
  });
}

export async function uploadVolumePages(payload: {
  mangaId: string;
  volumeId: string;
  files: File[];
}) {
  const formData = new FormData();
  payload.files.forEach((file) => formData.append("files", file));

  return apiClient.request(
    `/manga/${payload.mangaId}/volumes/${payload.volumeId}/upload`,
    {
      method: "POST",
      body: formData
    }
  );
}
