import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { getMe } from "@/features/users/api";
import { ProtectedImage } from "@/components/ProtectedImage";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/profile", label: "Perfil" },
  { to: "/manga", label: "Manga" },
  { to: "/books", label: "Books" },
];

export function AppLayout() {
  const { role, email, logout } = useAuth();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    staleTime: 1000 * 60 * 5,
  });

  const avatarInitial = (meQuery.data?.email ?? email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Lura MVP
        </Link>
        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? "active-link" : "")}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
          {role === "ADMIN" && (
            <NavLink className={({ isActive }) => (isActive ? "active-link" : "")} to="/admin">
              Admin
            </NavLink>
          )}
        </nav>
        <div className="topbar-actions">
          <Link className="topbar-avatar-link" to="/profile" aria-label="Abrir perfil">
            {meQuery.data?.profileImageUrl ? (
              <ProtectedImage
                path={meQuery.data.profileImageUrl}
                alt="Foto de perfil"
                className="topbar-avatar-image"
              />
            ) : (
              <span className="topbar-avatar-fallback">{avatarInitial}</span>
            )}
          </Link>
          <button className="secondary-button" onClick={logout} type="button">
            Cerrar sesion
          </button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}

