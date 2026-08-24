import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import {
  getBookById,
  getBookFileBlob,
  getBookProgress,
  getBookReadManifest,
  getBookReaderPreferences,
  saveBookProgress,
  updateBookReaderPreferences,
} from "@/features/books/api";
import { useAuth } from "@/features/auth/AuthContext";
import {
  endReadingSession,
  endReadingSessionKeepalive,
  startBookReadingSession,
} from "@/features/reading/api";
import type {
  BookReaderMode,
  BookReaderPreferences,
  BookReadManifest,
} from "@/types/domain";
import { useReaderHotkeys } from "@/features/reader/hooks/useReaderHotkeys";

function themeColors(theme: string) {
  if (theme === "dark") {
    return {
      background: "#111827",
      color: "#f8fafc",
      stage: "#08111f",
      chrome: "#0c1524",
    };
  }

  if (theme === "sepia") {
    return {
      background: "#f6eddc",
      color: "#3f2f1f",
      stage: "#1a1713",
      chrome: "#0f1827",
    };
  }

  return {
    background: "#ffffff",
    color: "#172033",
    stage: "#07111f",
    chrome: "#0d1626",
  };
}

function normalizeSectionHref(href: string) {
  return href.split("#")[0] ?? href;
}

function normalizeComparableHref(href: string) {
  return normalizeSectionHref(href)
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .trim();
}

function hrefMatches(left: string, right: string) {
  const normalizedLeft = normalizeComparableHref(left);
  const normalizedRight = normalizeComparableHref(right);

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.endsWith(`/${normalizedRight}`) ||
    normalizedRight.endsWith(`/${normalizedLeft}`)
  );
}

function findSectionLabel(manifest: BookReadManifest, href: string) {
  const tocMatch = manifest.toc.find((item) => hrefMatches(item.href, href));
  if (tocMatch) {
    return tocMatch.label;
  }

  return (
    manifest.spine.find((item) => hrefMatches(item.href, href))?.label ||
    "Lectura"
  );
}

function findManifestSpineItem(manifest: BookReadManifest, href: string) {
  return manifest.spine.find((item) => hrefMatches(item.href, href)) ?? null;
}

function resolveReaderHref(book: any, manifestHref: string) {
  const spineItems = Array.isArray(book?.spine?.spineItems) ? book.spine.spineItems : [];
  const matchedItem = spineItems.find((item: { href?: string }) =>
    typeof item?.href === "string" ? hrefMatches(item.href, manifestHref) : false
  );

  return matchedItem?.href ?? manifestHref;
}

export function BookReaderPage() {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const { initialized } = useAuth();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  const currentLocatorRef = useRef<string>("");
  const locationsReadyRef = useRef(false);
  const hasHydratedPreferencesRef = useRef(false);
  const saveProgressTimeoutRef = useRef<number | null>(null);
  const preferenceSaveTimeoutRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionEndRequestedRef = useRef(false);
  const saveProgressMutateRef = useRef<
    ((payload: {
      spineIndex: number;
      sectionHref: string;
      locator: string;
      progressPercent: number;
    }) => void) | null
  >(null);
  const savePreferencesMutateRef = useRef<((preferences: BookReaderPreferences) => void) | null>(
    null
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<BookReaderPreferences | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [currentSectionHref, setCurrentSectionHref] = useState("");
  const [currentLabel, setCurrentLabel] = useState("Preparando lectura");
  const [progressPercent, setProgressPercent] = useState(0);
  const [pageLabel, setPageLabel] = useState("1 / 1");
  const [isReaderBooting, setIsReaderBooting] = useState(true);
  const [readerInitError, setReaderInitError] = useState<string | null>(null);

  useEffect(() => {
    setSessionId(null);
    setPreferences(null);
    setPreferencesReady(false);
    setCurrentSectionHref("");
    setCurrentLabel("Preparando lectura");
    setProgressPercent(0);
    setPageLabel("1 / 1");
    setIsReaderBooting(true);
    setReaderInitError(null);
    hasHydratedPreferencesRef.current = false;
    currentLocatorRef.current = "";
    locationsReadyRef.current = false;
  }, [bookId]);

  const bookQuery = useQuery({
    queryKey: ["book-detail", bookId],
    queryFn: () => getBookById(bookId),
    enabled: Boolean(bookId),
  });

  const manifestQuery = useQuery({
    queryKey: ["book-read-manifest", bookId],
    queryFn: () => getBookReadManifest(bookId),
    enabled: Boolean(bookId && initialized),
  });

  const progressQuery = useQuery({
    queryKey: ["book-progress", bookId],
    queryFn: () => getBookProgress(bookId),
    enabled: Boolean(bookId && initialized),
  });

  const preferencesQuery = useQuery({
    queryKey: ["book-reader-preferences"],
    queryFn: getBookReaderPreferences,
    enabled: initialized,
  });

  const epubBlobQuery = useQuery({
    queryKey: ["book-epub", bookId],
    queryFn: () => getBookFileBlob(bookId),
    enabled: Boolean(bookId && manifestQuery.isSuccess),
  });

  const startSessionMutation = useMutation({
    mutationFn: startBookReadingSession,
    onSuccess: (nextSessionId) => {
      sessionEndRequestedRef.current = false;
      setSessionId(nextSessionId);
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: (payload: {
      spineIndex: number;
      sectionHref: string;
      locator: string;
      progressPercent: number;
    }) => saveBookProgress(bookId, payload),
  });

  const savePreferencesMutation = useMutation({
    mutationFn: updateBookReaderPreferences,
  });

  useEffect(() => {
    saveProgressMutateRef.current = saveProgressMutation.mutate;
  }, [saveProgressMutation.mutate]);

  useEffect(() => {
    savePreferencesMutateRef.current = savePreferencesMutation.mutate;
  }, [savePreferencesMutation.mutate]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (preferences || !manifestQuery.data || !preferencesQuery.data) {
      return;
    }

    setPreferences(preferencesQuery.data ?? manifestQuery.data.defaultPreferences);
    setPreferencesReady(true);
  }, [manifestQuery.data, preferences, preferencesQuery.data]);

  useEffect(() => {
    if (!preferencesReady || !preferences) {
      return;
    }

    if (!hasHydratedPreferencesRef.current) {
      hasHydratedPreferencesRef.current = true;
      return;
    }

    if (preferenceSaveTimeoutRef.current !== null) {
      window.clearTimeout(preferenceSaveTimeoutRef.current);
    }

    preferenceSaveTimeoutRef.current = window.setTimeout(() => {
      savePreferencesMutateRef.current?.(preferences);
    }, 300);

    return () => {
      if (preferenceSaveTimeoutRef.current !== null) {
        window.clearTimeout(preferenceSaveTimeoutRef.current);
      }
    };
  }, [preferences, preferencesReady]);

  const hasStartedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bookId || startSessionMutation.isPending || sessionId) {
      return;
    }
    
    if (hasStartedRef.current === bookId) {
      return;
    }
    hasStartedRef.current = bookId;

    startSessionMutation.mutate(bookId);
  }, [bookId, sessionId, startSessionMutation]);

  const applyPreferencesToRendition = useCallback((nextPreferences: BookReaderPreferences) => {
    const rendition = renditionRef.current;
    if (!rendition) {
      return;
    }

    const palette = themeColors(nextPreferences.theme);
    rendition.themes.default({
      body: {
        background: palette.background,
        color: palette.color,
        "font-family": nextPreferences.fontFamily,
        "font-size": `${nextPreferences.fontSize}px`,
        "line-height": `${nextPreferences.lineHeight}`,
        "text-align": nextPreferences.textAlign,
        margin: "0 auto",
        "max-width": `${nextPreferences.pageWidth}px`,
        padding: "24px 28px 36px",
      },
      p: {
        "margin-block": "0 0 1em",
      },
      img: {
        "max-width": "100%",
        height: "auto",
      },
      h1: {
        "line-height": "1.2",
      },
      h2: {
        "line-height": "1.24",
      },
      h3: {
        "line-height": "1.28",
      },
    });
  }, []);

  useEffect(() => {
    if (!preferences) {
      return;
    }

    applyPreferencesToRendition(preferences);
  }, [applyPreferencesToRendition, preferences]);

  useEffect(() => {
    let cancelled = false;
    const readerMode = preferences?.mode;

    async function loadBook() {
      if (
        !manifestQuery.data ||
        !epubBlobQuery.data ||
        !viewportRef.current ||
        !preferences ||
        !readerMode
      ) {
        return;
      }

      setIsReaderBooting(true);
      setCurrentLabel("Preparando lectura");
      setPageLabel("1 / 1");
      setReaderInitError(null);

      try {
        const epubModule = await import("epubjs");
        const ePubFactory =
          typeof (epubModule as { default?: unknown }).default === "function"
            ? (epubModule as { default: (input: unknown) => any }).default
            : typeof (epubModule as { default?: { default?: unknown } }).default?.default === "function"
              ? (epubModule as { default: { default: (input: unknown) => any } }).default.default
              : null;

        if (!ePubFactory) {
          throw new Error("No fue posible inicializar el motor EPUB.");
        }

        if (cancelled || !viewportRef.current) {
          return;
        }

        viewportRef.current.innerHTML = "";
        const arrayBuffer = await epubBlobQuery.data.arrayBuffer();
        if (cancelled || !viewportRef.current) {
          return;
        }

        const book = ePubFactory(arrayBuffer);
        const rendition = book.renderTo(viewportRef.current, {
          width: "100%",
          height: "100%",
          flow: readerMode === "SCROLL" ? "scrolled-doc" : "paginated",
          manager: readerMode === "SCROLL" ? "continuous" : "default",
          spread: "none",
        });

        bookRef.current = book;
        renditionRef.current = rendition;
        locationsReadyRef.current = false;

        rendition.on("relocated", (location: any) => {
          const href = normalizeSectionHref(location?.start?.href ?? "");
          const cfi = typeof location?.start?.cfi === "string" ? location.start.cfi : "";
          const manifestSpineItem = findManifestSpineItem(manifestQuery.data, href);
          const spineIndex = manifestSpineItem?.order ?? -1;
          const displayedPage = Number(location?.start?.displayed?.page ?? 1);
          const displayedTotal = Number(location?.start?.displayed?.total ?? 1);
          const label = findSectionLabel(manifestQuery.data, href);

          currentLocatorRef.current = cfi;
          setCurrentSectionHref(manifestSpineItem?.href ?? href);
          setCurrentLabel(label);
          setPageLabel(`${displayedPage} / ${displayedTotal}`);

          let nextProgress = 0;

          if (cfi && locationsReadyRef.current) {
            try {
              nextProgress = Math.round(book.locations.percentageFromCfi(cfi) * 100);
            } catch {
              nextProgress = 0;
            }
          } else if (spineIndex >= 0 && manifestQuery.data.spine.length > 1) {
            nextProgress = Math.round((spineIndex / (manifestQuery.data.spine.length - 1)) * 100);
          }

          setProgressPercent(Number.isFinite(nextProgress) ? nextProgress : 0);

          if (spineIndex < 0 || !cfi) {
            return;
          }

          if (saveProgressTimeoutRef.current !== null) {
            window.clearTimeout(saveProgressTimeoutRef.current);
          }

          saveProgressTimeoutRef.current = window.setTimeout(() => {
            saveProgressMutateRef.current?.({
              spineIndex,
              sectionHref: manifestSpineItem?.href ?? href,
              locator: cfi,
              progressPercent: Number.isFinite(nextProgress) ? nextProgress : 0,
            });
          }, 250);
        });

        rendition.on("rendered", () => {
          setIsReaderBooting(false);
        });

        await book.ready;
        applyPreferencesToRendition(preferences);

        const initialTarget =
          currentLocatorRef.current ||
          progressQuery.data?.locator ||
          resolveReaderHref(book, manifestQuery.data.spine[0]?.href ?? "") ||
          undefined;

        try {
          if (initialTarget) {
            await rendition.display(initialTarget);
          } else {
            await rendition.display();
          }
        } catch {
          await rendition.display();
        }

        setIsReaderBooting(false);
        void book.locations
          .generate(1024)
          .then(() => {
            locationsReadyRef.current = true;
            const currentLocator = currentLocatorRef.current;

            if (!currentLocator) {
              return;
            }

            try {
              setProgressPercent(Math.round(book.locations.percentageFromCfi(currentLocator) * 100));
            } catch {
              // no-op when EPUB locations cannot resolve current CFI
            }
          })
          .catch(() => {
            locationsReadyRef.current = false;
          });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "No pudimos abrir este EPUB en el reader.";
        setReaderInitError(message);
        setIsReaderBooting(false);
      }
    }

    void loadBook();

    return () => {
      cancelled = true;

      if (saveProgressTimeoutRef.current !== null) {
        window.clearTimeout(saveProgressTimeoutRef.current);
      }

      renditionRef.current?.destroy?.();
      bookRef.current?.destroy?.();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [
    applyPreferencesToRendition,
    bookId,
    epubBlobQuery.data,
    manifestQuery.data,
    preferences?.mode,
    progressQuery.data?.locator,
  ]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function endSessionIfNeeded(preferKeepalive = false) {
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
      // no-op cleanup path
    });
  }

  useEffect(() => {
    const onPageHide = () => endSessionIfNeeded(true);

    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      endSessionIfNeeded();
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await shellRef.current?.requestFullscreen?.();
    }
  }, []);

  const handlePrevHotkey = useCallback(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.prev?.();
  }, []);

  const handleNextHotkey = useCallback(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    rendition.next?.();
  }, []);

  useReaderHotkeys({
    onNext: handleNextHotkey,
    onPrev: handlePrevHotkey,
    onToggleFullscreen: handleToggleFullscreen,
  });

  const isLoading =
    bookQuery.isLoading ||
    manifestQuery.isLoading ||
    preferencesQuery.isLoading ||
    epubBlobQuery.isLoading;
  const isError =
    bookQuery.isError ||
    manifestQuery.isError ||
    preferencesQuery.isError ||
    epubBlobQuery.isError;
  const toc = manifestQuery.data?.toc ?? [];
  const currentPalette = themeColors(preferences?.theme ?? "light");

  if (isLoading) {
    return <Loading text="Preparando lector EPUB..." />;
  }

  if (isError) {
    return (
      <section className="grid">
        {bookQuery.isError && <ErrorBox error={bookQuery.error} />}
        {manifestQuery.isError && <ErrorBox error={manifestQuery.error} />}
        {preferencesQuery.isError && <ErrorBox error={preferencesQuery.error} />}
        {epubBlobQuery.isError && <ErrorBox error={epubBlobQuery.error} />}
      </section>
    );
  }

  if (!bookQuery.data || !manifestQuery.data || !preferences) {
    return <Loading text="Preparando lector EPUB..." />;
  }

  if (readerInitError) {
    return (
      <section className="grid">
        <article className="card">
          <h1>{bookQuery.data.title}</h1>
          <p className="error-text">{readerInitError}</p>
          <p className="muted-text">
            El endpoint del libro responde, pero el motor EPUB fallo al inicializar el archivo en el navegador.
          </p>
          <Link to={`/books/${bookId}`}>Volver al detalle</Link>
        </article>
      </section>
    );
  }

  if (bookQuery.data.readerStatus !== "READY") {
    return (
      <section className="grid">
        <article className="card">
          <h1>{bookQuery.data.title}</h1>
          <p className="muted-text">
            Este book todavia no esta listo para lectura. Estado: {bookQuery.data.readerStatus}
          </p>
          <Link to={`/books/${bookId}`}>Volver al detalle</Link>
        </article>
      </section>
    );
  }

  const updateMode = (mode: BookReaderMode) => {
    const currentLocation = currentLocatorRef.current;

    setPreferences((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        mode,
      };
    });

    if (currentLocation) {
      currentLocatorRef.current = currentLocation;
    }
  };

  const readerReady = Boolean(renditionRef.current) && !isReaderBooting;

  const handlePrev = () => {
    const rendition = renditionRef.current;
    if (!rendition || isReaderBooting) {
      return;
    }

    rendition.prev?.();
  };

  const handleNext = () => {
    const rendition = renditionRef.current;
    if (!rendition || isReaderBooting) {
      return;
    }

    rendition.next?.();
  };

  const handleTocNavigate = (target: string) => {
    const rendition = renditionRef.current;
    const book = bookRef.current;
    if (!rendition || !book || isReaderBooting) {
      return;
    }

    const [href, anchor] = target.split("#");
    const resolvedHref = resolveReaderHref(book, href ?? "");
    const resolvedTarget = anchor ? `${resolvedHref}#${anchor}` : resolvedHref;
    rendition.display?.(resolvedTarget);
  };

  return (
    <div
      className="book-reader-shell"
      ref={shellRef}
      style={{ background: currentPalette.chrome }}
    >
      <header className="book-reader-topbar">
        <div className="book-reader-titleblock">
          <p className="book-reader-kicker">{bookQuery.data.author || "Book"}</p>
          <h1>{bookQuery.data.title}</h1>
          <p className="book-reader-meta">
            {currentLabel} | {pageLabel} | {progressPercent}%
          </p>
        </div>

        <div className="book-reader-actions">
          <button type="button" onClick={() => setTocOpen((open) => !open)}>
            {tocOpen ? "Ocultar panel" : "Mostrar panel"}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (document.fullscreenElement) {
                await document.exitFullscreen();
              } else {
                await shellRef.current?.requestFullscreen?.();
              }
            }}
          >
            {isFullscreen ? "Salir pantalla completa" : "Pantalla completa"}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (document.fullscreenElement) {
                try {
                  await document.exitFullscreen();
                } catch {
                  // ignore
                }
              }
              endSessionIfNeeded(true);
              navigate(`/books/${bookId}`);
            }}
          >
            Cerrar
          </button>
        </div>
      </header>

      <div className={tocOpen ? "book-reader-layout" : "book-reader-layout is-sidebar-closed"}>
        {tocOpen && (
          <aside className="book-reader-sidebar">
            <section className="book-reader-sidebar-card">
              <div className="book-reader-sidebar-heading">
                <h2>Indice</h2>
                <span>{toc.length}</span>
              </div>

              <div className="book-reader-toc">
                {toc.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.href === currentSectionHref ? "book-reader-toc-item active" : "book-reader-toc-item"}
                    onClick={() => {
                      handleTocNavigate(item.anchor ? `${item.href}#${item.anchor}` : item.href);
                    }}
                    disabled={!readerReady}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="book-reader-sidebar-card">
              <div className="book-reader-sidebar-heading">
                <h2>Apariencia</h2>
                <span>{preferences.mode === "SCROLL" ? "Scroll" : "Paginado"}</span>
              </div>

              <div className="book-reader-form-grid">
                <label>
                  Modo
                  <select
                    value={preferences.mode}
                    onChange={(event) =>
                      updateMode(event.target.value === "SCROLL" ? "SCROLL" : "PAGINATED")
                    }
                  >
                    <option value="PAGINATED">Paginado</option>
                    <option value="SCROLL">Scroll</option>
                  </select>
                </label>

                <label>
                  Tema
                  <select
                    value={preferences.theme}
                    onChange={(event) =>
                      setPreferences((current) =>
                        current ? { ...current, theme: event.target.value } : current
                      )
                    }
                  >
                    <option value="light">Claro</option>
                    <option value="sepia">Sepia</option>
                    <option value="dark">Oscuro</option>
                  </select>
                </label>

                <label>
                  Fuente
                  <select
                    value={preferences.fontFamily}
                    onChange={(event) =>
                      setPreferences((current) =>
                        current ? { ...current, fontFamily: event.target.value } : current
                      )
                    }
                  >
                    <option value="system-ui">System UI</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Arial">Arial</option>
                    <option value="Palatino">Palatino</option>
                  </select>
                </label>

                <label>
                  Tamano de texto
                  <input
                    type="range"
                    min={14}
                    max={30}
                    step={1}
                    value={preferences.fontSize}
                    onChange={(event) =>
                      setPreferences((current) =>
                        current ? { ...current, fontSize: Number(event.target.value) } : current
                      )
                    }
                  />
                </label>

                <label>
                  Interlineado
                  <input
                    type="range"
                    min={1.2}
                    max={2.2}
                    step={0.1}
                    value={preferences.lineHeight}
                    onChange={(event) =>
                      setPreferences((current) =>
                        current ? { ...current, lineHeight: Number(event.target.value) } : current
                      )
                    }
                  />
                </label>

                <label>
                  Alineacion
                  <select
                    value={preferences.textAlign}
                    onChange={(event) =>
                      setPreferences((current) =>
                        current ? { ...current, textAlign: event.target.value } : current
                      )
                    }
                  >
                    <option value="left">Izquierda</option>
                    <option value="justify">Justificado</option>
                  </select>
                </label>

                <label>
                  Ancho de pagina
                  <input
                    type="range"
                    min={460}
                    max={920}
                    step={20}
                    value={preferences.pageWidth}
                    onChange={(event) =>
                      setPreferences((current) =>
                        current ? { ...current, pageWidth: Number(event.target.value) } : current
                      )
                    }
                  />
                </label>
              </div>
            </section>
          </aside>
        )}

        <section
          className="book-reader-stage"
          style={{ background: currentPalette.stage }}
        >
          <div className="book-reader-nav-column">
            <button type="button" onClick={handlePrev} aria-label="Seccion anterior" disabled={!readerReady}>
              {"<"}
            </button>
          </div>

          <div className="book-reader-viewport-wrap">
            {isReaderBooting && (
              <div className="book-reader-loading">
                <Loading text="Renderizando EPUB..." />
              </div>
            )}

            <div
              className="book-reader-viewport-frame"
              style={{ background: currentPalette.background }}
            >
              <div ref={viewportRef} className="book-reader-viewport" />
            </div>
          </div>

          <div className="book-reader-nav-column">
            <button type="button" onClick={handleNext} aria-label="Seccion siguiente" disabled={!readerReady}>
              {">"}
            </button>
          </div>
        </section>
      </div>

      <footer className="book-reader-bottombar">
        <button
          type="button"
          className="book-reader-bottom-button"
          onClick={handlePrev}
          disabled={!readerReady}
        >
          Anterior
        </button>

        <div className="book-reader-progress">
          <div className="book-reader-progress-meta">
            <span>{currentLabel}</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="book-reader-progress-track">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <button
          type="button"
          className="book-reader-bottom-button"
          onClick={handleNext}
          disabled={!readerReady}
        >
          Siguiente
        </button>
      </footer>
    </div>
  );
}
