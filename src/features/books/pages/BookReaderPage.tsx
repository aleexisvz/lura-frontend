import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookById, getBookFileBlob, saveBookProgress } from "@/features/books/api";
import {
  endReadingSession,
  endReadingSessionKeepalive,
  startBookReadingSession,
} from "@/features/reading/api";
import { BookReaderWindowHeader } from "../components/BookReaderWindowHeader";
import { BookPageSpread } from "../components/BookPageSpread";
import {
  BookSettingsPanel,
  BookTheme,
  FONT_OPTIONS,
} from "../components/BookSettingsPanel";
import { BookBottomDock } from "../components/BookBottomDock";
import {
  BookBookmarksModal,
  BookBookmark,
} from "../components/BookBookmarksModal";
import { BookNotesModal, BookNote } from "../components/BookNotesModal";
import { BookTocDrawer, TocChapterItem } from "../components/BookTocDrawer";
import { applyEpubPagingFix } from "../utils/epubPagingFix";

const PREFS_STORAGE_KEY = "lura_book_reader_preferences";
const epubBufferCache = new Map<string, ArrayBuffer>();

function themeColors(theme: BookTheme) {
  if (theme === "dark") {
    return {
      pageBg: "#1e2128",
      textColor: "#e2e8f0",
      stageBg: "#0d0f13",
      chromeBg: "#14171d",
      coverEdge: "#0a0b0e",
    };
  }
  if (theme === "light") {
    return {
      pageBg: "#ffffff",
      textColor: "#1a202c",
      stageBg: "#22242a",
      chromeBg: "#edf0f4",
      coverEdge: "#2c3444",
    };
  }
  return {
    pageBg: "#f7f4ec",
    textColor: "#2b2219",
    stageBg: "#1c1d22",
    chromeBg: "#e6e8ec",
    coverEdge: "#3d3023",
  };
}

function applyEpubTheme(
  rendition: any,
  theme: BookTheme,
  fontFamily: string,
  fontSize: number
) {
  if (!rendition) return;

  const palette = themeColors(theme);
  rendition.themes.default({
    body: {
      background: `${palette.pageBg} !important`,
      color: `${palette.textColor} !important`,
      "font-family": `${fontFamily} !important`,
      "font-size": `${fontSize}px !important`,
      "line-height": "1.7 !important",
      "text-align": "justify !important",
      padding: "0 !important",
      margin: "0 !important",
      "box-sizing": "border-box !important",
    },
    p: {
      "margin-block": "0 0 1.1em !important",
      "text-indent": "1.25em !important",
      "word-break": "break-word !important",
      hyphens: "auto !important",
      "-webkit-hyphens": "auto !important",
    },
    "p:first-of-type": {
      "text-indent": "0 !important",
    },
    h1: {
      "font-family": `${fontFamily} !important`,
      color: `${palette.textColor} !important`,
      "line-height": "1.25 !important",
      "margin-block": "1.2em 0.8em !important",
      "text-align": "center !important",
      "page-break-before": "always !important",
      "break-before": "page !important",
    },
    h2: {
      "font-family": `${fontFamily} !important`,
      color: `${palette.textColor} !important`,
      "line-height": "1.3 !important",
      "margin-block": "1.2em 0.8em !important",
      "text-align": "center !important",
    },
    h3: {
      "font-family": `${fontFamily} !important`,
      color: `${palette.textColor} !important`,
      "line-height": "1.35 !important",
      "margin-block": "1em 0.6em !important",
    },
    img: {
      "max-width": "100% !important",
      height: "auto !important",
    },
  });

  try {
    rendition.themes?.fontSize?.(`${fontSize}px`);
    rendition.themes?.font?.(fontFamily);
    rendition.themes?.override?.("color", `${palette.textColor} !important`);
    rendition.themes?.override?.("background", `${palette.pageBg} !important`);
  } catch {}
}

export function BookReaderPage() {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const shellRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bookEngineRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  const locationsReadyRef = useRef(false);

  // --- QUERY BOOK DATA ---
  const bookQuery = useQuery({
    queryKey: ["book-detail", bookId],
    queryFn: () => getBookById(bookId),
    enabled: Boolean(bookId),
  });

  const book = useMemo(() => {
    if (bookQuery.data) {
      return {
        id: bookQuery.data.id,
        title: bookQuery.data.title,
        author: bookQuery.data.author,
        coverUrl: bookQuery.data.coverUrl || null,
        epubUrl: bookQuery.data.epubUrl || null,
        hasEpub: bookQuery.data.hasEpub,
      };
    }
    return {
      id: bookId || "",
      title: "",
      author: "",
      coverUrl: null,
      epubUrl: null,
      hasEpub: false,
    };
  }, [bookQuery.data, bookId]);

  // Ensure local progress metadata contains real book title and cover
  useEffect(() => {
    if (bookId && bookQuery.data?.title) {
      try {
        const raw = localStorage.getItem(`lura_book_progress_${bookId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          let changed = false;
          if (!parsed.title || parsed.title === "Book") {
            parsed.title = bookQuery.data.title;
            changed = true;
          }
          if (!parsed.coverUrl && bookQuery.data.coverUrl) {
            parsed.coverUrl = bookQuery.data.coverUrl;
            changed = true;
          }
          if (changed) {
            localStorage.setItem(`lura_book_progress_${bookId}`, JSON.stringify(parsed));
          }
        }
      } catch {}
    }
  }, [bookId, bookQuery.data]);

  // --- PERSISTED READING POSITION (Starts at 1, NOT 68) ---
  const progressStorageKey = `lura_book_page_${bookId || "demo"}`;
  const cfiStorageKey = `lura_book_cfi_${bookId || "demo"}`;

  const [currentPage, setCurrentPage] = useState<number>(() => {
    try {
      const savedCfi = localStorage.getItem(cfiStorageKey);
      const saved = localStorage.getItem(progressStorageKey);
      if (savedCfi && saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 1) {
          return parsed;
        }
      }
      const rawFull = localStorage.getItem(`lura_book_progress_${bookId || "demo"}`);
      if (rawFull) {
        const parsedObj = JSON.parse(rawFull);
        if (parsedObj.currentPage && parsedObj.currentPage >= 1) {
          return parsedObj.currentPage;
        }
      }
    } catch {
      // ignore
    }
    return 1;
  });

  const [totalPages, setTotalPages] = useState<number>(() => {
    try {
      const rawFull = localStorage.getItem(`lura_book_progress_${bookId || "demo"}`);
      if (rawFull) {
        const parsedObj = JSON.parse(rawFull);
        if (typeof parsedObj.totalPages === "number" && parsedObj.totalPages > 1) {
          return parsedObj.totalPages;
        }
      }
    } catch {}
    return 1;
  });
  const [progressPercent, setProgressPercent] = useState<number>(() => {
    try {
      const rawFull = localStorage.getItem(`lura_book_progress_${bookId || "demo"}`);
      if (rawFull) {
        const parsedObj = JSON.parse(rawFull);
        if (typeof parsedObj.progressPercent === "number") {
          return Math.min(100, Math.max(0, parsedObj.progressPercent));
        }
      }
    } catch {}
    return 0;
  });
  const [currentSectionHref, setCurrentSectionHref] = useState<string>("");
  const [chapters, setChapters] = useState<TocChapterItem[]>([]);
  const [isEpubMode, setIsEpubMode] = useState<boolean>(false);
  const [isReaderBooting, setIsReaderBooting] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const handleRetry = useCallback(() => {
    if (bookId) {
      epubBufferCache.delete(bookId);
    }
    setReloadKey((k) => k + 1);
  }, [bookId]);

  // --- READER PREFERENCES ---
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.fontSize === "number") return p.fontSize;
      }
    } catch {
      // ignore
    }
    return 16;
  });

  const [fontFamily, setFontFamily] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.fontFamily === "string") return p.fontFamily;
      }
    } catch {
      // ignore
    }
    return FONT_OPTIONS[0].cssFamily; // "Modern Serif"
  });

  const [theme, setTheme] = useState<BookTheme>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.theme === "light" || p.theme === "sepia" || p.theme === "dark") {
          return p.theme;
        }
      }
    } catch {
      // ignore
    }
    return "sepia";
  });

  const [brightnessEnabled, setBrightnessEnabled] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({ fontSize, fontFamily, theme, brightnessEnabled })
      );
    } catch {
      // ignore
    }
  }, [fontSize, fontFamily, theme, brightnessEnabled]);

  // Apply preferences dynamically to EPUB rendition
  useEffect(() => {
    if (renditionRef.current) {
      applyEpubTheme(renditionRef.current, theme, fontFamily, fontSize);
    }
  }, [theme, fontFamily, fontSize]);

  // --- BOOKMARKS & NOTES (NO FAKE DATA, PURGE LEGACY MOCK) ---
  const bookmarksStorageKey = `lura_book_bookmarks_${book.id}`;
  const [bookmarks, setBookmarks] = useState<BookBookmark[]>(() => {
    try {
      const saved = localStorage.getItem(bookmarksStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (b) =>
              b &&
              typeof b === "object" &&
              b.id !== "bm-1" &&
              !String(b.id || "").startsWith("bm-1") &&
              !String(b.label || "").includes("El juramento")
          );
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(bookmarksStorageKey, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks, bookmarksStorageKey]);

  const notesStorageKey = `lura_book_notes_${book.id}`;
  const [notes, setNotes] = useState<BookNote[]>(() => {
    try {
      const saved = localStorage.getItem(notesStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (n) =>
              n &&
              typeof n === "object" &&
              n.id !== "note-1" &&
              !String(n.id || "").startsWith("note-1") &&
              !String(n.text || "").includes("ley de la corte")
          );
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(notesStorageKey, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes, notesStorageKey]);

  // --- OVERLAYS STATE ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- SESSION TRACKING ---
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionEndRequestedRef = useRef(false);
  const hasStartedRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!bookId) return;
    if (hasStartedRef.current === bookId) return;
    hasStartedRef.current = bookId;

    startBookReadingSession(bookId)
      .then((id) => {
        if (!id) return null;
        sessionIdRef.current = id;
        setSessionId(id);
        // If the component already unmounted before the start request resolved
        if (!isMountedRef.current || sessionEndRequestedRef.current) {
          sessionEndRequestedRef.current = true;
          endReadingSessionKeepalive(id);
        }
        return id;
      })
      .catch(() => null);
  }, [bookId]);

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
    void endReadingSession(activeSessionId).catch(() => {});
  }, []);

  // Terminate session when reader unmounts (e.g. navigation / closing reader)
  useEffect(() => {
    return () => {
      endSessionIfNeeded(false);
    };
  }, [endSessionIfNeeded]);

  // Window unload and pagehide listeners
  useEffect(() => {
    const handlePageHide = () => {
      endSessionIfNeeded(true);
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [endSessionIfNeeded]);

  // --- RESIZE HANDLER FOR EPUB ---
  useEffect(() => {
    let resizeTimeout: any = null;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (renditionRef.current && viewportRef.current) {
          try {
            const rect = viewportRef.current.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              renditionRef.current.resize(rect.width, rect.height);
            }
          } catch {}
        }
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // --- LOAD REAL EPUB ENGINE ---
  useEffect(() => {
    let cancelled = false;
    let cleanupPagingFix: (() => void) | null = null;

    async function initEpub() {
      if (!viewportRef.current) return;
      setIsReaderBooting(true);

      try {
        let arrayBuffer: ArrayBuffer | null = bookId ? (epubBufferCache.get(bookId) || null) : null;

        // 1. Prioritize backend streaming (guaranteed CORS + authentication + memory cached)
        if (!arrayBuffer && bookId) {
          try {
            const blob = await getBookFileBlob(bookId);
            arrayBuffer = await blob.arrayBuffer();
            epubBufferCache.set(bookId, arrayBuffer);
          } catch (err) {
            console.warn("Backend EPUB streaming error:", err);
          }
        }

        // 2. Direct CDN fallback if backend was unavailable
        if (!arrayBuffer && bookQuery.data?.epubUrl) {
          try {
            const res = await fetch(bookQuery.data.epubUrl);
            if (res.ok) {
              arrayBuffer = await res.arrayBuffer();
              if (bookId) epubBufferCache.set(bookId, arrayBuffer);
            }
          } catch (err) {
            console.warn("Direct CDN fetch error:", err);
          }
        }

        if (!arrayBuffer || cancelled || !viewportRef.current) {
          if (!cancelled) {
            setIsEpubMode(false);
            setIsReaderBooting(false);
          }
          return;
        }

        const epubModule = await import("epubjs");
        const ePubFactory =
          typeof (epubModule as any).default === "function"
            ? (epubModule as any).default
            : (epubModule as any).default?.default || (epubModule as any);

        if (!ePubFactory || cancelled || !viewportRef.current) return;

        viewportRef.current.innerHTML = "";
        const bookEngine = ePubFactory(arrayBuffer);
        bookEngineRef.current = bookEngine;

        // Try loading cached locations immediately for instant 0ms locationsReady
        const locationsCacheKey = bookId ? `lura_book_locations_${bookId}` : null;
        if (locationsCacheKey) {
          try {
            const cachedLocations = localStorage.getItem(locationsCacheKey);
            if (cachedLocations) {
              bookEngine.locations.load(cachedLocations);
              if (bookEngine.locations.total > 0) {
                locationsReadyRef.current = true;
                setTotalPages(bookEngine.locations.total);
              }
            }
          } catch {}
        }

        // Configure epub.js rendition in dual-page spread mode.
        // On viewports >= 700px, two facing pages are rendered side-by-side with a 60px gutter.
        const rendition = bookEngine.renderTo(viewportRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "always",
          minSpreadWidth: 700,
          gap: 60,
        });
        renditionRef.current = rendition;

        // Attach monkey patches to epub.js DefaultViewManager to resolve:
        // 1. Dropped last half-spread on odd page counts.
        // 2. Misaligned backward scrolling.
        // 3. Unhandled task rejection queue deadlocks.
        cleanupPagingFix = applyEpubPagingFix(rendition);

        // Inject active palette, typography, line-height, and paragraph indent rules into iframe
        applyEpubTheme(rendition, theme, fontFamily, fontSize);

        rendition.on("keyup", (e: any) => {
          if (e.key === "ArrowLeft" || e.key === "PageUp") {
            handlePrevPage();
          } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
            handleNextPage();
          }
        });

        rendition.on("relocated", (location: any) => {
          if (cancelled) return;
          const cfi = location?.start?.cfi || "";
          const href = location?.start?.href || "";

          setCurrentSectionHref(href);

          let pct = 0;
          let calculatedPage = currentPage;
          let calculatedTotal = totalPages;

          if (locationsReadyRef.current && bookEngine.locations && bookEngine.locations.total > 0) {
            calculatedTotal = bookEngine.locations.total;
            if (cfi) {
              try {
                const cfiPct = bookEngine.locations.percentageFromCfi(cfi);
                const loc = bookEngine.locations.locationFromCfi(cfi);

                if (typeof loc === "number" && loc >= 0) {
                  calculatedPage = loc + 1;
                } else if (typeof cfiPct === "number" && cfiPct > 0) {
                  calculatedPage = Math.max(1, Math.min(calculatedTotal, Math.round(cfiPct * calculatedTotal)));
                }

                pct = Math.min(100, Math.max(0, Math.round(((calculatedPage - 1) / Math.max(1, calculatedTotal - 1)) * 100)));
              } catch {
                pct = Math.min(100, Math.max(0, Math.round((calculatedPage / calculatedTotal) * 100)));
              }
            }
          } else {
            // Locations not ready yet: preserve existing totalPages (never use chapter page count)
            if (calculatedTotal > 1 && calculatedPage >= 1) {
              pct = Math.min(100, Math.max(0, Math.round(((calculatedPage - 1) / Math.max(1, calculatedTotal - 1)) * 100)));
            }
          }

          setCurrentPage(calculatedPage);
          if (calculatedTotal > 1) {
            setTotalPages(calculatedTotal);
          }
          const finalPct = Math.min(100, Math.max(0, pct));
          setProgressPercent(finalPct);

          try {
            if (cfi) localStorage.setItem(cfiStorageKey, cfi);
            localStorage.setItem(progressStorageKey, String(calculatedPage));
          } catch {}

          // ONLY save progress if locations are ready OR if calculatedTotal is a valid full book count (> 50)
          if (bookId && (locationsReadyRef.current || calculatedTotal > 50)) {
            const matchedChapter = chapters.find((c) => href && c.href && href.includes(c.href));
            const isFinished = location?.atEnd === true || finalPct >= 100 || (calculatedTotal > 1 && calculatedPage >= calculatedTotal && finalPct >= 95);
            saveBookProgress(bookId, {
              spineIndex: 0,
              sectionHref: href,
              locator: cfi,
              progressPercent: finalPct,
              currentPage: calculatedPage,
              totalPages: calculatedTotal,
              title: book.title || bookQuery.data?.title,
              coverUrl: book.coverUrl || bookQuery.data?.coverUrl,
              chapterTitle: matchedChapter?.title,
              completed: isFinished,
            }).catch(() => {});
          }
        });

        rendition.on("rendered", () => {
          if (!cancelled) {
            setIsEpubMode(true);
            setIsReaderBooting(false);
          }
        });

        await bookEngine.ready;

        // Extract real table of contents from EPUB
        const tocItems: Array<{ id: string; title: string; href: string }> = (bookEngine.navigation?.toc || []).map((t: any) => ({
          id: t.id || t.href,
          title: (t.label || "").trim() || "Capítulo",
          href: t.href,
        }));

        if (!cancelled) {
          setChapters(tocItems);
          setIsEpubMode(true);
        }

        // Restore saved position or display from beginning
        let savedCfi = localStorage.getItem(cfiStorageKey);
        if (!savedCfi && bookId) {
          try {
            const rawProgress = localStorage.getItem(`lura_book_progress_${bookId}`);
            if (rawProgress) {
              const parsed = JSON.parse(rawProgress);
              if (parsed.locator) savedCfi = parsed.locator;
            }
          } catch {}
        }

        try {
          if (savedCfi) {
            await rendition.display(savedCfi);
          } else {
            await rendition.display();
          }
        } catch {
          await rendition.display();
        }

        if (!cancelled) {
          setIsEpubMode(true);
          setIsReaderBooting(false);
        }

        // Generate locations if not already cached
        const shouldGenerate = !locationsReadyRef.current || !locationsCacheKey || !localStorage.getItem(locationsCacheKey);
        if (shouldGenerate) {
          void bookEngine.locations
            .generate(1024)
            .then(() => {
              if (cancelled) return;
              locationsReadyRef.current = true;
              const total = bookEngine.locations.total;
              if (typeof total === "number" && total > 0) {
                setTotalPages(total);
                if (locationsCacheKey) {
                  try {
                    localStorage.setItem(locationsCacheKey, bookEngine.locations.save());
                  } catch {}
                }
                const currentLocation = rendition.currentLocation?.() || renditionRef.current?.location;
                const currentCfi = currentLocation?.start?.cfi;
                if (currentCfi) {
                  try {
                    const cfiPct = bookEngine.locations.percentageFromCfi(currentCfi);
                    const loc = bookEngine.locations.locationFromCfi(currentCfi);
                    let updatedPage = currentPage;
                    if (typeof loc === "number" && loc >= 0) {
                      updatedPage = loc + 1;
                    } else if (typeof cfiPct === "number" && cfiPct > 0) {
                      updatedPage = Math.max(1, Math.min(total, Math.round(cfiPct * total)));
                    }
                    const updatedPct = Math.min(100, Math.max(0, Math.round(((updatedPage - 1) / Math.max(1, total - 1)) * 100)));
                    setProgressPercent(updatedPct);
                    setCurrentPage(updatedPage);
                    if (bookId) {
                      const matchedChapter = tocItems.find((c) => currentSectionHref && c.href && currentSectionHref.includes(c.href));
                      const isFinished = updatedPct >= 100 || (total > 1 && updatedPage >= total && updatedPct >= 95);
                      saveBookProgress(bookId, {
                        spineIndex: 0,
                        sectionHref: currentSectionHref,
                        locator: currentCfi,
                        progressPercent: updatedPct,
                        currentPage: updatedPage,
                        totalPages: total,
                        title: book.title || bookQuery.data?.title,
                        coverUrl: book.coverUrl || bookQuery.data?.coverUrl,
                        chapterTitle: matchedChapter?.title,
                        completed: isFinished,
                      }).catch(() => {});
                    }
                  } catch {}
                }
              }
            })
            .catch(() => {
              locationsReadyRef.current = false;
            });
        }
      } catch (err) {
        console.error("Error loading EPUB:", err);
        if (!cancelled) {
          setIsEpubMode(false);
          setIsReaderBooting(false);
        }
      }
    }

    void initEpub();

    return () => {
      cancelled = true;
      try {
        cleanupPagingFix?.();
        renditionRef.current?.destroy?.();
        bookEngineRef.current?.destroy?.();
      } catch {}
      renditionRef.current = null;
      bookEngineRef.current = null;
    };
  }, [bookId, reloadKey, cfiStorageKey, progressStorageKey]);

  // --- NAVIGATION (TWO-PAGE SPREAD) ---
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const isNavigatingRef = useRef(false);

  const handlePrevPage = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 180);

    if (isEpubMode && renditionRef.current) {
      renditionRef.current.prev?.();
    } else {
      setCurrentPage((prev) => Math.max(1, prev - 2));
    }
  }, [isEpubMode]);

  const handleNextPage = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 180);

    if (isEpubMode && renditionRef.current) {
      renditionRef.current.next?.();
    } else {
      setCurrentPage((prev) => Math.min(totalPages - 1, prev + 2));
    }
  }, [isEpubMode, totalPages]);

  const handlePageSelect = useCallback(
    (target: number) => {
      const normalized = Math.max(1, Math.min(totalPages, target));
      setCurrentPage(normalized);

      if (isEpubMode && bookEngineRef.current && renditionRef.current) {
        try {
          if (locationsReadyRef.current && bookEngineRef.current.locations) {
            const cfi = bookEngineRef.current.locations.cfiFromLocation(normalized - 1);
            if (cfi) {
              void renditionRef.current.display(cfi);
              return;
            }
          }
          const pct = (normalized - 1) / Math.max(1, totalPages - 1);
          const cfi = bookEngineRef.current.locations.cfiFromPercentage(pct);
          if (cfi) {
            void renditionRef.current.display(cfi);
          }
        } catch {}
      }
    },
    [isEpubMode, totalPages]
  );

  const handleTocNavigate = useCallback(
    (target: string | number) => {
      if (isEpubMode && renditionRef.current && typeof target === "string") {
        void renditionRef.current.display(target);
      } else if (typeof target === "number") {
        handlePageSelect(target);
      }
    },
    [handlePageSelect, isEpubMode]
  );

  // --- FULLSCREEN & WINDOW CONTROLS ---
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await shellRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const handleMinimize = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      endSessionIfNeeded(false);
      navigate(bookId ? `/books/${bookId}` : "/books");
    }
  }, [bookId, navigate, endSessionIfNeeded]);

  const handleClose = useCallback(() => {
    endSessionIfNeeded(false);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    navigate(bookId ? `/books/${bookId}` : "/books");
  }, [bookId, navigate, endSessionIfNeeded]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevPage();
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === "Escape") {
        if (isBookmarksOpen) setIsBookmarksOpen(false);
        else if (isNotesOpen) setIsNotesOpen(false);
        else if (isTocOpen) setIsTocOpen(false);
        else if (isSettingsOpen) setIsSettingsOpen(false);
      } else if (e.key === "f" || e.key === "F") {
        void handleToggleFullscreen();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handlePrevPage,
    handleNextPage,
    handleToggleFullscreen,
    isBookmarksOpen,
    isNotesOpen,
    isTocOpen,
    isSettingsOpen,
  ]);

  // --- BOOKMARKS & NOTES ACTIONS ---
  const handleAddBookmark = (pageNumber: number, label?: string) => {
    setBookmarks((prev) => [
      ...prev,
      {
        id: `bm-${Date.now()}`,
        pageNumber,
        label: label || `Página ${pageNumber}`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleRemoveBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  };

  const handleAddNote = (pageNumber: number, text: string) => {
    setNotes((prev) => [
      ...prev,
      {
        id: `note-${Date.now()}`,
        pageNumber,
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleRemoveNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div
      ref={shellRef}
      className={`book-window-shell theme-${theme} ${
        brightnessEnabled ? "brightness-active" : ""
      }`}
    >
      {/* 1. WINDOW TOPBAR */}
      <BookReaderWindowHeader
        title={book.title}
        author={book.author}
        isFullscreen={isFullscreen}
        onToggleToc={() => setIsTocOpen((prev) => !prev)}
        onToggleFullscreen={handleToggleFullscreen}
        onMinimize={handleMinimize}
        onClose={handleClose}
      />

      {/* 2. MAIN READING STAGE */}
      <main className="book-reader-stage-main">
        <BookPageSpread
          viewportRef={viewportRef}
          isEpubMode={isEpubMode}
          isBooting={isReaderBooting}
          bookTitle={book.title}
          bookAuthor={book.author}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onRetry={handleRetry}
          canPrev={canPrev}
          canNext={canNext}
        />

        {/* FLOATING SETTINGS TRIGGER BUTTON */}
        {!isSettingsOpen && (
          <button
            type="button"
            className="book-settings-float-trigger"
            onClick={() => setIsSettingsOpen(true)}
            title="Abrir configuración de lectura"
            aria-label="Configuración de lectura"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}

        {/* FLOATING SETTINGS PANEL */}
        <BookSettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          fontFamily={fontFamily}
          onFontFamilyChange={setFontFamily}
          theme={theme}
          onThemeChange={setTheme}
          brightnessEnabled={brightnessEnabled}
          onToggleBrightness={() => setBrightnessEnabled((prev) => !prev)}
        />
      </main>

      {/* 3. FLOATING BOTTOM DOCK */}
      <BookBottomDock
        currentPage={currentPage}
        totalPages={totalPages}
        progressPercent={progressPercent}
        onPageChange={handlePageSelect}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenNotes={() => setIsNotesOpen(true)}
        bookmarksCount={bookmarks.length}
        notesCount={notes.length}
      />

      {/* 4. MODALS & DRAWERS */}
      <BookBookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        currentPage={currentPage}
        bookmarks={bookmarks}
        onAddBookmark={handleAddBookmark}
        onRemoveBookmark={handleRemoveBookmark}
        onSelectBookmark={handlePageSelect}
      />

      <BookNotesModal
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        currentPage={currentPage}
        notes={notes}
        onAddNote={handleAddNote}
        onRemoveNote={handleRemoveNote}
        onSelectPage={handlePageSelect}
      />

      <BookTocDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        chapters={chapters}
        currentPage={currentPage}
        currentSectionHref={currentSectionHref}
        onSelectChapter={handleTocNavigate}
        bookTitle={book.title}
      />
    </div>
  );
}
