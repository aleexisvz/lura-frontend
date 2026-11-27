import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/apiClient";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once, except after a timeout: waiting another full timeout for the same silence would
      // only keep the screen loading longer, so show the error and let the user retry.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.code === "TIMEOUT") && failureCount < 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});
