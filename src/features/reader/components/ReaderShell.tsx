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
          Pagina <strong>{safeCurrent}</strong> de {maxPage}
        </p>
        <div className="reader-top-actions">
          <button
            type="button"
            className="reader-icon-button"
            onClick={() => setShowInfo(true)}
            aria-label="Atajos del reader"
          >
            ?
          </button>
          <button
            type="button"
            className="reader-icon-button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Entrar en pantalla completa"}
          >
            {isFullscreen ? "x" : "[]"}
          </button>
          <button type="button" className="reader-close-button" onClick={onClose}>
            Cerrar
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
          aria-label="Pagina anterior"
        >
          {"<"}
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
          aria-label="Pagina siguiente"
        >
          {">"}
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
