import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/profile", label: "Perfil" },
  { to: "/manga", label: "Manga" },
  { to: "/books", label: "Books" }
];

export function AppLayout() {
  const { role, logout } = useAuth();

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
            <NavLink
              className={({ isActive }) => (isActive ? "active-link" : "")}
              to="/admin"
            >
              Admin
            </NavLink>
          )}
        </nav>
        <button className="secondary-button" onClick={logout} type="button">
          Cerrar sesión
        </button>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
