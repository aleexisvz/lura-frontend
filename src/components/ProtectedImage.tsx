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

  const isAbsoluteUrl = path?.startsWith("http://") || path?.startsWith("https://");

  const imageQuery = useQuery({
    queryKey: ["protected-image", path],
    queryFn: () => apiClient.fetchBlob(path),
    enabled: Boolean(path && !isAbsoluteUrl),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (isAbsoluteUrl || !imageQuery.data) {
      setBlobUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(imageQuery.data);
    setBlobUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [imageQuery.data, isAbsoluteUrl]);

  const finalUrl = isAbsoluteUrl ? path : blobUrl;

  if (!finalUrl || (imageQuery.isLoading && !isAbsoluteUrl)) {
    return <div className={`cover-placeholder ${className ?? ""}`.trim()}>Sin portada</div>;
  }

  return <img src={finalUrl} alt={alt} className={className} loading="lazy" />;
}
