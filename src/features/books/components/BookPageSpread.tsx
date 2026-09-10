import { BookPageData } from "./bookDemoContent";

type BookPageSpreadProps = {
  leftPage: BookPageData | null;
  rightPage: BookPageData | null;
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

            {/* Left page edge turn trigger hint */}
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

            {/* Right page edge turn trigger hint */}
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
        </div>
      </div>
    </div>
  );
}
