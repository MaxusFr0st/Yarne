import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Header } from "../components/Header";
import { CartDrawer } from "../components/CartDrawer";
import { LoginModal } from "../components/LoginModal";
import { Footer } from "../components/Footer";

export function Root() {
  const { pathname } = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  return (
    <div style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }}>
      <Header />
      <Outlet />
      <Footer />
      <CartDrawer />
      <LoginModal />
    </div>
  );
}
