import { useState } from "react";

export type BookNote = {
  id: string;
  pageNumber: number;
  text: string;
  createdAt: string;
};

type BookNotesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  notes: BookNote[];
  onAddNote: (pageNumber: number, text: string) => void;
  onRemoveNote: (id: string) => void;
  onSelectPage: (pageNumber: number) => void;
};

export function BookNotesModal({
  isOpen,
  onClose,
  currentPage,
  notes,
  onAddNote,
  onRemoveNote,
  onSelectPage,
}: BookNotesModalProps) {
  const [newNoteText, setNewNoteText] = useState("");

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(currentPage, newNoteText.trim());
    setNewNoteText("");
  };

  return (
    <div className="book-modal-backdrop" onClick={onClose}>
      <div
        className="book-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notas de lectura"
      >
        <div className="book-modal-header">
          <div className="book-modal-title-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <h3>Notas de Lectura</h3>
          </div>
          <button type="button" className="book-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="book-modal-body">
          {/* Form to add note */}
          <form className="book-notes-form" onSubmit={handleSave}>
            <label className="book-notes-label">
              Nueva nota en la página <strong>{currentPage}</strong>:
            </label>
            <textarea
              className="book-notes-textarea"
              placeholder="Escribe tus reflexiones, ideas o citas aquí..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className="book-modal-primary-btn"
              disabled={!newNoteText.trim()}
            >
              Guardar Nota
            </button>
          </form>

          {/* List of existing notes */}
          <div className="book-modal-list">
            {notes.length === 0 ? (
              <p className="book-modal-empty">No hay notas guardadas todavía.</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="book-note-card">
                  <div className="book-note-card-header">
                    <button
                      type="button"
                      className="book-modal-page-tag"
                      onClick={() => {
                        onSelectPage(note.pageNumber);
                        onClose();
                      }}
                      title="Ir a esta página"
                    >
                      Pág. {note.pageNumber}
                    </button>
                    <button
                      type="button"
                      className="book-modal-item-delete"
                      onClick={() => onRemoveNote(note.id)}
                      title="Eliminar nota"
                      aria-label="Eliminar nota"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <p className="book-note-text">{note.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
