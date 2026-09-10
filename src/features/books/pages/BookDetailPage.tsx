import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { getBookById, getBookProgress } from "@/features/books/api";
import type { Book } from "@/types/domain";

function getReaderState(book: Book) {
  if (book.readerStatus === "READY") {
    return {
      label: "Listo para leer",
      badgeClass: "book-hero-status is-ready",
      helper: null,
    };
  }

  if (book.readerStatus === "FAILED") {
    return {
      label: "Error de procesamiento",
      badgeClass: "book-hero-status is-failed",
      helper: book.processingError || "Hubo un problema al preparar este EPUB.",
    };
  }

  if (book.hasEpub) {
    return {
      label: "Procesando EPUB",
      badgeClass: "book-hero-status is-processing",
      helper: "El servidor esta indexando el contenido para el reader.",
    };
  }

  return {
    label: "Sin EPUB cargado",
    badgeClass: "book-hero-status is-pending",
    helper: "Todavia no hay un archivo EPUB asociado a este book.",
  };
}

function formatSectionName(href?: string) {
  if (!href) return "";
  const clean = href.split("#")[0].split("/").pop() || href;
  return clean.replace(/\.(x?html|xml)$/i, "").replace(/[-_]/g, " ");
}

export function BookDetailPage() {
  const { bookId = "" } = useParams();

  const bookQuery = useQuery({
    queryKey: ["book-detail", bookId],
    queryFn: () => getBookById(bookId),
    enabled: Boolean(bookId),
  });

  const progressQuery = useQuery({
    queryKey: ["book-progress", bookId],
    queryFn: () => getBookProgress(bookId),
    enabled: Boolean(bookId && bookQuery.data?.readerStatus === "READY"),
    refetchOnMount: "always",
  });

  const hasProgress = Boolean(
    progressQuery.data &&
      ((progressQuery.data.progressPercent ?? 0) > 0 ||
        (progressQuery.data.currentPage ?? 1) > 1 ||
        Boolean(progressQuery.data.locator))
  );

  const isCompleted = Boolean(
    progressQuery.data &&
      (progressQuery.data.completed === true ||
        progressQuery.data.progressPercent >= 100 ||
        (progressQuery.data.totalPages &&
          progressQuery.data.totalPages > 1 &&
          progressQuery.data.currentPage &&
          progressQuery.data.currentPage >= progressQuery.data.totalPages))
  );

  const actionLabel = isCompleted
    ? "Volver a leer"
    : hasProgress
    ? "Continuar leyendo"
    : "Empezar a leer";
  const readerState = bookQuery.data ? getReaderState(bookQuery.data) : null;
  const descriptionParagraphs = (bookQuery.data?.description ?? "")
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const UserIcon = () => (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.35rem" }}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  return (
    <section className="grid book-detail-layout">
      {bookQuery.isLoading && <Loading text="Cargando libro..." />}
      {bookQuery.isError && <ErrorBox error={bookQuery.error} />}
      {progressQuery.isError && <ErrorBox error={progressQuery.error} />}

      {bookQuery.data && (
        <>
          <article className="card book-hero-card">
            <div className="book-hero-grid">
              {bookQuery.data.coverUrl ? (
                <ProtectedImage
                  path={bookQuery.data.coverUrl}
                  alt={`Portada de ${bookQuery.data.title}`}
                  className="book-hero-cover"
                />
              ) : (
                <div className="cover-placeholder book-hero-cover">Sin portada</div>
              )}

              <div className="book-hero-content">
                <p className="book-hero-kicker">Book</p>
                <h1 className="book-hero-title">{bookQuery.data.title}</h1>

                <div className="book-hero-meta">
                  <span className="book-hero-author">
                    <UserIcon /> {bookQuery.data.author || "Autor desconocido"}
                  </span>
                  {bookQuery.data.language && (
                    <span className="book-hero-pill">Idioma: {bookQuery.data.language}</span>
                  )}
                  {bookQuery.data.readingDirection && (
                    <span className="book-hero-pill">
                      Direccion:{" "}
                      {bookQuery.data.readingDirection === "RTL"
                        ? "RTL"
                        : bookQuery.data.readingDirection === "LTR"
                          ? "LTR"
                          : "Predeterminada"}
                    </span>
                  )}
                  <span className={readerState?.badgeClass}>
                    {readerState?.label}
                  </span>
                </div>

                {bookQuery.data.categories.length > 0 && (
                  <div className="book-hero-tags">
                    {bookQuery.data.categories.map((category) => (
                      <span key={category} className="book-hero-tag">
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                {descriptionParagraphs.length > 0 ? (
                  <div className="book-hero-description">
                    {descriptionParagraphs.map((paragraph, index) => (
                      <p key={`book-desc-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="book-hero-description-empty">Sin descripcion cargada.</p>
                )}

                <div className="book-hero-actions">
                  {bookQuery.data.readerStatus === "READY" ? (
                    <Link className="book-reader-cta" to={`/books/${bookId}/read`}>
                      {actionLabel}
                    </Link>
                  ) : (
                    <span className="chip">{readerState?.label}</span>
                  )}
                  {readerState?.helper && (
                    <p className="book-hero-helper">{readerState.helper}</p>
                  )}
                </div>
              </div>
            </div>
          </article>

          <article className="card book-meta-card">
            <div className="book-meta-panel book-progress-panel">
              <div className="book-progress-panel-header">
                <h2>Lectura</h2>
                {hasProgress && progressQuery.data && (
                  <span className="book-progress-status-badge">
                    {isCompleted ? "Completado" : "En lectura"}
                  </span>
                )}
              </div>

              {hasProgress && progressQuery.data ? (
                <div className="book-progress-tracker-card">
                  <div className="book-progress-cover-col">
                    {bookQuery.data.coverUrl ? (
                      <ProtectedImage
                        path={bookQuery.data.coverUrl}
                        alt={`Mini portada de ${bookQuery.data.title}`}
                        className="book-progress-mini-cover"
                      />
                    ) : (
                      <div className="book-progress-mini-cover placeholder">
                        <span>Sin portada</span>
                      </div>
                    )}
                  </div>

                  <div className="book-progress-details-col">
                    <div className="book-progress-metrics">
                      <div className="book-progress-percent-box">
                        <span className="book-progress-pct-number">{progressQuery.data.progressPercent}%</span>
                        <span className="book-progress-pct-label">completado</span>
                      </div>
                      <div className="book-progress-page-box">
                        <span className="book-progress-page-text">
                          Página <strong>{progressQuery.data.currentPage ?? 1}</strong>
                          {progressQuery.data.totalPages && progressQuery.data.totalPages > 1
                            ? ` de ${progressQuery.data.totalPages}`
                            : ""}
                        </span>
                      </div>
                    </div>

                    <div
                      className="book-progress-bar-track"
                      role="progressbar"
                      aria-valuenow={progressQuery.data.progressPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="book-progress-bar-fill"
                        style={{ width: `${Math.min(100, Math.max(2, progressQuery.data.progressPercent))}%` }}
                      />
                    </div>

                    <div className="book-progress-footer-info">
                      {progressQuery.data.sectionHref ? (
                        <p className="book-progress-section-name">
                          Sección: <strong>{formatSectionName(progressQuery.data.sectionHref)}</strong>
                        </p>
                      ) : null}
                      {progressQuery.data.updatedAt ? (
                        <p className="book-progress-timestamp">
                          Última lectura: {new Date(progressQuery.data.updatedAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="book-progress-empty">
                  <p className="muted-text">Todavía no hay progreso guardado para este libro.</p>
                  <p className="book-progress-empty-hint">Haz clic en &quot;Empezar a leer&quot; para registrar tus páginas y porcentaje de lectura.</p>
                </div>
              )}
            </div>

            <div className="book-meta-panel">
              <h2>Archivo</h2>
              <p className="book-meta-value">{bookQuery.data.hasEpub ? "EPUB cargado" : "Sin EPUB"}</p>
              {bookQuery.data.processingError ? (
                <p className="error-text">{bookQuery.data.processingError}</p>
              ) : (
                <p className="muted-text">
                  Portada con proporciones editoriales tipo libro y reader dedicado para EPUB.
                </p>
              )}
            </div>
          </article>
        </>
      )}
    </section>
  );
}
