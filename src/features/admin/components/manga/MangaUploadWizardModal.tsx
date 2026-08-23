import { useState, useRef, ChangeEvent, DragEvent, FormEvent, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tag } from "@/types/domain";
import {
  createManga,
  uploadMangaCover,
  createVolume,
  uploadVolumeCover,
  uploadVolumePages,
} from "@/features/manga/api";
import { createTag, getTags } from "@/features/tags/api";
import { ErrorBox } from "@/components/ErrorBox";
import {
  parseMangadexFolder,
  getAllFilesFromDataTransfer,
  ParsedMangaFolder,
  ParsedVolume,
} from "../../utils/mangadexFolderParser";

interface MangaUploadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTags: Tag[];
  onCreatedSuccess?: (newMangaId?: string) => void;
}

type WizardStep = 1 | 2 | 3;

export function MangaUploadWizardModal({
  isOpen,
  onClose,
  availableTags,
  onCreatedSuccess,
}: MangaUploadWizardModalProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);
  const [isParsingFolder, setIsParsingFolder] = useState(false);

  // Folder parser results
  const [parsedData, setParsedData] = useState<ParsedMangaFolder | null>(null);

  // Editable fields in Step 2
  const [title, setTitle] = useState("");
  const [titleKanji, setTitleKanji] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [newGenreInput, setNewGenreInput] = useState("");
  const [mangaCoverFile, setMangaCoverFile] = useState<File | null>(null);
  const [mangaCoverPreview, setMangaCoverPreview] = useState<string | null>(null);
  const [selectedVolumes, setSelectedVolumes] = useState<ParsedVolume[]>([]);

  // Pipeline execution state in Step 3
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState(0);
  const [publishingStage, setPublishingStage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessComplete, setIsSuccessComplete] = useState(false);

  const folderInputRef = useRef<HTMLInputElement>(null);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setParsedData(null);
      setTitle("");
      setTitleKanji("");
      setAuthor("");
      setDescription("");
      setGenres([]);
      setMangaCoverFile(null);
      setMangaCoverPreview(null);
      setSelectedVolumes([]);
      setIsPublishing(false);
      setPublishingProgress(0);
      setPublishingStage("");
      setErrorMessage(null);
      setIsSuccessComplete(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFolderFilesSelected = async (files: File[]) => {
    setIsParsingFolder(true);
    setErrorMessage(null);

    try {
      const parsed = await parseMangadexFolder(files);
      setParsedData(parsed);

      // Populate form state from parsed data
      setTitle(parsed.metadata.title);
      setTitleKanji(parsed.metadata.titleKanji || "");
      setAuthor(parsed.metadata.author || "");
      setDescription(parsed.metadata.description || "");
      setGenres(parsed.metadata.genres);
      setMangaCoverFile(parsed.mangaCoverFile || null);
      setMangaCoverPreview(parsed.mangaCoverPreview || null);
      setSelectedVolumes(parsed.volumes);

      // Advance to review step
      setCurrentStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar la carpeta seleccionada";
      setErrorMessage(msg);
    } finally {
      setIsParsingFolder(false);
    }
  };

  const handleFolderDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFolder(false);
    if (e.dataTransfer) {
      const files = await getAllFilesFromDataTransfer(e.dataTransfer);
      if (files.length > 0) {
        await handleFolderFilesSelected(files);
      }
    }
  };

  const handleFolderInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      await handleFolderFilesSelected(files);
    }
  };

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (mangaCoverPreview) URL.revokeObjectURL(mangaCoverPreview);
      setMangaCoverFile(file);
      setMangaCoverPreview(URL.createObjectURL(file));
    }
  };

  const addGenre = () => {
    const trimmed = newGenreInput.trim();
    if (trimmed && !genres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      setGenres([...genres, trimmed]);
      setNewGenreInput("");
    }
  };

  const removeGenre = (genreToRemove: string) => {
    setGenres(genres.filter((g) => g !== genreToRemove));
  };

  const toggleVolumeInclusion = (volIndex: number) => {
    if (!parsedData) return;
    const vol = parsedData.volumes[volIndex];
    if (selectedVolumes.some((v) => v.folderName === vol.folderName)) {
      setSelectedVolumes(selectedVolumes.filter((v) => v.folderName !== vol.folderName));
    } else {
      setSelectedVolumes([...selectedVolumes, vol].sort((a, b) => a.volumeNumber - b.volumeNumber));
    }
  };

  // Helper to resolve tag ID or create missing tag in backend
  const resolveTagId = async (
    genreName: string,
    currentTagsMap: Map<string, string>
  ): Promise<string> => {
    const normalized = genreName.trim().toLowerCase();
    if (currentTagsMap.has(normalized)) {
      return currentTagsMap.get(normalized)!;
    }

    try {
      const created = await createTag({ scope: "MANGA", name: genreName.trim() });
      currentTagsMap.set(normalized, created.id);
      return created.id;
    } catch {
      // If tag already existed or conflict, fetch fresh list
      const freshTags = await getTags("MANGA");
      const matched = freshTags.find(
        (t) => t.name.trim().toLowerCase() === normalized || t.slug.toLowerCase() === normalized
      );
      if (matched) {
        currentTagsMap.set(normalized, matched.id);
        return matched.id;
      }
      throw new Error(`No se pudo crear ni resolver la etiqueta "${genreName}"`);
    }
  };

  // Pipeline execution
  const executeFullPublishPipeline = async () => {
    setIsPublishing(true);
    setErrorMessage(null);
    setIsSuccessComplete(false);
    setPublishingProgress(5);

    try {
      // 1. Resolve / Create tags
      setPublishingStage("1/4: Comprobando y creando etiquetas en base de datos...");
      const tagsMap = new Map<string, string>();
      availableTags.forEach((t) => tagsMap.set(t.name.trim().toLowerCase(), t.id));

      const tagIds: string[] = [];
      for (const genre of genres) {
        const id = await resolveTagId(genre, tagsMap);
        if (id && !tagIds.includes(id)) {
          tagIds.push(id);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["tags", "MANGA"] });
      setPublishingProgress(20);

      // 2. Create Manga
      setPublishingStage(`2/4: Registrando "${title.trim()}" en la biblioteca...`);
      const createdManga = (await createManga({
        title: title.trim(),
        titleKanji: titleKanji.trim() || undefined,
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      })) as { id: string };

      const mangaId = createdManga.id;
      if (!mangaId) throw new Error("No se pudo obtener el ID del manga creado.");
      setPublishingProgress(35);

      // 3. Upload Manga Cover
      if (mangaCoverFile) {
        setPublishingStage("3/4: Subiendo portada principal a Cloudflare R2...");
        await uploadMangaCover({ mangaId, file: mangaCoverFile });
      }
      setPublishingProgress(50);

      // 4. Create Volumes and upload their pages & covers
      const totalVols = selectedVolumes.length;
      if (totalVols > 0) {
        const progressPerVol = 50 / totalVols;

        for (let i = 0; i < totalVols; i++) {
          const vol = selectedVolumes[i];
          const volProgressStart = 50 + i * progressPerVol;

          setPublishingStage(
            `4/4: Procesando Volumen ${vol.volumeNumber} (${i + 1} de ${totalVols}) — ${vol.pageFiles.length} páginas...`
          );

          // Create volume
          const createdVol = (await createVolume({
            mangaId,
            number: vol.volumeNumber,
            title: vol.volumeTitle || undefined,
          })) as { id: string } | undefined;

          const volumeId = createdVol?.id;

          if (volumeId) {
            // Upload volume cover if available
            if (vol.coverFile) {
              await uploadVolumeCover({
                mangaId,
                volumeId,
                file: vol.coverFile,
              });
            }

            // Upload volume pages
            if (vol.pageFiles.length > 0) {
              await uploadVolumePages({
                mangaId,
                volumeId,
                files: vol.pageFiles,
              });
            }
          }

          setPublishingProgress(Math.round(volProgressStart + progressPerVol));
        }
      }

      // Final invalidations
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes", mangaId] });
      await queryClient.invalidateQueries({ queryKey: ["tags", "MANGA"] });

      setPublishingProgress(100);
      setPublishingStage("¡Publicación completada con éxito!");
      setIsSuccessComplete(true);

      setTimeout(() => {
        setIsPublishing(false);
        onCreatedSuccess?.(mangaId);
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setIsPublishing(false);
      const msg = err instanceof Error ? err.message : "Error inesperado al publicar";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container wizard-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h3>Nuevo (Wizard mode)</h3>
            <p className="muted-text text-sm">
              Importa una carpeta estructurada con mangadex-cli (metadata.json, covers y volúmenes)
            </p>
          </div>
          <button type="button" className="ghost-button btn-xs modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Wizard Steps Indicator */}
        <div className="wizard-steps-bar">
          <div
            className={`wizard-step-pill ${
              currentStep === 1 ? "active" : currentStep > 1 ? "completed" : ""
            }`}
          >
            <span className="step-num">{currentStep > 1 ? "✓" : "1"}</span>
            <span className="step-label">Seleccionar Carpeta</span>
          </div>
          <div className="step-line" />
          <div
            className={`wizard-step-pill ${
              currentStep === 2 ? "active" : currentStep > 2 ? "completed" : ""
            }`}
          >
            <span className="step-num">{currentStep > 2 ? "✓" : "2"}</span>
            <span className="step-label">Revisar Datos & Tomos</span>
          </div>
          <div className="step-line" />
          <div className={`wizard-step-pill ${currentStep === 3 ? "active" : ""}`}>
            <span className="step-num">3</span>
            <span className="step-label">Publicación</span>
          </div>
        </div>

        {errorMessage && <ErrorBox error={{ message: errorMessage }} />}

        {/* Modal Body */}
        <div className="modal-body wizard-body">
          {/* STEP 1: Select Manga Folder */}
          {currentStep === 1 && (
            <div className="wizard-step-content">
              <div
                className={`mangadex-folder-dropzone ${isDraggingFolder ? "dropzone-active" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFolder(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDraggingFolder(false);
                }}
                onDrop={handleFolderDrop}
                onClick={() => folderInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory is standard for directory picker in modern browsers
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  className="visually-hidden"
                  onChange={handleFolderInputChange}
                />

                <div className="dropzone-inner-large">
                  <span className="folder-icon-glow">📂</span>
                  <h3>Arrastra la carpeta del Manga aquí</h3>
                  <p className="muted-text">
                    O haz clic para explorar en tu equipo y elegir el directorio descargado con <strong>mangadex-cli</strong>.
                  </p>
                  <div className="detected-features-badge-list">
                    <span className="feature-pill">✓ Lee metadata.json</span>
                    <span className="feature-pill">✓ Detecta cover.png/jpg</span>
                    <span className="feature-pill">✓ Autocrea vol_1, vol_2...</span>
                    <span className="feature-pill">✓ Autocrea géneros faltantes</span>
                  </div>
                </div>
              </div>

              {isParsingFolder && (
                <div className="parsing-status-box">
                  <div className="spinner-sm" />
                  <span>Leyendo estructura de archivos, metadatos y portadas...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Review & Edit Metadata & Volumes */}
          {currentStep === 2 && (
            <div className="wizard-step-content">
              <div className="step-split-layout">
                {/* Left: Metadata form */}
                <div className="form-grid">
                  <label className="form-field">
                    <span>Título del Manga *</span>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span>Título Kanji / Alternativo</span>
                    <input
                      type="text"
                      value={titleKanji}
                      onChange={(e) => setTitleKanji(e.target.value)}
                      placeholder="Ej. 雪にツバサ"
                    />
                  </label>

                  <label className="form-field">
                    <span>Autor / Mangaka</span>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Ej. Takahashi Shin"
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

                  {/* Genres / Tags */}
                  <div className="form-field">
                    <span>Géneros & Etiquetas</span>
                    <div className="wizard-tags-container">
                      {genres.map((g) => {
                        const existsInDb = availableTags.some(
                          (t) => t.name.toLowerCase() === g.toLowerCase()
                        );
                        return (
                          <span
                            key={g}
                            className={`wizard-genre-chip ${existsInDb ? "exists" : "new-tag"}`}
                          >
                            <span>{g}</span>
                            <span className="genre-tag-status">
                              {existsInDb ? "✓ Existente" : "+ Nuevo"}
                            </span>
                            <button
                              type="button"
                              className="chip-remove-btn"
                              onClick={() => removeGenre(g)}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <div className="add-genre-inline">
                      <input
                        type="text"
                        placeholder="Añadir otro género..."
                        value={newGenreInput}
                        onChange={(e) => setNewGenreInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addGenre();
                          }
                        }}
                      />
                      <button type="button" className="secondary-button btn-xs" onClick={addGenre}>
                        + Añadir
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Manga Cover Preview */}
                <div className="wizard-cover-upload-box">
                  <span className="field-label">Portada del Manga</span>
                  <label className="wizard-cover-dropzone">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="visually-hidden"
                      onChange={handleCoverChange}
                    />
                    {mangaCoverPreview ? (
                      <div className="cover-preview-wrapper">
                        <img src={mangaCoverPreview} alt="Preview Portada" />
                        <span className="cover-replace-tag">Clic para cambiar</span>
                      </div>
                    ) : (
                      <div className="cover-placeholder-prompt">
                        <span className="cover-icon">🖼️</span>
                        <span>Sin portada detectada</span>
                        <span className="text-xs muted-text">Clic para seleccionar</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Volumes detected review */}
              <div className="detected-volumes-section">
                <div className="detected-volumes-header">
                  <h4>
                    Tomos Detectados ({selectedVolumes.length} seleccionados de{" "}
                    {parsedData?.volumes.length || 0})
                  </h4>
                  <span className="muted-text text-xs">
                    Se crearán automáticamente con sus páginas y portadas
                  </span>
                </div>

                <div className="detected-volumes-grid">
                  {parsedData?.volumes.map((vol, idx) => {
                    const isSelected = selectedVolumes.some(
                      (v) => v.folderName === vol.folderName
                    );
                    return (
                      <div
                        key={vol.folderName}
                        className={`detected-vol-card ${isSelected ? "selected" : "deselected"}`}
                        onClick={() => toggleVolumeInclusion(idx)}
                      >
                        <div className="vol-check-indicator">{isSelected ? "✓" : "○"}</div>
                        <div className="vol-card-thumb">
                          {vol.coverPreview ? (
                            <img src={vol.coverPreview} alt={`Cover Vol ${vol.volumeNumber}`} />
                          ) : (
                            <div className="vol-thumb-placeholder">Vol.{vol.volumeNumber}</div>
                          )}
                        </div>
                        <div className="vol-card-info">
                          <span className="vol-card-number">Volumen {vol.volumeNumber}</span>
                          <span className="vol-card-pages">
                            {vol.pageFiles.length} páginas {vol.coverFile ? "+ Cover" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Publishing Progress View */}
          {currentStep === 3 && (
            <div className="wizard-step-content publishing-step-view">
              <div className="publishing-card card">
                {isSuccessComplete ? (
                  <div className="publishing-success-state">
                    <span className="success-icon-large">🎉</span>
                    <h3>¡Manga y Tomos Publicados Exitosamente!</h3>
                    <p className="muted-text">
                      Se han registrado los metadatos, creado las etiquetas y subido todas las imágenes a Cloudflare R2.
                    </p>
                  </div>
                ) : (
                  <div className="publishing-progress-state">
                    <div className="spinner-md" />
                    <h3>Procesando y Publicando Contenido</h3>
                    <p className="publishing-current-stage">{publishingStage}</p>

                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${publishingProgress}%` }}
                      />
                    </div>
                    <span className="progress-percent-label">{publishingProgress}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {currentStep === 1 && (
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancelar
            </button>
          )}

          {currentStep === 2 && (
            <>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setCurrentStep(1)}
              >
                ← Elegir otra carpeta
              </button>
              <button
                type="button"
                className="primary-button btn-gold-glow"
                disabled={!title.trim()}
                onClick={() => {
                  setCurrentStep(3);
                  executeFullPublishPipeline();
                }}
              >
                🚀 Iniciar Publicación Automática ({selectedVolumes.length} Tomos)
              </button>
            </>
          )}

          {currentStep === 3 && isPublishing && (
            <div className="muted-text text-sm">
              Por favor espera, subiendo imágenes a Cloudflare R2...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
