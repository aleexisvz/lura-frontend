import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookById, getBookFileBlob } from "@/features/books/api";
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
import {
  DEMO_BOOK,
  getBookPage,
} from "../components/bookDemoContent";

const PREFS_STORAGE_KEY = "lura_book_reader_preferences";

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
      "line-height": "1.68 !important",
      "text-align": "justify !important",
      padding: "36px 44px 28px 44px !important",
      margin: "0 auto !important",
      "column-gap": "56px !important",
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
        epubUrl: bookQuery.data.epubUrl || null,
        hasEpub: bookQuery.data.hasEpub,
      };
    }
    return {
      id: bookId || DEMO_BOOK.id,
      title: DEMO_BOOK.title,
      author: DEMO_BOOK.author,
      epubUrl: null,
      hasEpub: false,
    };
  }, [bookQuery.data, bookId]);

  // --- PERSISTED READING POSITION (Starts at 1, NOT 68) ---
  const progressStorageKey = `lura_book_page_${book.id}`;
  const cfiStorageKey = `lura_book_cfi_${book.id}`;

  const [currentPage, setCurrentPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(progressStorageKey);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed >= 1) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return 1;
  });

  const [totalPages, setTotalPages] = useState<number>(100);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentSectionHref, setCurrentSectionHref] = useState<string>("");
  const [chapters, setChapters] = useState<TocChapterItem[]>([]);
  const [isEpubMode, setIsEpubMode] = useState<boolean>(false);
  const [isReaderBooting, setIsReaderBooting] = useState<boolean>(true);

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

  // --- BOOKMARKS & NOTES (NO FAKE DATA) ---
  const bookmarksStorageKey = `lura_book_bookmarks_${book.id}`;
  const [bookmarks, setBookmarks] = useState<BookBookmark[]>(() => {
    try {
      const saved = localStorage.getItem(bookmarksStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return []; // Empty by default!
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
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return []; // Empty by default!
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
  const sessionIdRef = useRef<string | null>(null);
  const sessionEndRequestedRef = useRef(false);

  useEffect(() => {
    if (!bookId) return;

    let isSubscribed = true;
    startBookReadingSession(bookId)
      .then((id) => {
        if (isSubscribed && id) {
          sessionIdRef.current = id;
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
      const activeSessionId = sessionIdRef.current;
      if (activeSessionId && !sessionEndRequestedRef.current) {
        sessionEndRequestedRef.current = true;
        endReadingSessionKeepalive(activeSessionId);
      }
    };
  }, [bookId]);

  // --- LOAD REAL EPUB ENGINE ---
  useEffect(() => {
    let cancelled = false;

    async function initEpub() {
      if (!viewportRef.current) return;
      setIsReaderBooting(true);

      try {
        let arrayBuffer: ArrayBuffer | null = null;

        // Try direct CDN or backend file stream
        if (book.epubUrl) {
          try {
            const res = await fetch(book.epubUrl);
            if (res.ok) {
              arrayBuffer = await res.arrayBuffer();
            }
          } catch {
            // CORS/network fallback to backend endpoint
          }
        }

        if (!arrayBuffer && bookId) {
          try {
            const blob = await getBookFileBlob(bookId);
            arrayBuffer = await blob.arrayBuffer();
          } catch {
            // No file available
          }
        }

        if (!arrayBuffer || cancelled || !viewportRef.current) {
          // Fallback to demo mode if no EPUB found
          setIsEpubMode(false);
          setIsReaderBooting(false);
          setChapters(DEMO_BOOK.chapters);
          setTotalPages(DEMO_BOOK.totalPages);
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

        // Render paginated spread: two entire facing pages side-by-side
        const rendition = bookEngine.renderTo(viewportRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "always",
          minSpreadWidth: 700,
        });
        renditionRef.current = rendition;

        applyEpubTheme(rendition, theme, fontFamily, fontSize);

        rendition.on("relocated", (location: any) => {
          if (cancelled) return;
          const cfi = location?.start?.cfi || "";
          const displayedPage = Number(location?.start?.displayed?.page || 1);
          const displayedTotal = Number(location?.start?.displayed?.total || 1);
          const href = location?.start?.href || "";

          setCurrentSectionHref(href);

          let pct = 0;
          let calculatedPage = displayedPage;
          let calculatedTotal = displayedTotal;

          if (locationsReadyRef.current && cfi && bookEngine.locations) {
            try {
              pct = Math.round(bookEngine.locations.percentageFromCfi(cfi) * 100);
              const loc = bookEngine.locations.locationFromCfi(cfi);
              if (typeof loc === "number" && loc >= 0) {
                calculatedPage = loc + 1;
              }
              if (typeof bookEngine.locations.total === "number" && bookEngine.locations.total > 0) {
                calculatedTotal = bookEngine.locations.total;
              }
            } catch {
              pct = displayedTotal > 1 ? Math.round((displayedPage / displayedTotal) * 100) : 0;
            }
          } else if (displayedTotal > 1) {
            pct = Math.round((displayedPage / displayedTotal) * 100);
          }

          setCurrentPage(calculatedPage);
          if (calculatedTotal > 1) {
            setTotalPages(calculatedTotal);
          }
          setProgressPercent(Math.min(100, Math.max(0, pct)));

          try {
            if (cfi) localStorage.setItem(cfiStorageKey, cfi);
            localStorage.setItem(progressStorageKey, String(calculatedPage));
          } catch {}
        });

        rendition.on("rendered", () => {
          if (!cancelled) {
            setIsReaderBooting(false);
          }
        });

        await bookEngine.ready;

        // Extract real table of contents from EPUB
        const tocItems = (bookEngine.navigation?.toc || []).map((t: any) => ({
          id: t.id || t.href,
          title: (t.label || "").trim() || "Capítulo",
          href: t.href,
        }));

        if (!cancelled) {
          setChapters(tocItems.length > 0 ? tocItems : DEMO_BOOK.chapters);
          setIsEpubMode(true);
        }

        // Restore saved position or display from beginning
        const savedCfi = localStorage.getItem(cfiStorageKey);
        try {
          if (savedCfi) {
            await rendition.display(savedCfi);
          } else {
            await rendition.display();
          }
        } catch {
          await rendition.display();
        }

        setIsReaderBooting(false);

        // Generate locations for accurate total pages and page jumping
        void bookEngine.locations
          .generate(1024)
          .then(() => {
            if (cancelled) return;
            locationsReadyRef.current = true;
            if (bookEngine.locations.total) {
              setTotalPages(bookEngine.locations.total);
            }
          })
          .catch(() => {
            locationsReadyRef.current = false;
          });
      } catch {
        if (!cancelled) {
          setIsEpubMode(false);
          setIsReaderBooting(false);
          setChapters(DEMO_BOOK.chapters);
          setTotalPages(DEMO_BOOK.totalPages);
        }
      }
    }

    void initEpub();

    return () => {
      cancelled = true;
      try {
        renditionRef.current?.destroy?.();
        bookEngineRef.current?.destroy?.();
      } catch {}
      renditionRef.current = null;
      bookEngineRef.current = null;
    };
  }, [book.epubUrl, bookId, cfiStorageKey, progressStorageKey]);

  // --- NAVIGATION (TWO-PAGE SPREAD) ---
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handlePrevPage = useCallback(() => {
    if (isEpubMode && renditionRef.current) {
      renditionRef.current.prev?.();
    } else {
      setCurrentPage((prev) => Math.max(1, prev - 2));
    }
  }, [isEpubMode]);

  const handleNextPage = useCallback(() => {
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
    }
  }, []);

  const handleClose = useCallback(() => {
    const activeSessionId = sessionIdRef.current;
    if (activeSessionId && !sessionEndRequestedRef.current) {
      sessionEndRequestedRef.current = true;
      void endReadingSession(activeSessionId).catch(() => {});
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    navigate(bookId ? `/books/${bookId}` : "/books");
  }, [bookId, navigate]);

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

  // Fallback data if EPUB is not used
  const leftPageData = useMemo(
    () => (!isEpubMode ? getBookPage(currentPage, book.title, book.author || undefined) : null),
    [isEpubMode, currentPage, book.title, book.author]
  );

  const rightPageData = useMemo(
    () =>
      !isEpubMode && currentPage + 1 <= totalPages
        ? getBookPage(currentPage + 1, book.title, book.author || undefined)
        : null,
    [isEpubMode, currentPage, totalPages, book.title, book.author]
  );

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
          leftPage={leftPageData}
          rightPage={rightPageData}
          bookTitle={book.title}
          bookAuthor={book.author}
          fontSize={fontSize}
          fontFamily={fontFamily}
          textAlign="justify"
          lineHeight={1.68}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
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
