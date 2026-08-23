import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ProtectedImage } from "@/components/ProtectedImage";
import { Loading } from "@/components/Loading";
import { ErrorBox } from "@/components/ErrorBox";
import { getFeaturedManga, getRecentMangaUpdates, getMangaRankings } from "@/features/manga/api";
import { getContinueReading } from "@/features/reading/api";
import { getTags } from "@/features/tags/api";
import { Manga } from "@/types/domain";

// Icons
const FireIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 23c-4.97 0-9-3.99-9-8.9 0-3.41 1.94-6.42 4.88-7.96.48-.25.86.32.55.75-1.02 1.41-1.39 2.82-1.02 4.11.45 1.58 1.93 2.65 3.59 2.65 1.62 0 3-1.01 3.52-2.52.71-2.09-.43-4.52-2.01-6.19-.34-.36-.08-.94.41-.93 4.22.06 7.58 3.58 7.58 8.09 0 4.91-4.03 8.9-9 8.9z" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0l2.5 9.5L24 12l-9.5 2.5L12 24l-2.5-9.5L0 12l9.5-2.5z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Reciente";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Recién salido";
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

export function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Queries
  const featuredQuery = useQuery({
    queryKey: ["manga-featured"],
    queryFn: getFeaturedManga,
  });

  const updatesQuery = useQuery({
    queryKey: ["manga-recent-updates"],
    queryFn: getRecentMangaUpdates,
  });

  const rankingsQuery = useQuery({
    queryKey: ["manga-rankings"],
    queryFn: getMangaRankings,
  });

  const continueQuery = useQuery({
    queryKey: ["continue-reading"],
    queryFn: getContinueReading,
  });

  const tagsQuery = useQuery({
    queryKey: ["tags", "MANGA"],
    queryFn: () => getTags("MANGA"),
  });

  // Featured Slides preparation
  const featuredList: Manga[] = useMemo(() => {
    if (featuredQuery.data && featuredQuery.data.length > 0) {
      return featuredQuery.data;
    }
    if (updatesQuery.data && updatesQuery.data.length > 0) {
      return updatesQuery.data.slice(0, 5);
    }
    return [];
  }, [featuredQuery.data, updatesQuery.data]);

  // Carousel Auto-rotation
  useEffect(() => {
    if (featuredList.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featuredList.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredList.length, isPaused]);

  const currentHero = featuredList[activeSlide] ?? null;

  // Filtered Updates
  const filteredUpdates = useMemo(() => {
    const list = updatesQuery.data ?? [];
    if (!selectedTag) return list;
    return list.filter((manga) =>
      manga.tags?.some((t) => t.id === selectedTag || t.name === selectedTag)
    );
  }, [updatesQuery.data, selectedTag]);

  // Rankings
  const rankings = rankingsQuery.data ?? [];

  // Active Continue Reading item
  const latestContinue = continueQuery.data?.[0];

  return (
    <div className="mp-home">
      {/* 1. HERO CAROUSEL BANNER (Manga Plus Style) */}
      {currentHero ? (
        <section
          className="mp-hero-banner"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Ambient Backdrop */}
          <div className="mp-hero-backdrop">
            {currentHero.coverUrl ? (
              <ProtectedImage
                path={currentHero.coverUrl}
                alt=""
                className="mp-hero-bg-img"
              />
            ) : null}
            <div className="mp-hero-gradient-overlay" />
          </div>

          {/* Hero Content */}
          <div className="mp-hero-container">
            <div className="mp-hero-info">
              <div className="mp-hero-badge-row">
                <span className="mp-badge mp-badge-primary">
                  <SparkleIcon /> DESTACADO DE LA SEMANA
                </span>
                {currentHero.status === "FINALIZADO" ? (
                  <span className="mp-badge mp-badge-muted">COMPLETO</span>
                ) : (
                  <span className="mp-badge mp-badge-accent">EN EMISIÓN</span>
                )}
              </div>

              {currentHero.titleKanji && (
                <div className="mp-hero-kanji">{currentHero.titleKanji}</div>
              )}

              <h1 className="mp-hero-title">{currentHero.title}</h1>

              {currentHero.author && (
                <p className="mp-hero-author">Por <strong>{currentHero.author}</strong></p>
              )}

              <div className="mp-hero-tags">
                {currentHero.tags?.slice(0, 4).map((tag) => (
                  <span key={tag.id} className="mp-tag-pill">
                    {tag.name}
                  </span>
                ))}
              </div>

              <p className="mp-hero-desc">
                {currentHero.description ||
                  "Descubre esta apasionante historia disponible ahora en la biblioteca digital Lura."}
              </p>

              <div className="mp-hero-actions">
                {currentHero.latestVolume ? (
                  <Link
                    to={`/reader/${currentHero.id}/${currentHero.latestVolume.id}/1`}
                    className="mp-btn mp-btn-primary"
                  >
                    <PlayIcon /> Leer Vol. {currentHero.latestVolume.number}
                  </Link>
                ) : (
                  <Link
                    to={`/manga/${currentHero.id}`}
                    className="mp-btn mp-btn-primary"
                  >
                    <PlayIcon /> Comenzar a Leer
                  </Link>
                )}

                <Link
                  to={`/manga/${currentHero.id}`}
                  className="mp-btn mp-btn-secondary"
                >
                  Ver Detalles
                </Link>
              </div>
            </div>

            {/* Hero Right Cover Poster */}
            <div className="mp-hero-cover-wrap">
              <Link to={`/manga/${currentHero.id}`} className="mp-hero-poster-link">
                {currentHero.coverUrl ? (
                  <ProtectedImage
                    path={currentHero.coverUrl}
                    alt={currentHero.title}
                    className="mp-hero-poster"
                  />
                ) : (
                  <div className="mp-hero-poster-fallback">
                    <span>{currentHero.title}</span>
                  </div>
                )}
                {currentHero.latestVolume && (
                  <div className="mp-hero-poster-chapter-badge">
                    Vol. {currentHero.latestVolume.number}
                  </div>
                )}
              </Link>
            </div>
          </div>

          {/* Carousel Controls */}
          {featuredList.length > 1 && (
            <div className="mp-hero-controls">
              <button
                type="button"
                className="mp-hero-arrow"
                onClick={() =>
                  setActiveSlide((prev) => (prev === 0 ? featuredList.length - 1 : prev - 1))
                }
                aria-label="Slide anterior"
              >
                <ChevronLeftIcon />
              </button>

              <div className="mp-hero-dots">
                {featuredList.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`mp-hero-dot ${idx === activeSlide ? "active" : ""}`}
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Ir al manga ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                className="mp-hero-arrow"
                onClick={() =>
                  setActiveSlide((prev) => (prev + 1) % featuredList.length)
                }
                aria-label="Siguiente slide"
              >
                <ChevronRightIcon />
              </button>
            </div>
          )}
        </section>
      ) : null}

      {/* 2. CONTINUE READING SHELF (If active progress) */}
      {latestContinue && (
        <section className="mp-continue-shelf">
          <div className="mp-continue-inner">
            <div className="mp-continue-left">
              <div className="mp-continue-pulse" />
              <div className="mp-continue-label">
                <span className="mp-continue-tag">CONTINUAR LEYENDO</span>
                <strong className="mp-continue-title">
                  {latestContinue.mangaTitle || latestContinue.title || "Tu Lectura"}
                </strong>
                <span className="mp-continue-meta">
                  {latestContinue.volumeNumber ? `Capítulo ${latestContinue.volumeNumber}` : ""} · Pág. {latestContinue.pageNumber}
                </span>
              </div>
            </div>

            <div className="mp-continue-right">
              {latestContinue.progressPercent !== undefined && latestContinue.progressPercent > 0 && (
                <div className="mp-continue-progress-wrap">
                  <div className="mp-continue-progress-bar">
                    <div
                      className="mp-continue-progress-fill"
                      style={{ width: `${latestContinue.progressPercent}%` }}
                    />
                  </div>
                  <span className="mp-continue-progress-pct">
                    {latestContinue.progressPercent}%
                  </span>
                </div>
              )}

              <Link
                to={
                  latestContinue.contentType === "BOOK"
                    ? `/books/${latestContinue.bookId}/reader`
                    : `/reader/${latestContinue.mangaId}/${latestContinue.volumeId}/${latestContinue.pageNumber}`
                }
                className="mp-btn mp-btn-accent-small"
              >
                Continuar <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. MAIN PORTAL GRID: Updates (Left) & Rankings (Right) */}
      <div className="mp-portal-layout">
        {/* LEFT COLUMN: LATEST UPDATES / CAPÍTULOS RECIENTES */}
        <section className="mp-updates-section">
          <div className="mp-section-header">
            <div className="mp-section-title-wrap">
              <h2 className="mp-section-title">
                <span className="mp-title-indicator" /> Actualizaciones Recientes
              </h2>
              <span className="mp-section-subtitle">Novedades y capítulos recién publicados</span>
            </div>

            <Link to="/manga" className="mp-view-all-link">
              Ver catálogo completo <ArrowRightIcon />
            </Link>
          </div>

          {/* Genre Filter Pills */}
          {tagsQuery.data && tagsQuery.data.length > 0 && (
            <div className="mp-filter-tags-row">
              <button
                type="button"
                className={`mp-filter-tag-chip ${selectedTag === null ? "active" : ""}`}
                onClick={() => setSelectedTag(null)}
              >
                Todos
              </button>
              {tagsQuery.data.slice(0, 8).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`mp-filter-tag-chip ${selectedTag === tag.id ? "active" : ""}`}
                  onClick={() => setSelectedTag(tag.id === selectedTag ? null : tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Loading / Error States */}
          {updatesQuery.isLoading && <Loading />}
          {updatesQuery.isError && <ErrorBox error={updatesQuery.error} />}

          {/* Updates Grid */}
          {!updatesQuery.isLoading && filteredUpdates.length === 0 ? (
            <div className="mp-empty-state">
              <BookOpenIcon />
              <p>No hay actualizaciones disponibles en este momento.</p>
            </div>
          ) : (
            <div className="mp-updates-grid">
              {filteredUpdates.map((manga) => {
                const latestVol = manga.latestVolume;
                const chapterLabel = latestVol
                  ? `VOL. ${latestVol.number}`
                  : "DISPONIBLE";

                return (
                  <article key={manga.id} className="mp-update-card">
                    <Link to={`/manga/${manga.id}`} className="mp-card-thumb-wrap">
                      {manga.coverUrl ? (
                        <ProtectedImage
                          path={manga.coverUrl}
                          alt={manga.title}
                          className="mp-card-thumb"
                        />
                      ) : (
                        <div className="mp-card-thumb-fallback">
                          <span>{manga.title}</span>
                        </div>
                      )}

                      {/* Chapter Badge */}
                      <span className="mp-card-chapter-badge">
                        {chapterLabel}
                      </span>

                      {/* Hover Overlay */}
                      <div className="mp-card-hover-overlay">
                        <span className="mp-card-hover-btn">Leer</span>
                      </div>
                    </Link>

                    <div className="mp-card-meta">
                      {manga.titleKanji && (
                        <span className="mp-card-kanji">{manga.titleKanji}</span>
                      )}
                      <h3 className="mp-card-title">
                        <Link to={`/manga/${manga.id}`}>{manga.title}</Link>
                      </h3>

                      <div className="mp-card-subinfo">
                        <span className="mp-card-author">
                          {manga.author || "Lura Manga"}
                        </span>
                        <span className="mp-card-time">
                          <ClockIcon /> {formatRelativeTime(manga.createdAt)}
                        </span>
                      </div>

                      {manga.tags && manga.tags.length > 0 && (
                        <div className="mp-card-tags">
                          {manga.tags.slice(0, 2).map((t) => (
                            <span key={t.id} className="mp-mini-tag">
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: MANGA PLUS LEADERBOARD & RANKINGS */}
        <aside className="mp-rankings-section">
          <div className="mp-section-header">
            <div className="mp-section-title-wrap">
              <h2 className="mp-section-title">
                <span className="mp-ranking-fire"><FireIcon /></span> Hottest Rankings
              </h2>
              <span className="mp-section-subtitle">Los mangas más leídos por la comunidad</span>
            </div>
          </div>

          {rankingsQuery.isLoading && <Loading />}
          {rankingsQuery.isError && <ErrorBox error={rankingsQuery.error} />}

          {!rankingsQuery.isLoading && rankings.length === 0 ? (
            <div className="mp-empty-state">
              <p>Los rankings se actualizarán a medida que la comunidad comience a leer.</p>
            </div>
          ) : (
            <div className="mp-ranking-list">
              {rankings.map((item, index) => {
                const rankNum = item.rank || index + 1;
                const isTop3 = rankNum <= 3;
                const manga = item.manga;

                return (
                  <Link
                    key={`rank-${manga.id}-${rankNum}`}
                    to={`/manga/${manga.id}`}
                    className={`mp-ranking-item ${isTop3 ? `top-${rankNum}` : ""}`}
                  >
                    {/* Stylized Rank Number */}
                    <div className={`mp-rank-number rank-${rankNum}`}>
                      {rankNum}
                    </div>

                    {/* Manga Thumbnail */}
                    <div className="mp-ranking-thumb-wrap">
                      {manga.coverUrl ? (
                        <ProtectedImage
                          path={manga.coverUrl}
                          alt={manga.title}
                          className="mp-ranking-thumb"
                        />
                      ) : (
                        <div className="mp-ranking-thumb-fallback">
                          M
                        </div>
                      )}
                    </div>

                    {/* Manga Ranking Info */}
                    <div className="mp-ranking-info">
                      <div className="mp-ranking-title-row">
                        <span className="mp-ranking-title">{manga.title}</span>
                      </div>

                      {manga.titleKanji && (
                        <span className="mp-ranking-kanji">{manga.titleKanji}</span>
                      )}

                      <div className="mp-ranking-meta-row">
                        <span className="mp-ranking-author">
                          {manga.author || "Manga"}
                        </span>
                        <span className="mp-ranking-views">
                          <FireIcon /> {item.readersCount > 0 ? `${item.readersCount} views` : "Popular"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Quick Japanese Categories Widget */}
          {tagsQuery.data && tagsQuery.data.length > 0 && (
            <div className="mp-tags-card">
              <h3 className="mp-tags-card-title">Explorar Géneros</h3>
              <div className="mp-tags-card-grid">
                {tagsQuery.data.map((tag) => (
                  <Link
                    key={tag.id}
                    to={`/manga?tagIds=${tag.id}`}
                    className="mp-tag-chip-link"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
