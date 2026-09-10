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
  let serverItems: ContinueReadingItem[] = [];
  try {
    const response = await apiClient.request<unknown>("/users/me/continue-reading");
    serverItems = unwrapArray(response).map((entry) => {
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
  } catch {}

  // Merge any locally tracked book progress from localStorage for resilience
  const existingBookIds = new Set(
    serverItems.filter((i) => i.contentType === "BOOK" && i.bookId).map((i) => i.bookId)
  );

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("lura_book_progress_")) {
        const bookId = key.replace("lura_book_progress_", "");
        if (bookId && !existingBookIds.has(bookId)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const p = JSON.parse(raw);
            const isCompleted =
              p &&
              (p.completed === true ||
                Number(p.progressPercent) >= 100 ||
                (Number(p.totalPages) > 1 && Number(p.currentPage) >= Number(p.totalPages)));

            if (p && !isCompleted && (p.progressPercent > 0 || (p.currentPage ?? 1) > 1 || p.locator)) {
              const rawSection = p.chapterTitle
                ? p.chapterTitle
                : p.sectionHref
                ? p.sectionHref.split("#")[0].split("/").pop()?.replace(/\.(x?html|xml)$/i, "").replace(/[-_]/g, " ")
                : "Lectura en curso";
              // Format cleaner section title if it's just raw code like "c47" -> "Capítulo 47"
              const cleanSection = /^c(\d+)$/i.test(rawSection)
                ? `Capítulo ${rawSection.replace(/^c/i, "")}`
                : rawSection;

              serverItems.push({
                contentType: "BOOK",
                bookId,
                title: p.title || "Libro",
                mangaTitle: p.title || "Libro",
                chapterLabel: cleanSection || "Lectura en curso",
                mangaId: "",
                volumeId: "",
                pageNumber: Number(p.currentPage) || 1,
                totalPages: Number(p.totalPages) || 1,
                progressPercent: Number(p.progressPercent) || 0,
                coverUrl: p.coverUrl || null,
                updatedAt: p.updatedAt || new Date().toISOString(),
              });
              existingBookIds.add(bookId);
            }
          }
        }
      }
    }
  } catch {}

  // Self-heal any book items that lack coverUrl or title by querying /books
  const booksNeedingEnrichment = serverItems.filter(
    (item) =>
      item.contentType === "BOOK" &&
      item.bookId &&
      (!item.coverUrl || !item.title || item.title === "Book" || item.title === "Libro")
  );

  if (booksNeedingEnrichment.length > 0) {
    try {
      const allBooks = await apiClient.request<unknown>("/books").catch(() => null);
      if (allBooks) {
        const booksList = unwrapArray(allBooks).map(unwrapObject);
        const bookMap = new Map(
          booksList.map((b) => [
            pickString(b, ["id"]),
            {
              title: pickString(b, ["title"]),
              coverUrl: pickString(b, ["coverUrl"]) || null,
            },
          ])
        );

        for (const item of booksNeedingEnrichment) {
          if (item.bookId) {
            const b = bookMap.get(item.bookId);
            if (b) {
              if (b.title) {
                item.title = b.title;
                item.mangaTitle = b.title;
              }
              if (b.coverUrl) {
                item.coverUrl = b.coverUrl;
              }
              try {
                const raw = localStorage.getItem(`lura_book_progress_${item.bookId}`);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  parsed.title = b.title || parsed.title;
                  parsed.coverUrl = b.coverUrl || parsed.coverUrl;
                  localStorage.setItem(`lura_book_progress_${item.bookId}`, JSON.stringify(parsed));
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }

  return serverItems;
}

export async function getReadingStats(): Promise<ReadingStats> {
  const response = await apiClient.request<unknown>("/users/me/reading-stats");
  const source = unwrapObject(response);

  return {
    totalSessions: pickNumber(source, ["totalSessions", "sessions"], 0),
    totalMinutes: pickNumber(source, ["totalMinutes", "minutes"], 0),
    totalSeconds: pickNumber(source, ["totalSeconds", "seconds"], 0),
    mangaSeconds: pickNumber(source, ["mangaSeconds"], 0),
    bookSeconds: pickNumber(source, ["bookSeconds"], 0),
    totalPagesRead: pickNumber(source, ["totalPagesRead", "pagesRead"], 0),
    mangaPagesRead: pickNumber(source, ["mangaPagesRead"], 0),
    bookPagesRead: pickNumber(source, ["bookPagesRead"], 0),
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
