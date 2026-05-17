import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getReadingStats, getRecentSeries } from "@/features/reading/api";
import { getMe } from "@/features/users/api";

function formatRegistrationDate(createdAt: string): string {
  if (!createdAt) return "Registro: fecha no disponible";

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Registro: fecha no disponible";

  const formatter = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  });

  const value = formatter.format(date);
  return `Registro: ${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatReadingTimeByTier(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(totalSeconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} minutos`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return `${totalHours} horas ${remainingMinutes} minutos`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return `${days} dias ${remainingHours} horas`;
}

export function ProfilePage() {
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const statsQuery = useQuery({
    queryKey: ["reading-stats"],
    queryFn: getReadingStats,
  });

  const recentSeriesQuery = useQuery({
    queryKey: ["recent-series"],
    queryFn: () => getRecentSeries(12),
  });

  const username = meQuery.data?.username || "usuario";
  const registrationLabel = formatRegistrationDate(meQuery.data?.createdAt ?? "");
  const readingTime = formatReadingTimeByTier(statsQuery.data?.totalSeconds ?? 0);
  const [recentTab, setRecentTab] = useState<"manga" | "books">("manga");

  const statsLine = useMemo(() => {
    const series = statsQuery.data?.totalSeriesRead ?? 0;
    const volumes = statsQuery.data?.totalVolumesRead ?? 0;
    const pages = statsQuery.data?.totalPagesRead ?? 0;
    return `Series: ${series} | Volumenes: ${volumes} | Paginas: ${pages}`;
  }, [statsQuery.data]);

  return (
    <section className="profile-v2-page">
      <article className="card profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-hero-avatar-wrap">
            {meQuery.data?.profileImageUrl ? (
              <ProtectedImage
                path={meQuery.data.profileImageUrl}
                alt={`Avatar de ${username}`}
                className="profile-hero-avatar"
              />
            ) : (
              <div className="profile-hero-avatar profile-hero-avatar-fallback">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="profile-level-badge">7</span>
          </div>

          <div className="profile-hero-meta">
            <h1>{username}</h1>
            <p className="muted-text">{registrationLabel}</p>
          </div>

        </div>
        <button type="button" className="profile-settings-button">
          Ajustes
        </button>
      </article>

      <div className="profile-v2-grid">
        <div className="profile-v2-left-column">
          <article className="card profile-stats-card">
            <h2>Estadisticas de lectura</h2>
            {statsQuery.isLoading && <Loading />}
            {statsQuery.isError && <ErrorBox error={statsQuery.error} />}
            {statsQuery.data && (
              <div className="profile-stats-lines">
                <p>{statsLine}</p>
                <p>
                  Tiempo de lectura: <strong>{readingTime}</strong>
                </p>
              </div>
            )}
          </article>

          <article className="card profile-recent-card">
            <div className="profile-recent-header">
              <h2>Ultimas series leidas</h2>
              <div className="profile-recent-tabs">
                <button
                  type="button"
                  className={`profile-recent-tab${recentTab === "manga" ? " active" : ""}`}
                  onClick={() => setRecentTab("manga")}
                >
                  Manga
                </button>
                <button
                  type="button"
                  className={`profile-recent-tab${recentTab === "books" ? " active" : ""}`}
                  onClick={() => setRecentTab("books")}
                >
                  Books
                </button>
              </div>
            </div>
            {recentSeriesQuery.isLoading && <Loading />}
            {recentSeriesQuery.isError && <ErrorBox error={recentSeriesQuery.error} />}
            {recentSeriesQuery.data && (
              <div className="profile-recent-sections">
                {recentTab === "manga" && (
                  recentSeriesQuery.data.manga.length === 0 ? (
                    <p className="muted-text">No hay mangas recientes.</p>
                  ) : (
                    <div className="profile-recent-grid">
                      {recentSeriesQuery.data.manga.map((item) => (
                        <Link
                          key={`manga-${item.contentId}`}
                          to={`/manga/${item.contentId}`}
                          className="profile-recent-card-item"
                        >
                          {item.coverUrl ? (
                            <ProtectedImage
                              path={item.coverUrl}
                              alt={`Portada de ${item.title}`}
                              className="profile-recent-cover"
                            />
                          ) : (
                            <div className="profile-recent-cover cover-placeholder">Sin portada</div>
                          )}
                          <div className="profile-recent-hover">
                            <span className="profile-recent-hover-title">{item.title}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                )}
                {recentTab === "books" && (
                  recentSeriesQuery.data.books.length === 0 ? (
                    <p className="muted-text">No hay books recientes.</p>
                  ) : (
                    <div className="profile-recent-grid">
                      {recentSeriesQuery.data.books.map((item) => (
                        <Link
                          key={`book-${item.contentId}`}
                          to={`/books/${item.contentId}`}
                          className="profile-recent-card-item"
                        >
                          {item.coverUrl ? (
                            <ProtectedImage
                              path={item.coverUrl}
                              alt={`Portada de ${item.title}`}
                              className="profile-recent-cover"
                            />
                          ) : (
                            <div className="profile-recent-cover cover-placeholder">Sin portada</div>
                          )}
                          <div className="profile-recent-hover">
                            <span className="profile-recent-hover-title">{item.title}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </article>
        </div>

        <article className="card profile-empty-card" />
      </div>
    </section>
  );
}
