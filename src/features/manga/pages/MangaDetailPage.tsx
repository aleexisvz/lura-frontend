import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMangaById, getProgress, getVolumes } from "@/features/manga/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";

export function MangaDetailPage() {
  const { mangaId = "" } = useParams();

  const mangaQuery = useQuery({
    queryKey: ["manga-detail", mangaId],
    queryFn: () => getMangaById(mangaId),
    enabled: Boolean(mangaId)
  });

  const volumesQuery = useQuery({
    queryKey: ["manga-volumes", mangaId],
    queryFn: () => getVolumes(mangaId),
    enabled: Boolean(mangaId)
  });

  const progressQuery = useQuery({
    queryKey: ["manga-progress", mangaId],
    queryFn: () => getProgress(mangaId),
    enabled: Boolean(mangaId)
  });

  return (
    <section className="grid">
      {mangaQuery.isLoading && <Loading text="Cargando manga..." />}
      {mangaQuery.isError && <ErrorBox error={mangaQuery.error} />}
      {mangaQuery.data && (
        <article className="card">
          <h1>{mangaQuery.data.title}</h1>
          <p className="muted-text">{mangaQuery.data.description || "Sin descripción"}</p>
          {progressQuery.data?.volumeId && (
            <Link
              to={`/reader/${mangaId}/${progressQuery.data.volumeId}/${progressQuery.data.pageNumber}`}
            >
              Continuar desde página {progressQuery.data.pageNumber}
            </Link>
          )}
        </article>
      )}

      <article className="card">
        <h2>Volúmenes</h2>
        {volumesQuery.isLoading && <Loading text="Cargando volúmenes..." />}
        {volumesQuery.isError && <ErrorBox error={volumesQuery.error} />}

        <div className="grid">
          {volumesQuery.data?.map((volume) => (
            <div key={volume.id} className="split-row">
              <strong>{volume.title}</strong>
              <Link to={`/manga/${mangaId}/volumes/${volume.id}/pages`}>Ver páginas</Link>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

