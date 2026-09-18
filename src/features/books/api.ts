import { apiClient } from "@/lib/apiClient";
import {
  isRecord,
  pickNumber,
  pickString,
  pickStringArray,
  unwrapArray,
  unwrapObject,
} from "@/lib/adapters";
import type {
  Book,
  BookProgress,
  BookRankingItem,
  BookReadManifest,
  BookReaderPreferences,
  BookSpineItem,
  BookTocItem,
  RecentReader,
  Tag,
} from "@/types/domain";

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
        scope: pickString(tag, ["scope"], "BOOK") as Tag["scope"],
        name: pickString(tag, ["name"]),
        slug: pickString(tag, ["slug"]),
      };
    })
    .filter((tag): tag is Tag => Boolean(tag?.id && tag?.name));
}

function adaptBook(value: unknown): Book {
  const source = unwrapObject(value);
  const tags = adaptTags(source);
  const categories = pickStringArray(source, ["categories"]);
  const rawStatus = pickString(source, ["readerStatus"]);
  const readerStatus = rawStatus === "FAILED" ? "FAILED" : "READY";

  return {
    id: pickString(source, ["id", "bookId"]),
    title: pickString(source, ["title", "name"], "Untitled book"),
    author: pickString(source, ["author"]) || null,
    description: pickString(source, ["description", "summary"]) || null,
    tags,
    categories: categories.length > 0 ? categories : tags.map((tag) => tag.name),
    coverUrl: pickString(source, ["coverUrl"]) || null,
    epubUrl: pickString(source, ["epubUrl"]) || null,
    hasEpub: source.hasEpub === true || Boolean(pickString(source, ["epubUrl"])),
    language: pickString(source, ["language"]) || null,
    readingDirection: pickString(source, ["readingDirection"], "DEFAULT") as Book["readingDirection"],
    readerStatus: readerStatus as Book["readerStatus"],
    processingError: pickString(source, ["processingError"]) || null,
  };
}

function adaptPreferences(value: unknown): BookReaderPreferences {
  const source = unwrapObject(value);
  const mode = pickString(source, ["mode"], "PAGINATED");
  return {
    mode: mode === "SCROLL" ? "SCROLL" : "PAGINATED",
    theme: pickString(source, ["theme"], "light"),
    fontFamily: pickString(source, ["fontFamily"], "system-ui"),
    fontSize: pickNumber(source, ["fontSize"], 18),
    lineHeight: pickNumber(source, ["lineHeight"], 1.6),
    textAlign: pickString(source, ["textAlign"], "left"),
    pageWidth: pickNumber(source, ["pageWidth"], 720),
  };
}

function adaptSpineItem(value: unknown): BookSpineItem {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id"]),
    sectionId: pickString(source, ["sectionId"]),
    href: pickString(source, ["href"]),
    mediaType: pickString(source, ["mediaType"]),
    label: pickString(source, ["label"], "Section"),
    order: pickNumber(source, ["order"], 0),
  };
}

function adaptTocItem(value: unknown): BookTocItem {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id"]),
    label: pickString(source, ["label"], "Section"),
    href: pickString(source, ["href"]),
    sectionId: pickString(source, ["sectionId"]) || null,
    anchor: pickString(source, ["anchor"]) || null,
    order: pickNumber(source, ["order"], 0),
  };
}

type BooksFilters = {
  tagIds?: string[];
};

export async function getBooks(filters: BooksFilters = {}) {
  const tagIds = filters.tagIds?.filter(Boolean) ?? [];
  const query = tagIds.length > 0 ? `?tagIds=${encodeURIComponent(tagIds.join(","))}` : "";
  const response = await apiClient.request<unknown>(`/books${query}`);
  return unwrapArray(response).map(adaptBook);
}

export async function getBookById(bookId: string) {
  const response = await apiClient.request<unknown>(`/books/${bookId}`);
  return adaptBook(response);
}

export async function getBookReadManifest(bookId: string): Promise<BookReadManifest> {
  const response = await apiClient.request<unknown>(`/books/${bookId}/read-manifest`);
  const source = unwrapObject(response);
  return {
    book: adaptBook(source.book),
    readingDirection: pickString(source, ["readingDirection"], "DEFAULT") as BookReadManifest["readingDirection"],
    resourcesBaseUrl: pickString(source, ["resourcesBaseUrl"]),
    epubUrl: pickString(source, ["epubUrl"]),
    toc: unwrapArray(source.toc).map(adaptTocItem),
    spine: unwrapArray(source.spine).map(adaptSpineItem),
    defaultPreferences: adaptPreferences(source.defaultPreferences),
  };
}

export async function getBookFileBlob(bookId: string) {
  return apiClient.fetchBlob(`/books/${bookId}/file`);
}

export async function getBookProgress(bookId: string): Promise<BookProgress | null> {
  let localProgress: BookProgress | null = null;
  try {
    const raw = localStorage.getItem(`lura_book_progress_${bookId}`);
    if (raw) {
      localProgress = JSON.parse(raw);
    } else {
      const legacyCfi = localStorage.getItem(`lura_book_cfi_${bookId}`);
      const legacyPage = localStorage.getItem(`lura_book_page_${bookId}`);
      if (legacyCfi || legacyPage) {
        const pageNum = Number(legacyPage) || 1;
        localProgress = {
          bookId,
          spineIndex: 0,
          sectionHref: "",
          locator: legacyCfi || "",
          progressPercent: 0,
          currentPage: pageNum,
          totalPages: 1,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch {}

  try {
    const response = await apiClient.request<unknown>(`/books/${bookId}/progress`);
    if (isRecord(response) && response.bookId) {
      const source = unwrapObject(response);
      const serverProgress: BookProgress = {
        bookId: pickString(source, ["bookId"]),
        spineIndex: pickNumber(source, ["spineIndex"], 0),
        sectionHref: pickString(source, ["sectionHref"]),
        locator: pickString(source, ["locator"]),
        progressPercent: pickNumber(source, ["progressPercent"], 0),
        currentPage: pickNumber(source, ["currentPage"], localProgress?.currentPage ?? 1),
        totalPages: pickNumber(source, ["totalPages"], localProgress?.totalPages ?? 1),
        title: pickString(source, ["title"], localProgress?.title || ""),
        coverUrl: pickString(source, ["coverUrl"], localProgress?.coverUrl || "") || null,
        chapterTitle: pickString(source, ["chapterTitle"], localProgress?.chapterTitle || ""),
        completed: source.completed === true || localProgress?.completed === true,
        completedAt: pickString(source, ["completedAt"], localProgress?.completedAt || "") || null,
        updatedAt: pickString(source, ["updatedAt"], new Date().toISOString()),
      };
      try {
        localStorage.setItem(`lura_book_progress_${bookId}`, JSON.stringify(serverProgress));
      } catch {}
      return serverProgress;
    }
  } catch {
    // Graceful fallback to local storage
  }

  return localProgress;
}

export async function saveBookProgress(
  bookId: string,
  payload: Omit<BookProgress, "bookId" | "updatedAt">
): Promise<BookProgress> {
  const existingRaw = localStorage.getItem(`lura_book_progress_${bookId}`);
  let existing: Partial<BookProgress> = {};
  if (existingRaw) {
    try {
      existing = JSON.parse(existingRaw);
    } catch {}
  }

  const rawTotal = payload.totalPages;
  const existingTotal =
    typeof existing.totalPages === "number" && existing.totalPages > 1
      ? existing.totalPages
      : undefined;

  // Protect against downgrading a valid book total (e.g. 835) with a transient chapter count (e.g. 15)
  const effectiveTotalPages =
    typeof rawTotal === "number" && rawTotal > 1
      ? existingTotal && existingTotal > rawTotal
        ? existingTotal
        : rawTotal
      : existingTotal;

  const currentP =
    typeof payload.currentPage === "number" && payload.currentPage >= 1
      ? payload.currentPage
      : (existing.currentPage ?? 1);
  const pct =
    payload.progressPercent !== undefined
      ? Math.min(100, Math.max(0, payload.progressPercent))
      : (existing.progressPercent ?? 0);

  const isCompleted =
    existing.completed === true ||
    payload.completed === true ||
    pct >= 100 ||
    (typeof effectiveTotalPages === "number" &&
      effectiveTotalPages > 1 &&
      currentP >= effectiveTotalPages &&
      pct >= 95);

  const fullProgress: BookProgress = {
    bookId,
    spineIndex: payload.spineIndex ?? 0,
    sectionHref: payload.sectionHref ?? "",
    locator: payload.locator ?? "",
    progressPercent: pct,
    currentPage: currentP,
    totalPages: effectiveTotalPages,
    title: payload.title || existing.title || undefined,
    coverUrl: payload.coverUrl !== undefined ? payload.coverUrl : (existing.coverUrl || null),
    chapterTitle: payload.chapterTitle || existing.chapterTitle || undefined,
    completed: isCompleted,
    completedAt: isCompleted ? (existing.completedAt || new Date().toISOString()) : undefined,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(`lura_book_progress_${bookId}`, JSON.stringify(fullProgress));
    if (payload.locator) {
      localStorage.setItem(`lura_book_cfi_${bookId}`, payload.locator);
    }
    if (payload.currentPage) {
      localStorage.setItem(`lura_book_page_${bookId}`, String(payload.currentPage));
    }
  } catch {}

  try {
    const response = await apiClient.request<unknown>(`/books/${bookId}/progress`, {
      method: "PUT",
      body: fullProgress,
    });
    if (isRecord(response) && response.bookId) {
      const source = unwrapObject(response);
      return {
        bookId: pickString(source, ["bookId"]),
        spineIndex: pickNumber(source, ["spineIndex"], payload.spineIndex ?? 0),
        sectionHref: pickString(source, ["sectionHref"], payload.sectionHref ?? ""),
        locator: pickString(source, ["locator"], payload.locator ?? ""),
        progressPercent: pickNumber(source, ["progressPercent"], payload.progressPercent ?? 0),
        currentPage: pickNumber(source, ["currentPage"], payload.currentPage ?? 1),
        totalPages: pickNumber(source, ["totalPages"], payload.totalPages ?? 1),
        title: pickString(source, ["title"], fullProgress.title || ""),
        coverUrl: pickString(source, ["coverUrl"], fullProgress.coverUrl || "") || null,
        chapterTitle: pickString(source, ["chapterTitle"], fullProgress.chapterTitle || ""),
        completed: source.completed === true || fullProgress.completed === true,
        completedAt: pickString(source, ["completedAt"], fullProgress.completedAt || "") || null,
        updatedAt: pickString(source, ["updatedAt"], fullProgress.updatedAt),
      };
    }
  } catch {
    // Non-blocking fire-and-forget fallback
  }

  return fullProgress;
}

export async function getBookReaderPreferences() {
  const response = await apiClient.request<unknown>("/users/me/book-reader-preferences");
  return adaptPreferences(response);
}

export async function updateBookReaderPreferences(payload: BookReaderPreferences) {
  const response = await apiClient.request<unknown>("/users/me/book-reader-preferences", {
    method: "PUT",
    body: payload,
  });
  return adaptPreferences(response);
}

export async function createBook(payload: {
  title: string;
  author?: string;
  description?: string;
  tagIds?: string[];
}) {
  return apiClient.request("/books", {
    method: "POST",
    body: payload,
  });
}

export async function updateBook(payload: {
  bookId: string;
  title?: string;
  author?: string;
  description?: string;
  tagIds?: string[];
}) {
  const { bookId, ...body } = payload;
  return apiClient.request(`/books/${bookId}`, {
    method: "PATCH",
    body,
  });
}

export async function uploadEpub(payload: { bookId: string; file: File }) {
  const formData = new FormData();
  formData.append("file", payload.file);

  return apiClient.request(`/books/${payload.bookId}/upload-epub`, {
    method: "POST",
    body: formData,
  });
}

export async function uploadBookCover(payload: { bookId: string; file: File }) {
  const formData = new FormData();
  formData.append("file", payload.file);

  return apiClient.request(`/books/${payload.bookId}/upload-cover`, {
    method: "POST",
    body: formData,
  });
}

export async function getBookReaders(bookId: string): Promise<RecentReader[]> {
  const response = await apiClient.request<unknown>(`/books/${bookId}/readers`);
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

export async function getBookRankings(): Promise<BookRankingItem[]> {
  const response = await apiClient.request<unknown>("/books/rankings");
  return unwrapArray(response).map((item) => {
    const source = unwrapObject(item);
    return {
      rank: pickNumber(source, ["rank"], 1),
      readersCount: pickNumber(source, ["readersCount", "readers", "count"], 0),
      book: adaptBook(source.book),
    };
  });
}
