import React from "react";
import { createBrowserRouter } from "react-router";
import { Root } from "./pages/Root";
import { Home } from "./pages/Home";
import { Collection } from "./pages/Collection";
import { ProductDetail } from "./pages/ProductDetail";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { NotFound } from "./pages/NotFound";
import { AdminGuard } from "./components/AdminGuard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "collection", Component: Collection },
      { path: "product/:id", Component: ProductDetail },
      { path: "checkout", Component: CheckoutPage },
      { path: "account", Component: AccountPage },
      {
        path: "admin",
        element: (
          <AdminGuard>
            <AdminPage />
          </AdminGuard>
        ),
      },
      { path: "*", Component: NotFound },
    ],
  },
]);
