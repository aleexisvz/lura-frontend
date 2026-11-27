import { ApiError } from "@/lib/apiClient";

type Props = {
  error: unknown;
  // When given, a retry button is shown below the message.
  onRetry?: () => void;
};

export function ErrorBox({ error, onRetry }: Props) {
  const message = error instanceof ApiError ? error.message : "Error inesperado";

  return (
    <>
      <p className="error-text">{message}</p>
      {onRetry && (
        <button type="button" className="btn-primary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </>
  );
}
