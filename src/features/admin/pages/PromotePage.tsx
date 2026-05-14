import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { promoteUser } from "@/features/auth/api";

export function PromotePage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (e: string) => promoteUser(e),
    onSuccess: (data) => {
      setMessage(`Usuario ${data.email} promovido a ${data.role}`);
      setEmail("");
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!email.trim()) {
      setMessage("Ingresá un email");
      return;
    }
    mutation.mutate(email.trim());
  };

  return (
    <section className="grid">
      <h1>Promover a Admin</h1>
      <article className="card">
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Email del usuario
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
            />
          </label>
          {mutation.isError && <ErrorBox error={mutation.error} />}
          {message && <p className="muted-text">{message}</p>}
          <button type="submit" disabled={mutation.isPending}>
            Promover a Admin
          </button>
        </form>
      </article>
    </section>
  );
}
