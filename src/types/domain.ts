export type Role = "USER" | "ADMIN";

export type SessionUser = {
  role: Role;
  email?: string;
  sub?: string;
};

export type Manga = {
  id: string;
  title: string;
  description?: string;
};

export type Volume = {
  id: string;
  title: string;
  number?: number;
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
};

export type Book = {
  id: string;
  title: string;
  author?: string;
  description?: string;
};

