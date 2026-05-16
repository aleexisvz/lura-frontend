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
import { getDemoMangaType, getDemoStatus } from "@/lib/demoFilters";

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

  const isCompleted = completionQuery.data?.completed === true;

  return (
    <div className="volume-detail-row">
      <div className="volume-detail-main">
        {volume.coverUrl ? (
          <ProtectedImage
            path={volume.coverUrl}
            alt={`Portada de ${volume.title}`}
            className="volume-cover-image"
          />
        ) : (
          <div className="volume-cover-placeholder">Sin portada</div>
        )}
        <div className="volume-detail-copy">
          <strong className="volume-detail-title">
            {volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}
          </strong>
          {volume.pagesCount !== undefined && (
            <p className="muted-text">Paginas: {volume.pagesCount}</p>
          )}
        </div>
      </div>

      <div className="volume-detail-actions">
        {isCompleted && <span className="volume-detail-completed">Completado</span>}
        {isCompleted && (
          <button
            type="button"
            className="secondary-button"
            disabled={resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
          >
            Reiniciar
          </button>
        )}
        <Link className="volume-detail-link" to={`/manga/${mangaId}/volumes/${volume.id}/pages`}>
          Ver paginas
        </Link>
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

  const demoType = mangaQuery.data ? getDemoMangaType(mangaQuery.data.id) : "MANGA";
  const demoStatus = mangaQuery.data ? getDemoStatus(mangaQuery.data.id) : "EN_EMISION";

  const descriptionParagraphs = (mangaQuery.data?.description ?? "")
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return (
    <section className="grid manga-detail-layout">
      {mangaQuery.isLoading && <Loading text="Cargando manga..." />}
      {mangaQuery.isError && <ErrorBox error={mangaQuery.error} />}

      {mangaQuery.data && (
        <article className="card manga-hero-card">
          <div className="manga-hero-grid">
            {mangaQuery.data.coverUrl ? (
              <ProtectedImage
                path={mangaQuery.data.coverUrl}
                alt={`Portada de ${mangaQuery.data.title}`}
                className="manga-hero-cover"
              />
            ) : (
              <div className="cover-placeholder manga-hero-cover">Sin portada</div>
            )}

            <div className="manga-hero-content">
              <h1 className="manga-hero-title">{mangaQuery.data.title}</h1>

              <div className="manga-hero-meta">
                {mangaQuery.data.titleKanji && (
                  <span className="manga-hero-kanji">{mangaQuery.data.titleKanji}</span>
                )}
                <span className="manga-hero-author">{"\u{1F464}"} {mangaQuery.data.author || "Autor desconocido"}</span>
                <span className="manga-hero-type">{demoType}</span>
                <span
                  className={`manga-hero-status ${
                    demoStatus === "FINALIZADO" ? "is-finished" : "is-ongoing"
                  }`}
                >
                  {"\u{2705}"} {demoStatus === "FINALIZADO" ? "FINALIZADO" : "EN EMISION"}
                </span>
              </div>

              {mangaQuery.data.categories.length > 0 && (
                <div className="manga-hero-tags">
                  {mangaQuery.data.categories.map((category) => (
                    <span key={category} className="manga-hero-tag">
                      {category}
                    </span>
                  ))}
                </div>
              )}

              {descriptionParagraphs.length > 0 && (
                <div className="manga-hero-description">
                  {descriptionParagraphs.map((paragraph, index) => (
                    <p key={`desc-${index}`}>{paragraph}</p>
                  ))}
                </div>
              )}

              {progressQuery.data?.volumeId && !progressQuery.data.completed && (
                <Link
                  className="manga-continue-link"
                  to={`/reader/${mangaId}/${progressQuery.data.volumeId}/${progressQuery.data.pageNumber}`}
                >
                  Continuar desde pagina {progressQuery.data.pageNumber}
                </Link>
              )}
            </div>
          </div>
        </article>
      )}

      <article className="card manga-volumes-card">
        <h2>Volumenes</h2>
        {volumesQuery.isLoading && <Loading text="Cargando volumenes..." />}
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
