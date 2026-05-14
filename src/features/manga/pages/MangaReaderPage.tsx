import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import {
  getPageImageBlob,
  getPages,
  saveProgress
} from "@/features/manga/api";
import { endReadingSession, startReadingSession } from "@/features/reading/api";

export function MangaReaderPage() {
  const navigate = useNavigate();
  const { mangaId = "", volumeId = "", pageNumber = "1" } = useParams();
  const currentPage = useMemo(() => Number(pageNumber) || 1, [pageNumber]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const pagesQuery = useQuery({
    queryKey: ["manga-pages", mangaId, volumeId],
    queryFn: () => getPages(mangaId, volumeId),
    enabled: Boolean(mangaId && volumeId)
  });

  const imageQuery = useQuery({
    queryKey: ["page-image", mangaId, volumeId, currentPage],
    queryFn: () => getPageImageBlob(mangaId, volumeId, currentPage),
    enabled: Boolean(mangaId && volumeId && currentPage > 0)
  });

  const saveProgressMutation = useMutation({
    mutationFn: saveProgress
  });

  const startSessionMutation = useMutation({
    mutationFn: startReadingSession,
    onSuccess: (id) => setSessionId(id)
  });

  const endSessionMutation = useMutation({
    mutationFn: endReadingSession
  });

  useEffect(() => {
    startSessionMutation.mutate({
      mangaId,
      volumeId,
      pageNumber: currentPage
    });
  }, [mangaId, volumeId]);

  useEffect(() => {
    if (!imageQuery.data) {
      return;
    }

    const nextUrl = URL.createObjectURL(imageQuery.data);
    setImageUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [imageQuery.data]);

  useEffect(() => {
    return () => {
      if (sessionId) {
        endSessionMutation.mutate(sessionId);
      }
    };
  }, [sessionId]);

  const pageNumbers = pagesQuery.data?.map((item) => item.pageNumber) ?? [];
  const minPage = pageNumbers[0] ?? 1;
  const maxPage = pageNumbers[pageNumbers.length - 1] ?? currentPage;

  const goToPage = async (nextPage: number) => {
    await saveProgressMutation.mutateAsync({
      mangaId,
      volumeId,
      pageNumber: nextPage
    });
    navigate(`/reader/${mangaId}/${volumeId}/${nextPage}`);
  };

  return (
    <section className="grid">
      <header className="split-row">
        <h1>Reader</h1>
        <Link to={`/manga/${mangaId}/volumes/${volumeId}/pages`}>Volver a páginas</Link>
      </header>

      <article className="card">
        <p className="muted-text">
          Volumen: {volumeId} | Página actual: {currentPage}
        </p>
        {imageQuery.isLoading && <Loading text="Cargando imagen protegida..." />}
        {imageQuery.isError && <ErrorBox error={imageQuery.error} />}
        {imageUrl && <img src={imageUrl} alt={`Página ${currentPage}`} className="reader-image" />}

        <div className="split-row">
          <button
            type="button"
            disabled={currentPage <= minPage || saveProgressMutation.isPending}
            onClick={() => goToPage(currentPage - 1)}
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={currentPage >= maxPage || saveProgressMutation.isPending}
            onClick={() => goToPage(currentPage + 1)}
          >
            Siguiente
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!sessionId || endSessionMutation.isPending}
            onClick={() => sessionId && endSessionMutation.mutate(sessionId)}
          >
            Finalizar sesión
          </button>
        </div>
      </article>
    </section>
  );
}

