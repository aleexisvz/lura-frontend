import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTags } from "@/features/tags/api";
import { getMangaPage } from "@/features/manga/api";
import { getBooksPage } from "@/features/books/api";
import { AdminNavTabs, AdminTab } from "../components/AdminNavTabs";
import { MangaAdminSection } from "../components/manga/MangaAdminSection";
import { BookAdminSection } from "../components/books/BookAdminSection";
import { TagAdminSection } from "../components/tags/TagAdminSection";
import { UserAdminSection } from "../components/users/UserAdminSection";
import "@/styles/admin.css";

export function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("manga");

  // Fetch counts and tags
  const mangaTagsQuery = useQuery({
    queryKey: ["tags", "MANGA"],
    queryFn: () => getTags("MANGA"),
  });

  const bookTagsQuery = useQuery({
    queryKey: ["tags", "BOOK"],
    queryFn: () => getTags("BOOK"),
  });

  // Only the totals are needed here, so each query loads a single page.
  // Object keys never collide with the list queries, and the list invalidations
  // by prefix ("manga-list-admin", "books-admin") refresh these counts too.
  const mangaQuery = useQuery({
    queryKey: ["manga-list-admin", { count: true }],
    queryFn: () => getMangaPage({}, null),
  });

  const booksQuery = useQuery({
    queryKey: ["books-admin", { count: true }],
    queryFn: () => getBooksPage({}, null),
  });

  const mangaTags = mangaTagsQuery.data ?? [];
  const bookTags = bookTagsQuery.data ?? [];

  return (
    <div className="admin-page-container">
      {/* Admin Nav Tabs Header */}
      <div className="admin-header-wrapper">
        <AdminNavTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={{
            mangas: mangaQuery.data?.totalCount ?? undefined,
            books: booksQuery.data?.totalCount ?? undefined,
            tags: mangaTags.length + bookTags.length,
          }}
        />
      </div>

      {/* Tab Content Panels */}
      <main className="admin-content-view">
        {activeTab === "manga" && <MangaAdminSection tags={mangaTags} />}
        {activeTab === "books" && <BookAdminSection tags={bookTags} />}
        {activeTab === "tags" && <TagAdminSection />}
        {activeTab === "users" && <UserAdminSection />}
      </main>
    </div>
  );
}
