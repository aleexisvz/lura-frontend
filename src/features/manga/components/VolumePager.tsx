// Up to this many pages every page gets its own button; beyond it the bar switches to previous / next
// buttons around a dropdown, because the buttons would no longer fit on a phone.
const MAX_BUTTON_PAGES = 6;

type VolumePagerProps = {
  /** One label per page, for example "11–20". */
  labels: string[];
  /** Zero-based index of the page being shown. */
  page: number;
  onChange: (page: number) => void;
};

export function VolumePager({ labels, page, onChange }: VolumePagerProps) {
  if (labels.length <= 1) {
    return null;
  }

  if (labels.length <= MAX_BUTTON_PAGES) {
    return (
      <nav className="volume-pager" aria-label="Páginas de volúmenes">
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            className={`volume-pager-chip${index === page ? " active" : ""}`}
            aria-current={index === page ? "page" : undefined}
            aria-label={`Volúmenes ${label}`}
            onClick={() => onChange(index)}
          >
            {label}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav className="volume-pager" aria-label="Páginas de volúmenes">
      <button
        type="button"
        className="volume-pager-step"
        aria-label="Página anterior"
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      <select
        className="volume-pager-select"
        value={page}
        aria-label="Elegir páginas de volúmenes"
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {labels.map((label, index) => (
          <option key={label} value={index}>
            {`Volúmenes ${label} (${index + 1} de ${labels.length})`}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="volume-pager-step"
        aria-label="Página siguiente"
        disabled={page >= labels.length - 1}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
