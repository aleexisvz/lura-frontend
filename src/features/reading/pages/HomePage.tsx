import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getContinueReading, getReadingStats, getRecentSeries } from "@/features/reading/api";
import { useAuth } from "@/features/auth/AuthContext";

function formatReadingTime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function HomePage() {
  const { email, role } = useAuth();

  const continueQuery = useQuery({
    queryKey: ["continue-reading"],
    queryFn: getContinueReading,
  });

  const statsQuery = useQuery({
    queryKey: ["reading-stats"],
    queryFn: getReadingStats,
  });

  const recentSeriesQuery = useQuery({
    queryKey: ["recent-series"],
    queryFn: () => getRecentSeries(8),
  });

  const latestContinue = continueQuery.data?.[0];

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="home-hero">
        <div>
          <h1>Biblioteca Digital</h1>
          <div className="home-hero-meta">
            <span>{email || "Sesión activa"}</span>
            <span className="home-hero-badge">
              ⭐ Nivel {statsQuery.data?.readingLevel ?? 1}
            </span>
            {role === "ADMIN" && (
              <span className="home-hero-badge">ADMIN</span>
            )}
          </div>
        </div>
        {latestContinue && (
          <Link
            to={
              latestContinue.contentType === "BOOK"
                ? `/books/${latestContinue.bookId}/reader`
                : `/reader/${latestContinue.mangaId}/${latestContinue.volumeId}/${latestContinue.pageNumber}`
            }
            className="btn-primary"
            style={{ textDecoration: "none" }}
          >
            Continuar: {latestContinue.mangaTitle || latestContinue.title || "Lectura"} →
          </Link>
        )}
      </section>

      {/* Main Grid: Continue Reading & Stats */}
      <div className="grid grid-2">
        {/* Continue Reading Card */}
        <article className="card">
          <h2>
            <span>⚡</span> Continuar Leyendo
          </h2>
          {continueQuery.isLoading && <Loading />}
          {continueQuery.isError && <ErrorBox error={continueQuery.error} />}
          
          <div className="continue-reading-list">
            {continueQuery.data?.length ? (
              continueQuery.data.slice(0, 4).map((item) => {
                const targetUrl =
                  item.contentType === "BOOK"
                    ? `/books/${item.bookId}/reader`
                    : `/reader/${item.mangaId}/${item.volumeId}/${item.pageNumber}`;
                const title = item.mangaTitle || item.title || item.mangaId || "Lectura";
                const label = item.volumeTitle
                  ? item.volumeTitle
                  : item.volumeNumber > 0
                  ? `Capítulo ${item.volumeNumber}`
                  : `Vol. ${item.volumeId}`;

                return (
                  <Link
                    key={`${item.contentType}-${item.mangaId || item.bookId}-${item.volumeId}`}
                    to={targetUrl}
                    className="continue-reading-card"
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
                      {item.coverUrl ? (
                        <ProtectedImage
                          path={item.coverUrl}
                          alt={title}
                          className="recent-series-thumb"
                          style={{ width: "44px", height: "58px", borderRadius: "6px", flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "44px",
                            height: "58px",
                            borderRadius: "6px",
                            background: "var(--bg-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            flexShrink: 0,
                          }}
                        >
                          📖
                        </div>
                      )}
                      <div className="continue-reading-info">
                        <span className="continue-reading-title">{title}</span>
                        <span className="continue-reading-sub">
                          {label} · Pág. {item.pageNumber}
                        </span>
                        {item.progressPercent > 0 && (
                          <div
                            style={{
                              width: "100%",
                              height: "3px",
                              borderRadius: "999px",
                              background: "rgba(255,255,255,0.1)",
                              overflow: "hidden",
                              marginTop: "0.15rem",
                            }}
                          >
                            <div
                              style={{
                                width: `${item.progressPercent}%`,
                                height: "100%",
                                background: "var(--accent-gold)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="continue-reading-btn">Leer</span>
                  </Link>
                );
              })
            ) : (
              <p className="muted-text" style={{ margin: "1rem 0" }}>
                No tienes lecturas pendientes. ¡Explora el catálogo de mangas o libros!
              </p>
            )}
          </div>
        </article>

        {/* Reading Stats Card */}
        <article className="card">
          <h2>
            <span>📊</span> Estadísticas de Lectura
          </h2>
          {statsQuery.isLoading && <Loading />}
          {statsQuery.isError && <ErrorBox error={statsQuery.error} />}
          {statsQuery.data && (
            <div style={{ display: "grid", gap: "0.9rem" }}>
              {/* XP Level Bar */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem 0.9rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    marginBottom: "0.35rem",
                  }}
                >
                  <span style={{ color: "var(--accent-gold)" }}>
                    Nivel {statsQuery.data.readingLevel}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    {statsQuery.data.xpInLevel} / {statsQuery.data.xpToNextLevel} XP
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    borderRadius: "999px",
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${statsQuery.data.xpProgressPercent}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #d97706, #f59e0b)",
                    }}
                  />
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="stats-kpi-grid">
                <div className="stat-kpi-item">
                  <span className="stat-kpi-label">Tiempo Total</span>
                  <span className="stat-kpi-val highlight">
                    {formatReadingTime(statsQuery.data.totalSeconds)}
                  </span>
                </div>
                <div className="stat-kpi-item">
                  <span className="stat-kpi-label">Páginas Leídas</span>
                  <span className="stat-kpi-val">
                    {statsQuery.data.totalPagesRead}
                  </span>
                </div>
                <div className="stat-kpi-item">
                  <span className="stat-kpi-label">Mangas / Libros</span>
                  <span className="stat-kpi-val">
                    {statsQuery.data.totalMangasRead} / {statsQuery.data.totalBooksRead}
                  </span>
                </div>
                <div className="stat-kpi-item">
                  <span className="stat-kpi-label">Sesiones</span>
                  <span className="stat-kpi-val">
                    {statsQuery.data.totalSessions}
                  </span>
                </div>
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Recent Books & Manga Activity */}
      {(recentSeriesQuery.data?.manga?.length || recentSeriesQuery.data?.books?.length) ? (
        <article className="card">
          <h2>
            <span>📚</span> Actividad Reciente
          </h2>
          {recentSeriesQuery.isLoading && <Loading />}
          {recentSeriesQuery.isError && <ErrorBox error={recentSeriesQuery.error} />}
          
          <div className="recent-series-grid">
            {recentSeriesQuery.data?.manga.map((item) => (
              <Link
                key={`recent-manga-${item.contentId}`}
                to={`/manga/${item.contentId}`}
                className="recent-series-card"
              >
                {item.coverUrl ? (
                  <ProtectedImage
                    path={item.coverUrl}
                    alt={item.title}
                    className="recent-series-thumb"
                  />
                ) : (
                  <div className="recent-series-thumb manga-poster-fallback">
                    Manga
                  </div>
                )}
                <div className="recent-series-title">{item.title}</div>
              </Link>
            ))}

            {recentSeriesQuery.data?.books.map((item) => (
              <Link
                key={`recent-book-${item.contentId}`}
                to={`/books/${item.contentId}`}
                className="recent-series-card"
              >
                {item.coverUrl ? (
                  <ProtectedImage
                    path={item.coverUrl}
                    alt={item.title}
                    className="recent-series-thumb"
                  />
                ) : (
                  <div className="recent-series-thumb manga-poster-fallback">
                    Book
                  </div>
                )}
                <div className="recent-series-title">{item.title}</div>
              </Link>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}
