import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPages } from "@/features/manga/api";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";

export function VolumePagesPage() {
  const { mangaId = "", volumeId = "" } = useParams();

  const pagesQuery = useQuery({
    queryKey: ["manga-pages", mangaId, volumeId],
    queryFn: () => getPages(mangaId, volumeId),
    enabled: Boolean(mangaId && volumeId)
  });

  return (
    <section className="grid">
      <h1>Páginas</h1>
      <p className="muted-text">Seleccioná una página para abrir el reader.</p>
      {pagesQuery.isLoading && <Loading />}
      {pagesQuery.isError && <ErrorBox error={pagesQuery.error} />}

      <div className="grid grid-2">
        {pagesQuery.data?.map((page) => (
          <article key={page.pageNumber} className="card">
            <h3>Página {page.pageNumber}</h3>
            <Link to={`/reader/${mangaId}/${volumeId}/${page.pageNumber}`}>Leer</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

