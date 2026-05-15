import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMangaById,
  getProgress,
  getVolumes,
  getVolumeCompletion,
  resetVolumeCompletion,
} from "@/features/manga/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { Volume } from "@/types/domain";
import { ProtectedImage } from "@/components/ProtectedImage";

function VolumeRow({ mangaId, volume }: { mangaId: string; volume: Volume }) {
  const queryClient = useQueryClient();

  const completionQuery = useQuery({
    queryKey: ["volume-completion", mangaId, volume.id],
    queryFn: () => getVolumeCompletion(mangaId, volume.id),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetVolumeCompletion(mangaId, volume.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volume-completion", mangaId, volume.id] });
      queryClient.invalidateQueries({ queryKey: ["manga-progress", mangaId] });
    },
  });

  return (
    <div className="split-row volume-row">
      <div className="split-row">
        {volume.coverUrl ? (
          <ProtectedImage
            path={volume.coverUrl}
            alt={`Portada de ${volume.title}`}
            className="volume-cover-image"
          />
        ) : (
          <div className="volume-cover-placeholder">Sin portada</div>
        )}
        <div>
          <strong>
            {volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}
          </strong>
          {volume.pagesCount !== undefined && (
            <p className="muted-text">Páginas: {volume.pagesCount}</p>
          )}
        </div>
      </div>
      <div className="split-row">
        {completionQuery.data?.completed && (
          <>
            <span className="muted-text">Completado</span>
            <button
              type="button"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              Reiniciar
            </button>
          </>
        )}
        <Link to={`/manga/${mangaId}/volumes/${volume.id}/pages`}>Ver páginas</Link>
      </div>
    </div>
  );
}

export function MangaDetailPage() {
  const { mangaId = "" } = useParams();

  const mangaQuery = useQuery({
    queryKey: ["manga-detail", mangaId],
    queryFn: () => getMangaById(mangaId),
    enabled: Boolean(mangaId),
  });

  const volumesQuery = useQuery({
    queryKey: ["manga-volumes", mangaId],
    queryFn: () => getVolumes(mangaId),
    enabled: Boolean(mangaId),
  });

  const progressQuery = useQuery({
    queryKey: ["manga-progress", mangaId],
    queryFn: () => getProgress(mangaId),
    enabled: Boolean(mangaId),
  });

  return (
    <section className="grid">
      {mangaQuery.isLoading && <Loading text="Cargando manga..." />}
      {mangaQuery.isError && <ErrorBox error={mangaQuery.error} />}
      {mangaQuery.data && (
        <article className="card">
          {mangaQuery.data.coverUrl ? (
            <ProtectedImage
              path={mangaQuery.data.coverUrl}
              alt={`Portada de ${mangaQuery.data.title}`}
              className="detail-cover-image"
            />
          ) : (
            <div className="cover-placeholder detail-cover-image">Sin portada</div>
          )}
          <h1>{mangaQuery.data.title}</h1>
          <p className="muted-text">{mangaQuery.data.author || "Autor no disponible"}</p>
          {mangaQuery.data.categories.length > 0 && (
            <p className="muted-text">Categorías: {mangaQuery.data.categories.join(", ")}</p>
          )}
          {progressQuery.data?.volumeId && !progressQuery.data.completed && (
            <Link to={`/reader/${mangaId}/${progressQuery.data.volumeId}/${progressQuery.data.pageNumber}`}>
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
            <VolumeRow key={volume.id} mangaId={mangaId} volume={volume} />
          ))}
        </div>
      </article>
    </section>
  );
}
