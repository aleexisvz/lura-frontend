import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMangaList } from "@/features/manga/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";

export function MangaListPage() {
  const mangaQuery = useQuery({
    queryKey: ["manga-list"],
    queryFn: getMangaList
  });

  return (
    <section className="grid">
      <header>
        <h1>Manga</h1>
        <p className="muted-text">Listado completo para navegar volúmenes y páginas.</p>
      </header>

      {mangaQuery.isLoading && <Loading />}
      {mangaQuery.isError && <ErrorBox error={mangaQuery.error} />}

      <div className="grid grid-2">
        {mangaQuery.data?.map((item) => (
          <article key={item.id} className="card">
            <h3>{item.title}</h3>
            {item.description && <p className="muted-text">{item.description}</p>}
            <Link to={`/manga/${item.id}`}>Ver detalle</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

