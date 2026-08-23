import { useMemo } from "react";
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

  const isHotWeekend = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }, []);

  const avatarInitial = (meQuery.data?.username ?? meQuery.data?.email ?? email ?? "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand" aria-label="Lura Home">
            <span className="brand-icon">L</span>
            <span>Lura</span>
            <span className="brand-badge">LIBRARY</span>
          </Link>
          <nav className="nav" aria-label="Navegación principal">
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
            <div className="topbar-avatar-wrap">
              <Link className="topbar-avatar-link" to="/profile" title={meQuery.data?.username || email || "Perfil"}>
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
              {isHotWeekend && (
                <span
                  className="topbar-hot-badge"
                  title="¡Hot Weekend Activo! Doble XP"
                  aria-label="Hot Weekend Activo"
                >
                  🔥
                </span>
              )}
            </div>
            <button className="secondary-button" onClick={logout} type="button" title="Cerrar sesión">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
