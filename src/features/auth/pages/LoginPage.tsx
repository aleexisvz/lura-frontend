import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login } from "@/features/auth/api";
import { loginSchema } from "@/features/auth/schemas";
import { useAuth } from "@/features/auth/AuthContext";
import { ErrorBox } from "@/components/ErrorBox";

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (token) => {
      setSession(token);
      navigate("/", { replace: true });
    }
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Formulario inválido");
      return;
    }

    mutation.mutate(parsed.data);
  };

  return (
    <section className="auth-card">
      <h1>Iniciar sesión</h1>
      <p className="muted-text">Entrá para continuar con tu lectura en Lura.</p>
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
        {validationError && <p className="error-text">{validationError}</p>}
        {mutation.isError && <ErrorBox error={mutation.error} />}
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
      <p className="muted-text">
        ¿No tenés cuenta? <Link to="/register">Crear cuenta</Link>
      </p>
    </section>
  );
}

