import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { createTag, getTags } from "@/features/tags/api";
import { Tag, TagScope } from "@/types/domain";

const tagIdsSchema = z.array(z.string().trim().min(1)).max(100);

const createMangaSchema = z.object({
  title: z.string().trim().min(2, "Titulo demasiado corto"),
  author: z.string().trim().optional(),
  tagIds: tagIdsSchema.optional(),
});

const updateMangaSchema = z.object({
  mangaId: z.string().trim().min(1, "Selecciona un manga"),
  title: z.string().trim().optional(),
  author: z.string().trim().optional(),
  tagIds: tagIdsSchema.optional(),
});

const createVolumeSchema = z.object({
  mangaId: z.string().trim().min(1, "Selecciona un manga"),
  title: z.string().trim().optional(),
  number: z.number().int().positive(),
});

const updateVolumeSchema = z.object({
  mangaId: z.string().trim().min(1, "Selecciona un manga"),
  volumeId: z.string().trim().min(1, "Selecciona un volumen"),
  title: z.string().trim().optional(),
  number: z.number().int().positive().optional(),
});

const createBookSchema = z.object({
  title: z.string().trim().min(2, "Titulo demasiado corto"),
  author: z.string().trim().optional(),
  description: z.string().trim().optional(),
  tagIds: tagIdsSchema.optional(),
});

const updateBookSchema = z.object({
  bookId: z.string().trim().min(1, "Selecciona un book"),
  title: z.string().trim().optional(),
  author: z.string().trim().optional(),
  description: z.string().trim().optional(),
  tagIds: tagIdsSchema.optional(),
});

function TagSelector({
  tags,
  selected,
  onToggle,
}: {
  tags: Tag[];
  selected: string[];
  onToggle: (tagId: string) => void;
}) {
  if (tags.length === 0) {
    return <p className="muted-text">No hay tags para este scope.</p>;
  }

  return (
    <div className="tag-check-grid">
      {tags.map((tag) => (
        <label key={tag.id} className="tag-check">
          <input
            type="checkbox"
            checked={selected.includes(tag.id)}
            onChange={() => onToggle(tag.id)}
          />
          <span>{tag.name}</span>
        </label>
      ))}
    </div>
  );
}

export function AdminPanelPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [tagScope, setTagScope] = useState<TagScope>("MANGA");
  const [tagName, setTagName] = useState("");

  const [mangaTitle, setMangaTitle] = useState("");
  const [mangaAuthor, setMangaAuthor] = useState("");
  const [mangaTagIds, setMangaTagIds] = useState<string[]>([]);
  const [editMangaId, setEditMangaId] = useState("");
  const [editMangaTitle, setEditMangaTitle] = useState("");
  const [editMangaAuthor, setEditMangaAuthor] = useState("");
  const [editMangaTagIds, setEditMangaTagIds] = useState<string[]>([]);
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
  const [bookTagIds, setBookTagIds] = useState<string[]>([]);
  const [editBookId, setEditBookId] = useState("");
  const [editBookTitle, setEditBookTitle] = useState("");
  const [editBookAuthor, setEditBookAuthor] = useState("");
  const [editBookDescription, setEditBookDescription] = useState("");
  const [editBookTagIds, setEditBookTagIds] = useState<string[]>([]);
  const [epubBookId, setEpubBookId] = useState("");
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [bookCoverId, setBookCoverId] = useState("");
  const [bookCoverFile, setBookCoverFile] = useState<File | null>(null);

  const [promoteEmail, setPromoteEmail] = useState("");

  const mangaQuery = useQuery({
    queryKey: ["manga-list-admin"],
    queryFn: () => getMangaList(),
  });

  const booksQuery = useQuery({
    queryKey: ["books-admin"],
    queryFn: () => getBooks(),
  });

  const mangaTagsQuery = useQuery({
    queryKey: ["tags", "MANGA"],
    queryFn: () => getTags("MANGA"),
  });

  const bookTagsQuery = useQuery({
    queryKey: ["tags", "BOOK"],
    queryFn: () => getTags("BOOK"),
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

  const createTagMutation = useMutation({
    mutationFn: createTag,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tags", tagScope] });
      setSuccess("Tag creado correctamente");
      setTagName("");
    },
  });

  const createMangaMutation = useMutation({
    mutationFn: createManga,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
      setSuccess("Manga creado correctamente");
      setMangaTitle("");
      setMangaAuthor("");
      setMangaTagIds([]);
    },
  });

  const updateMangaMutation = useMutation({
    mutationFn: updateManga,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
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
      setSuccess("Paginas subidas correctamente");
      setUploadMangaId("");
      setUploadVolumeId("");
      setPageFiles([]);
      setFileInputKey((key) => key + 1);
    },
  });

  const uploadMangaCoverMutation = useMutation({
    mutationFn: uploadMangaCover,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["manga-list-admin"] });
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
      await queryClient.invalidateQueries({ queryKey: ["books-admin"] });
      setSuccess("Book creado correctamente");
      setBookTitle("");
      setBookAuthor("");
      setBookDescription("");
      setBookTagIds([]);
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: updateBook,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["books-admin"] });
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
      await queryClient.invalidateQueries({ queryKey: ["books-admin"] });
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

  useEffect(() => {
    if (!editMangaId) {
      setEditMangaTagIds([]);
      return;
    }

    const selected = (mangaQuery.data ?? []).find((manga) => manga.id === editMangaId);
    setEditMangaTagIds(selected?.tags.map((tag) => tag.id) ?? []);
  }, [editMangaId, mangaQuery.data]);

  useEffect(() => {
    if (!editBookId) {
      setEditBookTagIds([]);
      return;
    }

    const selected = (booksQuery.data ?? []).find((book) => book.id === editBookId);
    setEditBookTagIds(selected?.tags.map((tag) => tag.id) ?? []);
  }, [editBookId, booksQuery.data]);

  const toggleSelection = (
    target: "manga" | "editManga" | "book" | "editBook",
    tagId: string
  ) => {
    const updater = (current: string[]) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId];

    if (target === "manga") setMangaTagIds(updater);
    if (target === "editManga") setEditMangaTagIds(updater);
    if (target === "book") setBookTagIds(updater);
    if (target === "editBook") setEditBookTagIds(updater);
  };

  const handleMutationError = (
    mutation:
      | typeof createTagMutation
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

  const submitCreateTag = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    if (!tagName.trim()) return;
    createTagMutation.mutate({ scope: tagScope, name: tagName.trim() });
  };

  const submitCreateManga = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    const parsed = createMangaSchema.safeParse({
      title: mangaTitle,
      author: mangaAuthor || undefined,
      tagIds: mangaTagIds,
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
      tagIds: editMangaTagIds,
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
      tagIds: bookTagIds,
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
      tagIds: editBookTagIds,
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
      <p className="muted-text">Gestion de tags, manga, books, portadas y archivos.</p>
      {success && <SuccessBox message={success} />}

      <div className="grid grid-2">
        <article className="card">
          <h2>Gestion de Tags</h2>
          <form onSubmit={submitCreateTag} className="form-grid">
            <label>
              Scope
              <select value={tagScope} onChange={(event) => setTagScope(event.target.value as TagScope)}>
                <option value="MANGA">MANGA</option>
                <option value="BOOK">BOOK</option>
              </select>
            </label>
            <label>
              Nombre del tag
              <input value={tagName} onChange={(event) => setTagName(event.target.value)} />
            </label>
            {handleMutationError(createTagMutation)}
            <button type="submit" disabled={createTagMutation.isPending}>
              Crear tag
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Crear Manga</h2>
          <form onSubmit={submitCreateManga} className="form-grid">
            <label>
              Titulo
              <input value={mangaTitle} onChange={(event) => setMangaTitle(event.target.value)} />
            </label>
            <label>
              Autor
              <input value={mangaAuthor} onChange={(event) => setMangaAuthor(event.target.value)} />
            </label>
            <div>
              <strong>Tags (MANGA)</strong>
              <TagSelector
                tags={mangaTagsQuery.data ?? []}
                selected={mangaTagIds}
                onToggle={(tagId) => toggleSelection("manga", tagId)}
              />
            </div>
            {handleMutationError(createMangaMutation)}
            <button type="submit" disabled={createMangaMutation.isPending}>
              Crear manga
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Editar Manga</h2>
          <form onSubmit={submitUpdateManga} className="form-grid">
            <label>
              Manga
              <select value={editMangaId} onChange={(event) => setEditMangaId(event.target.value)}>
                <option value="">Seleccionar</option>
                {mangaQuery.data?.map((manga) => (
                  <option key={manga.id} value={manga.id}>
                    {manga.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nuevo titulo
              <input value={editMangaTitle} onChange={(event) => setEditMangaTitle(event.target.value)} />
            </label>
            <label>
              Nuevo autor
              <input value={editMangaAuthor} onChange={(event) => setEditMangaAuthor(event.target.value)} />
            </label>
            <div>
              <strong>Tags (MANGA)</strong>
              <TagSelector
                tags={mangaTagsQuery.data ?? []}
                selected={editMangaTagIds}
                onToggle={(tagId) => toggleSelection("editManga", tagId)}
              />
            </div>
            {handleMutationError(updateMangaMutation)}
            <button type="submit" disabled={updateMangaMutation.isPending}>
              Guardar cambios
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Portada de Manga</h2>
          <form onSubmit={submitUploadMangaCover} className="form-grid">
            <label>
              Manga
              <select value={mangaCoverId} onChange={(event) => setMangaCoverId(event.target.value)}>
                <option value="">Seleccionar</option>
                {mangaQuery.data?.map((manga) => (
                  <option key={manga.id} value={manga.id}>
                    {manga.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Imagen
              <input
                key={`manga-cover-${fileInputKey}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setMangaCoverFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {handleMutationError(uploadMangaCoverMutation)}
            <button type="submit" disabled={uploadMangaCoverMutation.isPending}>
              Subir portada
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Crear Volumen</h2>
          <form onSubmit={submitCreateVolume} className="form-grid">
            <label>
              Manga
              <select value={volumeMangaId} onChange={(event) => setVolumeMangaId(event.target.value)}>
                <option value="">Seleccionar</option>
                {mangaQuery.data?.map((manga) => (
                  <option key={manga.id} value={manga.id}>
                    {manga.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Titulo volumen
              <input value={volumeTitle} onChange={(event) => setVolumeTitle(event.target.value)} />
            </label>
            <label>
              Numero
              <input
                type="number"
                value={volumeNumber}
                onChange={(event) => setVolumeNumber(event.target.value)}
              />
            </label>
            {handleMutationError(createVolumeMutation)}
            <button type="submit" disabled={createVolumeMutation.isPending}>
              Crear volumen
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Editar Volumen</h2>
          <form onSubmit={submitUpdateVolume} className="form-grid">
            <label>
              Manga
              <select
                value={editVolumeMangaId}
                onChange={(event) => {
                  setEditVolumeMangaId(event.target.value);
                  setEditVolumeId("");
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
              <select value={editVolumeId} onChange={(event) => setEditVolumeId(event.target.value)}>
                <option value="">Seleccionar</option>
                {availableEditVolumes.map((volume) => (
                  <option key={volume.id} value={volume.id}>
                    {volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nuevo titulo
              <input value={editVolumeTitle} onChange={(event) => setEditVolumeTitle(event.target.value)} />
            </label>
            <label>
              Nuevo numero
              <input
                type="number"
                value={editVolumeNumber}
                onChange={(event) => setEditVolumeNumber(event.target.value)}
              />
            </label>
            {handleMutationError(updateVolumeMutation)}
            <button type="submit" disabled={updateVolumeMutation.isPending}>
              Guardar cambios
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Upload Paginas</h2>
          <form onSubmit={submitUploadPages} className="form-grid">
            <label>
              Manga
              <select
                value={uploadMangaId}
                onChange={(event) => {
                  setUploadMangaId(event.target.value);
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
              <select value={uploadVolumeId} onChange={(event) => setUploadVolumeId(event.target.value)}>
                <option value="">Seleccionar</option>
                {availableUploadVolumes.map((volume) => (
                  <option key={volume.id} value={volume.id}>
                    {volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Imagenes
              <input
                key={`pages-${fileInputKey}`}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setPageFiles(Array.from(event.target.files ?? []))}
              />
            </label>
            {handleMutationError(uploadPagesMutation)}
            <button type="submit" disabled={uploadPagesMutation.isPending}>
              Subir paginas
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Portada de Volumen</h2>
          <form onSubmit={submitUploadVolumeCover} className="form-grid">
            <label>
              Manga
              <select
                value={volumeCoverMangaId}
                onChange={(event) => {
                  setVolumeCoverMangaId(event.target.value);
                  setVolumeCoverId("");
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
              <select value={volumeCoverId} onChange={(event) => setVolumeCoverId(event.target.value)}>
                <option value="">Seleccionar</option>
                {availableVolumeCoverVolumes.map((volume) => (
                  <option key={volume.id} value={volume.id}>
                    {volume.number > 0 ? `Vol. ${volume.number}` : "Volumen"} {volume.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Imagen
              <input
                key={`volume-cover-${fileInputKey}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setVolumeCoverFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {handleMutationError(uploadVolumeCoverMutation)}
            <button type="submit" disabled={uploadVolumeCoverMutation.isPending}>
              Subir portada
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Crear Book</h2>
          <form onSubmit={submitCreateBook} className="form-grid">
            <label>
              Titulo
              <input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} />
            </label>
            <label>
              Autor
              <input value={bookAuthor} onChange={(event) => setBookAuthor(event.target.value)} />
            </label>
            <label>
              Descripcion
              <textarea value={bookDescription} onChange={(event) => setBookDescription(event.target.value)} />
            </label>
            <div>
              <strong>Tags (BOOK)</strong>
              <TagSelector
                tags={bookTagsQuery.data ?? []}
                selected={bookTagIds}
                onToggle={(tagId) => toggleSelection("book", tagId)}
              />
            </div>
            {handleMutationError(createBookMutation)}
            <button type="submit" disabled={createBookMutation.isPending}>
              Crear book
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Editar Book</h2>
          <form onSubmit={submitUpdateBook} className="form-grid">
            <label>
              Book
              <select value={editBookId} onChange={(event) => setEditBookId(event.target.value)}>
                <option value="">Seleccionar</option>
                {booksQuery.data?.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nuevo titulo
              <input value={editBookTitle} onChange={(event) => setEditBookTitle(event.target.value)} />
            </label>
            <label>
              Nuevo autor
              <input value={editBookAuthor} onChange={(event) => setEditBookAuthor(event.target.value)} />
            </label>
            <label>
              Nueva descripcion
              <textarea
                value={editBookDescription}
                onChange={(event) => setEditBookDescription(event.target.value)}
              />
            </label>
            <div>
              <strong>Tags (BOOK)</strong>
              <TagSelector
                tags={bookTagsQuery.data ?? []}
                selected={editBookTagIds}
                onToggle={(tagId) => toggleSelection("editBook", tagId)}
              />
            </div>
            {handleMutationError(updateBookMutation)}
            <button type="submit" disabled={updateBookMutation.isPending}>
              Guardar cambios
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Upload EPUB</h2>
          <form onSubmit={submitUploadEpub} className="form-grid">
            <label>
              Book
              <select value={epubBookId} onChange={(event) => setEpubBookId(event.target.value)}>
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
                key={`epub-${fileInputKey}`}
                type="file"
                accept=".epub,application/epub+zip"
                onChange={(event) => setEpubFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {handleMutationError(uploadEpubMutation)}
            <button type="submit" disabled={uploadEpubMutation.isPending}>
              Subir EPUB
            </button>
          </form>
        </article>

        <article className="card">
          <h2>Portada de Book</h2>
          <form onSubmit={submitUploadBookCover} className="form-grid">
            <label>
              Book
              <select value={bookCoverId} onChange={(event) => setBookCoverId(event.target.value)}>
                <option value="">Seleccionar</option>
                {booksQuery.data?.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Imagen
              <input
                key={`book-cover-${fileInputKey}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setBookCoverFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {handleMutationError(uploadBookCoverMutation)}
            <button type="submit" disabled={uploadBookCoverMutation.isPending}>
              Subir portada
            </button>
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
                onChange={(event) => setPromoteEmail(event.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </label>
            {handleMutationError(promoteUserMutation)}
            <button type="submit" disabled={promoteUserMutation.isPending}>
              Promover
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
