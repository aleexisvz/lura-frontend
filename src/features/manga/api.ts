import { apiClient } from "@/lib/apiClient";
import {
  isRecord,
  pickNumber,
  pickString,
  pickStringArray,
  unwrapArray,
  unwrapObject,
} from "@/lib/adapters";
import { Manga, MangaPage, MangaProgress, RecentReader, Tag, Volume } from "@/types/domain";

function adaptTags(source: Record<string, unknown>) {
  const tagsValue = source.tags;
  if (!Array.isArray(tagsValue)) {
    return [] as Tag[];
  }

  return tagsValue
    .map((tag) => {
      if (!isRecord(tag)) return null;
      return {
        id: pickString(tag, ["id"]),
        scope: pickString(tag, ["scope"], "MANGA") as Tag["scope"],
        name: pickString(tag, ["name"]),
        slug: pickString(tag, ["slug"]),
      };
    })
    .filter((tag): tag is Tag => Boolean(tag?.id && tag?.name));
}

function adaptManga(value: unknown): Manga {
  const source = unwrapObject(value);
  const tags = adaptTags(source);
  const categories = pickStringArray(source, ["categories"]);
  const latestVolume =
    source.latestVolume && typeof source.latestVolume === "object"
      ? adaptVolume(source.latestVolume)
      : null;
  const status = pickString(source, ["status"]) as Manga["status"];

  return {
    id: pickString(source, ["id", "mangaId"]),
    title: pickString(source, ["title", "name"], "Untitled manga"),
    titleKanji: pickString(source, ["titleKanji"]) || null,
    author: pickString(source, ["author"]) || null,
    description: pickString(source, ["description", "summary"]),
    tags,
    categories: categories.length > 0 ? categories : tags.map((tag) => tag.name),
    coverUrl: pickString(source, ["coverUrl"]) || null,
    status: status || "EN_EMISION",
    latestVolume,
    createdAt: pickString(source, ["createdAt"]),
  };
}

function adaptVolume(value: unknown): Volume {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id", "volumeId"]),
    mangaId: pickString(source, ["mangaId"]) || undefined,
    title: pickString(source, ["title", "name"], "Volume"),
    number: pickNumber(source, ["number", "index"], 0),
    status: pickString(source, ["status"]) as Volume["status"],
    pagesCount: pickNumber(source, ["pagesCount"], 0),
    coverUrl: pickString(source, ["coverUrl"]) || null,
  };
}

function adaptPage(value: unknown): MangaPage {
  const source = unwrapObject(value);
  return {
    pageNumber: pickNumber(source, ["index", "pageNumber", "page", "number"], 1),
    imageUrl: pickString(source, ["imageUrl", "image_url", "url"]),
  };
}

type MangaListFilters = {
  tagIds?: string[];
};

export async function getMangaList(filters: MangaListFilters = {}) {
  const tagIds = filters.tagIds?.filter(Boolean) ?? [];
  const query =
    tagIds.length > 0
      ? `?tagIds=${encodeURIComponent(tagIds.join(","))}`
      : "";
  const response = await apiClient.request<unknown>(`/manga${query}`);
  return unwrapArray(response).map(adaptManga);
}

export async function getFeaturedManga(): Promise<Manga[]> {
  const response = await apiClient.request<unknown>("/manga/featured");
  return unwrapArray(response).map(adaptManga);
}

export async function getRecentMangaUpdates(): Promise<Manga[]> {
  const response = await apiClient.request<unknown>("/manga/recent-updates");
  return unwrapArray(response).map(adaptManga);
}

export async function getMangaRankings() {
  const response = await apiClient.request<unknown>("/manga/rankings");
  return unwrapArray(response).map((item) => {
    const source = unwrapObject(item);
    return {
      rank: pickNumber(source, ["rank"], 1),
      readersCount: pickNumber(source, ["readersCount", "readers", "count"], 0),
      manga: adaptManga(source.manga),
    };
  });
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
  const response = await apiClient.request<unknown>(`/manga/${mangaId}/volumes/${volumeId}/pages`);
  const raw =
    isRecord(response) && Array.isArray((response as Record<string, unknown>).pages)
      ? (response as Record<string, unknown>).pages
      : unwrapArray(response);
  const pages = (raw as unknown[]).map(adaptPage);
  return pages.sort((a, b) => a.pageNumber - b.pageNumber);
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
    volumeCompleted: source.volumeCompleted === true,
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
    body: { volumeId, page: pageNumber },
  });
}

export async function getVolumeCompletion(
  mangaId: string,
  volumeId: string
): Promise<{ completed: boolean; completedAt: string | null }> {
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

export async function createManga(payload: {
  title: string;
  titleKanji?: string;
  author?: string;
  description?: string;
  tagIds?: string[];
}) {
  return apiClient.request("/manga", {
    method: "POST",
    body: payload,
  });
}

export async function updateManga(payload: {
  mangaId: string;
  title?: string;
  titleKanji?: string;
  author?: string;
  description?: string;
  tagIds?: string[];
}) {
  const { mangaId, ...body } = payload;
  return apiClient.request(`/manga/${mangaId}`, {
    method: "PATCH",
    body,
  });
}

export async function createVolume(payload: { mangaId: string; title?: string; number: number }) {
  const { mangaId, ...body } = payload;
  return apiClient.request(`/manga/${mangaId}/volumes`, {
    method: "POST",
    body,
  });
}

export async function updateVolume(payload: {
  mangaId: string;
  volumeId: string;
  title?: string;
  number?: number;
}) {
  const { mangaId, volumeId, ...body } = payload;
  return apiClient.request(`/manga/${mangaId}/volumes/${volumeId}`, {
    method: "PATCH",
    body,
  });
}

export async function uploadVolumePages(payload: {
  mangaId: string;
  volumeId: string;
  files: File[];
}) {
  const formData = new FormData();
  payload.files.forEach((file) => formData.append("files", file));

  return apiClient.request(`/manga/${payload.mangaId}/volumes/${payload.volumeId}/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function uploadMangaCover(payload: { mangaId: string; file: File }) {
  const formData = new FormData();
  formData.append("file", payload.file);

  return apiClient.request(`/manga/${payload.mangaId}/upload-cover`, {
    method: "POST",
    body: formData,
  });
}

export async function uploadVolumeCover(payload: {
  mangaId: string;
  volumeId: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("file", payload.file);

  return apiClient.request(`/manga/${payload.mangaId}/volumes/${payload.volumeId}/upload-cover`, {
    method: "POST",
    body: formData,
  });
}

export async function getMangaReaders(mangaId: string): Promise<RecentReader[]> {
  const response = await apiClient.request<unknown>(`/manga/${mangaId}/readers`);
  return unwrapArray(response).map((item) => {
    const source = unwrapObject(item);
    const profileImageUrl = pickString(source, ["profileImageUrl"], "");
    return {
      id: pickString(source, ["id"]),
      username: pickString(source, ["username"]),
      profileImageUrl: profileImageUrl || null,
      readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
      readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
      lastReadAt: pickString(source, ["lastReadAt"], ""),
    };
  });
}
