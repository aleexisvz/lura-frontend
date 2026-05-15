import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBooks } from "@/features/books/api";
import { getTags } from "@/features/tags/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getDemoStatus } from "@/lib/demoFilters";

type BooksFilterState = {
  status: "ALL" | "FINALIZADO" | "EN_EMISION";
  tagIds: string[];
};

function parseFilterParams(searchParams: URLSearchParams): BooksFilterState {
  const statusValue = searchParams.get("status");
  const tagIds = (searchParams.get("tagIds") ?? "")
    .split(",")
    .map((tagId) => tagId.trim())
    .filter(Boolean);

  return {
    status: statusValue === "FINALIZADO" || statusValue === "EN_EMISION" ? statusValue : "ALL",
    tagIds,
  };
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
      const status = getDemoStatus(book.id);
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      return true;
    });
  }, [booksQuery.data, statusFilter]);

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();

    if (statusFilter !== "ALL") next.set("status", statusFilter);
    if (selectedTagIds.length > 0) next.set("tagIds", selectedTagIds.join(","));

    setSearchParams(next);
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  return (
    <section className="grid">
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
          <span>Estado</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as BooksFilterState["status"])}
          >
            <option value="ALL">Seleccionar</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="EN_EMISION">En emision</option>
          </select>
        </label>

        <button type="submit" className="filter-submit">
          Filtrar
        </button>
      </form>

      {tagsQuery.isError && <ErrorBox error={tagsQuery.error} />}
      {booksQuery.isLoading && <Loading />}
      {booksQuery.isError && <ErrorBox error={booksQuery.error} />}

      <div className="grid grid-2">
        {filteredBooks.map((book) => (
          <article key={book.id} className="card">
            {book.coverUrl ? (
              <ProtectedImage
                path={book.coverUrl}
                alt={`Portada de ${book.title}`}
                className="cover-image"
              />
            ) : (
              <div className="cover-placeholder">Sin portada</div>
            )}
            <h3>{book.title}</h3>
            {book.author && <p className="muted-text">Autor: {book.author}</p>}
            {book.categories.length > 0 && (
              <p className="muted-text">Generos: {book.categories.join(", ")}</p>
            )}
            <Link to={`/books/${book.id}`}>Ver detalle</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
