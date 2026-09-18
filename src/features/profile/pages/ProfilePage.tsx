import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getContinueReading, getReadingStats, getRecentSeries } from "@/features/reading/api";
import { getMe, getPublicProfile, updateUsername, uploadProfileImage } from "@/features/users/api";

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

function formatReadingTime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

const ChartIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
);

const LibraryIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const ZapIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

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
  const { username: routeUsername } = useParams<{ username?: string }>();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInputValue, setNameInputValue] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const isViewingOtherUser = Boolean(
    routeUsername &&
      meQuery.data?.username &&
      routeUsername.toLowerCase() !== meQuery.data.username.toLowerCase()
  );

  const publicProfileQuery = useQuery({
    queryKey: ["public-profile", routeUsername],
    queryFn: () => getPublicProfile(routeUsername!),
    enabled: isViewingOtherUser,
  });

  const updateUsernameMutation = useMutation({
    mutationFn: (nextUsername: string) => updateUsername(nextUsername),
    onSuccess: () => {
      setNameError(null);
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Error al actualizar el nombre";
      setNameError(message);
    },
  });

  const handleStartEditName = () => {
    setNameInputValue(meQuery.data?.username || "");
    setNameError(null);
    setIsEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  const handleCancelEditName = () => {
    if (updateUsernameMutation.isPending) return;
    setIsEditingName(false);
    setNameError(null);
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (updateUsernameMutation.isPending) return;

    const trimmed = nameInputValue.trim();
    if (!trimmed) {
      setNameError("El nombre no puede estar vacío");
      return;
    }
    if (trimmed.length < 2) {
      setNameError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (trimmed.length > 32) {
      setNameError("El nombre no puede superar 32 caracteres");
      return;
    }
    if (!/^[\p{L}\p{N}_-]+$/u.test(trimmed)) {
      setNameError("Solo letras, caracteres japoneses/kanji, números, guión y guión bajo");
      return;
    }

    if (trimmed === meQuery.data?.username) {
      setIsEditingName(false);
      setNameError(null);
      return;
    }

    setNameError(null);
    updateUsernameMutation.mutate(trimmed);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEditName();
    } else if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSaveName();
    }
  };

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
    enabled: !isViewingOtherUser,
    refetchOnMount: "always",
  });

  const recentSeriesQuery = useQuery({
    queryKey: ["recent-series"],
    queryFn: () => getRecentSeries(12),
    enabled: !isViewingOtherUser,
    refetchOnMount: "always",
  });

  const continueReadingQuery = useQuery({
    queryKey: ["continue-reading"],
    queryFn: getContinueReading,
    enabled: !isViewingOtherUser,
    refetchOnMount: "always",
  });

  const displayUser = isViewingOtherUser ? publicProfileQuery.data : meQuery.data;
  const username = displayUser?.username || routeUsername || "usuario";
  const registrationLabel = formatRegistrationDate(displayUser?.createdAt ?? "");
  const statsData = isViewingOtherUser ? publicProfileQuery.data?.stats : statsQuery.data;
  const recentSeriesData = isViewingOtherUser ? publicProfileQuery.data?.recentSeries : recentSeriesQuery.data;
  const rawContinueReading = isViewingOtherUser ? publicProfileQuery.data?.continueReading : continueReadingQuery.data;
  const readingLevel = displayUser?.readingLevel ?? statsData?.readingLevel ?? 1;

  const [recentTab, setRecentTab] = useState<"manga" | "books">("manga");
  const [statsTab, setStatsTab] = useState<"manga" | "books">("manga");
  const [lastReadTab, setLastReadTab] = useState<"manga" | "books">("manga");

  const lastReadVolumeItems = useMemo(
    () =>
      (rawContinueReading ?? []).map((item) => {
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
    [rawContinueReading]
  );

  const filteredLastReadItems = useMemo(
    () =>
      lastReadVolumeItems.filter((item) =>
        lastReadTab === "books" ? item.contentType === "BOOK" : item.contentType !== "BOOK"
      ),
    [lastReadTab, lastReadVolumeItems]
  );

  if (isViewingOtherUser && publicProfileQuery.isLoading) {
    return (
      <section className="profile-v2-page">
        <Loading text={`Cargando perfil de ${routeUsername}...`} />
      </section>
    );
  }

  if (isViewingOtherUser && publicProfileQuery.isError) {
    return (
      <section className="profile-v2-page">
        <article className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Usuario no encontrado</h2>
          <p className="muted-text" style={{ marginBottom: "1.5rem" }}>
            No pudimos encontrar el perfil de &quot;{routeUsername}&quot;. Es posible que el usuario no exista.
          </p>
          <Link to="/profile" className="secondary-button" style={{ display: "inline-block" }}>
            Volver a mi perfil
          </Link>
        </article>
      </section>
    );
  }

  return (
    <section className="profile-v2-page">
      <article className="card profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-hero-avatar-wrap">
            {isViewingOtherUser ? (
              <div className="profile-hero-avatar profile-hero-avatar-static">
                {displayUser?.profileImageUrl ? (
                  <ProtectedImage
                    path={displayUser.profileImageUrl}
                    alt={`Avatar de ${username}`}
                    className="profile-hero-avatar"
                  />
                ) : (
                  <div className="profile-hero-avatar profile-hero-avatar-fallback">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
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
            )}

            {!isViewingOtherUser && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
                tabIndex={-1}
              />
            )}

            <span className="profile-level-badge">{readingLevel}</span>
          </div>

          <div className="profile-hero-meta">
            {isViewingOtherUser ? (
              <div className="profile-hero-name-row">
                <h1>{username}</h1>
              </div>
            ) : isEditingName ? (
              <form className="profile-edit-name-form" onSubmit={handleSaveName}>
                <div className="profile-edit-name-row">
                  <input
                    ref={nameInputRef}
                    type="text"
                    className="profile-edit-name-input"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    disabled={updateUsernameMutation.isPending}
                    maxLength={32}
                    placeholder="Nuevo nombre"
                    aria-label="Nuevo nombre de usuario"
                  />
                  <button
                    type="submit"
                    className="profile-edit-name-action-btn confirm"
                    disabled={updateUsernameMutation.isPending || !nameInputValue.trim()}
                    title="Guardar nombre"
                    aria-label="Guardar nombre"
                  >
                    {updateUsernameMutation.isPending ? (
                      <span className="profile-edit-name-spinner" aria-hidden="true" />
                    ) : (
                      <CheckIcon />
                    )}
                  </button>
                  <button
                    type="button"
                    className="profile-edit-name-action-btn cancel"
                    onClick={handleCancelEditName}
                    disabled={updateUsernameMutation.isPending}
                    title="Cancelar"
                    aria-label="Cancelar"
                  >
                    <CloseIcon />
                  </button>
                </div>
                {nameError && <p className="profile-name-error">{nameError}</p>}
              </form>
            ) : (
              <div className="profile-hero-name-row">
                <h1>{username}</h1>
                <button
                  type="button"
                  className="profile-edit-name-trigger"
                  onClick={handleStartEditName}
                  title="Editar nombre de usuario"
                  aria-label="Editar nombre de usuario"
                >
                  <EditIcon />
                </button>
              </div>
            )}
            <p className="muted-text">{registrationLabel}</p>
            {!isViewingOtherUser && uploadError && <p className="profile-upload-error">{uploadError}</p>}
          </div>
        </div>
      </article>

      <div className="profile-v2-grid">
        <div className="profile-v2-left-column">
          <article className="card profile-stats-card">
            <div className="profile-recent-header">
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-flex", color: "var(--accent-gold)" }}><ChartIcon /></span>
                <span>Estadísticas de Lectura</span>
              </h2>
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
            {!isViewingOtherUser && statsQuery.isLoading && <Loading />}
            {!isViewingOtherUser && statsQuery.isError && <ErrorBox error={statsQuery.error} />}
            {statsData && (
              <div style={{ display: "grid", gap: "0.85rem" }}>
                {/* Barra de Nivel y XP */}
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
                      alignItems: "center",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      marginBottom: "0.35rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "var(--accent-gold)" }}>
                        Nivel {statsData.readingLevel}
                      </span>
                      {statsData.isHotWeekend && (
                        <span
                          className="hot-weekend-badge"
                          title="¡Doble experiencia activa por fin de semana!"
                        >
                          🔥 Hot Weekend x2 XP
                        </span>
                      )}
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>
                      {statsData.xpInLevel} / {statsData.xpToNextLevel} XP
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
                        width: `${statsData.xpProgressPercent}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #d97706, #f59e0b)",
                      }}
                    />
                  </div>
                </div>

                {/* Grid 2x2 de Rectángulos KPI */}
                <div className="stats-kpi-grid">
                  <div className="stat-kpi-item">
                    <span className="stat-kpi-label">Tiempo Total</span>
                    <span className="stat-kpi-val highlight">
                      {formatReadingTime(statsData.totalSeconds)}
                    </span>
                  </div>
                  <div className="stat-kpi-item">
                    <span className="stat-kpi-label">Páginas Leídas</span>
                    <span className="stat-kpi-val">
                      {statsData.totalPagesRead}
                    </span>
                  </div>
                  <div className="stat-kpi-item">
                    <span className="stat-kpi-label">
                      {statsTab === "books" ? "Libros" : "Mangas"}
                    </span>
                    <span className="stat-kpi-val">
                      {statsTab === "books"
                        ? statsData.totalBooksRead ?? 0
                        : statsData.totalMangasRead ?? statsData.totalSeriesRead ?? 0}
                    </span>
                  </div>
                  <div className="stat-kpi-item">
                    <span className="stat-kpi-label">
                      {statsTab === "books" ? "Capítulos" : "Volúmenes"}
                    </span>
                    <span className="stat-kpi-val">
                      {statsTab === "books"
                        ? statsData.totalChaptersRead ?? 0
                        : statsData.totalVolumesRead ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </article>

          <article className="card profile-recent-card">
            <div className="profile-recent-header">
              <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ display: "inline-flex", color: "var(--accent-gold)" }}><LibraryIcon /></span>
                <span>Actividad Reciente</span>
              </h2>
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
            {!isViewingOtherUser && recentSeriesQuery.isLoading && <Loading />}
            {!isViewingOtherUser && recentSeriesQuery.isError && <ErrorBox error={recentSeriesQuery.error} />}
            {recentSeriesData && (
              <div className="profile-recent-sections">
                {recentTab === "manga" && (
                  recentSeriesData.manga.length === 0 ? (
                    <p className="muted-text">No hay mangas recientes.</p>
                  ) : (
                    <div className="profile-recent-grid">
                      {recentSeriesData.manga.map((item) => (
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
                  recentSeriesData.books.length === 0 ? (
                    <p className="muted-text">No hay books recientes.</p>
                  ) : (
                    <div className="profile-recent-grid">
                      {recentSeriesData.books.map((item) => (
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
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ display: "inline-flex", color: "var(--accent-gold)" }}><ZapIcon /></span>
              <span>{isViewingOtherUser ? "Lecturas en Curso" : "Continuar Leyendo"}</span>
            </h2>
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

          {!isViewingOtherUser && continueReadingQuery.isLoading && <Loading text="Cargando lecturas en curso..." />}
          {!isViewingOtherUser && continueReadingQuery.isError && <ErrorBox error={continueReadingQuery.error} />}

          {(!isViewingOtherUser ? !continueReadingQuery.isLoading && !continueReadingQuery.isError : true) &&
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
                  isViewingOtherUser
                    ? item.contentType === "BOOK"
                      ? `/books/${item.bookId}`
                      : `/manga/${item.mangaId}`
                    : item.contentType === "BOOK"
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
