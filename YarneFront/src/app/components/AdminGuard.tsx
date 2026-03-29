import { Navigate } from "react-router";
import { useApp } from "../context/AppContext";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAdmin } = useApp();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
