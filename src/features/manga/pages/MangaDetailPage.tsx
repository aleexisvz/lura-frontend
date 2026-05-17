import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getMangaById, getProgress, getVolumeCompletion, getVolumes } from "@/features/manga/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { MangaProgress, Volume } from "@/types/domain";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getDemoMangaType, getDemoStatus } from "@/lib/demoFilters";

function VolumePosterCard({
  mangaId,
  volume,
  progress,
  isCompleted,
}: {
  mangaId: string;
  volume: Volume;
  progress: MangaProgress | null | undefined;
  isCompleted: boolean;
}) {
  const pagesCount = volume.pagesCount ?? 0;
  const volumeTitle =
    volume.number > 0 ? volume.title : `Volumen ${volume.title}`;
  const startPage =
    progress?.volumeId === volume.id && progress.pageNumber > 1 ? progress.pageNumber : 1;
  const isInProgress = progress?.volumeId === volume.id && !isCompleted;

  const badgeClass = isCompleted
    ? "volume-pages-badge volume-pages-badge--completed"
    : isInProgress
      ? "volume-pages-badge volume-pages-badge--reading"
      : "volume-pages-badge";

  const BookIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width="12"
      height="12"
      fill="currentColor"
      aria-hidden="true"
      style={{ display: "inline", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path d="M248 48c0-8.8-7.2-16-16-16H96C60.7 32 32 60.7 32 96v320c0 35.3 28.7 64 64 64h136c8.8 0 16-7.2 16-16V48zm16 0v416c0 8.8 7.2 16 16 16h136c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H280c-8.8 0-16 7.2-16 16z" />
    </svg>
  );

  return (
    <Link
      to={`/reader/${mangaId}/${volume.id}/${startPage}`}
      className="volume-poster-card"
      aria-label={`Abrir ${volumeTitle}`}
    >
      {volume.coverUrl ? (
        <ProtectedImage path={volume.coverUrl} alt={`Portada de ${volume.title}`} className="volume-poster-image" />
      ) : (
        <div className="volume-poster-image volume-poster-fallback">Sin portada</div>
      )}

      <span className={badgeClass}>
        {isCompleted && <>✓ {pagesCount}</>}
        {isInProgress && <><BookIcon /> {pagesCount}</>}
        {!isCompleted && !isInProgress && pagesCount}
      </span>

      <div className="volume-hover-layer">
        <p className="volume-hover-title">{volumeTitle}</p>
      </div>
    </Link>
  );
}

export function MangaDetailPage() {
  const { mangaId = "" } = useParams();
  const [volumeOrder, setVolumeOrder] = useState<"ASC" | "DESC">("ASC");

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

  const completionQueries = useQueries({
    queries: (volumesQuery.data ?? []).map((volume) => ({
      queryKey: ["volume-completion", mangaId, volume.id],
      queryFn: () => getVolumeCompletion(mangaId, volume.id),
      enabled: Boolean(mangaId && volumesQuery.data),
    })),
  });

  const completionMap = useMemo(() => {
    const volumes = volumesQuery.data ?? [];
    return Object.fromEntries(
      volumes.map((volume, i) => [volume.id, completionQueries[i]?.data?.completed ?? false])
    );
  }, [volumesQuery.data, completionQueries]);

  const demoType = mangaQuery.data ? getDemoMangaType(mangaQuery.data.id) : "MANGA";
  const demoStatus = mangaQuery.data ? getDemoStatus(mangaQuery.data.id) : "EN_EMISION";

  const descriptionParagraphs = (mangaQuery.data?.description ?? "")
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const orderedVolumes = useMemo(() => {
    const source = [...(volumesQuery.data ?? [])];
    source.sort((a, b) => {
      const aNumber = a.number ?? 0;
      const bNumber = b.number ?? 0;
      return volumeOrder === "ASC" ? aNumber - bNumber : bNumber - aNumber;
    });
    return source;
  }, [volumesQuery.data, volumeOrder]);

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

              {progressQuery.data?.volumeId && (
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
        <div className="manga-volumes-toolbar">
          <h2>{orderedVolumes.length} Capitulos</h2>
          <label className="volume-order-control">
            <span>Ordenar por:</span>
            <select
              value={volumeOrder}
              onChange={(event) => setVolumeOrder(event.target.value as "ASC" | "DESC")}
            >
              <option value="ASC">Primeros</option>
              <option value="DESC">Ultimos</option>
            </select>
          </label>
        </div>

        {volumesQuery.isLoading && <Loading text="Cargando volumenes..." />}
        {volumesQuery.isError && <ErrorBox error={volumesQuery.error} />}

        <div className="volume-poster-grid">
          {orderedVolumes.map((volume: Volume) => (
            <VolumePosterCard
              key={volume.id}
              mangaId={mangaId}
              volume={volume}
              progress={progressQuery.data}
              isCompleted={completionMap[volume.id] ?? false}
            />
          ))}
        </div>
      </article>
    </section>
  );
}
