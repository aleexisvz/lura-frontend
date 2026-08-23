export type Role = "USER" | "ADMIN";

export type SessionUser = {
  role: Role;
  email?: string;
  sub?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: Role;
  createdAt: string;
  profileImageUrl: string | null;
  readingXpTotal: number;
  readingLevel: number;
};

export type TagScope = "MANGA" | "BOOK";

export type Tag = {
  id: string;
  scope: TagScope;
  name: string;
  slug: string;
};

export type Manga = {
  id: string;
  title: string;
  titleKanji?: string | null;
  author?: string | null;
  description?: string;
  tags: Tag[];
  categories: string[];
  coverUrl: string | null;
  status?: "EN_EMISION" | "FINALIZADO";
  latestVolume?: Volume | null;
  createdAt?: string;
};

export type MangaWithLatest = Manga;

export type MangaRankingItem = {
  rank: number;
  readersCount: number;
  manga: Manga;
};

export type Volume = {
  id: string;
  mangaId?: string;
  title: string;
  number: number;
  status?: "UPLOADING" | "READY";
  pagesCount?: number;
  coverUrl: string | null;
};

export type MangaPage = {
  pageNumber: number;
  imageUrl: string;
};

export type MangaProgress = {
  mangaId: string;
  volumeId: string;
  pageNumber: number;
  completed?: boolean;
};

export type ContinueReadingItem = {
  contentType?: "MANGA" | "BOOK";
  bookId?: string;
  title?: string;
  chapterLabel?: string;
  mangaId: string;
  volumeId: string;
  pageNumber: number;
  mangaTitle?: string;
  volumeTitle?: string;
  volumeNumber?: number;
  totalPages?: number;
  progressPercent?: number;
  coverUrl?: string | null;
  updatedAt?: string;
};

export type ReadingStats = {
  totalSessions: number;
  totalMinutes: number;
  totalSeconds: number;
  totalPagesRead: number;
  totalVolumesRead: number;
  totalChaptersRead: number;
  totalMangasRead: number;
  totalSeriesRead: number;
  totalBooksRead: number;
  readingLevel: number;
  readingXpTotal: number;
  xpInLevel: number;
  xpToNextLevel: number;
  xpProgressPercent: number;
  isHotWeekend?: boolean;
  xpMultiplier?: number;
  activeXpEvent?: string | null;
  xpPerMinute?: number;
};

export type RecentSeriesItem = {
  contentId: string;
  title: string;
  coverUrl: string | null;
  lastStartedAt: string;
};

export type RecentSeriesResponse = {
  manga: RecentSeriesItem[];
  books: RecentSeriesItem[];
};

export type Book = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  tags: Tag[];
  categories: string[];
  coverUrl: string | null;
  hasEpub?: boolean;
  language?: string | null;
  readingDirection?: "DEFAULT" | "LTR" | "RTL";
  readerStatus?: "PROCESSING" | "READY" | "FAILED";
  processingError?: string | null;
};

export type BookReaderMode = "PAGINATED" | "SCROLL";

export type BookReaderPreferences = {
  mode: BookReaderMode;
  theme: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  textAlign: string;
  pageWidth: number;
};

export type BookSpineItem = {
  id: string;
  sectionId: string;
  href: string;
  mediaType: string;
  label: string;
  order: number;
};

export type BookTocItem = {
  id: string;
  label: string;
  href: string;
  sectionId: string | null;
  anchor: string | null;
  order: number;
};

export type BookReadManifest = {
  book: Book;
  readingDirection: "DEFAULT" | "LTR" | "RTL";
  resourcesBaseUrl: string;
  epubUrl: string;
  toc: BookTocItem[];
  spine: BookSpineItem[];
  defaultPreferences: BookReaderPreferences;
};

export type BookProgress = {
  bookId: string;
  spineIndex: number;
  sectionHref: string;
  locator: string;
  progressPercent: number;
  updatedAt: string;
};
