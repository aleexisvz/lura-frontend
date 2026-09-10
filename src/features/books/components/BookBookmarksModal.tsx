export type BookBookmark = {
  id: string;
  pageNumber: number;
  label?: string;
  createdAt: string;
};

type BookBookmarksModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  bookmarks: BookBookmark[];
  onAddBookmark: (pageNumber: number, label?: string) => void;
  onRemoveBookmark: (id: string) => void;
  onSelectBookmark: (pageNumber: number) => void;
};

export function BookBookmarksModal({
  isOpen,
  onClose,
  currentPage,
  bookmarks,
  onAddBookmark,
  onRemoveBookmark,
  onSelectBookmark,
}: BookBookmarksModalProps) {
  if (!isOpen) return null;

  const isCurrentPageBookmarked = bookmarks.some((b) => b.pageNumber === currentPage);

  return (
    <div className="book-modal-backdrop" onClick={onClose}>
      <div
        className="book-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Marcadores"
      >
        <div className="book-modal-header">
          <div className="book-modal-title-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <h3>Marcadores</h3>
          </div>
          <button type="button" className="book-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="book-modal-body">
          <div className="book-modal-action-bar">
            {isCurrentPageBookmarked ? (
              <span className="book-modal-current-status">
                ✓ Página {currentPage} ya está en marcadores
              </span>
            ) : (
              <button
                type="button"
                className="book-modal-primary-btn"
                onClick={() => onAddBookmark(currentPage)}
              >
                + Añadir marcador en pág. {currentPage}
              </button>
            )}
          </div>

          <div className="book-modal-list">
            {bookmarks.length === 0 ? (
              <p className="book-modal-empty">Aún no tienes marcadores guardados para este libro.</p>
            ) : (
              bookmarks.map((bm) => (
                <div key={bm.id} className="book-modal-item">
                  <button
                    type="button"
                    className="book-modal-item-btn"
                    onClick={() => {
                      onSelectBookmark(bm.pageNumber);
                      onClose();
                    }}
                  >
                    <span className="book-modal-page-tag">Pág. {bm.pageNumber}</span>
                    <span className="book-modal-item-label">
                      {bm.label || `Marcador en página ${bm.pageNumber}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="book-modal-item-delete"
                    onClick={() => onRemoveBookmark(bm.id)}
                    title="Eliminar marcador"
                    aria-label="Eliminar marcador"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
