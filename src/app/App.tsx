import { AppRouter } from "@/app/router";
import { AuthProvider } from "@/features/auth/AuthContext";

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

