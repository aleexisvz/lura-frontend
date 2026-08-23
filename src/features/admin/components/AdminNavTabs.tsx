export type AdminTab = "manga" | "books" | "tags" | "users";

interface AdminNavTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  counts?: {
    mangas?: number;
    books?: number;
    tags?: number;
  };
}

export function AdminNavTabs({ activeTab, onTabChange, counts }: AdminNavTabsProps) {
  const tabs: { id: AdminTab; label: string; icon: string; badge?: number }[] = [
    { id: "manga", label: "Mangas & Cómics", icon: "📖", badge: counts?.mangas },
    { id: "books", label: "Libros & EPUB", icon: "📚", badge: counts?.books },
    { id: "tags", label: "Etiquetas & Tags", icon: "🏷️", badge: counts?.tags },
    { id: "users", label: "Usuarios & Permisos", icon: "👥" },
  ];

  return (
    <nav className="admin-nav-tabs" aria-label="Secciones de administración">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`admin-nav-tab ${isActive ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
          >
            <span className="admin-tab-icon">{tab.icon}</span>
            <span className="admin-tab-label">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="admin-tab-badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
