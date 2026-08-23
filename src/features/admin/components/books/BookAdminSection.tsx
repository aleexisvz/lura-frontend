import { useState, useRef, FormEvent, ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Book, Tag } from "@/types/domain";
import {
  getBooks,
  createBook,
  updateBook,
  uploadBookCover,
  uploadEpub,
} from "@/features/books/api";
import { ErrorBox } from "@/components/ErrorBox";

interface BookAdminSectionProps {
  tags: Tag[];
}

export function BookAdminSection({ tags }: BookAdminSectionProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingBook, setIsCreatingBook] = useState(false);

  // New book state
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverPreview, setNewCoverPreview] = useState<string | null>(null);
  const [newEpubFile, setNewEpubFile] = useState<File | null>(null);
  const [isSubmittingNewBook, setIsSubmittingNewBook] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);

  // Edit book state
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  // Direct cover / epub upload target
  const coverInputRef = useRef<HTMLInputElement>(null);
  const epubInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetBookId, setUploadTargetBookId] = useState<string | null>(null);

  const booksQuery = useQuery({
    queryKey: ["books-admin"],
    queryFn: () => getBooks(),
  });

  const books: Book[] = booksQuery.data ?? [];

  const filteredBooks = books.filter((b) => {
    if (!searchQuery.trim()) return true;
    return (
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Mutations
  const updateBookMutation = useMutation({
    mutationFn: updateBook,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books-admin"] });
      setEditingBook(null);
      setSubmitFeedback("Libro actualizado correctamente");
      setTimeout(() => setSubmitFeedback(null), 3500);
    },
  });

  const uploadCoverMutation = useMutation({
    mutationFn: uploadBookCover,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books-admin"] });
      setUploadTargetBookId(null);
      setSubmitFeedback("Portada de libro actualizada");
      setTimeout(() => setSubmitFeedback(null), 3500);
    },
  });

  const uploadEpubMutation = useMutation({
    mutationFn: uploadEpub,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books-admin"] });
      setUploadTargetBookId(null);
      setSubmitFeedback("Archivo EPUB subido exitosamente");
      setTimeout(() => setSubmitFeedback(null), 3500);
    },
  });

  const toggleNewTag = (tagId: string) => {
    setNewTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleEditTag = (tagId: string) => {
    setEditTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleNewCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (newCoverPreview) URL.revokeObjectURL(newCoverPreview);
      setNewCoverFile(file);
      setNewCoverPreview(URL.createObjectURL(file));
    }
  };

  // Unified all-in-one create pipeline
  const handleCreateBookPipeline = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmittingNewBook(true);
    setCreateErrorMessage(null);

    try {
      // 1. Create book record
      const created = (await createBook({
        title: newTitle.trim(),
        author: newAuthor.trim() || undefined,
        description: newDescription.trim() || undefined,
        tagIds: newTagIds.length > 0 ? newTagIds : undefined,
      })) as Book | { id: string };

      const bookId = created.id;

      // 2. Upload cover if selected
      if (newCoverFile && bookId) {
        await uploadBookCover({ bookId, file: newCoverFile });
      }

      // 3. Upload epub if selected
      if (newEpubFile && bookId) {
        await uploadEpub({ bookId, file: newEpubFile });
      }

      await queryClient.invalidateQueries({ queryKey: ["books-admin"] });

      // Reset form
      setNewTitle("");
      setNewAuthor("");
      setNewDescription("");
      setNewTagIds([]);
      setNewCoverFile(null);
      if (newCoverPreview) URL.revokeObjectURL(newCoverPreview);
      setNewCoverPreview(null);
      setNewEpubFile(null);
      setIsCreatingBook(false);

      setSubmitFeedback("¡Libro creado y publicado exitosamente!");
      setTimeout(() => setSubmitFeedback(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear libro";
      setCreateErrorMessage(msg);
    } finally {
      setIsSubmittingNewBook(false);
    }
  };

  const startEditBook = (book: Book) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author || "");
    setEditDescription(book.description || "");
    setEditTagIds(book.tags.map((t) => t.id));
  };

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editTitle.trim()) return;
    updateBookMutation.mutate({
      bookId: editingBook.id,
      title: editTitle.trim(),
      author: editAuthor.trim() || undefined,
      description: editDescription.trim() || undefined,
      tagIds: editTagIds,
    });
  };

  const triggerUploadCoverForBook = (bookId: string) => {
    setUploadTargetBookId(bookId);
    coverInputRef.current?.click();
  };

  const triggerUploadEpubForBook = (bookId: string) => {
    setUploadTargetBookId(bookId);
    epubInputRef.current?.click();
  };

  const handleCoverFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetBookId) {
      uploadCoverMutation.mutate({ bookId: uploadTargetBookId, file });
    }
  };

  const handleEpubFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetBookId) {
      uploadEpubMutation.mutate({ bookId: uploadTargetBookId, file });
    }
  };

  return (
    <div className="books-admin-section">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="visually-hidden"
        onChange={handleCoverFileSelected}
      />
      <input
        ref={epubInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        className="visually-hidden"
        onChange={handleEpubFileSelected}
      />

      <div className="admin-section-header">
        <div className="header-info">
          <h2>Gestión de Libros & EPUBs</h2>
          <p className="muted-text">
            {books.length} libros registrados • Sube archivos .epub, administra portadas y metadatos.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="primary-button btn-gold-glow"
            onClick={() => setIsCreatingBook(!isCreatingBook)}
          >
            {isCreatingBook ? "Cerrar Formulario" : "✨ + Nuevo Libro"}
          </button>
        </div>
      </div>

      {submitFeedback && <div className="success-banner">{submitFeedback}</div>}

      {/* Unified All-in-One Book Creator */}
      {isCreatingBook && (
        <div className="unified-create-card card">
          <div className="card-header-bar">
            <h3>Registrar y Publicar Libro</h3>
            <span className="muted-text text-xs">
              Completa la información y adjunta portada y archivo EPUB de una sola vez
            </span>
          </div>

          {createErrorMessage && <ErrorBox error={{ message: createErrorMessage }} />}

          <form onSubmit={handleCreateBookPipeline} className="unified-book-form">
            <div className="form-split-grid">
              {/* Left Column: Metadata */}
              <div className="form-grid">
                <label className="form-field">
                  <span>Título del Libro *</span>
                  <input
                    type="text"
                    placeholder="Ej. El Señor de los Anillos"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </label>
                <label className="form-field">
                  <span>Autor</span>
                  <input
                    type="text"
                    placeholder="Ej. J.R.R. Tolkien"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Descripción / Sinopsis</span>
                  <textarea
                    rows={3}
                    placeholder="Sinopsis de la obra..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </label>
                <div className="form-field">
                  <span>Etiquetas (Tags)</span>
                  <div className="tag-selector-chips max-h-32">
                    {tags.map((tag) => {
                      const isSelected = newTagIds.includes(tag.id);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          className={`chip-toggle ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleNewTag(tag.id)}
                        >
                          {tag.name} {isSelected && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Files */}
              <div className="files-upload-column">
                {/* Cover File */}
                <div className="file-dropzone-box">
                  <span className="field-label">Portada del Libro</span>
                  <label className="wizard-cover-dropzone">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="visually-hidden"
                      onChange={handleNewCoverChange}
                    />
                    {newCoverPreview ? (
                      <div className="cover-preview-wrapper">
                        <img src={newCoverPreview} alt="Preview Portada" />
                        <span className="cover-replace-tag">Cambiar portada</span>
                      </div>
                    ) : (
                      <div className="cover-placeholder-prompt">
                        <span className="cover-icon">🖼️</span>
                        <span>Seleccionar Portada</span>
                        <span className="text-xs muted-text">JPG, PNG o WEBP</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* EPUB File */}
                <div className="file-dropzone-box">
                  <span className="field-label">Archivo Digital (.EPUB)</span>
                  <label className="epub-dropzone">
                    <input
                      type="file"
                      accept=".epub,application/epub+zip"
                      className="visually-hidden"
                      onChange={(e) => setNewEpubFile(e.target.files?.[0] ?? null)}
                    />
                    <div className="epub-placeholder-prompt">
                      <span className="epub-icon">📄</span>
                      <span>
                        {newEpubFile ? newEpubFile.name : "Seleccionar archivo .EPUB"}
                      </span>
                      <span className="text-xs muted-text">
                        {newEpubFile
                          ? `${(newEpubFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : "Arrastra o haz clic"}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-submit-row">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsCreatingBook(false)}
                disabled={isSubmittingNewBook}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="primary-button btn-gold-glow"
                disabled={isSubmittingNewBook || !newTitle.trim()}
              >
                {isSubmittingNewBook ? "Publicando Libro..." : "🚀 Publicar Libro Completo"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Book Modal / Inline Box */}
      {editingBook && (
        <div className="modal-backdrop" onClick={() => setEditingBook(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Libro: {editingBook.title}</h3>
              <button
                type="button"
                className="ghost-button btn-xs modal-close-btn"
                onClick={() => setEditingBook(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-body form-grid">
              <label className="form-field">
                <span>Título</span>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Autor</span>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Sinopsis</span>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </label>
              <div className="form-field">
                <span>Etiquetas</span>
                <div className="tag-selector-chips max-h-32">
                  {tags.map((tag) => {
                    const isSelected = editTagIds.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        className={`chip-toggle ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleEditTag(tag.id)}
                      >
                        {tag.name} {isSelected && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setEditingBook(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={updateBookMutation.isPending}
                >
                  {updateBookMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar libros por título o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Books Table / Grid */}
      <div className="books-admin-grid">
        {filteredBooks.map((book) => (
          <div key={book.id} className="book-admin-card card">
            <div className="book-card-cover-wrap">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} />
              ) : (
                <div className="book-cover-placeholder">📚</div>
              )}
            </div>

            <div className="book-card-body">
              <div className="book-card-title-row">
                <h4 className="book-card-title">{book.title}</h4>
                <span className={`status-tag ${book.hasEpub ? "ready" : "pending"}`}>
                  {book.hasEpub ? "EPUB Disponible" : "Sin EPUB"}
                </span>
              </div>
              <span className="book-card-author">{book.author || "Autor Desconocido"}</span>

              <div className="book-card-tags">
                {book.tags.map((t) => (
                  <span key={t.id} className="tag-pill">
                    {t.name}
                  </span>
                ))}
              </div>

              <div className="book-card-actions">
                <button
                  type="button"
                  className="secondary-button btn-xs"
                  onClick={() => startEditBook(book)}
                >
                  ✏️ Editar Datos
                </button>
                <button
                  type="button"
                  className="secondary-button btn-xs"
                  onClick={() => triggerUploadCoverForBook(book.id)}
                >
                  📷 Portada
                </button>
                <button
                  type="button"
                  className="secondary-button btn-xs"
                  onClick={() => triggerUploadEpubForBook(book.id)}
                >
                  📄 Subir EPUB
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
