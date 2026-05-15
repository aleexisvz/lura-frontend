import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getMangaList, getVolumes } from "@/features/manga/api";
import { getTags } from "@/features/tags/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getDemoMangaType, getDemoStatus } from "@/lib/demoFilters";

type MangaFilterState = {
  type: "ALL" | "MANGA" | "MANHWA";
  status: "ALL" | "FINALIZADO" | "EN_EMISION";
  tagIds: string[];
};

function parseFilterParams(searchParams: URLSearchParams): MangaFilterState {
  const typeValue = searchParams.get("type");
  const statusValue = searchParams.get("status");
  const tagIds = (searchParams.get("tagIds") ?? "")
    .split(",")
    .map((tagId) => tagId.trim())
    .filter(Boolean);

  return {
    type: typeValue === "MANGA" || typeValue === "MANHWA" ? typeValue : "ALL",
    status: statusValue === "FINALIZADO" || statusValue === "EN_EMISION" ? statusValue : "ALL",
    tagIds,
  };
}

export function MangaListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilters = useMemo(() => parseFilterParams(searchParams), [searchParams]);
  const [typeFilter, setTypeFilter] = useState<MangaFilterState["type"]>(initialFilters.type);
  const [statusFilter, setStatusFilter] = useState<MangaFilterState["status"]>(initialFilters.status);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialFilters.tagIds);

  const tagsQuery = useQuery({
    queryKey: ["tags", "MANGA"],
    queryFn: () => getTags("MANGA"),
  });

  const mangaQuery = useQuery({
    queryKey: ["manga-list", selectedTagIds.join(",")],
    queryFn: () => getMangaList({ tagIds: selectedTagIds }),
  });

  const filteredManga = useMemo(() => {
    const list = mangaQuery.data ?? [];
    return list.filter((item) => {
      const demoType = getDemoMangaType(item.id);
      const demoStatus = getDemoStatus(item.id);

      if (typeFilter !== "ALL" && demoType !== typeFilter) return false;
      if (statusFilter !== "ALL" && demoStatus !== statusFilter) return false;
      return true;
    });
  }, [mangaQuery.data, statusFilter, typeFilter]);

  const volumesQueries = useQueries({
    queries: filteredManga.map((manga) => ({
      queryKey: ["manga-volumes", manga.id],
      queryFn: () => getVolumes(manga.id),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();

    if (typeFilter !== "ALL") next.set("type", typeFilter);
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
    <section className="manga-page grid">
      <form onSubmit={applyFilters} className="filters-toolbar">
        <label className="filter-control">
          <span>Tipo</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as MangaFilterState["type"])}>
            <option value="ALL">Seleccionar</option>
            <option value="MANGA">Manga</option>
            <option value="MANHWA">Manhwa</option>
          </select>
        </label>

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
            onChange={(event) => setStatusFilter(event.target.value as MangaFilterState["status"])}
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
      {mangaQuery.isLoading && <Loading text="Cargando catalogo..." />}
      {mangaQuery.isError && <ErrorBox error={mangaQuery.error} />}

      <div className="manga-poster-grid">
        {filteredManga.map((item, index) => {
          const volumeCount = volumesQueries[index]?.data?.length ?? 0;
          const demoType = getDemoMangaType(item.id);
          const demoStatus = getDemoStatus(item.id);

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
                  <span className="manga-tag manga-tag-status">
                    {demoStatus === "FINALIZADO" ? "FINALIZADO" : "EN EMISION"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
