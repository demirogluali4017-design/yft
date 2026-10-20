import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return twMerge(clsx(parts));
}

const buttonStyles = cva(
  "inline-flex h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        solid: "bg-field text-paper hover:bg-field/90",
        ghost: "border border-ink/15 bg-paper text-ink hover:bg-ink/5",
        danger: "bg-signal text-paper hover:bg-signal/90",
      },
    },
    defaultVariants: { variant: "solid" },
  },
);

export function Button({
  className,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>) {
  return <button className={cx(buttonStyles({ variant }), className)} {...props} />;
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-signal">{error}</span> : null}
    </label>
  );
}

const control = "h-11 w-full border border-ink/15 bg-paper px-3 text-base text-ink outline-none focus-visible:border-field";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(control, props.className)} />;
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(control, "h-24 py-2", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(control, props.className)} />;
}

export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-40 flex items-end justify-center bg-ink/40 md:items-center md:p-6">
      <div
        role="dialog"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto bg-paper p-5 md:max-w-lg"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-wide">{title}</h2>
          <button type="button" className="h-11 px-3 text-sm" onClick={onClose}>
            Kapat
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-ink/20 px-4 py-8 text-center text-sm text-ink/60">{children}</p>;
}
