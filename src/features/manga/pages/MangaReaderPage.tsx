import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import {
  getPageImageBlob,
  getPages,
  getVolumeCompletion,
  markVolumeCompleted,
  saveProgress
} from "@/features/manga/api";
import {
  endReadingSession,
  endReadingSessionKeepalive,
  startReadingSession
} from "@/features/reading/api";
import { ReaderShell } from "@/features/reader/components/ReaderShell";
import { useReaderHotkeys } from "@/features/reader/hooks/useReaderHotkeys";

const NAVIGATION_INTERVAL_MS = 1000;

export function MangaReaderPage() {
  const navigate = useNavigate();
  const { mangaId = "", volumeId = "", pageNumber = "1" } = useParams();
  const currentPage = useMemo(() => Number(pageNumber) || 1, [pageNumber]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sliderPage, setSliderPage] = useState(currentPage);
  const navigationInFlightRef = useRef(false);
  const queuedPageRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionEndRequestedRef = useRef(false);

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

  const completionQuery = useQuery({
    queryKey: ["volume-completion", mangaId, volumeId],
    queryFn: () => getVolumeCompletion(mangaId, volumeId),
    enabled: Boolean(mangaId && volumeId)
  });

  const markCompletedMutation = useMutation({
    mutationFn: () => markVolumeCompleted(mangaId, volumeId),
    onSuccess: () => completionQuery.refetch()
  });

  const startSessionMutation = useMutation({
    mutationFn: startReadingSession,
    onSuccess: (id) => setSessionId(id)
  });

  useEffect(() => {
    if (!mangaId || !volumeId) {
      return;
    }
    startSessionMutation.mutate({
      mangaId,
      volumeId,
      pageNumber: currentPage
    });
    // start once per opened volume; progress updates are handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mangaId, volumeId]);

  useEffect(() => {
    if (!mangaId || !volumeId || currentPage < 1) {
      return;
    }

    // Register current volume in active reading list even before page navigation.
    saveProgressMutation.mutate({
      mangaId,
      volumeId,
      pageNumber: currentPage
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mangaId, volumeId, currentPage]);

  useEffect(() => {
    if (!imageQuery.data) {
      return;
    }

    const nextUrl = URL.createObjectURL(imageQuery.data);
    setImageUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [imageQuery.data]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const endSessionIfNeeded = useCallback((preferKeepalive = false) => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId || sessionEndRequestedRef.current) {
      return;
    }
    sessionEndRequestedRef.current = true;
    if (preferKeepalive) {
      endReadingSessionKeepalive(activeSessionId);
      return;
    }
    void endReadingSession(activeSessionId).catch(() => {
      // avoid surfacing cleanup errors to UI
    });
  }, []);

  useEffect(() => {
    return () => {
      endSessionIfNeeded();
    };
  }, [endSessionIfNeeded]);

  useEffect(() => {
    const handlePageHide = () => {
      endSessionIfNeeded(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        endSessionIfNeeded(true);
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [endSessionIfNeeded]);

  useEffect(() => {
    setSliderPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const pageNumbers = pagesQuery.data?.map((item) => item.pageNumber) ?? [];
  const minPage = pageNumbers[0] ?? 1;
  const maxPage = pageNumbers[pageNumbers.length - 1] ?? currentPage;

  const clampPage = useCallback(
    (page: number) => Math.min(maxPage, Math.max(minPage, page)),
    [maxPage, minPage]
  );

  const runGoToPage = useCallback(
    async (nextPage: number) => {
      const safeNextPage = clampPage(nextPage);
      if (!mangaId || !volumeId || safeNextPage === currentPage) {
        return;
      }

      await saveProgressMutation.mutateAsync({
        mangaId,
        volumeId,
        pageNumber: safeNextPage
      });
      if (safeNextPage >= maxPage && !completionQuery.data?.completed) {
        markCompletedMutation.mutate();
      }
      navigate(`/reader/${mangaId}/${volumeId}/${safeNextPage}`);
    },
    [
      clampPage,
      completionQuery.data?.completed,
      currentPage,
      mangaId,
      markCompletedMutation,
      maxPage,
      navigate,
      saveProgressMutation,
      volumeId
    ]
  );

  const goToPage = useCallback(
    async (nextPage: number) => {
      const safeNextPage = clampPage(nextPage);
      setSliderPage(safeNextPage);

      if (navigationInFlightRef.current) {
        queuedPageRef.current = safeNextPage;
        return;
      }

      navigationInFlightRef.current = true;
      const navStart = Date.now();
      try {
        await runGoToPage(safeNextPage);
      } finally {
        navigationInFlightRef.current = false;
      }

      const queuedPage = queuedPageRef.current;
      queuedPageRef.current = null;
      if (queuedPage && queuedPage !== safeNextPage) {
        const elapsed = Date.now() - navStart;
        const remaining = NAVIGATION_INTERVAL_MS - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        await goToPage(queuedPage);
      }
    },
    [clampPage, runGoToPage]
  );

  const goNext = useCallback(() => {
    if (currentPage < maxPage) {
      void goToPage(currentPage + 1);
    }
  }, [currentPage, goToPage, maxPage]);

  const goPrev = useCallback(() => {
    if (currentPage > minPage) {
      void goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage, minPage]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore browser fullscreen API errors
    }
  }, []);

  useReaderHotkeys({
    onNext: goNext,
    onPrev: goPrev,
    onToggleFullscreen: () => {
      void toggleFullscreen();
    }
  });

  const progressPercent =
    maxPage <= minPage ? 0 : Math.round(((currentPage - minPage) / (maxPage - minPage)) * 100);

  return (
    <ReaderShell
      currentPage={currentPage}
      totalPages={maxPage}
      progressPercent={progressPercent}
      sliderValue={sliderPage}
      isFullscreen={isFullscreen}
      isBusy={saveProgressMutation.isPending}
      onClose={() => {
        endSessionIfNeeded(true);
        navigate(`/manga/${mangaId}`);
      }}
      onPrev={goPrev}
      onNext={goNext}
      onToggleFullscreen={() => {
        void toggleFullscreen();
      }}
      onSliderChange={(nextPage) => {
        void goToPage(nextPage);
      }}
    >
      {pagesQuery.isLoading && <Loading text="Cargando paginas..." />}
      {pagesQuery.isError && <ErrorBox error={pagesQuery.error} />}
      {imageQuery.isLoading && <Loading text="Cargando imagen protegida..." />}
      {imageQuery.isError && <ErrorBox error={imageQuery.error} />}
      {imageUrl && <img src={imageUrl} alt={`Pagina ${currentPage}`} className="reader-image" />}
    </ReaderShell>
  );
}
