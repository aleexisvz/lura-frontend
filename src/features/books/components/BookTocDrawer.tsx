import { BookChapter } from "./bookDemoContent";

type BookTocDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  chapters: BookChapter[];
  currentPage: number;
  onSelectChapter: (startPage: number) => void;
  bookTitle: string;
};

export function BookTocDrawer({
  isOpen,
  onClose,
  chapters,
  currentPage,
  onSelectChapter,
  bookTitle,
}: BookTocDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="book-toc-backdrop" onClick={onClose}>
      <aside
        className="book-toc-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Índice de capítulos"
      >
        <div className="book-toc-header">
          <div>
            <h3 className="book-toc-title">Índice de Contenido</h3>
            <p className="book-toc-book-title">{bookTitle}</p>
          </div>
          <button type="button" className="book-modal-close-btn" onClick={onClose} aria-label="Cerrar índice">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="book-toc-list">
          {chapters.map((chapter) => {
            // Check if current page is within this chapter
            const isCurrent =
              currentPage >= chapter.startPage &&
              (!chapters.some((c) => c.startPage > chapter.startPage && currentPage >= c.startPage));

            return (
              <button
                key={chapter.id}
                type="button"
                className={`book-toc-item ${isCurrent ? "is-active" : ""}`}
                onClick={() => {
                  onSelectChapter(chapter.startPage);
                  onClose();
                }}
              >
                <span className="book-toc-item-title">{chapter.title}</span>
                <span className="book-toc-item-page">pág. {chapter.startPage}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
