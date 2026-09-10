import { RefObject } from "react";
import { BookPageData } from "./bookDemoContent";

type BookPageSpreadProps = {
  viewportRef?: RefObject<HTMLDivElement>;
  isEpubMode?: boolean;
  leftPage?: BookPageData | null;
  rightPage?: BookPageData | null;
  bookTitle: string;
  bookAuthor?: string | null;
  fontSize: number;
  fontFamily: string;
  textAlign: string;
  lineHeight: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrev: boolean;
  canNext: boolean;
};

export function BookPageSpread({
  viewportRef,
  isEpubMode = false,
  leftPage,
  rightPage,
  bookTitle,
  bookAuthor,
  fontSize,
  fontFamily,
  textAlign,
  lineHeight,
  onPrevPage,
  onNextPage,
  canPrev,
  canNext,
}: BookPageSpreadProps) {
  const pageTextStyle = {
    fontFamily: fontFamily || "var(--book-font-serif)",
    fontSize: `${fontSize}px`,
    textAlign: (textAlign as any) || "justify",
    lineHeight: lineHeight || 1.65,
  };

  return (
    <div className="book-spread-wrapper">
      {/* Book cover / backing border */}
      <div className="book-spread-outer">
        {/* Physical book pages container */}
        <div className="book-spread-book">
          {isEpubMode && viewportRef ? (
            /* REAL EPUB RENDERING MODE */
            <div className="book-epub-container">
              {/* Running header across the top of both pages */}
              <div className="book-spread-topbar-header">
                <span className="book-running-title">{bookTitle.toUpperCase()}</span>
                {bookAuthor && (
                  <span className="book-running-author">{bookAuthor.toUpperCase()}</span>
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

              {/* Real EPUB viewport where epubjs mounts iframe */}
              <div ref={viewportRef} className="book-epub-viewport" />

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
            </div>
          ) : (
            /* FALLBACK / DEMO STATIC SPREAD */
            <>
              {/* LEFT PAGE */}
              <div
                className={`book-page book-page-left ${canPrev ? "is-clickable" : ""}`}
                onClick={() => canPrev && onPrevPage()}
                role="region"
                aria-label={`Página ${leftPage?.pageNumber || ""}`}
              >
                <div className="book-page-inner">
                  {leftPage ? (
                    <>
                      <div className="book-running-header">
                        <span className="book-running-title">
                          {leftPage.runningHeaderLeft || bookTitle.toUpperCase()}
                        </span>
                        {bookAuthor && (
                          <span className="book-running-author">
                            {leftPage.runningHeaderRight || bookAuthor.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {leftPage.chapterTitle && (
                        <h2 className="book-chapter-title">{leftPage.chapterTitle}</h2>
                      )}

                      <div className="book-page-body" style={pageTextStyle}>
                        {leftPage.paragraphs.map((p, idx) => (
                          <p key={`left-p-${idx}`} className="book-paragraph">
                            {p}
                          </p>
                        ))}
                      </div>

                      <div className="book-page-footer">
                        <span className="book-page-folio">{leftPage.pageNumber}</span>
                      </div>
                    </>
                  ) : (
                    <div className="book-page-empty" />
                  )}
                </div>

                {canPrev && (
                  <button
                    type="button"
                    className="book-turn-arrow book-turn-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrevPage();
                    }}
                    aria-label="Página anterior"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                )}
              </div>

              {/* REALISTIC 3D SPINE CREASE */}
              <div className="book-spine-gutter" aria-hidden="true">
                <div className="book-spine-shadow" />
                <div className="book-spine-stitch" />
              </div>

              {/* RIGHT PAGE */}
              <div
                className={`book-page book-page-right ${canNext ? "is-clickable" : ""}`}
                onClick={() => canNext && onNextPage()}
                role="region"
                aria-label={`Página ${rightPage?.pageNumber || ""}`}
              >
                <div className="book-page-inner">
                  {rightPage ? (
                    <>
                      <div className="book-running-header">
                        <span className="book-running-title">
                          {rightPage.runningHeaderLeft || bookTitle.toUpperCase()}
                        </span>
                        {bookAuthor && (
                          <span className="book-running-author">
                            {rightPage.runningHeaderRight || bookAuthor.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {rightPage.chapterTitle && (
                        <h2 className="book-chapter-title">{rightPage.chapterTitle}</h2>
                      )}

                      <div className="book-page-body" style={pageTextStyle}>
                        {rightPage.paragraphs.map((p, idx) => (
                          <p key={`right-p-${idx}`} className="book-paragraph">
                            {p}
                          </p>
                        ))}
                      </div>

                      <div className="book-page-footer">
                        <span className="book-page-folio">{rightPage.pageNumber}</span>
                      </div>
                    </>
                  ) : (
                    <div className="book-page-empty" />
                  )}
                </div>

                {canNext && (
                  <button
                    type="button"
                    className="book-turn-arrow book-turn-right"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNextPage();
                    }}
                    aria-label="Página siguiente"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
