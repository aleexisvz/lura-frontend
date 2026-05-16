import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { register } from "@/features/auth/api";
import { registerSchema } from "@/features/auth/schemas";
import { useAuth } from "@/features/auth/AuthContext";
import { ErrorBox } from "@/components/ErrorBox";

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (token) => {
      setSession(token);
      navigate("/", { replace: true });
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const parsed = registerSchema.safeParse({ email, username, password, role });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Formulario invalido");
      return;
    }

    mutation.mutate(parsed.data);
  };

  return (
    <section className="auth-card">
      <h1>Crear cuenta</h1>
      <p className="muted-text">Podras registrar usuario normal o admin para pruebas.</p>
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="ej: alexis_01"
            required
          />
        </label>
        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label>
          Rol
          <select value={role} onChange={(event) => setRole(event.target.value as "USER" | "ADMIN")}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        {validationError && <p className="error-text">{validationError}</p>}
        {mutation.isError && <ErrorBox error={mutation.error} />}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
      <p className="muted-text">
        Ya tenes cuenta? <Link to="/login">Iniciar sesion</Link>
      </p>
    </section>
  );
}

