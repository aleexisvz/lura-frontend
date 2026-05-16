import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { getContinueReading, getReadingStats } from "@/features/reading/api";
import { useAuth } from "@/features/auth/AuthContext";

function formatReadingTime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const dd = String(days).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${dd}:${hh}:${mm}`;
}

export function HomePage() {
  const { email, role } = useAuth();

  const continueQuery = useQuery({
    queryKey: ["continue-reading"],
    queryFn: getContinueReading
  });

  const statsQuery = useQuery({
    queryKey: ["reading-stats"],
    queryFn: getReadingStats
  });

  return (
    <section className="grid">
      <header>
        <h1>Bienvenido a Lura</h1>
        <p className="muted-text">
          {email ? `Sesión: ${email}` : "Sesión activa"} · Rol: {role}
        </p>
      </header>

      <div className="grid grid-2">
        <article className="card">
          <h2>Continue Reading</h2>
          {continueQuery.isLoading && <Loading />}
          {continueQuery.isError && <ErrorBox error={continueQuery.error} />}
          <div className="grid">
            {continueQuery.data?.length ? (
              continueQuery.data.map((item) => (
                <Link
                  key={`${item.mangaId}-${item.volumeId}`}
                  to={`/reader/${item.mangaId}/${item.volumeId}/${item.pageNumber}`}
                >
                  {item.mangaTitle || item.mangaId} · Volumen {item.volumeId} · Página{" "}
                  {item.pageNumber}
                </Link>
              ))
            ) : (
              <p className="muted-text">No hay lecturas pendientes.</p>
            )}
          </div>
        </article>

        <article className="card">
          <h2>Reading Stats</h2>
          {statsQuery.isLoading && <Loading />}
          {statsQuery.isError && <ErrorBox error={statsQuery.error} />}
          {statsQuery.data && (
            <div className="grid">
              <p>Total sesiones: {statsQuery.data.totalSessions}</p>
              <p>Tiempo total de lectura: {formatReadingTime(statsQuery.data.totalSeconds)}</p>
              <p>Total mangas leidos: {statsQuery.data.totalMangasRead}</p>
              <p>Total volúmenes leídos: {statsQuery.data.totalVolumesRead}</p>
              <p>Total páginas leídas: {statsQuery.data.totalPagesRead}</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
