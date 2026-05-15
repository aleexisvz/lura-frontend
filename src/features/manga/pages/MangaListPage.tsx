import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getMangaList, getVolumes } from "@/features/manga/api";
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

export function MangaListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategories = useMemo(
    () => parseCategoriesInput(searchParams.get("categories") ?? ""),
    [searchParams]
  );
  const [categoriesInput, setCategoriesInput] = useState(selectedCategories.join(", "));

  const mangaQuery = useQuery({
    queryKey: ["manga-list", selectedCategories.join(",")],
    queryFn: () => getMangaList({ categories: selectedCategories }),
  });

  const mangaList = mangaQuery.data ?? [];
  const volumesQueries = useQueries({
    queries: mangaList.map((manga) => ({
      queryKey: ["manga-volumes", manga.id],
      queryFn: () => getVolumes(manga.id),
      staleTime: 1000 * 60 * 5,
    })),
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
    <section className="manga-page grid">
      <header className="manga-header">
        <h1>Manga</h1>
        <p className="manga-subtitle">Filtrá por categorías y navegá volúmenes/páginas.</p>
      </header>

      <form onSubmit={applyFilter} className="manga-filter-box form-grid">
        <label>
          Categorías (separadas por coma)
          <input
            value={categoriesInput}
            onChange={(event) => setCategoriesInput(event.target.value)}
            placeholder="accion, romance, seinen"
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

      {mangaQuery.isLoading && <Loading text="Cargando catálogo..." />}
      {mangaQuery.isError && <ErrorBox error={mangaQuery.error} />}

      <div className="manga-poster-grid">
        {mangaList.map((item, index) => {
          const volumeCount = volumesQueries[index]?.data?.length ?? 0;
          const demoType = index % 2 === 0 ? "MANGA" : "MANHWA";
          const demoStatus = index % 3 === 0 ? "FINALIZADO" : "EN EMISIÓN";

          return (
            <Link
              key={item.id}
              to={`/manga/${item.id}`}
              className="manga-poster-card"
              aria-label={`Abrir ${item.title}`}
            >
              {item.coverUrl ? (
                <ProtectedImage
                  path={item.coverUrl}
                  alt={`Portada de ${item.title}`}
                  className="manga-poster-image"
                />
              ) : (
                <div className="manga-poster-image manga-poster-fallback">Sin portada</div>
              )}

              <span className="manga-volume-badge">{volumeCount}</span>

              <div className="manga-hover-layer">
                <h3 className="manga-poster-title">{item.title}</h3>
                <div className="manga-hover-tags">
                  <span className="manga-tag manga-tag-type">{demoType}</span>
                  <span className="manga-tag manga-tag-status">{demoStatus}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
