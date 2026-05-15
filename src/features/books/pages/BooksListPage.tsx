import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBooks } from "@/features/books/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";

function parseCategoriesInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function BooksListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategories = useMemo(
    () => parseCategoriesInput(searchParams.get("categories") ?? ""),
    [searchParams]
  );
  const [categoriesInput, setCategoriesInput] = useState(selectedCategories.join(", "));

  const booksQuery = useQuery({
    queryKey: ["books", selectedCategories.join(",")],
    queryFn: () => getBooks({ categories: selectedCategories }),
  });

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const categories = parseCategoriesInput(categoriesInput);
    const next = new URLSearchParams(searchParams);
    if (categories.length > 0) {
      next.set("categories", categories.join(","));
    } else {
      next.delete("categories");
    }
    setSearchParams(next);
  };

  return (
    <section className="grid">
      <h1>Books</h1>
      <form onSubmit={applyFilter} className="card form-grid">
        <label>
          Categorías (separadas por coma)
          <input
            value={categoriesInput}
            onChange={(event) => setCategoriesInput(event.target.value)}
            placeholder="fantasia, historia"
          />
        </label>
        <button type="submit">Aplicar filtro</button>
      </form>

      {selectedCategories.length > 0 && (
        <div className="split-row">
          {selectedCategories.map((category) => (
            <span key={category} className="chip">
              {category}
            </span>
          ))}
        </div>
      )}

      {booksQuery.isLoading && <Loading />}
      {booksQuery.isError && <ErrorBox error={booksQuery.error} />}

      <div className="grid grid-2">
        {booksQuery.data?.map((book) => (
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
              <p className="muted-text">Categorías: {book.categories.join(", ")}</p>
            )}
            <Link to={`/books/${book.id}`}>Ver detalle</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
