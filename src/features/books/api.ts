import { apiClient } from "@/lib/apiClient";
import { isRecord, pickString, pickStringArray, unwrapArray, unwrapObject } from "@/lib/adapters";
import { Book, Tag } from "@/types/domain";

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
  return {
    id: pickString(source, ["id", "bookId"]),
    title: pickString(source, ["title", "name"], "Untitled book"),
    author: pickString(source, ["author"]) || null,
    description: pickString(source, ["description", "summary"]) || null,
    tags,
    categories: categories.length > 0 ? categories : tags.map((tag) => tag.name),
    coverUrl: pickString(source, ["coverUrl"]) || null,
  };
}

type BooksFilters = {
  tagIds?: string[];
};

export async function getBooks(filters: BooksFilters = {}) {
  const tagIds = filters.tagIds?.filter(Boolean) ?? [];
  const query =
    tagIds.length > 0
      ? `?tagIds=${encodeURIComponent(tagIds.join(","))}`
      : "";
  const response = await apiClient.request<unknown>(`/books${query}`);
  return unwrapArray(response).map(adaptBook);
}

export async function getBookById(bookId: string) {
  const response = await apiClient.request<unknown>(`/books/${bookId}`);
  return adaptBook(response);
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
