import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";

type ProtectedImageProps = {
  path: string;
  alt: string;
  className?: string;
};

export function ProtectedImage({ path, alt, className }: ProtectedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const imageQuery = useQuery({
    queryKey: ["protected-image", path],
    queryFn: () => apiClient.fetchBlob(path),
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!imageQuery.data) {
      setBlobUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(imageQuery.data);
    setBlobUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [imageQuery.data]);

  if (!blobUrl || imageQuery.isLoading) {
    return <div className={`cover-placeholder ${className ?? ""}`.trim()}>Sin portada</div>;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
