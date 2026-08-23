import { useState, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { promoteUser } from "@/features/auth/api";
import { ErrorBox } from "@/components/ErrorBox";

export function UserAdminSection() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const promoteMutation = useMutation({
    mutationFn: (targetEmail: string) => promoteUser(targetEmail),
    onSuccess: (data) => {
      setFeedback(`Usuario ${data.email} promovido exitosamente a ${data.role}`);
      setEmail("");
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    promoteMutation.mutate(email.trim());
  };

  return (
    <div className="users-admin-section">
      <div className="admin-section-header">
        <div className="header-info">
          <h2>Gestión de Usuarios & Permisos</h2>
          <p className="muted-text">
            Otorga permisos de administrador a usuarios registrados.
          </p>
        </div>
      </div>

      {feedback && <div className="success-banner">{feedback}</div>}
      {promoteMutation.isError && <ErrorBox error={promoteMutation.error} />}

      <div className="users-split-grid">
        <div className="promote-card card">
          <h3>Promover Usuario a Administrador</h3>
          <p className="muted-text text-sm mb-4">
            Los administradores tienen acceso a crear mangas, subir volúmenes, gestionar libros y modificar etiquetas.
          </p>

          <form onSubmit={handleSubmit} className="form-grid">
            <label className="form-field">
              <span>Correo electrónico del usuario</span>
              <input
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              className="primary-button btn-gold-glow"
              disabled={promoteMutation.isPending || !email.trim()}
            >
              {promoteMutation.isPending ? "Promoviendo..." : "👑 Asignar Rol ADMIN"}
            </button>
          </form>
        </div>

        <div className="roles-info-card card">
          <h4>Roles y Seguridad</h4>
          <ul className="roles-info-list">
            <li>
              <strong>USER (Por defecto)</strong>: Puede leer mangas y libros, registrar su progreso de lectura, ganar experiencia (XP) y personalizar su perfil.
            </li>
            <li>
              <strong>ADMIN</strong>: Acceso total al panel de administración para subir y editar contenidos, crear tomos y publicar archivos en Cloudflare R2.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
