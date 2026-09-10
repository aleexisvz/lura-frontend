type BookBottomDockProps = {
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  onPageChange: (newPage: number) => void;
  onOpenBookmarks: () => void;
  onOpenNotes: () => void;
  bookmarksCount?: number;
  notesCount?: number;
};

export function BookBottomDock({
  currentPage,
  totalPages,
  progressPercent,
  onPageChange,
  onOpenBookmarks,
  onOpenNotes,
  bookmarksCount = 0,
  notesCount = 0,
}: BookBottomDockProps) {
  const safeTotal = Math.max(totalPages, 1);
  const safeCurrent = Math.min(Math.max(currentPage, 1), safeTotal);

  return (
    <footer className="book-bottom-dock" aria-label="Controles de lectura y progreso">
      <div className="book-dock-progress-container">
        <div className="book-dock-progress-label">
          <span>
            página <strong>{safeCurrent}</strong> de <strong>{safeTotal}</strong> · <strong>{progressPercent}% leído</strong>
          </span>
        </div>

        <div className="book-dock-slider-track">
          <input
            type="range"
            min={1}
            max={safeTotal}
            value={safeCurrent}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="book-dock-range-input"
            aria-label="Deslizar página de lectura"
          />
          <div
            className="book-dock-fill-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="book-dock-actions">
        <button
          type="button"
          className="book-dock-btn"
          onClick={onOpenBookmarks}
          title="Ver y agregar marcadores"
          aria-label="Marcadores"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <span>Marcadores</span>
          {bookmarksCount > 0 && (
            <span className="book-dock-badge">{bookmarksCount}</span>
          )}
        </button>

        <button
          type="button"
          className="book-dock-btn"
          onClick={onOpenNotes}
          title="Ver y escribir notas"
          aria-label="Notas"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Notas</span>
          {notesCount > 0 && (
            <span className="book-dock-badge">{notesCount}</span>
          )}
        </button>
      </div>
    </footer>
  );
}
