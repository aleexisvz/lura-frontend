export type Role = "USER" | "ADMIN";

export type SessionUser = {
  role: Role;
  email?: string;
  sub?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  role: Role;
  profileImageUrl: string | null;
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
  mangaId: string;
  volumeId: string;
  pageNumber: number;
  mangaTitle?: string;
};

export type ReadingStats = {
  totalSessions: number;
  totalMinutes: number;
  totalSeconds: number;
  totalPagesRead: number;
  totalVolumesRead: number;
  totalMangasRead: number;
};

export type Book = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  tags: Tag[];
  categories: string[];
  coverUrl: string | null;
};
