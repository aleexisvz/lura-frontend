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
  });

  const actionLabel = progressQuery.data ? "Continuar lectura" : "Empezar a leer";
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
            <div className="book-meta-panel">
              <h2>Lectura</h2>
              {progressQuery.data ? (
                <>
                  <p className="book-meta-value">{progressQuery.data.progressPercent}% completado</p>
                  <p className="muted-text">
                    Ultima posicion guardada en <strong>{progressQuery.data.sectionHref}</strong>
                  </p>
                </>
              ) : (
                <p className="muted-text">Todavia no hay progreso guardado para este book.</p>
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
