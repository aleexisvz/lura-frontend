import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import {
  getPages,
  getVolumeCompletion,
  markVolumeCompleted,
  saveProgress
} from "@/features/manga/api";
import {
  endReadingSession,
  endReadingSessionKeepalive,
  startMangaReadingSession
} from "@/features/reading/api";
import { ReaderShell } from "@/features/reader/components/ReaderShell";
import { useReaderHotkeys } from "@/features/reader/hooks/useReaderHotkeys";
import { useAFKTimer } from "@/features/reader/hooks/useAFKTimer";

const NAVIGATION_INTERVAL_MS = 1000;

export function MangaReaderPage() {
  const navigate = useNavigate();
  const { mangaId = "", volumeId = "", pageNumber = "1" } = useParams();
  const currentPage = useMemo(() => Number(pageNumber) || 1, [pageNumber]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sliderPage, setSliderPage] = useState(currentPage);
  const [isAfkPaused, setIsAfkPaused] = useState(false);
  const navigationInFlightRef = useRef(false);
  const queuedPageRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionEndRequestedRef = useRef(false);

  const pagesQuery = useQuery({
    queryKey: ["manga-pages", mangaId, volumeId],
    queryFn: () => getPages(mangaId, volumeId),
    enabled: Boolean(mangaId && volumeId)
  });

  const imageUrl = useMemo(() => {
    if (!pagesQuery.data) return null;
    const page = pagesQuery.data.find((p) => p.pageNumber === currentPage);
    return page?.imageUrl ?? null;
  }, [pagesQuery.data, currentPage]);

  const preloadUrls = useMemo(() => {
    if (!pagesQuery.data) return [];
    
    // Precargar 3 páginas hacia adelante y 1 hacia atrás
    const urls: string[] = [];
    const targetPages = [currentPage - 1, currentPage + 1, currentPage + 2, currentPage + 3];
    
    for (const target of targetPages) {
      const page = pagesQuery.data.find((p) => p.pageNumber === target);
      if (page?.imageUrl) {
        urls.push(page.imageUrl);
      }
    }
    return urls;
  }, [pagesQuery.data, currentPage]);

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
    mutationFn: startMangaReadingSession,
    onSuccess: (id) => setSessionId(id)
  });

  const hasStartedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mangaId || !volumeId) {
      return;
    }
    const volumeKey = `${mangaId}-${volumeId}`;
    if (hasStartedRef.current === volumeKey) {
      return;
    }
    hasStartedRef.current = volumeKey;

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

  const onAfkExpired = useCallback(() => {
    const activeSessionId = sessionIdRef.current;
    if (activeSessionId && !sessionEndRequestedRef.current) {
      sessionEndRequestedRef.current = true;
      void endReadingSession(activeSessionId).catch(() => {
        // best-effort: AFK session end
      });
      setSessionId(null);
      sessionIdRef.current = null;
    }
    setIsAfkPaused(true);
  }, []);

  const { isWarning, secondsRemaining, resetTimer: resetAFKTimer } = useAFKTimer({
    onExpired: onAfkExpired,
    disabled: isAfkPaused,
  });

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
    (nextPage: number) => {
      const safeNextPage = clampPage(nextPage);
      if (!mangaId || !volumeId || safeNextPage === currentPage) {
        return;
      }

      saveProgressMutation.mutate({
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
        runGoToPage(safeNextPage);
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
      resetAFKTimer();
      void goToPage(currentPage + 1);
    }
  }, [currentPage, goToPage, maxPage, resetAFKTimer]);

  const goPrev = useCallback(() => {
    if (currentPage > minPage) {
      resetAFKTimer();
      void goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage, minPage, resetAFKTimer]);

  const toggleFullscreen = useCallback(async () => {
    resetAFKTimer();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // ignore browser fullscreen API errors
    }
  }, [resetAFKTimer]);

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
        resetAFKTimer();
        void goToPage(nextPage);
      }}
    >
      {pagesQuery.isLoading && <Loading text="Cargando paginas..." />}
      {pagesQuery.isError && <ErrorBox error={pagesQuery.error} />}

      {imageUrl && <img src={imageUrl} alt={`Pagina ${currentPage}`} className="reader-image" />}

      {/* Precarga de imágenes ocultas para cachear */}
      <div style={{ display: "none" }} aria-hidden="true">
        {preloadUrls.map(url => (
          <img key={url} src={url} alt="" />
        ))}
      </div>

      {isWarning && !isAfkPaused && (
        <div className="reader-afk-overlay" role="alertdialog" aria-modal="true" aria-label="Aviso de inactividad">
          <div className="reader-afk-box">
            <p className="reader-afk-title">¿Sigues leyendo?</p>
            <p className="reader-afk-countdown">
              La sesión se pausará en <strong>{secondsRemaining}s</strong>
            </p>
            <button type="button" className="reader-afk-btn" onClick={resetAFKTimer}>
              Sí, continuar
            </button>
          </div>
        </div>
      )}

      {isAfkPaused && (
        <div className="reader-afk-overlay" role="alertdialog" aria-modal="true" aria-label="Sesión pausada">
          <div className="reader-afk-box">
            <p className="reader-afk-title">Sesión pausada</p>
            <p className="reader-afk-text">Tu sesión fue terminada por inactividad. Tu progreso fue guardado.</p>
            <button
              type="button"
              className="reader-afk-btn"
              onClick={() => {
                sessionEndRequestedRef.current = false;
                setIsAfkPaused(false);
                resetAFKTimer();
                startSessionMutation.mutate({ mangaId, volumeId, pageNumber: currentPage });
              }}
            >
              Reanudar lectura
            </button>
          </div>
        </div>
      )}
    </ReaderShell>
  );
}
