import { useState, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TagScope } from "@/types/domain";
import { getTags, createTag } from "@/features/tags/api";
import { ErrorBox } from "@/components/ErrorBox";

export function TagAdminSection() {
  const queryClient = useQueryClient();
  const [activeScope, setActiveScope] = useState<TagScope>("MANGA");
  const [tagName, setTagName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const tagsQuery = useQuery({
    queryKey: ["tags", activeScope],
    queryFn: () => getTags(activeScope),
  });

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["tags", activeScope] });
      setTagName("");
      setFeedback(`Etiqueta "${created.name || tagName}" creada correctamente`);
      setTimeout(() => setFeedback(null), 3000);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    createTagMutation.mutate({ scope: activeScope, name: tagName.trim() });
  };

  const tags = tagsQuery.data ?? [];

  return (
    <div className="tags-admin-section">
      <div className="admin-section-header">
        <div className="header-info">
          <h2>Gestión de Etiquetas & Categorías</h2>
          <p className="muted-text">
            Organiza los géneros y clasificaciones para Mangas y Libros.
          </p>
        </div>
      </div>

      {feedback && <div className="success-banner">{feedback}</div>}
      {createTagMutation.isError && <ErrorBox error={createTagMutation.error} />}

      {/* Scope Selector Tabs */}
      <div className="tag-scope-switch-row">
        <button
          type="button"
          className={`scope-pill-btn ${activeScope === "MANGA" ? "active" : ""}`}
          onClick={() => setActiveScope("MANGA")}
        >
          📖 Etiquetas Manga ({activeScope === "MANGA" ? tags.length : "..."})
        </button>
        <button
          type="button"
          className={`scope-pill-btn ${activeScope === "BOOK" ? "active" : ""}`}
          onClick={() => setActiveScope("BOOK")}
        >
          📚 Etiquetas Libros ({activeScope === "BOOK" ? tags.length : "..."})
        </button>
      </div>

      {/* Quick Add Form */}
      <div className="tag-add-card card">
        <h4>Añadir Nueva Etiqueta para {activeScope === "MANGA" ? "Manga" : "Libro"}</h4>
        <form onSubmit={handleSubmit} className="tag-add-inline-form">
          <input
            type="text"
            placeholder="Nombre de la etiqueta (ej. Acción, Romance, Cyberpunk...)"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            required
          />
          <button
            type="submit"
            className="primary-button"
            disabled={createTagMutation.isPending || !tagName.trim()}
          >
            {createTagMutation.isPending ? "Añadiendo..." : "+ Añadir Etiqueta"}
          </button>
        </form>
      </div>

      {/* Tags Grid / Cloud */}
      <div className="tags-cloud-card card">
        <div className="card-header-bar">
          <h4>Etiquetas Activas ({tags.length})</h4>
          <span className="muted-text text-xs">
            Disponibles en los selectores del panel y los filtros de la biblioteca
          </span>
        </div>

        {tagsQuery.isLoading && <p className="muted-text">Cargando etiquetas...</p>}
        {tags.length === 0 && !tagsQuery.isLoading && (
          <p className="muted-text">Aún no hay etiquetas creadas para este ámbito.</p>
        )}

        <div className="tags-cloud-display">
          {tags.map((tag) => (
            <div key={tag.id} className="tag-cloud-item">
              <span className="tag-cloud-name">{tag.name}</span>
              <span className="tag-cloud-scope">{tag.scope}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
