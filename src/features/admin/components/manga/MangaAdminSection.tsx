import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Manga, Tag } from "@/types/domain";
import { getMangaList } from "@/features/manga/api";
import { MangaStudioWorkspace } from "./MangaStudioWorkspace";
import { MangaUploadWizardModal } from "./MangaUploadWizardModal";

interface MangaAdminSectionProps {
  tags: Tag[];
}

export function MangaAdminSection({ tags }: MangaAdminSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("");
  const [selectedMangaId, setSelectedMangaId] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const mangaQuery = useQuery({
    queryKey: ["manga-list-admin"],
    queryFn: () => getMangaList(),
  });

  const mangas: Manga[] = mangaQuery.data ?? [];

  // Filtered manga list
  const filteredMangas = useMemo(() => {
    return mangas.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.titleKanji && m.titleKanji.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.author && m.author.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        !selectedTagFilter ||
        m.tags.some((t) => t.id === selectedTagFilter || t.name === selectedTagFilter);

      return matchesSearch && matchesTag;
    });
  }, [mangas, searchQuery, selectedTagFilter]);

  // Selected manga object
  const selectedManga = useMemo(() => {
    if (!selectedMangaId && filteredMangas.length > 0) {
      return filteredMangas[0];
    }
    return mangas.find((m) => m.id === selectedMangaId) ?? null;
  }, [mangas, selectedMangaId, filteredMangas]);

  return (
    <div className="manga-admin-section">
      {/* Top Controls Bar */}
      <div className="admin-section-header">
        <div className="header-info">
          <h2>Gestión de Mangas</h2>
          <p className="muted-text">
            {mangas.length} obras registradas • Crea, edita información y sube tomos con páginas.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="primary-button btn-gold-glow"
            onClick={() => setIsWizardOpen(true)}
          >
            ⚡ Nuevo (Wizard mode)
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="admin-filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por título, kanji o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-tag-select-wrap">
          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="admin-select"
          >
            <option value="">Todas las etiquetas ({tags.length})</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Studio Split Layout */}
      <div className="manga-studio-split-container">
        {/* Left: Manga Catalog List */}
        <div className="manga-catalog-sidebar">
          <div className="sidebar-catalog-header">
            <span className="catalog-count-label">
              {filteredMangas.length} títulos encontrados
            </span>
          </div>

          {mangaQuery.isLoading && (
            <div className="catalog-loading">
              <div className="spinner-sm" />
              <span>Cargando catálogo...</span>
            </div>
          )}

          {filteredMangas.length === 0 && !mangaQuery.isLoading && (
            <div className="catalog-empty">
              <span>📭</span>
              <p>No se encontraron mangas con ese criterio.</p>
              <button
                type="button"
                className="secondary-button btn-sm"
                onClick={() => setIsWizardOpen(true)}
              >
                + Crear el primero
              </button>
            </div>
          )}

          <div className="manga-catalog-cards">
            {filteredMangas.map((manga) => {
              const isSelected = selectedManga?.id === manga.id;
              return (
                <div
                  key={manga.id}
                  className={`manga-catalog-item-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedMangaId(manga.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="catalog-item-cover">
                    {manga.coverUrl ? (
                      <img src={manga.coverUrl} alt={manga.title} loading="lazy" />
                    ) : (
                      <div className="cover-empty-icon">📖</div>
                    )}
                  </div>

                  <div className="catalog-item-details">
                    <h4 className="catalog-item-title">{manga.title}</h4>
                    {manga.author && (
                      <span className="catalog-item-author">{manga.author}</span>
                    )}
                    <div className="catalog-item-footer">
                      {manga.tags.slice(0, 2).map((t) => (
                        <span key={t.id} className="tag-badge-mini">
                          {t.name}
                        </span>
                      ))}
                      {manga.tags.length > 2 && (
                        <span className="tag-badge-mini-more">+{manga.tags.length - 2}</span>
                      )}
                    </div>
                  </div>

                  <div className="catalog-item-arrow">›</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Studio Workspace of Selected Manga */}
        <div className="manga-workspace-main">
          {selectedManga ? (
            <MangaStudioWorkspace
              key={selectedManga.id}
              manga={selectedManga}
              availableTags={tags}
            />
          ) : (
            <div className="no-manga-selected card">
              <span className="empty-icon">📚</span>
              <h3>Selecciona un manga de la lista</h3>
              <p className="muted-text">
                O utiliza el asistente rápido para registrar una nueva obra y subir sus tomos.
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsWizardOpen(true)}
              >
                + Crear Nuevo Manga
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fast Upload Wizard Modal */}
      <MangaUploadWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        availableTags={tags}
        onCreatedSuccess={(newId) => {
          if (newId) setSelectedMangaId(newId);
        }}
      />
    </div>
  );
}
