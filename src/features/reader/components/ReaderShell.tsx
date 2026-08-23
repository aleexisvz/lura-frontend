import { ReactNode, useMemo, useState } from "react";

type ReaderShellProps = {
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  sliderValue: number;
  isFullscreen: boolean;
  isBusy?: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleFullscreen: () => void;
  onSliderChange: (nextPage: number) => void;
  children: ReactNode;
};

function clampPage(value: number, minPage: number, maxPage: number) {
  return Math.min(maxPage, Math.max(minPage, Math.round(value)));
}

export function ReaderShell(props: ReaderShellProps) {
  const {
    currentPage,
    totalPages,
    progressPercent,
    sliderValue,
    isFullscreen,
    isBusy = false,
    onClose,
    onPrev,
    onNext,
    onToggleFullscreen,
    onSliderChange,
    children
  } = props;
  const [showInfo, setShowInfo] = useState(false);
  const minPage = 1;
  const maxPage = Math.max(totalPages, 1);

  const safeCurrent = useMemo(
    () => clampPage(currentPage, minPage, maxPage),
    [currentPage, maxPage]
  );

  return (
    <section className="reader-shell" aria-label="Manga reader">
      <header className="reader-topbar">
        <p className="reader-page-indicator">
          Página <strong>{safeCurrent}</strong> <span style={{ opacity: 0.6 }}>/ {maxPage}</span>
        </p>
        <div className="reader-top-actions">
          <button
            type="button"
            className="reader-icon-button"
            onClick={() => setShowInfo(true)}
            title="Atajos de teclado"
            aria-label="Atajos de teclado"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </button>
          <button
            type="button"
            className="reader-icon-button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            )}
          </button>
          <button type="button" className="reader-close-button" onClick={onClose} title="Cerrar visor">
            ✕ Salir
          </button>
        </div>
      </header>

      <div className="reader-viewport">{children}</div>

      <footer className="reader-bottombar">
        <button
          type="button"
          className="reader-nav-button"
          onClick={onPrev}
          disabled={safeCurrent <= minPage || isBusy}
          aria-label="Página anterior"
          title="Página anterior"
        >
          ‹
        </button>
        <div className="reader-progress-wrap">
          <div className="reader-progress-meta">
            <span>{progressPercent}%</span>
          </div>
          <input
            className="reader-progress-input"
            type="range"
            min={minPage}
            max={maxPage}
            step={1}
            value={clampPage(sliderValue, minPage, maxPage)}
            onChange={(event) => onSliderChange(Number(event.target.value))}
            aria-label="Progreso de lectura"
            disabled={isBusy}
          />
        </div>
        <button
          type="button"
          className="reader-nav-button"
          onClick={onNext}
          disabled={safeCurrent >= maxPage || isBusy}
          aria-label="Página siguiente"
          title="Página siguiente"
        >
          ›
        </button>
      </footer>

      {showInfo && (
        <div className="reader-info-backdrop" role="dialog" aria-modal="true">
          <div className="reader-info-modal">
            <h2>Atajos de teclado</h2>
            <ul>
              <li>Flecha derecha: avanzar pagina</li>
              <li>Flecha izquierda: retroceder pagina</li>
              <li>Espacio: avanzar pagina</li>
              <li>F: entrar/salir de pantalla completa</li>
            </ul>
            <button type="button" className="reader-close-button" onClick={() => setShowInfo(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
