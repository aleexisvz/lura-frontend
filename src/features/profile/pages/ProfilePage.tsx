import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getContinueReading, getReadingStats, getRecentSeries } from "@/features/reading/api";
import { getMe, uploadProfileImage } from "@/features/users/api";

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

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveVolumeLabel(item: {
  volumeTitle?: string;
  volumeNumber?: number;
  volumeId: string;
}) {
  if (item.volumeNumber && item.volumeNumber > 0) {
    return `Capitulo ${item.volumeNumber}`;
  }
  if (item.volumeTitle && item.volumeTitle.trim()) {
    return item.volumeTitle;
  }
  return `Volumen ${item.volumeId}`;
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProfileImage(file),
    onSuccess: () => {
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Error al subir la imagen";
      setUploadError(message);
    },
  });

  const handleAvatarClick = () => {
    if (uploadMutation.isPending) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      setUploadError("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    setUploadError(null);
    uploadMutation.mutate(file);
  };

  const statsQuery = useQuery({
    queryKey: ["reading-stats"],
    queryFn: getReadingStats,
  });

  const recentSeriesQuery = useQuery({
    queryKey: ["recent-series"],
    queryFn: () => getRecentSeries(12),
  });

  const continueReadingQuery = useQuery({
    queryKey: ["continue-reading"],
    queryFn: getContinueReading,
  });

  const username = meQuery.data?.username || "usuario";
  const registrationLabel = formatRegistrationDate(meQuery.data?.createdAt ?? "");
  const readingTime = formatReadingTimeByTier(statsQuery.data?.totalSeconds ?? 0);
  const readingLevel = meQuery.data?.readingLevel ?? statsQuery.data?.readingLevel ?? 1;
  const [recentTab, setRecentTab] = useState<"manga" | "books">("manga");
  const [statsTab, setStatsTab] = useState<"manga" | "books">("manga");
  const [lastReadTab, setLastReadTab] = useState<"manga" | "books">("manga");

  const statsLine = useMemo(() => {
    const pages = statsQuery.data?.totalPagesRead ?? 0;
    if (statsTab === "books") {
      const books = statsQuery.data?.totalBooksRead ?? 0;
      const chapters = statsQuery.data?.totalChaptersRead ?? 0;
      return `Libros: ${books} | Capítulos: ${chapters} | Paginas: ${pages}`;
    }
    const series = statsQuery.data?.totalSeriesRead ?? 0;
    const volumes = statsQuery.data?.totalVolumesRead ?? 0;
    return `Series: ${series} | Volumenes: ${volumes} | Paginas: ${pages}`;
  }, [statsQuery.data, statsTab]);

  const xpLine = useMemo(() => {
    const level = statsQuery.data?.readingLevel ?? meQuery.data?.readingLevel ?? 1;
    const xpTotal = statsQuery.data?.readingXpTotal ?? meQuery.data?.readingXpTotal ?? 0;
    const progress = statsQuery.data?.xpProgressPercent ?? 0;
    return `Nivel ${level} · XP ${xpTotal} (${progress}% al siguiente)`;
  }, [meQuery.data?.readingLevel, meQuery.data?.readingXpTotal, statsQuery.data]);

  const lastReadVolumeItems = useMemo(
    () =>
      (continueReadingQuery.data ?? []).map((item) => {
        const totalPages = item.totalPages ?? 0;
        const derivedPercent =
          totalPages > 0 ? clampPercent((item.pageNumber / totalPages) * 100) : 0;
        const progressPercent =
          item.progressPercent && item.progressPercent > 0
            ? clampPercent(item.progressPercent)
            : derivedPercent;

        return {
          ...item,
          progressPercent,
          chapterLabel:
            item.contentType === "BOOK"
              ? item.chapterLabel || "Lectura en progreso"
              : resolveVolumeLabel(item),
        };
      }),
    [continueReadingQuery.data]
  );

  const filteredLastReadItems = useMemo(
    () =>
      lastReadVolumeItems.filter((item) =>
        lastReadTab === "books" ? item.contentType === "BOOK" : item.contentType !== "BOOK"
      ),
    [lastReadTab, lastReadVolumeItems]
  );

  return (
    <section className="profile-v2-page">
      <article className="card profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-hero-avatar-wrap">
            <button
              type="button"
              className={`profile-hero-avatar-button${uploadMutation.isPending ? " is-uploading" : ""}`}
              onClick={handleAvatarClick}
              disabled={uploadMutation.isPending}
              aria-label="Cambiar foto de perfil"
              title="Cambiar foto de perfil"
            >
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

              <div className="profile-hero-avatar-overlay">
                {uploadMutation.isPending ? (
                  <span className="profile-avatar-spinner" aria-hidden="true" />
                ) : (
                  <svg
                    className="profile-avatar-camera-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
              tabIndex={-1}
            />

            <span className="profile-level-badge">{readingLevel}</span>
          </div>

          <div className="profile-hero-meta">
            <h1>{username}</h1>
            <p className="muted-text">{registrationLabel}</p>
            {uploadError && <p className="profile-upload-error">{uploadError}</p>}
          </div>
        </div>
      </article>

      <div className="profile-v2-grid">
        <div className="profile-v2-left-column">
          <article className="card profile-stats-card">
            <div className="profile-recent-header">
              <h2>Estadisticas de lectura</h2>
              <div className="profile-recent-tabs">
                <button
                  type="button"
                  className={`profile-recent-tab${statsTab === "manga" ? " active" : ""}`}
                  onClick={() => setStatsTab("manga")}
                >
                  Manga
                </button>
                <button
                  type="button"
                  className={`profile-recent-tab${statsTab === "books" ? " active" : ""}`}
                  onClick={() => setStatsTab("books")}
                >
                  Books
                </button>
              </div>
            </div>
            {statsQuery.isLoading && <Loading />}
            {statsQuery.isError && <ErrorBox error={statsQuery.error} />}
            {statsQuery.data && (
              <div className="profile-stats-lines">
                <p>{statsLine}</p>
                <p>
                  Tiempo de lectura: <strong>{readingTime}</strong>
                </p>
                <p>{xpLine}</p>
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

        <article className="card profile-last-read-card">
          <div className="profile-last-read-header">
            <h2>Ultimos Capitulos Leidos</h2>
            <div className="profile-recent-tabs">
              <button
                type="button"
                className={`profile-recent-tab${lastReadTab === "manga" ? " active" : ""}`}
                onClick={() => setLastReadTab("manga")}
              >
                Manga
              </button>
              <button
                type="button"
                className={`profile-recent-tab${lastReadTab === "books" ? " active" : ""}`}
                onClick={() => setLastReadTab("books")}
              >
                Books
              </button>
            </div>
          </div>

          {continueReadingQuery.isLoading && <Loading text="Cargando lecturas en curso..." />}
          {continueReadingQuery.isError && <ErrorBox error={continueReadingQuery.error} />}

          {!continueReadingQuery.isLoading &&
            !continueReadingQuery.isError &&
            filteredLastReadItems.length === 0 && (
              <p className="muted-text">
                {lastReadTab === "books"
                  ? "No hay books en curso por ahora."
                  : "No hay capitulos en curso por ahora."}
              </p>
            )}

          <div className="profile-last-read-list">
            {filteredLastReadItems.map((item) => (
              <Link
                key={
                  item.contentType === "BOOK"
                    ? `book-${item.bookId}`
                    : `${item.mangaId}-${item.volumeId}`
                }
                to={
                  item.contentType === "BOOK"
                    ? `/books/${item.bookId}/read`
                    : `/reader/${item.mangaId}/${item.volumeId}/${item.pageNumber}`
                }
                className="profile-last-read-item"
              >
                <div className="profile-last-read-cover-wrap">
                  {item.coverUrl ? (
                    <ProtectedImage
                      path={item.coverUrl}
                      alt={`Portada de ${item.contentType === "BOOK" ? (item.title || "book") : (item.mangaTitle || "manga")}`}
                      className="profile-last-read-cover"
                    />
                  ) : (
                    <div className="profile-last-read-cover cover-placeholder">Sin portada</div>
                  )}
                </div>

                <div className="profile-last-read-body">
                  <h3>{item.contentType === "BOOK" ? (item.title || "Sin titulo") : (item.mangaTitle || "Sin titulo")}</h3>
                  <p className="profile-last-read-chapter">{item.chapterLabel}</p>
                  <div className="profile-last-read-track">
                    <span
                      className="profile-last-read-fill"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                  <p className="profile-last-read-percent">{item.progressPercent}% completado</p>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
