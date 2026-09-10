import { useAuth } from "@/features/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/features/users/api";
import { ProtectedImage } from "@/components/ProtectedImage";

type BookReaderWindowHeaderProps = {
  title: string;
  author?: string | null;
  isFullscreen: boolean;
  onToggleToc: () => void;
  onToggleFullscreen: () => void;
  onMinimize: () => void;
  onClose: () => void;
};

export function BookReaderWindowHeader({
  title,
  author,
  isFullscreen,
  onToggleToc,
  onToggleFullscreen,
  onMinimize,
  onClose,
}: BookReaderWindowHeaderProps) {
  const { isAuthenticated, email } = useAuth();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: isAuthenticated,
  });

  const titleAuthorText = author ? `${title} — ${author}` : title;
  const username = meQuery.data?.username || email || "Perfil de usuario";

  return (
    <header className="book-window-topbar" aria-label="Cabecera del lector">
      <div className="book-window-left">
        <button
          type="button"
          className="book-window-avatar-btn"
          title={username}
          aria-label={username}
        >
          {meQuery.data?.profileImageUrl ? (
            <ProtectedImage
              path={meQuery.data.profileImageUrl}
              alt={username}
              className="book-window-avatar-img"
            />
          ) : (
            <span className="book-window-avatar-fallback">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
          )}
        </button>
      </div>

      <div className="book-window-center">
        <span className="book-window-title" title={titleAuthorText}>
          {titleAuthorText}
        </span>
      </div>

      <div className="book-window-right">
        {/* Índice / Capítulos */}
        <button
          type="button"
          className="book-window-control-btn book-window-menu-btn"
          onClick={onToggleToc}
          title="Índice y capítulos"
          aria-label="Índice y capítulos"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Minimizar */}
        <button
          type="button"
          className="book-window-control-btn book-window-minimize-btn"
          onClick={onMinimize}
          title="Minimizar vista"
          aria-label="Minimizar vista"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="15" x2="20" y2="15" />
          </svg>
        </button>

        {/* Maximizar / Restaurar */}
        <button
          type="button"
          className="book-window-control-btn book-window-maximize-btn"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Restaurar tamaño" : "Maximizar pantalla"}
          aria-label={isFullscreen ? "Restaurar tamaño" : "Maximizar pantalla"}
        >
          {isFullscreen ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="7" width="13" height="13" rx="2" />
              <path d="M4 17V5a2 2 0 0 1 2-2h12" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
            </svg>
          )}
        </button>

        {/* Cerrar */}
        <button
          type="button"
          className="book-window-control-btn book-window-close-btn"
          onClick={onClose}
          title="Cerrar lectura"
          aria-label="Cerrar lectura"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}
