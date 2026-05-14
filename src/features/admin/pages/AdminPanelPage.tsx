import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ErrorBox } from "@/components/ErrorBox";
import { SuccessBox } from "@/components/SuccessBox";
import {
  createManga,
  createVolume,
  getMangaList,
  getVolumes,
  uploadVolumePages
} from "@/features/manga/api";
import { createBook, getBooks, uploadEpub } from "@/features/books/api";
import { promoteUser } from "@/features/auth/api";

const createMangaSchema = z.object({
  title: z.string().min(2, "Título demasiado corto"),
  description: z.string().optional()
});

const createVolumeSchema = z.object({
  mangaId: z.string().min(1, "Seleccioná un manga"),
  title: z.string().min(1, "Título requerido"),
  number: z.number().int().positive().optional()
});

const createBookSchema = z.object({
  title: z.string().min(2, "Título demasiado corto"),
  author: z.string().optional(),
  description: z.string().optional()
});

export function AdminPanelPage() {
  const queryClient = useQueryClient();
  const [mangaTitle, setMangaTitle] = useState("");
  const [mangaDescription, setMangaDescription] = useState("");
  const [volumeMangaId, setVolumeMangaId] = useState("");
  const [volumeTitle, setVolumeTitle] = useState("");
  const [volumeNumber, setVolumeNumber] = useState("");
  const [uploadMangaId, setUploadMangaId] = useState("");
  const [uploadVolumeId, setUploadVolumeId] = useState("");
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [epubBookId, setEpubBookId] = useState("");
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [mangaSuccess, setMangaSuccess] = useState<string | null>(null);
  const [volumeSuccess, setVolumeSuccess] = useState<string | null>(null);
  const [pagesSuccess, setPagesSuccess] = useState<string | null>(null);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [epubSuccess, setEpubSuccess] = useState<string | null>(null);
  const [promoteSuccess, setPromoteSuccess] = useState<string | null>(null);

  const mangaQuery = useQuery({
    queryKey: ["manga-list"],
    queryFn: getMangaList
  });

  const volumesQuery = useQuery({
    queryKey: ["manga-volumes", uploadMangaId],
    queryFn: () => getVolumes(uploadMangaId),
    enabled: Boolean(uploadMangaId)
  });

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: getBooks
  });

  const createMangaMutation = useMutation({
    mutationFn: createManga,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list"] });
      setMangaSuccess("Manga creado correctamente");
      setMangaTitle("");
      setMangaDescription("");
    },
    onError: () => setMangaSuccess(null)
  });

  const createVolumeMutation = useMutation({
    mutationFn: createVolume,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes"] });
      setVolumeSuccess("Volumen creado correctamente");
      setVolumeMangaId("");
      setVolumeTitle("");
      setVolumeNumber("");
    },
    onError: () => setVolumeSuccess(null)
  });

  const uploadPagesMutation = useMutation({
    mutationFn: uploadVolumePages,
    onSuccess: () => {
      setPagesSuccess("Páginas subidas correctamente");
      setUploadMangaId("");
      setUploadVolumeId("");
      setPageFiles([]);
      setFileInputKey((k) => k + 1);
    },
    onError: () => setPagesSuccess(null)
  });

  const createBookMutation = useMutation({
    mutationFn: createBook,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      setBookSuccess("Book creado correctamente");
      setBookTitle("");
      setBookAuthor("");
      setBookDescription("");
    },
    onError: () => setBookSuccess(null)
  });

  const uploadEpubMutation = useMutation({
    mutationFn: uploadEpub,
    onSuccess: () => {
      setEpubSuccess("EPUB subido correctamente");
      setEpubBookId("");
      setEpubFile(null);
      setFileInputKey((k) => k + 1);
    },
    onError: () => setEpubSuccess(null)
  });

  const promoteUserMutation = useMutation({
    mutationFn: (email: string) => promoteUser(email),
    onSuccess: (data) => {
      setPromoteSuccess(`Usuario ${data.email} promovido a ${data.role}`);
      setPromoteEmail("");
    },
    onError: () => setPromoteSuccess(null)
  });

  const uploadVolumes = useMemo(() => volumesQuery.data ?? [], [volumesQuery.data]);

  const submitCreateManga = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMangaSuccess(null);
    const parsed = createMangaSchema.safeParse({
      title: mangaTitle,
      description: mangaDescription || undefined
    });
    if (!parsed.success) {
      setMangaSuccess(null);
      return;
    }
    createMangaMutation.mutate(parsed.data);
  };

  const submitCreateVolume = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVolumeSuccess(null);
    const number = volumeNumber ? Number(volumeNumber) : undefined;
    const parsed = createVolumeSchema.safeParse({
      mangaId: volumeMangaId,
      title: volumeTitle,
      number
    });
    if (!parsed.success) {
      setVolumeSuccess(null);
      return;
    }
    createVolumeMutation.mutate(parsed.data);
  };

  const submitUploadPages = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPagesSuccess(null);
    if (!uploadMangaId || !uploadVolumeId || pageFiles.length === 0) {
      return;
    }
    uploadPagesMutation.mutate({
      mangaId: uploadMangaId,
      volumeId: uploadVolumeId,
      files: pageFiles
    });
  };

  const submitCreateBook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookSuccess(null);
    const parsed = createBookSchema.safeParse({
      title: bookTitle,
      author: bookAuthor || undefined,
      description: bookDescription || undefined
    });
    if (!parsed.success) {
      setBookSuccess(null);
      return;
    }
    createBookMutation.mutate(parsed.data);
  };

  const submitPromoteUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPromoteSuccess(null);
    if (!promoteEmail.trim()) {
      return;
    }
    promoteUserMutation.mutate(promoteEmail.trim());
  };

  const submitUploadEpub = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEpubSuccess(null);
    if (!epubBookId || !epubFile) {
      return;
    }
    uploadEpubMutation.mutate({ bookId: epubBookId, file: epubFile });
  };

  return (
    <section className="grid">
      <h1>Admin Panel</h1>
      <p className="muted-text">Operaciones básicas para contenido manga y books.</p>

      <div className="grid grid-2">
        <article className="card">
          <h2>Crear Manga</h2>
          <form onSubmit={submitCreateManga} className="form-grid">
            <label>
              Título
              <input value={mangaTitle} onChange={(e) => setMangaTitle(e.target.value)} />
            </label>
            <label>
              Descripción
              <textarea
                value={mangaDescription}
                onChange={(e) => setMangaDescription(e.target.value)}
              />
            </label>
            {createMangaMutation.isError && <ErrorBox error={createMangaMutation.error} />}
            <button type="submit" disabled={createMangaMutation.isPending}>
              Crear manga
            </button>
            {mangaSuccess && <SuccessBox message={mangaSuccess} />}
          </form>
        </article>

        <article className="card">
          <h2>Crear Volumen</h2>
          <form onSubmit={submitCreateVolume} className="form-grid">
            <label>
              Manga
              <select
                value={volumeMangaId}
                onChange={(e) => setVolumeMangaId(e.target.value)}
              >
                <option value="">Seleccionar</option>
                {mangaQuery.data?.map((manga) => (
                  <option key={manga.id} value={manga.id}>
                    {manga.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título volumen
              <input value={volumeTitle} onChange={(e) => setVolumeTitle(e.target.value)} />
            </label>
            <label>
              Número
              <input
                type="number"
                value={volumeNumber}
                onChange={(e) => setVolumeNumber(e.target.value)}
              />
            </label>
            {createVolumeMutation.isError && <ErrorBox error={createVolumeMutation.error} />}
            <button type="submit" disabled={createVolumeMutation.isPending}>
              Crear volumen
            </button>
            {volumeSuccess && <SuccessBox message={volumeSuccess} />}
          </form>
        </article>

        <article className="card">
          <h2>Upload Páginas</h2>
          <form onSubmit={submitUploadPages} className="form-grid">
            <label>
              Manga
              <select
                value={uploadMangaId}
                onChange={(e) => {
                  setUploadMangaId(e.target.value);
                  setUploadVolumeId("");
                }}
              >
                <option value="">Seleccionar</option>
                {mangaQuery.data?.map((manga) => (
                  <option key={manga.id} value={manga.id}>
                    {manga.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Volumen
              <select
                value={uploadVolumeId}
                onChange={(e) => setUploadVolumeId(e.target.value)}
              >
                <option value="">Seleccionar</option>
                {uploadVolumes.map((volume) => (
                  <option key={volume.id} value={volume.id}>
                    {volume.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Imágenes
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPageFiles(Array.from(e.target.files ?? []))}
              />
            </label>
            {uploadPagesMutation.isError && <ErrorBox error={uploadPagesMutation.error} />}
            <button type="submit" disabled={uploadPagesMutation.isPending}>
              Subir páginas
            </button>
            {pagesSuccess && <SuccessBox message={pagesSuccess} />}
          </form>
        </article>

        <article className="card">
          <h2>Crear Book + Upload EPUB</h2>
          <form onSubmit={submitCreateBook} className="form-grid">
            <label>
              Título
              <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
            </label>
            <label>
              Autor
              <input value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} />
            </label>
            <label>
              Descripción
              <textarea
                value={bookDescription}
                onChange={(e) => setBookDescription(e.target.value)}
              />
            </label>
            {createBookMutation.isError && <ErrorBox error={createBookMutation.error} />}
            <button type="submit" disabled={createBookMutation.isPending}>
              Crear book
            </button>
            {bookSuccess && <SuccessBox message={bookSuccess} />}
          </form>

          <form onSubmit={submitUploadEpub} className="form-grid">
            <label>
              Book
              <select value={epubBookId} onChange={(e) => setEpubBookId(e.target.value)}>
                <option value="">Seleccionar</option>
                {booksQuery.data?.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              EPUB
              <input
                key={fileInputKey}
                type="file"
                accept=".epub,application/epub+zip"
                onChange={(e) => setEpubFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {uploadEpubMutation.isError && <ErrorBox error={uploadEpubMutation.error} />}
            <button type="submit" disabled={uploadEpubMutation.isPending}>
              Subir EPUB
            </button>
            {epubSuccess && <SuccessBox message={epubSuccess} />}
          </form>
        </article>
        <article className="card">
          <h2>Promover a Admin</h2>
          <form onSubmit={submitPromoteUser} className="form-grid">
            <label>
              Email del usuario
              <input
                type="email"
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </label>
            {promoteUserMutation.isError && <ErrorBox error={promoteUserMutation.error} />}
            <button type="submit" disabled={promoteUserMutation.isPending}>
              Promover a Admin
            </button>
            {promoteSuccess && <SuccessBox message={promoteSuccess} />}
          </form>
        </article>
      </div>
    </section>
  );
}
