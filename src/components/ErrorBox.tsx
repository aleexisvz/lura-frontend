import { ApiError } from "@/lib/apiClient";

type Props = {
  error: unknown;
};

export function ErrorBox({ error }: Props) {
  const message = error instanceof ApiError ? error.message : "Error inesperado";

  return <p className="error-text">{message}</p>;
}

