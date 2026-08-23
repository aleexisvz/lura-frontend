import { apiClient } from "@/lib/apiClient";
import { API_BASE_URL } from "@/lib/config";
import { getToken } from "@/lib/storage";
import {
  pickNumber,
  pickString,
  unwrapArray,
  unwrapObject
} from "@/lib/adapters";
import { ContinueReadingItem, ReadingStats, RecentSeriesResponse } from "@/types/domain";

export async function getContinueReading(): Promise<ContinueReadingItem[]> {
  const response = await apiClient.request<unknown>("/users/me/continue-reading");
  return unwrapArray(response).map((entry) => {
    const source = unwrapObject(entry);
    const contentType = pickString(source, ["contentType"], "MANGA");
    return {
      contentType: contentType === "BOOK" ? "BOOK" : "MANGA",
      bookId: pickString(source, ["bookId"]),
      title: pickString(source, ["title"]),
      chapterLabel: pickString(source, ["chapterLabel", "sectionLabel"]),
      mangaId: pickString(source, ["mangaId", "id"]),
      volumeId: pickString(source, ["volumeId"]),
      pageNumber: pickNumber(source, ["pageNumber", "currentPage", "page"], 1),
      mangaTitle: pickString(source, ["mangaTitle", "title"]),
      volumeTitle: pickString(source, ["volumeTitle", "chapterLabel", "volumeName"], ""),
      volumeNumber: pickNumber(source, ["volumeNumber", "chapterNumber"], 0),
      totalPages: pickNumber(source, ["totalPages", "pagesCount", "pageCount"], 0),
      progressPercent: pickNumber(source, ["progressPercent", "progress"], 0),
      coverUrl: pickString(source, ["coverUrl", "volumeCoverUrl"], "") || null,
      updatedAt: pickString(source, ["updatedAt"]),
    };
  });
}

export async function getReadingStats(): Promise<ReadingStats> {
  const response = await apiClient.request<unknown>("/users/me/reading-stats");
  const source = unwrapObject(response);

  return {
    totalSessions: pickNumber(source, ["totalSessions", "sessions"], 0),
    totalMinutes: pickNumber(source, ["totalMinutes", "minutes"], 0),
    totalSeconds: pickNumber(source, ["totalSeconds", "seconds"], 0),
    totalPagesRead: pickNumber(source, ["totalPagesRead", "pagesRead"], 0),
    totalVolumesRead: pickNumber(source, ["totalVolumesRead", "volumesRead"], 0),
    totalChaptersRead: pickNumber(source, ["totalChaptersRead", "chaptersRead"], 0),
    totalMangasRead: pickNumber(source, ["totalMangasRead", "mangasRead"], 0),
    totalSeriesRead: pickNumber(source, ["totalSeriesRead", "seriesRead"], 0),
    totalBooksRead: pickNumber(source, ["totalBooksRead", "booksRead"], 0),
    readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
    readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
    xpInLevel: Math.max(0, pickNumber(source, ["xpInLevel"], 0)),
    xpToNextLevel: Math.max(1, pickNumber(source, ["xpToNextLevel"], 20)),
    xpProgressPercent: Math.max(0, Math.min(100, pickNumber(source, ["xpProgressPercent"], 0))),
    isHotWeekend: Boolean(source["isHotWeekend"]),
    xpMultiplier: pickNumber(source, ["xpMultiplier"], 1),
    activeXpEvent: pickString(source, ["activeXpEvent"]) || null,
    xpPerMinute: pickNumber(source, ["xpPerMinute"], 2),
  };
}

export async function getRecentSeries(limit = 12): Promise<RecentSeriesResponse> {
  const response = await apiClient.request<unknown>(`/users/me/recent-series?limit=${limit}`);
  const source = unwrapObject(response);

  const mapRecentItems = (value: unknown) =>
    unwrapArray(value).map((item) => {
      const entry = unwrapObject(item);
      return {
        contentId: pickString(entry, ["contentId", "id"]),
        title: pickString(entry, ["title"], "Sin titulo"),
        coverUrl: pickString(entry, ["coverUrl"], "") || null,
        lastStartedAt: pickString(entry, ["lastStartedAt"], ""),
      };
    });

  return {
    manga: mapRecentItems(source.manga),
    books: mapRecentItems(source.books),
  };
}

export async function startReadingSession(payload: { contentType: "MANGA" | "BOOK"; contentId: string }) {
  const response = await apiClient.request<unknown>("/reading/sessions/start", {
    method: "POST",
    body: payload,
  });

  const source = unwrapObject(response);
  return pickString(source, ["sessionId", "id"]);
}

export async function startMangaReadingSession(payload: {
  mangaId: string;
  volumeId: string;
  pageNumber: number;
}) {
  return startReadingSession({
    contentType: "MANGA",
    contentId: payload.mangaId,
  });
}

export async function startBookReadingSession(bookId: string) {
  return startReadingSession({
    contentType: "BOOK",
    contentId: bookId,
  });
}

export async function endReadingSession(sessionId: string) {
  return apiClient.request(`/reading/sessions/${sessionId}/end`, {
    method: "POST"
  });
}

export function endReadingSessionKeepalive(sessionId: string) {
  if (!sessionId) {
    return;
  }

  const headers = new Headers();
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  void fetch(`${API_BASE_URL}/reading/sessions/${sessionId}/end`, {
    method: "POST",
    credentials: "include",
    headers,
    keepalive: true,
  }).catch(() => {
    // no-op: this is best-effort cleanup during page lifecycle events
  });
}
