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
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (token) => {
      setSession(token);
      navigate("/", { replace: true });
    }
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const parsed = registerSchema.safeParse({ email, password, role });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Formulario inválido");
      return;
    }

    mutation.mutate(parsed.data);
  };

  return (
    <section className="auth-card">
      <h1>Crear cuenta</h1>
      <p className="muted-text">Podés registrar usuario normal o admin para pruebas.</p>
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
          Contraseña
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
        ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </section>
  );
}

