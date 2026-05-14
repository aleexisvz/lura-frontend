import { apiClient } from "@/lib/apiClient";
import { pickString, unwrapArray, unwrapObject } from "@/lib/adapters";
import { Book } from "@/types/domain";

function adaptBook(value: unknown): Book {
  const source = unwrapObject(value);
  return {
    id: pickString(source, ["id", "bookId"]),
    title: pickString(source, ["title", "name"], "Untitled book"),
    author: pickString(source, ["author"]),
    description: pickString(source, ["description", "summary"])
  };
}

export async function getBooks() {
  const response = await apiClient.request<unknown>("/books");
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
}) {
  return apiClient.request("/books", {
    method: "POST",
    body: payload
  });
}

export async function uploadEpub(payload: { bookId: string; file: File }) {
  const formData = new FormData();
  formData.append("file", payload.file);

  return apiClient.request(`/books/${payload.bookId}/upload-epub`, {
    method: "POST",
    body: formData
  });
}

