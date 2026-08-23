import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTags } from "@/features/tags/api";
import { getMangaList } from "@/features/manga/api";
import { getBooks } from "@/features/books/api";
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

  const mangaQuery = useQuery({
    queryKey: ["manga-list-admin"],
    queryFn: () => getMangaList(),
  });

  const booksQuery = useQuery({
    queryKey: ["books-admin"],
    queryFn: () => getBooks(),
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
            mangas: mangaQuery.data?.length,
            books: booksQuery.data?.length,
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
