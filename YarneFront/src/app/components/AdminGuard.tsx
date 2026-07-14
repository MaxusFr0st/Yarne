import { useApp } from "../context/AppContext";
import { Navigate } from "react-router";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isAdmin, authHydrated } = useApp();

  if (!authHydrated) {
    return (
      <div
        className="min-h-[40svh] flex items-center justify-center text-[#2D241E]/50 text-sm"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        aria-busy="true"
      >
        Checking session…
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
