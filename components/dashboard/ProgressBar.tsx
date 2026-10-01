import Link from "next/link";
import { progressCounts } from "@/lib/dashboard/progress";

interface ProgressBarProps {
  label: string;
  completed: number;
  total: number;
  href?: string;
}

export function ProgressBar({ label, completed, total, href }: ProgressBarProps) {
  const { pct } = progressCounts(completed, total);
  const body = (
    <>
      <h2 className="dashboard-card-title">{label}</h2>
      <div className="dashboard-stat">
        <div className="dashboard-stat-label">
          <span>Completed</span>
          <span>
            {completed} / {total} ({pct}%)
          </span>
        </div>
        <div className="dashboard-bar-track">
          <div
            className="dashboard-bar-fill dashboard-bar-fill--completed"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="dashboard-card dashboard-card--link">
        {body}
      </Link>
    );
  }

  return <section className="dashboard-card">{body}</section>;
}
