import type { ReactNode } from "react";

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: "plain" | "primary";
  disabled?: boolean;
  // Visual "on" state; `pressed` additionally exposes it as a toggle to assistive tech.
  active?: boolean;
  pressed?: boolean;
}

export function IconButton({
  label,
  onClick,
  children,
  variant = "plain",
  disabled,
  active,
  pressed,
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`viz-iconbtn viz-iconbtn--${variant}${active ? " is-active" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}
