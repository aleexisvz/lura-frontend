import { RefObject } from "react";

type BookPageSpreadProps = {
  viewportRef?: RefObject<HTMLDivElement>;
  isEpubMode?: boolean;
  isBooting?: boolean;
  bookTitle: string;
  bookAuthor?: string | null;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRetry?: () => void;
  canPrev: boolean;
  canNext: boolean;
};

export function BookPageSpread({
  viewportRef,
  isEpubMode = false,
  isBooting = false,
  bookTitle,
  bookAuthor,
  onPrevPage,
  onNextPage,
  onRetry,
  canPrev,
  canNext,
}: BookPageSpreadProps) {
  return (
    <div className="book-spread-wrapper">
      {/* Book cover / backing border */}
      <div className="book-spread-outer">
        {/* Physical book pages container */}
        <div className="book-spread-book">
          {/* Running header across the top of the open book */}
          <div className="book-spread-topbar-header">
            <span className="book-running-title">{bookTitle}</span>
            {bookAuthor && (
              <span className="book-running-author">{bookAuthor}</span>
            )}
          </div>

          {/* Click navigation zones on left and right edges */}
          <div
            className="book-page-click-zone book-zone-left"
            onClick={onPrevPage}
            title="Página anterior"
            aria-label="Página anterior"
          />
          <div
            className="book-page-click-zone book-zone-right"
            onClick={onNextPage}
            title="Página siguiente"
            aria-label="Página siguiente"
          />

          {/* REAL EPUB VIEWPORT: ALWAYS IN DOM WITH REAL LAYOUT DIMENSIONS */}
          <div
            ref={viewportRef}
            className="book-epub-viewport"
            style={{
              opacity: isEpubMode ? 1 : 0,
              pointerEvents: isEpubMode ? "auto" : "none",
            }}
          />

          {/* Realistic 3D spine shadow in the center */}
          <div className="book-spine-gutter" aria-hidden="true">
            <div className="book-spine-shadow" />
            <div className="book-spine-stitch" />
          </div>

          {/* Turn button arrows */}
          <button
            type="button"
            className="book-turn-arrow book-turn-left"
            onClick={(e) => {
              e.stopPropagation();
              onPrevPage();
            }}
            disabled={!canPrev}
            aria-label="Página anterior"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            className="book-turn-arrow book-turn-right"
            onClick={(e) => {
              e.stopPropagation();
              onNextPage();
            }}
            disabled={!canNext}
            aria-label="Página siguiente"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Loading overlay when booting */}
          {isBooting && (
            <div className="book-epub-loading-overlay">
              <div className="book-loading-spinner" />
              <p className="book-loading-text">Cargando libro...</p>
            </div>
          )}

          {/* Error / retry state if EPUB failed to load */}
          {!isBooting && !isEpubMode && (
            <div className="book-epub-error-overlay">
              <div className="book-epub-error-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="book-epub-error-title">No se pudo cargar el libro</p>
              <p className="book-epub-error-subtitle">
                Hubo un inconveniente al procesar el archivo EPUB.
              </p>
              {onRetry && (
                <button
                  type="button"
                  className="book-retry-btn"
                  onClick={onRetry}
                >
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
