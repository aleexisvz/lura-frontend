import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBookById } from "@/features/books/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";

export function BookDetailPage() {
  const { bookId = "" } = useParams();

  const bookQuery = useQuery({
    queryKey: ["book-detail", bookId],
    queryFn: () => getBookById(bookId),
    enabled: Boolean(bookId)
  });

  return (
    <section className="grid">
      <h1>Detalle Book</h1>
      {bookQuery.isLoading && <Loading />}
      {bookQuery.isError && <ErrorBox error={bookQuery.error} />}
      {bookQuery.data && (
        <article className="card">
          <h2>{bookQuery.data.title}</h2>
          <p className="muted-text">{bookQuery.data.author || "Autor no disponible"}</p>
          <p>{bookQuery.data.description || "Sin descripción"}</p>
        </article>
      )}
    </section>
  );
}

