import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getMangaById, getMangaReaders, getProgress, getVolumeCompletion, getVolumes } from "@/features/manga/api";
import { getContinueReading } from "@/features/reading/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { Volume } from "@/types/domain";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getDemoMangaType, getDemoStatus } from "@/lib/demoFilters";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { VolumePager } from "@/features/manga/components/VolumePager";
import {
  BookIcon,
  CheckCircleIcon,
  CheckIcon,
  RadioIcon,
  UserIcon,
} from "@/features/manga/components/MangaIcons";

// On phones the volume list is shown in pages: every card loads a cover and asks the API whether
// its volume is completed, which is too much to do at once for a series with dozens of volumes.
const MOBILE_QUERY = "(max-width: 768px)";
const MOBILE_VOLUMES_PAGE_SIZE = 10;

// "11–20" from the volume numbers of a page, in the order they are shown. Falls back to the position in
// the list when a volume has no usable number (for example an extra).
function getVolumeRangeLabel(volumes: Volume[], offset: number) {
  const first = volumes[0];
  const last = volumes[volumes.length - 1];
  if (!first || !last) {
    return "";
  }
  if (first.number > 0 && last.number > 0) {
    return first.number === last.number ? `${first.number}` : `${first.number}–${last.number}`;
  }
  return volumes.length === 1 ? `${offset + 1}` : `${offset + 1}–${offset + volumes.length}`;
}

function VolumePosterCard({
  mangaId,
  volume,
  inProgressPage,
  isInProgress,
  isCompleted,
}: {
  mangaId: string;
  volume: Volume;
  inProgressPage: number | null;
  isInProgress: boolean;
  isCompleted: boolean;
}) {
  const pagesCount = volume.pagesCount ?? 0;
  const volumeTitle =
    volume.number > 0 ? volume.title : `Volumen ${volume.title}`;
  const startPage = inProgressPage && inProgressPage > 1 ? inProgressPage : 1;

  const badgeClass = isCompleted
    ? "volume-pages-badge volume-pages-badge--completed"
    : isInProgress
      ? "volume-pages-badge volume-pages-badge--reading"
      : "volume-pages-badge";

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
        {isCompleted && <><CheckIcon /> {pagesCount}</>}
        {isInProgress && <><BookIcon /> {pagesCount}</>}
        {!isCompleted && !isInProgress && pagesCount}
      </span>

      <div
        className={`volume-hover-layer${
          isCompleted
            ? " is-completed"
            : isInProgress
            ? " is-reading"
            : ""
        }`}
      >
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

  const continueReadingQuery = useQuery({
    queryKey: ["continue-reading"],
    queryFn: getContinueReading,
  });

  const readersQuery = useQuery({
    queryKey: ["manga-readers", mangaId],
    queryFn: () => getMangaReaders(mangaId),
    enabled: Boolean(mangaId),
  });

  const orderedVolumes = useMemo(() => {
    const source = [...(volumesQuery.data ?? [])];
    source.sort((a, b) => {
      const aNumber = a.number ?? 0;
      const bNumber = b.number ?? 0;
      return volumeOrder === "ASC" ? aNumber - bNumber : bNumber - aNumber;
    });
    return source;
  }, [volumesQuery.data, volumeOrder]);

  const isMobile = useMediaQuery(MOBILE_QUERY);
  const volumesCardRef = useRef<HTMLElement>(null);

  // Zero-based page chosen by the user. While it is null the page that holds the volume being read is
  // shown, which also follows along once the progress finishes loading.
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  useEffect(() => {
    setSelectedPage(null);
  }, [mangaId]);

  const pageCount = Math.max(1, Math.ceil(orderedVolumes.length / MOBILE_VOLUMES_PAGE_SIZE));

  const defaultPage = useMemo(() => {
    const currentVolumeId = progressQuery.data?.volumeId;
    const index = currentVolumeId ? orderedVolumes.findIndex((volume) => volume.id === currentVolumeId) : -1;
    return index === -1 ? 0 : Math.floor(index / MOBILE_VOLUMES_PAGE_SIZE);
  }, [orderedVolumes, progressQuery.data?.volumeId]);

  const currentPage = Math.min(selectedPage ?? defaultPage, pageCount - 1);

  const visibleVolumes = useMemo(
    () =>
      isMobile
        ? orderedVolumes.slice(
            currentPage * MOBILE_VOLUMES_PAGE_SIZE,
            (currentPage + 1) * MOBILE_VOLUMES_PAGE_SIZE
          )
        : orderedVolumes,
    [isMobile, orderedVolumes, currentPage]
  );

  const pageLabels = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, page) =>
        getVolumeRangeLabel(
          orderedVolumes.slice(page * MOBILE_VOLUMES_PAGE_SIZE, (page + 1) * MOBILE_VOLUMES_PAGE_SIZE),
          page * MOBILE_VOLUMES_PAGE_SIZE
        )
      ),
    [orderedVolumes, pageCount]
  );

  const changePage = (page: number) => {
    setSelectedPage(page);
    // Without this, pressing a page at the bottom of the list leaves you looking at the end of the new page.
    volumesCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const changeOrder = (order: "ASC" | "DESC") => {
    setVolumeOrder(order);
    setSelectedPage(0);
  };

  // Completion is fetched once per volume, so only ask for the volumes on screen, plus the one being
  // read because the continue button needs it.
  const completionVolumes = useMemo(() => {
    const currentVolumeId = progressQuery.data?.volumeId;
    if (!currentVolumeId || visibleVolumes.some((volume) => volume.id === currentVolumeId)) {
      return visibleVolumes;
    }
    const currentVolume = (volumesQuery.data ?? []).find((volume) => volume.id === currentVolumeId);
    return currentVolume ? [...visibleVolumes, currentVolume] : visibleVolumes;
  }, [visibleVolumes, progressQuery.data?.volumeId, volumesQuery.data]);

  const completionQueries = useQueries({
    queries: completionVolumes.map((volume) => ({
      queryKey: ["volume-completion", mangaId, volume.id],
      queryFn: () => getVolumeCompletion(mangaId, volume.id),
      enabled: Boolean(mangaId && volumesQuery.data),
    })),
  });

  const completionMap = useMemo(
    () =>
      Object.fromEntries(
        completionVolumes.map((volume, i) => [volume.id, completionQueries[i]?.data?.completed ?? false])
      ),
    [completionVolumes, completionQueries]
  );

  const inProgressPageByVolumeId = useMemo(() => {
    const entries = continueReadingQuery.data ?? [];
    const map = new Map<string, number>();

    entries.forEach((entry) => {
      if (entry.mangaId !== mangaId) {
        return;
      }
      if (!entry.volumeId) {
        return;
      }
      const page = Math.max(1, entry.pageNumber || 1);
      map.set(entry.volumeId, page);
    });

    return map;
  }, [continueReadingQuery.data, mangaId]);

  const demoType = mangaQuery.data ? getDemoMangaType(mangaQuery.data.id) : "MANGA";
  const demoStatus = mangaQuery.data ? getDemoStatus(mangaQuery.data.id) : "EN_EMISION";

  const descriptionParagraphs = (mangaQuery.data?.description ?? "")
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const continueButtonInfo = useMemo(() => {
    const progress = progressQuery.data;
    const volumes = volumesQuery.data ?? [];
    if (!progress?.volumeId || volumes.length === 0) {
      return null;
    }

    const sortedVolumes = [...volumes].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const currentVolumeIndex = sortedVolumes.findIndex((v) => v.id === progress.volumeId);
    if (currentVolumeIndex === -1) {
      return {
        to: `/reader/${mangaId}/${progress.volumeId}/${progress.pageNumber}`,
        label: `Continuar desde pagina ${progress.pageNumber}`,
      };
    }

    const currentVolume = sortedVolumes[currentVolumeIndex];
    const isCurrentVolumeCompleted = Boolean(
      completionMap[currentVolume.id] ||
      progress.volumeCompleted ||
      (currentVolume.pagesCount && currentVolume.pagesCount > 0 && progress.pageNumber >= currentVolume.pagesCount)
    );

    if (isCurrentVolumeCompleted) {
      const nextVolume = sortedVolumes[currentVolumeIndex + 1];
      if (nextVolume) {
        const nextVolumeNumber = nextVolume.number > 0 ? nextVolume.number : nextVolume.title;
        const targetPage = inProgressPageByVolumeId.get(nextVolume.id) ?? 1;
        return {
          to: `/reader/${mangaId}/${nextVolume.id}/${targetPage}`,
          label: `Continuar Volúmen ${nextVolumeNumber}`,
        };
      }

      const firstVolume = sortedVolumes[0];
      return {
        to: `/reader/${mangaId}/${firstVolume.id}/1`,
        label: "Volver a leer",
      };
    }

    return {
      to: `/reader/${mangaId}/${currentVolume.id}/${progress.pageNumber}`,
      label: `Continuar desde pagina ${progress.pageNumber}`,
    };
  }, [progressQuery.data, volumesQuery.data, completionMap, mangaId, inProgressPageByVolumeId]);

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
                <span className="manga-hero-author">
                  <UserIcon /> {mangaQuery.data.author || "Autor desconocido"}
                </span>
                <span className="manga-hero-type">{demoType}</span>
                <span
                  className={`manga-hero-status ${
                    demoStatus === "FINALIZADO" ? "is-finished" : "is-ongoing"
                  }`}
                >
                  {demoStatus === "FINALIZADO" ? (
                    <>
                      <CheckCircleIcon /> FINALIZADO
                    </>
                  ) : (
                    <>
                      <RadioIcon /> EN EMISION
                    </>
                  )}
                </span>
              </div>

              {((mangaQuery.data.tags && mangaQuery.data.tags.length > 0) || mangaQuery.data.categories.length > 0) && (
                <div className="manga-hero-tags">
                  {(mangaQuery.data.tags && mangaQuery.data.tags.length > 0
                    ? mangaQuery.data.tags
                    : mangaQuery.data.categories.map((c) => ({ id: c, name: c }))
                  ).map((tag) => (
                    <Link
                      key={tag.id || tag.name}
                      to={`/manga?tagIds=${tag.id}`}
                      className="manga-hero-tag"
                      title={`Ver mangas del género ${tag.name}`}
                    >
                      #{tag.name}
                    </Link>
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

              {continueButtonInfo && (
                <Link
                  className="manga-continue-link"
                  to={continueButtonInfo.to}
                >
                  {continueButtonInfo.label}
                </Link>
              )}
            </div>
          </div>
        </article>
      )}

      <article className="card manga-volumes-card" ref={volumesCardRef}>
        <div className="manga-volumes-toolbar">
          <h2>{orderedVolumes.length} Capitulos</h2>
          <label className="volume-order-control">
            <span>Ordenar por:</span>
            <select
              value={volumeOrder}
              onChange={(event) => changeOrder(event.target.value as "ASC" | "DESC")}
            >
              <option value="ASC">Primeros</option>
              <option value="DESC">Ultimos</option>
            </select>
          </label>
        </div>

        {volumesQuery.isLoading && <Loading text="Cargando volumenes..." />}
        {volumesQuery.isError && <ErrorBox error={volumesQuery.error} />}

        {isMobile && <VolumePager labels={pageLabels} page={currentPage} onChange={changePage} />}

        <div className="volume-poster-grid">
          {visibleVolumes.map((volume: Volume) => {
            const isCompleted = Boolean(
              completionMap[volume.id] ||
              (progressQuery.data?.volumeId === volume.id &&
                (progressQuery.data.volumeCompleted ||
                  (volume.pagesCount !== undefined &&
                    volume.pagesCount > 0 &&
                    progressQuery.data.pageNumber >= volume.pagesCount)))
            );
            const isInProgress =
              !isCompleted &&
              (inProgressPageByVolumeId.has(volume.id) ||
                progressQuery.data?.volumeId === volume.id);

            return (
              <VolumePosterCard
                key={volume.id}
                mangaId={mangaId}
                volume={volume}
                inProgressPage={inProgressPageByVolumeId.get(volume.id) ?? null}
                isInProgress={isInProgress}
                isCompleted={isCompleted}
              />
            );
          })}
        </div>

        {isMobile && <VolumePager labels={pageLabels} page={currentPage} onChange={changePage} />}
      </article>

      <article className="card content-readers-card">
        <h2 className="content-readers-title">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Últimos Lectores</span>
        </h2>

        {readersQuery.isLoading && <Loading text="Cargando lectores..." />}
        {readersQuery.isError && <ErrorBox error={readersQuery.error} />}

        {readersQuery.data && readersQuery.data.length === 0 && (
          <p className="muted-text">Todavía no hay lectores registrados para este manga. ¡Sé el primero!</p>
        )}

        {readersQuery.data && readersQuery.data.length > 0 && (
          <div className="content-readers-grid">
            {readersQuery.data.map((reader) => (
              <Link
                key={reader.id}
                to={`/profile/${encodeURIComponent(reader.username)}`}
                className="content-reader-item"
              >
                <div className="content-reader-avatar-wrap">
                  {reader.profileImageUrl ? (
                    <ProtectedImage
                      path={reader.profileImageUrl}
                      alt={reader.username}
                      className="content-reader-avatar"
                    />
                  ) : (
                    <span className="content-reader-avatar-fallback">
                      {reader.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="content-reader-meta">
                  <span className="content-reader-name">{reader.username}</span>
                  <span className="content-reader-level">Nivel {reader.readingLevel}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
