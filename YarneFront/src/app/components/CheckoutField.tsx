import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { InputHTMLAttributes, ReactNode } from "react";

const ERROR_INK = "#F2B8B8";
const ERROR_LINE = "rgba(242,184,184,0.85)";

type CheckoutFieldProps = {
  id: string;
  label: string;
  /** Shown notched into the top outline when set. */
  error?: string | null;
  /** Background the notch paints over — must match the surface behind the field. */
  notchColor?: string;
  children?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

/**
 * Checkout input with its validation message cut into the top border, rather than pushed
 * below the field. Two reasons: the message never reflows the form as it appears and
 * disappears, and it sits directly on the boundary it is describing, so the eye picks up the
 * red outline and the reason for it in one movement.
 *
 * The notch is a small absolutely-positioned label painted in the surface colour, which masks
 * the border behind it — the same trick a fieldset legend uses, without inheriting the
 * fieldset's layout quirks.
 */
export function CheckoutField({
  id,
  label,
  error,
  notchColor = "#2D241E",
  children,
  ...inputProps
}: CheckoutFieldProps) {
  const reduceMotion = useReducedMotion();
  const invalid = Boolean(error);

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <AnimatePresence>
        {invalid && (
          <motion.span
            key="notch"
            className="absolute z-10 pointer-events-none uppercase"
            style={{
              top: -6,
              left: 14,
              padding: "0 6px",
              backgroundColor: notchColor,
              color: ERROR_INK,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.62rem",
              letterSpacing: "0.1em",
              lineHeight: "12px",
            }}
            initial={reduceMotion ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 3 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="status"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>

      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-errormessage={invalid ? `${id}-error` : undefined}
        className="w-full rounded-[14px] px-4 py-3.5 outline-none transition-colors duration-200"
        style={{
          backgroundColor: "rgba(245,242,237,0.14)",
          border: `1px solid ${invalid ? ERROR_LINE : "rgba(245,242,237,0.10)"}`,
          color: invalid ? ERROR_INK : "#F5F2ED",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.9rem",
        }}
        {...inputProps}
      />

      {/* Same text for assistive tech, which should hear the problem rather than infer it
          from a decorative notch. */}
      {invalid && (
        <span id={`${id}-error`} className="sr-only">
          {error}
        </span>
      )}
      {children}
    </div>
  );
}
