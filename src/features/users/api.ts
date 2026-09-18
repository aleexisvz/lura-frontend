import { apiClient } from "@/lib/apiClient";
import { pickNumber, pickString, unwrapArray, unwrapObject } from "@/lib/adapters";
import type { BookReaderPreferences, PublicUserProfile, Role, UserProfile, UserRankingItem, UserSearchResult } from "@/types/domain";

const MAX_DIMENSION = 768;
const OUTPUT_QUALITY = 0.84;

export async function getMe(): Promise<UserProfile> {
  const response = await apiClient.request<unknown>("/users/me");
  const source = unwrapObject(response);

  const role = pickString(source, ["role"], "USER");
  const profileImageUrl = pickString(source, ["profileImageUrl"], "");
  const createdAt = pickString(source, ["createdAt"], "");

  return {
    id: pickString(source, ["id"]),
    email: pickString(source, ["email"]),
    username: pickString(source, ["username"]),
    role: (role === "ADMIN" ? "ADMIN" : "USER") as Role,
    createdAt,
    profileImageUrl: profileImageUrl || null,
    readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
    readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
  };
}

export async function updateUsername(username: string): Promise<UserProfile> {
  const response = await apiClient.request<unknown>("/users/me", {
    method: "PATCH",
    body: { username },
  });
  const source = unwrapObject(response);

  const role = pickString(source, ["role"], "USER");
  const profileImageUrl = pickString(source, ["profileImageUrl"], "");
  const createdAt = pickString(source, ["createdAt"], "");

  return {
    id: pickString(source, ["id"]),
    email: pickString(source, ["email"]),
    username: pickString(source, ["username"]),
    role: (role === "ADMIN" ? "ADMIN" : "USER") as Role,
    createdAt,
    profileImageUrl: profileImageUrl || null,
    readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
    readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
  };
}

export async function uploadProfileImage(file: File) {
  const optimized = await optimizeImage(file);
  const formData = new FormData();
  formData.append("file", optimized, optimized.name);

  return apiClient.request<{ uploaded: boolean; profileImageUrl: string | null }>(
    "/users/me/upload-profile-image",
    {
      method: "POST",
      body: formData,
    }
  );
}

export async function getPublicProfile(username: string): Promise<PublicUserProfile> {
  const response = await apiClient.request<unknown>(`/users/${encodeURIComponent(username)}`);
  const source = unwrapObject(response);

  const role = pickString(source, ["role"], "USER");
  const profileImageUrl = pickString(source, ["profileImageUrl"], "");
  const createdAt = pickString(source, ["createdAt"], "");
  const statsSource = unwrapObject(source["stats"]);
  const recentSeriesSource = unwrapObject(source["recentSeries"]);

  const mapRecentItems = (value: unknown) =>
    unwrapArray(value).map((item) => {
      const entry = unwrapObject(item);
      return {
        contentId: pickString(entry, ["contentId", "id"]),
        title: pickString(entry, ["title"], "Sin titulo"),
        coverUrl: pickString(entry, ["coverUrl"], "") || null,
        lastStartedAt: pickString(entry, ["lastStartedAt"], ""),
      };
    });

  const continueReading = unwrapArray(source["continueReading"]).map((entry) => {
    const s = unwrapObject(entry);
    const contentType = pickString(s, ["contentType"], "MANGA");
    return {
      contentType: contentType === "BOOK" ? ("BOOK" as const) : ("MANGA" as const),
      bookId: pickString(s, ["bookId"]),
      title: pickString(s, ["title"]),
      chapterLabel: pickString(s, ["chapterLabel", "sectionLabel"]),
      mangaId: pickString(s, ["mangaId", "id"]),
      volumeId: pickString(s, ["volumeId"]),
      pageNumber: pickNumber(s, ["pageNumber", "currentPage", "page"], 1),
      mangaTitle: pickString(s, ["mangaTitle", "title"]),
      volumeTitle: pickString(s, ["volumeTitle", "chapterLabel", "volumeName"], ""),
      volumeNumber: pickNumber(s, ["volumeNumber", "chapterNumber"], 0),
      totalPages: pickNumber(s, ["totalPages", "pagesCount", "pageCount"], 0),
      progressPercent: pickNumber(s, ["progressPercent", "progress"], 0),
      coverUrl: pickString(s, ["coverUrl", "volumeCoverUrl"], "") || null,
      updatedAt: pickString(s, ["updatedAt"]),
    };
  });

  return {
    id: pickString(source, ["id"]),
    username: pickString(source, ["username"]),
    role: (role === "ADMIN" ? "ADMIN" : "USER") as Role,
    createdAt,
    profileImageUrl: profileImageUrl || null,
    readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
    readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
    stats: {
      totalSessions: pickNumber(statsSource, ["totalSessions", "sessions"], 0),
      totalMinutes: pickNumber(statsSource, ["totalMinutes", "minutes"], 0),
      totalSeconds: pickNumber(statsSource, ["totalSeconds", "seconds"], 0),
      mangaSeconds: pickNumber(statsSource, ["mangaSeconds"], 0),
      bookSeconds: pickNumber(statsSource, ["bookSeconds"], 0),
      totalPagesRead: pickNumber(statsSource, ["totalPagesRead", "pagesRead"], 0),
      mangaPagesRead: pickNumber(statsSource, ["mangaPagesRead"], 0),
      bookPagesRead: pickNumber(statsSource, ["bookPagesRead"], 0),
      totalVolumesRead: pickNumber(statsSource, ["totalVolumesRead", "volumesRead"], 0),
      totalChaptersRead: pickNumber(statsSource, ["totalChaptersRead", "chaptersRead"], 0),
      totalMangasRead: pickNumber(statsSource, ["totalMangasRead", "mangasRead"], 0),
      totalSeriesRead: pickNumber(statsSource, ["totalSeriesRead", "seriesRead"], 0),
      totalBooksRead: pickNumber(statsSource, ["totalBooksRead", "booksRead"], 0),
      readingLevel: Math.max(1, pickNumber(statsSource, ["readingLevel"], 1)),
      readingXpTotal: Math.max(0, pickNumber(statsSource, ["readingXpTotal"], 0)),
      xpInLevel: Math.max(0, pickNumber(statsSource, ["xpInLevel"], 0)),
      xpToNextLevel: Math.max(1, pickNumber(statsSource, ["xpToNextLevel"], 20)),
      xpProgressPercent: Math.max(0, Math.min(100, pickNumber(statsSource, ["xpProgressPercent"], 0))),
      isHotWeekend: Boolean(statsSource["isHotWeekend"]),
      xpMultiplier: pickNumber(statsSource, ["xpMultiplier"], 1),
      activeXpEvent: pickString(statsSource, ["activeXpEvent"]) || null,
      xpPerMinute: pickNumber(statsSource, ["xpPerMinute"], 2),
    },
    recentSeries: {
      manga: mapRecentItems(recentSeriesSource["manga"]),
      books: mapRecentItems(recentSeriesSource["books"]),
    },
    continueReading,
  };
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const response = await apiClient.request<unknown>(`/users/search?q=${encodeURIComponent(trimmed)}`);
  return unwrapArray(response).map((item) => {
    const source = unwrapObject(item);
    const profileImageUrl = pickString(source, ["profileImageUrl"], "");
    return {
      id: pickString(source, ["id"]),
      username: pickString(source, ["username"]),
      profileImageUrl: profileImageUrl || null,
      readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
      readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
    };
  });
}

export async function getUserRankings(): Promise<UserRankingItem[]> {
  const response = await apiClient.request<unknown>("/users/rankings");
  return unwrapArray(response).map((item) => {
    const source = unwrapObject(item);
    const role = pickString(source, ["role"], "USER");
    const profileImageUrl = pickString(source, ["profileImageUrl"], "");
    return {
      rank: pickNumber(source, ["rank"], 1),
      id: pickString(source, ["id"]),
      username: pickString(source, ["username"]),
      role: (role === "ADMIN" ? "ADMIN" : "USER") as Role,
      profileImageUrl: profileImageUrl || null,
      readingLevel: Math.max(1, pickNumber(source, ["readingLevel"], 1)),
      readingXpTotal: Math.max(0, pickNumber(source, ["readingXpTotal"], 0)),
      readingTimeTotalSeconds: Math.max(0, pickNumber(source, ["readingTimeTotalSeconds"], 0)),
    };
  });
}

export async function getBookReaderPreferences(): Promise<BookReaderPreferences> {
  const response = await apiClient.request<unknown>("/users/me/book-reader-preferences");
  const source = unwrapObject(response);
  const mode = pickString(source, ["mode"], "PAGINATED");

  return {
    mode: mode === "SCROLL" ? "SCROLL" : "PAGINATED",
    theme: pickString(source, ["theme"], "light"),
    fontFamily: pickString(source, ["fontFamily"], "system-ui"),
    fontSize: Math.max(12, pickNumber(source, ["fontSize"], 18)),
    lineHeight: pickNumber(source, ["lineHeight"], 1.6),
    textAlign: pickString(source, ["textAlign"], "left"),
    pageWidth: pickNumber(source, ["pageWidth"], 720),
  };
}

export async function updateBookReaderPreferences(
  payload: BookReaderPreferences
): Promise<BookReaderPreferences> {
  const response = await apiClient.request<unknown>("/users/me/book-reader-preferences", {
    method: "PUT",
    body: payload,
  });

  const source = unwrapObject(response);
  const mode = pickString(source, ["mode"], "PAGINATED");

  return {
    mode: mode === "SCROLL" ? "SCROLL" : "PAGINATED",
    theme: pickString(source, ["theme"], "light"),
    fontFamily: pickString(source, ["fontFamily"], "system-ui"),
    fontSize: Math.max(12, pickNumber(source, ["fontSize"], 18)),
    lineHeight: pickNumber(source, ["lineHeight"], 1.6),
    textAlign: pickString(source, ["textAlign"], "left"),
    pageWidth: pickNumber(source, ["pageWidth"], 720),
  };
}

async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", OUTPUT_QUALITY);
    });

    if (!blob) {
      return file;
    }

    const basename = file.name.replace(/\.[^.]+$/, "") || "avatar";
    const optimizedFile = new File([blob], `${basename}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    // Keep the original when optimization does not reduce size.
    return optimizedFile.size < file.size ? optimizedFile : file;
  } catch {
    return file;
  }
}
