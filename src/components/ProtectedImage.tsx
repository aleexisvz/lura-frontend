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

  // Detect Cloudflare R2 public CDN URLs (starting with http:// or https://).
  // If absolute, bypass the API query entirely and render directly via native <img>.
  const isAbsoluteUrl = path?.startsWith("http://") || path?.startsWith("https://");

  // Fallback query for legacy protected relative paths requiring authenticated blob streaming
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
