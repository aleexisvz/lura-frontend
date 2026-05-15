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
  updateManga,
  updateVolume,
  uploadMangaCover,
  uploadVolumeCover,
  uploadVolumePages,
} from "@/features/manga/api";
import {
  createBook,
  getBooks,
  updateBook,
  uploadBookCover,
  uploadEpub,
} from "@/features/books/api";
import { promoteUser } from "@/features/auth/api";

function parseCategoriesInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

const categoriesSchema = z.array(z.string().trim().min(1).max(50)).max(20);

const createMangaSchema = z.object({
  title: z.string().trim().min(2, "Título demasiado corto"),
  author: z.string().trim().optional(),
  categories: categoriesSchema.optional(),
});

const updateMangaSchema = z.object({
  mangaId: z.string().trim().min(1, "Seleccioná un manga"),
  title: z.string().trim().optional(),
  author: z.string().trim().optional(),
  categories: categoriesSchema.optional(),
});

const createVolumeSchema = z.object({
  mangaId: z.string().trim().min(1, "Seleccioná un manga"),
  title: z.string().trim().optional(),
  number: z.number().int().positive(),
});

const updateVolumeSchema = z.object({
  mangaId: z.string().trim().min(1, "Seleccioná un manga"),
  volumeId: z.string().trim().min(1, "Seleccioná un volumen"),
  title: z.string().trim().optional(),
  number: z.number().int().positive().optional(),
});

const createBookSchema = z.object({
  title: z.string().trim().min(2, "Título demasiado corto"),
  author: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categories: categoriesSchema.optional(),
});

const updateBookSchema = z.object({
  bookId: z.string().trim().min(1, "Seleccioná un book"),
  title: z.string().trim().optional(),
  author: z.string().trim().optional(),
  description: z.string().trim().optional(),
  categories: categoriesSchema.optional(),
});

export function AdminPanelPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [mangaTitle, setMangaTitle] = useState("");
  const [mangaAuthor, setMangaAuthor] = useState("");
  const [mangaCategoriesInput, setMangaCategoriesInput] = useState("");
  const [editMangaId, setEditMangaId] = useState("");
  const [editMangaTitle, setEditMangaTitle] = useState("");
  const [editMangaAuthor, setEditMangaAuthor] = useState("");
  const [editMangaCategoriesInput, setEditMangaCategoriesInput] = useState("");
  const [mangaCoverId, setMangaCoverId] = useState("");
  const [mangaCoverFile, setMangaCoverFile] = useState<File | null>(null);

  const [volumeMangaId, setVolumeMangaId] = useState("");
  const [volumeTitle, setVolumeTitle] = useState("");
  const [volumeNumber, setVolumeNumber] = useState("");
  const [editVolumeMangaId, setEditVolumeMangaId] = useState("");
  const [editVolumeId, setEditVolumeId] = useState("");
  const [editVolumeTitle, setEditVolumeTitle] = useState("");
  const [editVolumeNumber, setEditVolumeNumber] = useState("");
  const [uploadMangaId, setUploadMangaId] = useState("");
  const [uploadVolumeId, setUploadVolumeId] = useState("");
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [volumeCoverMangaId, setVolumeCoverMangaId] = useState("");
  const [volumeCoverId, setVolumeCoverId] = useState("");
  const [volumeCoverFile, setVolumeCoverFile] = useState<File | null>(null);

  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [bookCategoriesInput, setBookCategoriesInput] = useState("");
  const [editBookId, setEditBookId] = useState("");
  const [editBookTitle, setEditBookTitle] = useState("");
  const [editBookAuthor, setEditBookAuthor] = useState("");
  const [editBookDescription, setEditBookDescription] = useState("");
  const [editBookCategoriesInput, setEditBookCategoriesInput] = useState("");
  const [epubBookId, setEpubBookId] = useState("");
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [bookCoverId, setBookCoverId] = useState("");
  const [bookCoverFile, setBookCoverFile] = useState<File | null>(null);

  const [promoteEmail, setPromoteEmail] = useState("");

  const mangaQuery = useQuery({
    queryKey: ["manga-list"],
    queryFn: () => getMangaList(),
  });

  const createVolumeMangaVolumesQuery = useQuery({
    queryKey: ["manga-volumes", editVolumeMangaId],
    queryFn: () => getVolumes(editVolumeMangaId),
    enabled: Boolean(editVolumeMangaId),
  });

  const uploadPagesVolumesQuery = useQuery({
    queryKey: ["manga-volumes", uploadMangaId],
    queryFn: () => getVolumes(uploadMangaId),
    enabled: Boolean(uploadMangaId),
  });

  const volumeCoverVolumesQuery = useQuery({
    queryKey: ["manga-volumes", volumeCoverMangaId],
    queryFn: () => getVolumes(volumeCoverMangaId),
    enabled: Boolean(volumeCoverMangaId),
  });

  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: () => getBooks(),
  });

  const createMangaMutation = useMutation({
    mutationFn: createManga,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list"] });
      setSuccess("Manga creado correctamente");
      setMangaTitle("");
      setMangaAuthor("");
      setMangaCategoriesInput("");
    },
  });

  const updateMangaMutation = useMutation({
    mutationFn: updateManga,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list"] });
      await queryClient.invalidateQueries({ queryKey: ["manga-detail", editMangaId] });
      setSuccess("Manga actualizado correctamente");
    },
  });

  const createVolumeMutation = useMutation({
    mutationFn: createVolume,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes"] });
      setSuccess("Volumen creado correctamente");
      setVolumeTitle("");
      setVolumeNumber("");
    },
  });

  const updateVolumeMutation = useMutation({
    mutationFn: updateVolume,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes"] });
      setSuccess("Volumen actualizado correctamente");
    },
  });

  const uploadPagesMutation = useMutation({
    mutationFn: uploadVolumePages,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes"] });
      setSuccess("Páginas subidas correctamente");
      setUploadMangaId("");
      setUploadVolumeId("");
      setPageFiles([]);
      setFileInputKey((key) => key + 1);
    },
  });

  const uploadMangaCoverMutation = useMutation({
    mutationFn: uploadMangaCover,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list"] });
      setSuccess("Portada de manga subida correctamente");
      setMangaCoverFile(null);
      setFileInputKey((key) => key + 1);
    },
  });

  const uploadVolumeCoverMutation = useMutation({
    mutationFn: uploadVolumeCover,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-volumes"] });
      setSuccess("Portada de volumen subida correctamente");
      setVolumeCoverFile(null);
      setFileInputKey((key) => key + 1);
    },
  });

  const createBookMutation = useMutation({
    mutationFn: createBook,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      setSuccess("Book creado correctamente");
      setBookTitle("");
      setBookAuthor("");
      setBookDescription("");
      setBookCategoriesInput("");
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: updateBook,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      await queryClient.invalidateQueries({ queryKey: ["book-detail", editBookId] });
      setSuccess("Book actualizado correctamente");
    },
  });

  const uploadEpubMutation = useMutation({
    mutationFn: uploadEpub,
    onSuccess: () => {
      setSuccess("EPUB subido correctamente");
      setEpubBookId("");
      setEpubFile(null);
      setFileInputKey((key) => key + 1);
    },
  });

  const uploadBookCoverMutation = useMutation({
    mutationFn: uploadBookCover,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books"] });
      setSuccess("Portada de book subida correctamente");
      setBookCoverFile(null);
      setFileInputKey((key) => key + 1);
    },
  });

  const promoteUserMutation = useMutation({
    mutationFn: (email: string) => promoteUser(email),
    onSuccess: (data) => {
      setSuccess(`Usuario ${data.email} promovido a ${data.role}`);
      setPromoteEmail("");
    },
  });

  const availableEditVolumes = useMemo(
    () => createVolumeMangaVolumesQuery.data ?? [],
    [createVolumeMangaVolumesQuery.data]
  );

  const availableUploadVolumes = useMemo(
    () => uploadPagesVolumesQuery.data ?? [],
    [uploadPagesVolumesQuery.data]
  );

  const availableVolumeCoverVolumes = useMemo(
    () => volumeCoverVolumesQuery.data ?? [],
    [volumeCoverVolumesQuery.data]
  );

  const handleMutationError = (
    mutation:
      | typeof createMangaMutation
      | typeof updateMangaMutation
      | typeof createVolumeMutation
      | typeof updateVolumeMutation
      | typeof uploadPagesMutation
      | typeof uploadMangaCoverMutation
      | typeof uploadVolumeCoverMutation
      | typeof createBookMutation
      | typeof updateBookMutation
      | typeof uploadEpubMutation
      | typeof uploadBookCoverMutation
      | typeof promoteUserMutation
  ) => mutation.isError && <ErrorBox error={mutation.error} />;

  const submitCreateManga = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    const parsed = createMangaSchema.safeParse({
      title: mangaTitle,
      author: mangaAuthor || undefined,
      categories: parseCategoriesInput(mangaCategoriesInput),
    });
    if (!parsed.success) return;
    createMangaMutation.mutate(parsed.data);
  };

  const submitUpdateManga = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    const parsed = updateMangaSchema.safeParse({
      mangaId: editMangaId,
      title: editMangaTitle || undefined,
      author: editMangaAuthor || undefined,
      categories: parseCategoriesInput(editMangaCategoriesInput),
    });
    if (!parsed.success) return;
    updateMangaMutation.mutate(parsed.data);
  };

  const submitCreateVolume = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    const parsed = createVolumeSchema.safeParse({
      mangaId: volumeMangaId,
      title: volumeTitle || undefined,
      number: Number(volumeNumber),
    });
    if (!parsed.success) return;
    createVolumeMutation.mutate(parsed.data);
  };

  const submitUpdateVolume = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    const parsed = updateVolumeSchema.safeParse({
      mangaId: editVolumeMangaId,
      volumeId: editVolumeId,
      title: editVolumeTitle || undefined,
      number: editVolumeNumber ? Number(editVolumeNumber) : undefined,
    });
    if (!parsed.success) return;
    updateVolumeMutation.mutate(parsed.data);
  };

  const submitUploadPages = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    if (!uploadMangaId || !uploadVolumeId || pageFiles.length === 0) return;
    uploadPagesMutation.mutate({
      mangaId: uploadMangaId,
      volumeId: uploadVolumeId,
      files: pageFiles,
    });
  };

  const submitUploadMangaCover = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    if (!mangaCoverId || !mangaCoverFile) return;
    uploadMangaCoverMutation.mutate({
      mangaId: mangaCoverId,
      file: mangaCoverFile,
    });
  };

  const submitUploadVolumeCover = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    if (!volumeCoverMangaId || !volumeCoverId || !volumeCoverFile) return;
    uploadVolumeCoverMutation.mutate({
      mangaId: volumeCoverMangaId,
      volumeId: volumeCoverId,
      file: volumeCoverFile,
    });
  };

  const submitCreateBook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    const parsed = createBookSchema.safeParse({
      title: bookTitle,
      author: bookAuthor || undefined,
      description: bookDescription || undefined,
      categories: parseCategoriesInput(bookCategoriesInput),
    });
    if (!parsed.success) return;
    createBookMutation.mutate(parsed.data);
  };

  const submitUpdateBook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    const parsed = updateBookSchema.safeParse({
      bookId: editBookId,
      title: editBookTitle || undefined,
      author: editBookAuthor || undefined,
      description: editBookDescription || undefined,
      categories: parseCategoriesInput(editBookCategoriesInput),
    });
    if (!parsed.success) return;
    updateBookMutation.mutate(parsed.data);
  };

  const submitUploadEpub = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    if (!epubBookId || !epubFile) return;
    uploadEpubMutation.mutate({ bookId: epubBookId, file: epubFile });
  };

  const submitUploadBookCover = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    if (!bookCoverId || !bookCoverFile) return;
    uploadBookCoverMutation.mutate({ bookId: bookCoverId, file: bookCoverFile });
  };

  const submitPromoteUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    if (!promoteEmail.trim()) return;
    promoteUserMutation.mutate(promoteEmail.trim());
  };

  return (
    <section className="grid">
      <h1>Admin Panel</h1>
      <p className="muted-text">Gestión de manga/books, categorías, portadas y archivos.</p>
      {success && <SuccessBox message={success} />}

      <div className="grid grid-2">
        <article className="card">
          <h2>Crear Manga</h2>
          <form onSubmit={submitCreateManga} className="form-grid">
            <label>Título<input value={mangaTitle} onChange={(e) => setMangaTitle(e.target.value)} /></label>
            <label>Autor<input value={mangaAuthor} onChange={(e) => setMangaAuthor(e.target.value)} /></label>
            <label>Categorías<input value={mangaCategoriesInput} onChange={(e) => setMangaCategoriesInput(e.target.value)} placeholder="accion, aventura" /></label>
            {handleMutationError(createMangaMutation)}
            <button type="submit" disabled={createMangaMutation.isPending}>Crear manga</button>
          </form>
        </article>

        <article className="card">
          <h2>Editar Manga</h2>
          <form onSubmit={submitUpdateManga} className="form-grid">
            <label>Manga<select value={editMangaId} onChange={(e) => setEditMangaId(e.target.value)}><option value="">Seleccionar</option>{mangaQuery.data?.map((manga) => <option key={manga.id} value={manga.id}>{manga.title}</option>)}</select></label>
            <label>Nuevo título<input value={editMangaTitle} onChange={(e) => setEditMangaTitle(e.target.value)} /></label>
            <label>Nuevo autor<input value={editMangaAuthor} onChange={(e) => setEditMangaAuthor(e.target.value)} /></label>
            <label>Nuevas categorías<input value={editMangaCategoriesInput} onChange={(e) => setEditMangaCategoriesInput(e.target.value)} placeholder="accion, drama" /></label>
            {handleMutationError(updateMangaMutation)}
            <button type="submit" disabled={updateMangaMutation.isPending}>Guardar cambios</button>
          </form>
        </article>

        <article className="card">
          <h2>Portada de Manga</h2>
          <form onSubmit={submitUploadMangaCover} className="form-grid">
            <label>Manga<select value={mangaCoverId} onChange={(e) => setMangaCoverId(e.target.value)}><option value="">Seleccionar</option>{mangaQuery.data?.map((manga) => <option key={manga.id} value={manga.id}>{manga.title}</option>)}</select></label>
            <label>Imagen<input key={`manga-cover-${fileInputKey}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setMangaCoverFile(e.target.files?.[0] ?? null)} /></label>
            {handleMutationError(uploadMangaCoverMutation)}
            <button type="submit" disabled={uploadMangaCoverMutation.isPending}>Subir portada</button>
          </form>
        </article>

        <article className="card">
          <h2>Crear Volumen</h2>
          <form onSubmit={submitCreateVolume} className="form-grid">
            <label>Manga<select value={volumeMangaId} onChange={(e) => setVolumeMangaId(e.target.value)}><option value="">Seleccionar</option>{mangaQuery.data?.map((manga) => <option key={manga.id} value={manga.id}>{manga.title}</option>)}</select></label>
            <label>Título volumen<input value={volumeTitle} onChange={(e) => setVolumeTitle(e.target.value)} /></label>
            <label>Número<input type="number" value={volumeNumber} onChange={(e) => setVolumeNumber(e.target.value)} /></label>
            {handleMutationError(createVolumeMutation)}
            <button type="submit" disabled={createVolumeMutation.isPending}>Crear volumen</button>
          </form>
        </article>

        <article className="card">
          <h2>Editar Volumen</h2>
          <form onSubmit={submitUpdateVolume} className="form-grid">
            <label>Manga<select value={editVolumeMangaId} onChange={(e) => { setEditVolumeMangaId(e.target.value); setEditVolumeId(""); }}><option value="">Seleccionar</option>{mangaQuery.data?.map((manga) => <option key={manga.id} value={manga.id}>{manga.title}</option>)}</select></label>
            <label>Volumen<select value={editVolumeId} onChange={(e) => setEditVolumeId(e.target.value)}><option value="">Seleccionar</option>{availableEditVolumes.map((volume) => <option key={volume.id} value={volume.id}>{volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}</option>)}</select></label>
            <label>Nuevo título<input value={editVolumeTitle} onChange={(e) => setEditVolumeTitle(e.target.value)} /></label>
            <label>Nuevo número<input type="number" value={editVolumeNumber} onChange={(e) => setEditVolumeNumber(e.target.value)} /></label>
            {handleMutationError(updateVolumeMutation)}
            <button type="submit" disabled={updateVolumeMutation.isPending}>Guardar cambios</button>
          </form>
        </article>

        <article className="card">
          <h2>Upload Páginas</h2>
          <form onSubmit={submitUploadPages} className="form-grid">
            <label>Manga<select value={uploadMangaId} onChange={(e) => { setUploadMangaId(e.target.value); setUploadVolumeId(""); }}><option value="">Seleccionar</option>{mangaQuery.data?.map((manga) => <option key={manga.id} value={manga.id}>{manga.title}</option>)}</select></label>
            <label>Volumen<select value={uploadVolumeId} onChange={(e) => setUploadVolumeId(e.target.value)}><option value="">Seleccionar</option>{availableUploadVolumes.map((volume) => <option key={volume.id} value={volume.id}>{volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}</option>)}</select></label>
            <label>Imágenes<input key={`pages-${fileInputKey}`} type="file" accept="image/*" multiple onChange={(e) => setPageFiles(Array.from(e.target.files ?? []))} /></label>
            {handleMutationError(uploadPagesMutation)}
            <button type="submit" disabled={uploadPagesMutation.isPending}>Subir páginas</button>
          </form>
        </article>

        <article className="card">
          <h2>Portada de Volumen</h2>
          <form onSubmit={submitUploadVolumeCover} className="form-grid">
            <label>Manga<select value={volumeCoverMangaId} onChange={(e) => { setVolumeCoverMangaId(e.target.value); setVolumeCoverId(""); }}><option value="">Seleccionar</option>{mangaQuery.data?.map((manga) => <option key={manga.id} value={manga.id}>{manga.title}</option>)}</select></label>
            <label>Volumen<select value={volumeCoverId} onChange={(e) => setVolumeCoverId(e.target.value)}><option value="">Seleccionar</option>{availableVolumeCoverVolumes.map((volume) => <option key={volume.id} value={volume.id}>{volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}</option>)}</select></label>
            <label>Imagen<input key={`volume-cover-${fileInputKey}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setVolumeCoverFile(e.target.files?.[0] ?? null)} /></label>
            {handleMutationError(uploadVolumeCoverMutation)}
            <button type="submit" disabled={uploadVolumeCoverMutation.isPending}>Subir portada</button>
          </form>
        </article>

        <article className="card">
          <h2>Crear Book</h2>
          <form onSubmit={submitCreateBook} className="form-grid">
            <label>Título<input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} /></label>
            <label>Autor<input value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} /></label>
            <label>Descripción<textarea value={bookDescription} onChange={(e) => setBookDescription(e.target.value)} /></label>
            <label>Categorías<input value={bookCategoriesInput} onChange={(e) => setBookCategoriesInput(e.target.value)} placeholder="ficcion, misterio" /></label>
            {handleMutationError(createBookMutation)}
            <button type="submit" disabled={createBookMutation.isPending}>Crear book</button>
          </form>
        </article>

        <article className="card">
          <h2>Editar Book</h2>
          <form onSubmit={submitUpdateBook} className="form-grid">
            <label>Book<select value={editBookId} onChange={(e) => setEditBookId(e.target.value)}><option value="">Seleccionar</option>{booksQuery.data?.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
            <label>Nuevo título<input value={editBookTitle} onChange={(e) => setEditBookTitle(e.target.value)} /></label>
            <label>Nuevo autor<input value={editBookAuthor} onChange={(e) => setEditBookAuthor(e.target.value)} /></label>
            <label>Nueva descripción<textarea value={editBookDescription} onChange={(e) => setEditBookDescription(e.target.value)} /></label>
            <label>Nuevas categorías<input value={editBookCategoriesInput} onChange={(e) => setEditBookCategoriesInput(e.target.value)} placeholder="historia, filosofia" /></label>
            {handleMutationError(updateBookMutation)}
            <button type="submit" disabled={updateBookMutation.isPending}>Guardar cambios</button>
          </form>
        </article>

        <article className="card">
          <h2>Upload EPUB</h2>
          <form onSubmit={submitUploadEpub} className="form-grid">
            <label>Book<select value={epubBookId} onChange={(e) => setEpubBookId(e.target.value)}><option value="">Seleccionar</option>{booksQuery.data?.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
            <label>EPUB<input key={`epub-${fileInputKey}`} type="file" accept=".epub,application/epub+zip" onChange={(e) => setEpubFile(e.target.files?.[0] ?? null)} /></label>
            {handleMutationError(uploadEpubMutation)}
            <button type="submit" disabled={uploadEpubMutation.isPending}>Subir EPUB</button>
          </form>
        </article>

        <article className="card">
          <h2>Portada de Book</h2>
          <form onSubmit={submitUploadBookCover} className="form-grid">
            <label>Book<select value={bookCoverId} onChange={(e) => setBookCoverId(e.target.value)}><option value="">Seleccionar</option>{booksQuery.data?.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></label>
            <label>Imagen<input key={`book-cover-${fileInputKey}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setBookCoverFile(e.target.files?.[0] ?? null)} /></label>
            {handleMutationError(uploadBookCoverMutation)}
            <button type="submit" disabled={uploadBookCoverMutation.isPending}>Subir portada</button>
          </form>
        </article>

        <article className="card">
          <h2>Promover a Admin</h2>
          <form onSubmit={submitPromoteUser} className="form-grid">
            <label>Email del usuario<input type="email" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} placeholder="usuario@ejemplo.com" /></label>
            {handleMutationError(promoteUserMutation)}
            <button type="submit" disabled={promoteUserMutation.isPending}>Promover</button>
          </form>
        </article>
      </div>
    </section>
  );
}
