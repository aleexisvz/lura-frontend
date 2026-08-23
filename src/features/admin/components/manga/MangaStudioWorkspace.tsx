import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Manga, Tag, Volume } from "@/types/domain";
import {
  getVolumes,
  updateManga,
  uploadMangaCover,
  createVolume,
  updateVolume,
  uploadVolumeCover,
} from "@/features/manga/api";
import { VolumePagesUploader } from "./VolumePagesUploader";
import { ErrorBox } from "@/components/ErrorBox";

interface MangaStudioWorkspaceProps {
  manga: Manga;
  availableTags: Tag[];
  onBackToList?: () => void;
}

export function MangaStudioWorkspace({
  manga,
  availableTags,
  onBackToList,
}: MangaStudioWorkspaceProps) {
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const volCoverInputRef = useRef<HTMLInputElement>(null);

  // Manga editing state
  const [title, setTitle] = useState(manga.title);
  const [titleKanji, setTitleKanji] = useState(manga.titleKanji || "");
  const [author, setAuthor] = useState(manga.author || "");
  const [description, setDescription] = useState(manga.description || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    manga.tags.map((t) => t.id)
  );
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Volume addition state
  const [isAddingVolume, setIsAddingVolume] = useState(false);
  const [newVolumeNumber, setNewVolumeNumber] = useState<number>(1);
  const [newVolumeTitle, setNewVolumeTitle] = useState("");

  // Volume editing & selection
  const [expandedVolumeId, setExpandedVolumeId] = useState<string | null>(null);
  const [targetVolumeForCover, setTargetVolumeForCover] = useState<string | null>(null);
  const [editingVolume, setEditingVolume] = useState<{ id: string; number: number; title: string } | null>(null);

  // Sync state when manga changes
  useEffect(() => {
    setTitle(manga.title);
    setTitleKanji(manga.titleKanji || "");
    setAuthor(manga.author || "");
    setDescription(manga.description || "");
    setSelectedTagIds(manga.tags.map((t) => t.id));
    setIsEditingMetadata(false);
  }, [manga]);

  // Volumes query
  const volumesQuery = useQuery({
    queryKey: ["manga-volumes", manga.id],
    queryFn: () => getVolumes(manga.id),
  });

  const volumes: Volume[] = volumesQuery.data ?? [];

  // Update auto-calculated next volume number
  useEffect(() => {
    if (volumes.length > 0) {
      const maxNum = Math.max(...volumes.map((v) => v.number), 0);
      setNewVolumeNumber(maxNum + 1);
    } else {
      setNewVolumeNumber(1);
    }
  }, [volumes]);

  // Expand first volume by default if none expanded
  useEffect(() => {
    if (volumes.length > 0 && !expandedVolumeId) {
      setExpandedVolumeId(volumes[0].id);
    }
  }, [volumes, expandedVolumeId]);

  // Mutations
  const updateMangaMutation = useMutation({
    mutationFn: updateManga,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["manga", manga.id] });
      setFeedback("Información del manga actualizada con éxito");
      setIsEditingMetadata(false);
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const uploadCoverMutation = useMutation({
    mutationFn: uploadMangaCover,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["manga", manga.id] });
      setFeedback("Portada de manga actualizada");
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const createVolumeMutation = useMutation({
    mutationFn: createVolume,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes", manga.id] });
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
      setIsAddingVolume(false);
      setNewVolumeTitle("");
      setFeedback(`Volumen ${newVolumeNumber} creado correctamente`);
      // auto-expand newly created volume if ID is returned
      if (created && typeof created === "object" && "id" in created) {
        setExpandedVolumeId(String(created.id));
      }
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const updateVolumeMutation = useMutation({
    mutationFn: updateVolume,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes", manga.id] });
      setEditingVolume(null);
      setFeedback("Volumen actualizado");
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const uploadVolumeCoverMutation = useMutation({
    mutationFn: uploadVolumeCover,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes", manga.id] });
      setTargetVolumeForCover(null);
      setFeedback("Portada de tomo actualizada");
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  const handleMetadataSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateMangaMutation.mutate({
      mangaId: manga.id,
      title: title.trim(),
      titleKanji: titleKanji.trim() || undefined,
      author: author.trim() || undefined,
      description: description.trim() || undefined,
      tagIds: selectedTagIds,
    });
  };

  const handleCoverUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadCoverMutation.mutate({ mangaId: manga.id, file });
    }
  };

  const handleVolumeCoverUpload = (volumeId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadVolumeCoverMutation.mutate({ mangaId: manga.id, volumeId, file });
    }
  };

  const handleCreateVolumeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newVolumeNumber || newVolumeNumber < 1) return;
    createVolumeMutation.mutate({
      mangaId: manga.id,
      number: newVolumeNumber,
      title: newVolumeTitle.trim() || undefined,
    });
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="manga-studio-workspace">
      {/* Top Banner / Mobile back */}
      <div className="studio-topbar">
        {onBackToList && (
          <button type="button" className="secondary-button btn-sm" onClick={onBackToList}>
            ← Volver al catálogo
          </button>
        )}
        <div className="studio-heading">
          <h2>
            {manga.title}{" "}
            {manga.titleKanji && <span className="title-kanji">({manga.titleKanji})</span>}
          </h2>
          <span className="studio-badge-count">{volumes.length} Tomos registrados</span>
        </div>
      </div>

      {feedback && <div className="success-banner">{feedback}</div>}
      {updateMangaMutation.isError && <ErrorBox error={updateMangaMutation.error} />}
      {uploadCoverMutation.isError && <ErrorBox error={uploadCoverMutation.error} />}

      <div className="studio-grid-layout">
        {/* Left Column: Manga Information & Cover */}
        <div className="studio-manga-card card">
          <div className="manga-cover-studio-wrap">
            {manga.coverUrl ? (
              <img src={manga.coverUrl} alt={manga.title} className="studio-cover-img" />
            ) : (
              <div className="studio-cover-placeholder">
                <span>Sin portada</span>
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="visually-hidden"
              onChange={handleCoverUpload}
            />
            <button
              type="button"
              className="cover-change-btn"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadCoverMutation.isPending}
            >
              {uploadCoverMutation.isPending ? "Subiendo..." : "📷 Cambiar Portada"}
            </button>
          </div>

          {!isEditingMetadata ? (
            <div className="manga-info-preview">
              <div className="info-row">
                <span className="info-label">Autor:</span>
                <span className="info-value">{manga.author || "No especificado"}</span>
              </div>
              {manga.description && (
                <div className="info-desc">
                  <span className="info-label">Sinopsis:</span>
                  <p>{manga.description}</p>
                </div>
              )}
              <div className="info-tags">
                <span className="info-label">Etiquetas:</span>
                <div className="tags-chip-list">
                  {manga.tags.length > 0 ? (
                    manga.tags.map((t) => (
                      <span key={t.id} className="tag-pill">
                        {t.name}
                      </span>
                    ))
                  ) : (
                    <span className="muted-text">Sin etiquetas asignadas</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="secondary-button w-full"
                onClick={() => setIsEditingMetadata(true)}
              >
                ✏️ Editar Información
              </button>
            </div>
          ) : (
            <form onSubmit={handleMetadataSubmit} className="manga-edit-form">
              <label className="form-field">
                <span>Título Principal</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Título (Kanji / Original)</span>
                <input
                  type="text"
                  value={titleKanji}
                  onChange={(e) => setTitleKanji(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Autor / Mangaka</span>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Sinopsis</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className="form-field">
                <span>Etiquetas (Tags)</span>
                <div className="tag-selector-chips">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        className={`chip-toggle ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  className="ghost-button btn-sm"
                  onClick={() => setIsEditingMetadata(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button btn-sm"
                  disabled={updateMangaMutation.isPending}
                >
                  {updateMangaMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Volumes Manager */}
        <div className="studio-volumes-section">
          <div className="volumes-header-bar">
            <div>
              <h3>Gestor de Tomos & Capítulos</h3>
              <p className="muted-text">
                Administra portadas y sube los paquetes de imágenes de cada tomo.
              </p>
            </div>
            <button
              type="button"
              className="primary-button btn-sm"
              onClick={() => setIsAddingVolume(!isAddingVolume)}
            >
              {isAddingVolume ? "Cerrar" : `+ Añadir Vol. ${newVolumeNumber}`}
            </button>
          </div>

          {/* Quick Create Volume Form */}
          {isAddingVolume && (
            <div className="add-volume-box card">
              <h4>Crear Nuevo Volumen</h4>
              <form onSubmit={handleCreateVolumeSubmit} className="add-volume-form">
                <label className="form-field-inline">
                  <span>Número de Tomo:</span>
                  <input
                    type="number"
                    min={1}
                    value={newVolumeNumber}
                    onChange={(e) => setNewVolumeNumber(Number(e.target.value))}
                    required
                  />
                </label>
                <label className="form-field-inline">
                  <span>Título Opcional:</span>
                  <input
                    type="text"
                    placeholder="Ej. El comienzo del viaje"
                    value={newVolumeTitle}
                    onChange={(e) => setNewVolumeTitle(e.target.value)}
                  />
                </label>
                <div className="add-volume-actions">
                  <button
                    type="button"
                    className="ghost-button btn-sm"
                    onClick={() => setIsAddingVolume(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="primary-button btn-sm"
                    disabled={createVolumeMutation.isPending}
                  >
                    {createVolumeMutation.isPending ? "Creando..." : "Crear Tomo"}
                  </button>
                </div>
              </form>
              {createVolumeMutation.isError && (
                <ErrorBox error={createVolumeMutation.error} />
              )}
            </div>
          )}

          {/* Volumes List (Accordion Style) */}
          {volumesQuery.isLoading && <p className="muted-text">Cargando volúmenes...</p>}
          {volumes.length === 0 && !volumesQuery.isLoading && (
            <div className="empty-volumes-card card">
              <span className="empty-icon">📂</span>
              <h4>Aún no hay tomos en este manga</h4>
              <p className="muted-text">
                Crea el Volumen 1 para comenzar a cargar las páginas y portadas.
              </p>
              <button
                type="button"
                className="primary-button btn-sm"
                onClick={() => setIsAddingVolume(true)}
              >
                + Crear Volumen 1
              </button>
            </div>
          )}

          <div className="volume-accordions-list">
            {volumes.map((volume) => {
              const isExpanded = expandedVolumeId === volume.id;
              const isEditing = editingVolume?.id === volume.id;

              return (
                <div
                  key={volume.id}
                  className={`volume-accordion-card card ${isExpanded ? "expanded" : ""}`}
                >
                  <div
                    className="volume-accordion-header"
                    onClick={() => setExpandedVolumeId(isExpanded ? null : volume.id)}
                  >
                    <div className="volume-header-left">
                      {volume.coverUrl ? (
                        <img
                          src={volume.coverUrl}
                          alt={`Cover ${volume.number}`}
                          className="volume-mini-cover"
                        />
                      ) : (
                        <div className="volume-mini-cover-placeholder">
                          <span>Vol.{volume.number}</span>
                        </div>
                      )}
                      <div>
                        <span className="volume-title-badge">
                          Volumen {volume.number}
                          {volume.title && volume.title !== "Volume" && ` — ${volume.title}`}
                        </span>
                      </div>
                    </div>

                    <div className="volume-header-right">
                      <button
                        type="button"
                        className="ghost-button btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingVolume({
                            id: volume.id,
                            number: volume.number,
                            title: volume.title === "Volume" ? "" : volume.title,
                          });
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <span className="accordion-chevron">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Volume edit sub-form */}
                  {isEditing && (
                    <div className="volume-inline-edit-box">
                      <div className="inline-edit-grid">
                        <label>
                          <span>Número:</span>
                          <input
                            type="number"
                            min={1}
                            value={editingVolume.number}
                            onChange={(e) =>
                              setEditingVolume({
                                ...editingVolume,
                                number: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>Título:</span>
                          <input
                            type="text"
                            value={editingVolume.title}
                            onChange={(e) =>
                              setEditingVolume({
                                ...editingVolume,
                                title: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <div className="inline-edit-actions">
                        <button
                          type="button"
                          className="ghost-button btn-xs"
                          onClick={() => setEditingVolume(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="primary-button btn-xs"
                          onClick={() =>
                            updateVolumeMutation.mutate({
                              mangaId: manga.id,
                              volumeId: volume.id,
                              number: editingVolume.number,
                              title: editingVolume.title || undefined,
                            })
                          }
                          disabled={updateVolumeMutation.isPending}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Accordion Content (Visible when expanded) */}
                  {isExpanded && (
                    <div className="volume-accordion-content">
                      <div className="volume-cover-row">
                        <div className="volume-cover-action-box">
                          <span className="label-sm">Portada del Tomo:</span>
                          <input
                            type="file"
                            id={`vol-cover-${volume.id}`}
                            accept="image/png,image/jpeg,image/webp"
                            className="visually-hidden"
                            onChange={(e) => handleVolumeCoverUpload(volume.id, e)}
                          />
                          <label
                            htmlFor={`vol-cover-${volume.id}`}
                            className="secondary-button btn-xs cursor-pointer"
                          >
                            📷 {volume.coverUrl ? "Cambiar Portada" : "Subir Portada"}
                          </label>
                          {uploadVolumeCoverMutation.isPending &&
                            targetVolumeForCover === volume.id && (
                              <span className="muted-text text-xs">Subiendo portada...</span>
                            )}
                        </div>
                      </div>

                      {/* Dropzone & Pages uploader for this volume */}
                      <VolumePagesUploader
                        mangaId={manga.id}
                        volumeId={volume.id}
                        volumeNumber={volume.number}
                        volumeTitle={volume.title}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
