import type { ReactNode } from "react";
import { IconButton } from "../ui/IconButton";

interface SidePanelProps {
  side: "left" | "right";
  title: string;
  railLabel: string;
  railIcon: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function SidePanel({
  side,
  title,
  railLabel,
  railIcon,
  collapsed,
  onToggle,
  children,
}: SidePanelProps) {
  return (
    <aside
      className={`viz-panel viz-panel--${side}${collapsed ? " is-collapsed" : ""}`}
      aria-label={railLabel}
    >
      {collapsed ? (
        <div className="viz-panel__rail">
          <IconButton label={`Show ${railLabel}`} onClick={onToggle}>
            {railIcon}
          </IconButton>
          <span className="viz-panel__rail-label" aria-hidden="true">
            {railLabel}
          </span>
        </div>
      ) : (
        <>
          <div className="viz-panel__head">
            <h2 className="viz-panel__title">{title}</h2>
            <IconButton label={`Hide ${railLabel}`} onClick={onToggle}>
              {side === "left" ? "«" : "»"}
            </IconButton>
          </div>
          <div className="viz-panel__body">{children}</div>
        </>
      )}
    </aside>
  );
}
