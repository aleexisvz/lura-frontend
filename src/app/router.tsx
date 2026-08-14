import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthGuard, AdminGuard } from "@/app/route-guards";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { HomePage } from "@/features/reading/pages/HomePage";
import { MangaListPage } from "@/features/manga/pages/MangaListPage";
import { MangaDetailPage } from "@/features/manga/pages/MangaDetailPage";
import { MangaReaderPage } from "@/features/manga/pages/MangaReaderPage";
import { BooksListPage } from "@/features/books/pages/BooksListPage";
import { BookDetailPage } from "@/features/books/pages/BookDetailPage";
import { BookReaderPage } from "@/features/books/pages/BookReaderPage";
import { AdminPanelPage } from "@/features/admin/pages/AdminPanelPage";
import { PromotePage } from "@/features/admin/pages/PromotePage";
import { ProfilePage } from "@/features/profile/pages/ProfilePage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/manga" element={<MangaListPage />} />
          <Route path="/manga/:mangaId" element={<MangaDetailPage />} />
          <Route
            path="/reader/:mangaId/:volumeId/:pageNumber"
            element={<MangaReaderPage />}
          />
          <Route path="/books" element={<BooksListPage />} />
          <Route path="/books/:bookId" element={<BookDetailPage />} />
          <Route path="/books/:bookId/read" element={<BookReaderPage />} />

          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminPanelPage />} />
            <Route path="/promote" element={<PromotePage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
