import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getBooks, getBookProgress } from "@/features/books/api";
import { getTags } from "@/features/tags/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import type { Book } from "@/types/domain";

type BookAvailability = "ALL" | "READY" | "PROCESSING" | "FAILED" | "PENDING";

type BooksFilterState = {
  status: BookAvailability;
  tagIds: string[];
};

function parseFilterParams(searchParams: URLSearchParams): BooksFilterState {
  const statusValue = searchParams.get("status");
  const tagIds = (searchParams.get("tagIds") ?? "")
    .split(",")
    .map((tagId) => tagId.trim())
    .filter(Boolean);

  return {
    status:
      statusValue === "READY" ||
      statusValue === "PROCESSING" ||
      statusValue === "FAILED" ||
      statusValue === "PENDING"
        ? statusValue
        : "ALL",
    tagIds,
  };
}

function getBookAvailability(book: Book): Exclude<BookAvailability, "ALL"> {
  if (book.readerStatus === "READY") {
    return "READY";
  }

  if (book.readerStatus === "FAILED") {
    return "FAILED";
  }

  if (book.hasEpub) {
    return "PROCESSING";
  }

  return "PENDING";
}

function getAvailabilityLabel(status: Exclude<BookAvailability, "ALL">) {
  switch (status) {
    case "READY":
      return "Listo";
    case "FAILED":
      return "Error";
    case "PROCESSING":
      return "Procesando";
    default:
      return "Sin EPUB";
  }
}

function getAvailabilityBadgeClass(status: Exclude<BookAvailability, "ALL">) {
  switch (status) {
    case "READY":
      return "book-status-badge is-ready";
    case "FAILED":
      return "book-status-badge is-failed";
    case "PROCESSING":
      return "book-status-badge is-processing";
    default:
      return "book-status-badge is-pending";
  }
}

export function BooksListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo(() => parseFilterParams(searchParams), [searchParams]);
  const [statusFilter, setStatusFilter] = useState<BooksFilterState["status"]>(initialFilters.status);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialFilters.tagIds);

  const tagsQuery = useQuery({
    queryKey: ["tags", "BOOK"],
    queryFn: () => getTags("BOOK"),
  });

  const booksQuery = useQuery({
    queryKey: ["books", selectedTagIds.join(",")],
    queryFn: () => getBooks({ tagIds: selectedTagIds }),
  });

  const filteredBooks = useMemo(() => {
    const list = booksQuery.data ?? [];
    return list.filter((book) => {
      const availability = getBookAvailability(book);
      return statusFilter === "ALL" ? true : availability === statusFilter;
    });
  }, [booksQuery.data, statusFilter]);

  const progressQueries = useQueries({
    queries: filteredBooks.map((book) => ({
      queryKey: ["book-progress", book.id],
      queryFn: () => getBookProgress(book.id),
      staleTime: 1000 * 60 * 5,
      retry: false,
    })),
  });

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();

    if (statusFilter !== "ALL") {
      next.set("status", statusFilter);
    }

    if (selectedTagIds.length > 0) {
      next.set("tagIds", selectedTagIds.join(","));
    }

    setSearchParams(next);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  return (
    <section className="manga-page grid">
      <form onSubmit={applyFilter} className="filters-toolbar books-filters">
        <div className="filter-control">
          <span>Genero</span>
          <details className="filter-panel">
            <summary>
              {selectedTagIds.length > 0 ? `${selectedTagIds.length} seleccionados` : "Seleccionar"}
            </summary>
            <div className="tag-check-grid">
              {tagsQuery.data?.map((tag) => (
                <label key={tag.id} className="tag-check">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => handleTagToggle(tag.id)}
                  />
                  <span>{tag.name}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        <label className="filter-control">
          <span>Disponibilidad</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as BooksFilterState["status"])}
          >
            <option value="ALL">Seleccionar</option>
            <option value="READY">Listo para leer</option>
            <option value="PROCESSING">Procesando EPUB</option>
            <option value="PENDING">Sin EPUB</option>
            <option value="FAILED">Con error</option>
          </select>
        </label>

        <button type="submit" className="filter-submit">
          Filtrar
        </button>
      </form>

      {tagsQuery.isError && <ErrorBox error={tagsQuery.error} />}
      {booksQuery.isLoading && <Loading text="Cargando catalogo..." />}
      {booksQuery.isError && <ErrorBox error={booksQuery.error} />}

      {!booksQuery.isLoading && !booksQuery.isError && filteredBooks.length === 0 && (
        <article className="card">
          <h2>No encontramos books para esos filtros</h2>
          <p className="muted-text">Prueba con menos generos o cambia la disponibilidad seleccionada.</p>
        </article>
      )}

      <div className="book-poster-grid">
        {filteredBooks.map((book, index) => {
          const availability = getBookAvailability(book);
          const progress = progressQueries[index]?.data;
          const isCompleted = Boolean(
            progress &&
              (progress.completed === true ||
                progress.progressPercent >= 100 ||
                (progress.totalPages &&
                  progress.totalPages > 1 &&
                  progress.currentPage &&
                  progress.currentPage >= progress.totalPages))
          );
          const readingStatus =
            !progress || progress.progressPercent === 0
              ? "not-started"
              : isCompleted
              ? "completed"
              : "reading";

          return (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              className="book-poster-card"
              aria-label={`Abrir ${book.title}`}
            >
              {book.coverUrl ? (
                <ProtectedImage
                  path={book.coverUrl}
                  alt={`Portada de ${book.title}`}
                  className="book-poster-image"
                />
              ) : (
                <div className="book-poster-image book-poster-fallback">Sin portada</div>
              )}

              {availability !== "READY" && (
                <span className={getAvailabilityBadgeClass(availability)}>
                  {getAvailabilityLabel(availability)}
                </span>
              )}

              <div
                className={`book-hover-layer${
                  readingStatus === "reading"
                    ? " is-reading"
                    : readingStatus === "completed"
                    ? " is-completed"
                    : ""
                }`}
              >
                <h3 className="book-poster-title">{book.title}</h3>
                <p className="book-poster-subtitle">{book.author || "Autor desconocido"}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
