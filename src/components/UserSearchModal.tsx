import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchUsers } from "@/features/users/api";
import { ProtectedImage } from "@/components/ProtectedImage";

export function UserSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const searchQuery = useQuery({
    queryKey: ["users-search", searchTerm],
    queryFn: () => searchUsers(searchTerm),
    enabled: isOpen && searchTerm.trim().length >= 1,
    staleTime: 1000 * 30,
  });

  if (!isOpen) return null;

  return (
    <div className="user-search-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="user-search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="user-search-header">
          <svg
            className="user-search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="user-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar usuarios por nombre..."
            aria-label="Buscar usuarios"
          />
          <button
            type="button"
            className="user-search-close-btn"
            onClick={onClose}
            aria-label="Cerrar búsqueda"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="user-search-body">
          {searchTerm.trim().length === 0 ? (
            <p className="user-search-empty-text">Escribe un nombre para buscar perfiles...</p>
          ) : searchQuery.isLoading ? (
            <div className="user-search-loading">
              <span className="user-search-spinner" />
              <span>Buscando usuarios...</span>
            </div>
          ) : searchQuery.data && searchQuery.data.length > 0 ? (
            <ul className="user-search-results">
              {searchQuery.data.map((user) => (
                <li key={user.id}>
                  <Link
                    to={`/profile/${encodeURIComponent(user.username)}`}
                    className="user-search-item"
                    onClick={onClose}
                  >
                    <div className="user-search-avatar-wrap">
                      {user.profileImageUrl ? (
                        <ProtectedImage
                          path={user.profileImageUrl}
                          alt={user.username}
                          className="user-search-avatar"
                        />
                      ) : (
                        <span className="user-search-avatar-fallback">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="user-search-meta">
                      <span className="user-search-username">{user.username}</span>
                      <span className="user-search-level">Nivel {user.readingLevel}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="user-search-empty-text">
              No se encontraron usuarios con &quot;{searchTerm}&quot;
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
