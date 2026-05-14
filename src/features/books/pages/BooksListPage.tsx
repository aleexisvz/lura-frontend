import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getBooks } from "@/features/books/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";

export function BooksListPage() {
  const booksQuery = useQuery({
    queryKey: ["books"],
    queryFn: getBooks
  });

  return (
    <section className="grid">
      <h1>Books</h1>
      {booksQuery.isLoading && <Loading />}
      {booksQuery.isError && <ErrorBox error={booksQuery.error} />}

      <div className="grid grid-2">
        {booksQuery.data?.map((book) => (
          <article key={book.id} className="card">
            <h3>{book.title}</h3>
            {book.author && <p className="muted-text">Autor: {book.author}</p>}
            <Link to={`/books/${book.id}`}>Ver detalle</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

