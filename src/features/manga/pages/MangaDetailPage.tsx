import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMangaById, getProgress, getVolumes } from "@/features/manga/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { Volume } from "@/types/domain";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getDemoMangaType, getDemoStatus } from "@/lib/demoFilters";

function VolumePosterCard({ mangaId, volume }: { mangaId: string; volume: Volume }) {
  const pagesCount = volume.pagesCount ?? 0;
  const volumeTitle =
    volume.number > 0 ? `Vol. ${volume.number} ${volume.title}` : `Volumen ${volume.title}`;

  return (
    <Link
      to={`/manga/${mangaId}/volumes/${volume.id}/pages`}
      className="volume-poster-card"
      aria-label={`Abrir ${volumeTitle}`}
    >
      {volume.coverUrl ? (
        <ProtectedImage path={volume.coverUrl} alt={`Portada de ${volume.title}`} className="volume-poster-image" />
      ) : (
        <div className="volume-poster-image volume-poster-fallback">Sin portada</div>
      )}

      <span className="volume-pages-badge">{pagesCount}</span>

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
            <VolumePosterCard key={volume.id} mangaId={mangaId} volume={volume} />
          ))}
        </div>
      </article>
    </section>
  );
}
