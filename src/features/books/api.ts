import { apiClient } from "@/lib/apiClient";
import { pickString, pickStringArray, unwrapArray, unwrapObject } from "@/lib/adapters";
import { Book } from "@/types/domain";

function adaptBook(value: unknown): Book {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id", "bookId"]),
    title: pickString(source, ["title", "name"], "Untitled book"),
    author: pickString(source, ["author"]) || null,
    description: pickString(source, ["description", "summary"]) || null,
    categories: pickStringArray(source, ["categories"]),
    coverUrl: pickString(source, ["coverUrl"]) || null,
  };
}

type BooksFilters = {
  categories?: string[];
};

export async function getBooks(filters: BooksFilters = {}) {
  const categories = filters.categories?.filter(Boolean) ?? [];
  const query =
    categories.length > 0
      ? `?categories=${encodeURIComponent(categories.join(","))}`
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
  categories?: string[];
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
  categories?: string[];
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
