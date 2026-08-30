"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

/**
 * Sonner's default look is unstyled shadcn boilerplate (--popover, --primary,
 * etc. from theme.css) that nothing else in this app actually uses — the real
 * design system is the warm cream/brown palette + DM Sans set inline
 * throughout LoginModal.tsx and friends. Overridden here at the mount point
 * rather than in theme.css, since those global tokens aren't the app's system.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-center"
      mobileOffset={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-4 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[380px] px-5 py-4 rounded-2xl border border-[#2D241E]/12 bg-[#F5F2ED]",
          title: "text-[#2D241E] text-sm",
          actionButton:
            "!bg-[#2D241E] !text-[#F5F2ED] text-xs tracking-wide uppercase rounded-full px-4 py-2 whitespace-nowrap cursor-pointer hover:!bg-[#2D241E]/90 transition-colors duration-200",
          closeButton:
            "!bg-transparent !border-none !text-[#2D241E]/40 hover:!text-[#2D241E]",
        },
        style: {
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: "0 16px 48px rgba(45,36,30,0.16), 0 4px 16px rgba(45,36,30,0.08)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
