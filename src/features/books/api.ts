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
  BookReadManifest,
  BookReaderPreferences,
  BookSpineItem,
  BookTocItem,
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
    hasEpub: source.hasEpub === true,
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
  const response = await apiClient.request<unknown>(`/books/${bookId}/progress`);
  if (!isRecord(response)) {
    return null;
  }

  const source = unwrapObject(response);
  if (!source.bookId) {
    return null;
  }

  return {
    bookId: pickString(source, ["bookId"]),
    spineIndex: pickNumber(source, ["spineIndex"], 0),
    sectionHref: pickString(source, ["sectionHref"]),
    locator: pickString(source, ["locator"]),
    progressPercent: pickNumber(source, ["progressPercent"], 0),
    updatedAt: pickString(source, ["updatedAt"]),
  };
}

export async function saveBookProgress(
  bookId: string,
  payload: Omit<BookProgress, "bookId" | "updatedAt">
) {
  const response = await apiClient.request<unknown>(`/books/${bookId}/progress`, {
    method: "PUT",
    body: payload,
  });
  const source = unwrapObject(response);
  return {
    bookId: pickString(source, ["bookId"]),
    spineIndex: pickNumber(source, ["spineIndex"], 0),
    sectionHref: pickString(source, ["sectionHref"]),
    locator: pickString(source, ["locator"]),
    progressPercent: pickNumber(source, ["progressPercent"], 0),
    updatedAt: pickString(source, ["updatedAt"]),
  } satisfies BookProgress;
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
