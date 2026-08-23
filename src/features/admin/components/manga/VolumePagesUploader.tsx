import { useState, useRef, ChangeEvent, DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadVolumePages, getPages } from "@/features/manga/api";
import { ErrorBox } from "@/components/ErrorBox";

interface VolumePagesUploaderProps {
  mangaId: string;
  volumeId: string;
  volumeNumber: number;
  volumeTitle?: string;
  onSuccess?: () => void;
}

interface LocalFilePreview {
  file: File;
  previewUrl: string;
  name: string;
}

// Natural sort for files like "01.jpg", "page2.png", "10.jpg"
function naturalSortFiles(files: File[]): File[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
}

export function VolumePagesUploader({
  mangaId,
  volumeId,
  volumeNumber,
  volumeTitle,
  onSuccess,
}: VolumePagesUploaderProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<LocalFilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showExistingPages, setShowExistingPages] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const existingPagesQuery = useQuery({
    queryKey: ["volume-pages", mangaId, volumeId],
    queryFn: () => getPages(mangaId, volumeId),
    enabled: showExistingPages,
  });

  const uploadPagesMutation = useMutation({
    mutationFn: (files: File[]) => uploadVolumePages({ mangaId, volumeId, files }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes", mangaId] });
      await queryClient.invalidateQueries({ queryKey: ["volume-pages", mangaId, volumeId] });
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
      // Clean up local preview object URLs
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setSelectedFiles([]);
      setStatusMessage("¡Páginas subidas exitosamente!");
      setTimeout(() => setStatusMessage(null), 4000);
      onSuccess?.();
    },
  });

  const handleFilesAdded = (rawFiles: FileList | File[]) => {
    const fileArray = Array.from(rawFiles).filter((f) =>
      f.type.startsWith("image/") || /\.(jpe?g|png|webp|avif)$/i.test(f.name)
    );
    if (fileArray.length === 0) return;

    const sorted = naturalSortFiles(fileArray);
    const previews: LocalFilePreview[] = sorted.map((file) => ({
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => {
      // Release previous previews
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return previews;
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[indexToRemove];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handleUploadSubmit = () => {
    if (selectedFiles.length === 0) return;
    uploadPagesMutation.mutate(selectedFiles.map((p) => p.file));
  };

  return (
    <div className="volume-pages-uploader">
      <div className="uploader-header">
        <div className="uploader-title-wrap">
          <span className="uploader-title">
            Subir Páginas • Vol. {volumeNumber} {volumeTitle ? `(${volumeTitle})` : ""}
          </span>
          <span className="uploader-count">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} imágenes listas`
              : "Selecciona o arrastra los archivos"}
          </span>
        </div>
        <button
          type="button"
          className="ghost-button btn-sm"
          onClick={() => setShowExistingPages(!showExistingPages)}
        >
          {showExistingPages ? "Ocultar páginas actuales" : "Ver páginas actuales"}
        </button>
      </div>

      {showExistingPages && (
        <div className="existing-pages-panel">
          {existingPagesQuery.isLoading && <p className="muted-text">Cargando páginas del servidor...</p>}
          {existingPagesQuery.data && existingPagesQuery.data.length === 0 && (
            <p className="muted-text">Este tomo aún no tiene páginas en el servidor.</p>
          )}
          {existingPagesQuery.data && existingPagesQuery.data.length > 0 && (
            <div>
              <p className="existing-pages-summary">
                {existingPagesQuery.data.length} páginas almacenadas en CDN:
              </p>
              <div className="existing-pages-grid">
                {existingPagesQuery.data.map((page) => (
                  <div key={page.pageNumber} className="existing-page-thumb">
                    <img src={page.imageUrl} alt={`Página ${page.pageNumber}`} loading="lazy" />
                    <span className="page-num-tag">Pág. {page.pageNumber}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dropzone */}
      <div
        className={`dropzone-container ${isDragging ? "dropzone-active" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          multiple
          className="visually-hidden"
          onChange={handleInputChange}
        />
        <div className="dropzone-inner">
          <span className="dropzone-icon">📥</span>
          <p className="dropzone-prompt">
            <strong>Haz clic para examinar</strong> o arrastra todas las imágenes aquí
          </p>
          <span className="dropzone-hint">
            Soporta JPG, PNG, WEBP. Se ordenan automáticamente por nombre (ej. 01.jpg, 02.jpg).
          </span>
        </div>
      </div>

      {uploadPagesMutation.isError && <ErrorBox error={uploadPagesMutation.error} />}
      {statusMessage && <div className="success-banner">{statusMessage}</div>}

      {/* Preview Grid for selected files */}
      {selectedFiles.length > 0 && (
        <div className="upload-preview-section">
          <div className="upload-preview-bar">
            <span className="preview-heading">
              Orden de carga ({selectedFiles.length} páginas)
            </span>
            <div className="preview-actions">
              <button
                type="button"
                className="secondary-button btn-sm"
                onClick={() => {
                  selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                  setSelectedFiles([]);
                }}
                disabled={uploadPagesMutation.isPending}
              >
                Limpiar selección
              </button>
              <button
                type="button"
                className="primary-button btn-sm"
                onClick={handleUploadSubmit}
                disabled={uploadPagesMutation.isPending}
              >
                {uploadPagesMutation.isPending
                  ? "Subiendo a CDN..."
                  : `Subir ${selectedFiles.length} Páginas`}
              </button>
            </div>
          </div>

          <div className="upload-thumbnails-grid">
            {selectedFiles.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="upload-thumb-card">
                <div className="thumb-image-wrap">
                  <img src={item.previewUrl} alt={item.name} />
                  <span className="thumb-order-badge">#{idx + 1}</span>
                  <button
                    type="button"
                    className="thumb-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    title="Quitar imagen"
                  >
                    ×
                  </button>
                </div>
                <span className="thumb-filename" title={item.name}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>

          {uploadPagesMutation.isPending && (
            <div className="upload-progress-card">
              <div className="spinner-sm" />
              <span>Procesando y enviando páginas a Cloudflare R2...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
