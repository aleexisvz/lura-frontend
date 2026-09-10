import { useState, useRef, useEffect } from "react";

export type BookTheme = "light" | "sepia" | "dark";

export type FontOption = {
  id: string;
  name: string;
  cssFamily: string;
  previewClass?: string;
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "modern-serif",
    name: "Modern Serif",
    cssFamily: "'Merriweather', 'Georgia', 'Playfair Display', serif",
  },
  {
    id: "sans-serif-clear",
    name: "Sans-Serif Clear",
    cssFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  {
    id: "accessibility",
    name: "A accessibility",
    cssFamily: "'Atkinson Hyperlegible', 'OpenDyslexic', 'Verdana', sans-serif",
  },
  {
    id: "clear-sans",
    name: "CLEAR SANS",
    cssFamily: "'Clear Sans', 'Segoe UI', Arial, sans-serif",
  },
];

type BookSettingsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (fontFamily: string) => void;
  theme: BookTheme;
  onThemeChange: (theme: BookTheme) => void;
  brightnessEnabled: boolean;
  onToggleBrightness: () => void;
};

export function BookSettingsPanel({
  isOpen,
  onClose,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  theme,
  onThemeChange,
  brightnessEnabled,
  onToggleBrightness,
}: BookSettingsPanelProps) {
  const [dropdownOpen, setDropdownOpen] = useState(true); // Open by default matching the screenshot
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside panel
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Only close if not clicking a toggle button
        const target = event.target as HTMLElement;
        if (!target.closest(".book-settings-trigger")) {
          onClose();
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentFont =
    FONT_OPTIONS.find((f) => f.cssFamily === fontFamily) ?? FONT_OPTIONS[0];

  return (
    <aside
      className="book-settings-panel"
      ref={panelRef}
      aria-label="Configuración de Lectura"
    >
      <div className="book-settings-header">
        <h3 className="book-settings-title">Configuración de Lectura</h3>
        <button
          type="button"
          className="book-settings-close"
          onClick={onClose}
          aria-label="Cerrar configuración"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 1. TAMAÑO DE FUENTE */}
      <section className="book-settings-section">
        <div className="book-settings-label-row">
          <span className="book-settings-label">
            <span className="book-font-size-glyph">AA</span> Tamaño de Fuente
          </span>
        </div>
        <div className="book-slider-row">
          <span className="book-slider-icon" title="Volumen / Escala">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </span>
          <input
            type="range"
            min={13}
            max={26}
            step={1}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="book-slider-input"
            aria-label="Tamaño de fuente"
          />
        </div>
      </section>

      {/* 2. TIPO DE FUENTE */}
      <section className="book-settings-section">
        <div
          className="book-settings-label-row is-clickable"
          onClick={() => setDropdownOpen((prev) => !prev)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setDropdownOpen((prev) => !prev);
            }
          }}
        >
          <span className="book-settings-label">Tipo de Fuente</span>
          <svg
            className={`book-dropdown-chevron ${dropdownOpen ? "is-open" : ""}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {dropdownOpen && (
          <div className="book-font-dropdown-menu">
            {FONT_OPTIONS.map((option) => {
              const isSelected = option.cssFamily === currentFont.cssFamily;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`book-font-dropdown-item ${isSelected ? "is-selected" : ""}`}
                  onClick={() => {
                    onFontFamilyChange(option.cssFamily);
                  }}
                  style={{ fontFamily: option.cssFamily }}
                >
                  <span className="book-font-check">
                    {isSelected ? "✓" : ""}
                  </span>
                  <span className="book-font-name">{option.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. BRILLO / MODO DE COLOR */}
      <section className="book-settings-section">
        <div className="book-settings-label-row">
          <span className="book-settings-label">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.4rem" }}
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            Brillo / Modo de Color
          </span>
          <button
            type="button"
            className={`book-toggle-switch ${brightnessEnabled ? "is-checked" : ""}`}
            onClick={onToggleBrightness}
            role="switch"
            aria-checked={brightnessEnabled}
            aria-label="Alternar brillo / modo de color"
          >
            <span className="book-toggle-knob" />
          </button>
        </div>

        {/* 3 Theme buttons */}
        <div className="book-theme-grid">
          <button
            type="button"
            className={`book-theme-btn book-theme-light ${theme === "light" ? "is-active" : ""}`}
            onClick={() => onThemeChange("light")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span>Light</span>
          </button>

          <button
            type="button"
            className={`book-theme-btn book-theme-sepia ${theme === "sepia" ? "is-active" : ""}`}
            onClick={() => onThemeChange("sepia")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Sepia</span>
          </button>

          <button
            type="button"
            className={`book-theme-btn book-theme-dark ${theme === "dark" ? "is-active" : ""}`}
            onClick={() => onThemeChange("dark")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span>Dark</span>
          </button>
        </div>
      </section>
    </aside>
  );
}
