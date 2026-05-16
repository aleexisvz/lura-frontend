import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBox } from "@/components/ErrorBox";
import { Loading } from "@/components/Loading";
import { ProtectedImage } from "@/components/ProtectedImage";
import { SuccessBox } from "@/components/SuccessBox";
import { useAuth } from "@/features/auth/AuthContext";
import { getContinueReading, getReadingStats } from "@/features/reading/api";
import { getMe, uploadProfileImage } from "@/features/users/api";

function formatReadingTime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const dd = String(days).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${dd}:${hh}:${mm}`;
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { email, role } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const continueQuery = useQuery({
    queryKey: ["continue-reading"],
    queryFn: getContinueReading,
  });

  const statsQuery = useQuery({
    queryKey: ["reading-stats"],
    queryFn: getReadingStats,
  });

  const uploadMutation = useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: async () => {
      setSuccessMessage("Foto de perfil actualizada");
      setSelectedFile(null);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const submitProfileImage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const profileEmail = meQuery.data?.email ?? email ?? "No disponible";
  const profileRole = meQuery.data?.role ?? role ?? "USER";

  return (
    <section className="grid">
      <header>
        <h1>Perfil</h1>
        <p className="muted-text">Informacion de cuenta y estadisticas de lectura.</p>
      </header>

      {successMessage && <SuccessBox message={successMessage} />}

      <div className="grid grid-2">
        <article className="card">
          <h2>Cuenta</h2>
          <div className="profile-account-grid">
            <div className="profile-avatar-box">
              {meQuery.data?.profileImageUrl ? (
                <ProtectedImage
                  path={meQuery.data.profileImageUrl}
                  alt="Foto de perfil"
                  className="profile-avatar-image"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  {profileEmail.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="grid">
              <p>Email: {profileEmail}</p>
              <p>Rol: {profileRole}</p>
            </div>
          </div>
          <form onSubmit={submitProfileImage} className="form-grid profile-upload-form">
            <label>
              Foto de perfil (PNG/JPG/WEBP, max 2MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>
            {uploadMutation.isError && <ErrorBox error={uploadMutation.error} />}
            <button type="submit" disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Subiendo..." : "Actualizar foto"}
            </button>
          </form>
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
              <p>Total volumenes leidos: {statsQuery.data.totalVolumesRead}</p>
              <p>Total paginas leidas: {statsQuery.data.totalPagesRead}</p>
            </div>
          )}
        </article>
      </div>

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
                {item.mangaTitle || item.mangaId} - Volumen {item.volumeId} - Pagina{" "}
                {item.pageNumber}
              </Link>
            ))
          ) : (
            <p className="muted-text">No hay lecturas pendientes.</p>
          )}
        </div>
      </article>
    </section>
  );
}

