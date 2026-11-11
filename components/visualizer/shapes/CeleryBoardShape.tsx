import type { CeleryBoardModel, CeleryChip } from "@/lib/visualizer/core/shapes";
import { mechanismClockLabel } from "@/lib/visualizer/mechanism/clock-label";

function chipKind(id: string): string {
  if (/^S\d/.test(id)) return "slow";
  if (/^F\d/.test(id)) return "fast";
  if (/^charge/.test(id)) return "pay";
  if (/^R\d/.test(id)) return "rem";
  return "";
}

function Chip({ chip }: { chip: CeleryChip }) {
  const kind = chipKind(chip.id);
  const classes = ["viz-celery__chip", kind, chip.st].filter(Boolean).join(" ");
  return (
    <span className={classes}>
      {chip.id}
      {chip.meta ? <small>{chip.meta}</small> : null}
    </span>
  );
}

function Chips({ items, empty }: { items: CeleryChip[]; empty: string }) {
  if (!items.length) return <span className="viz-celery__empty">{empty}</span>;
  return (
    <div className="viz-celery__chips">
      {items.map((c) => (
        <Chip key={`${c.id}-${c.st}-${c.meta ?? ""}`} chip={c} />
      ))}
    </div>
  );
}

export function CeleryBoardShape({ model }: { model: CeleryBoardModel; subject: string }) {
  const on = new Set(model.on);
  return (
    <div className="viz-celery" role="img" aria-label="Celery broker and workers">
      <div className="viz-celery__meta">
        <span className="viz-celery__clock">{mechanismClockLabel(model.clock)}</span>
        {model.badge ? (
          <span className={`viz-celery__badge${model.badgeBad ? " viz-celery__badge--bad" : ""}`}>
            {model.badge}
          </span>
        ) : null}
      </div>
      {model.term ? <pre className="viz-celery__term">{model.term}</pre> : null}
      <div className="viz-celery__board">
        <div className={`viz-celery__panel${on.has("broker") ? " viz-celery__panel--on" : ""}`}>
          <div className="viz-celery__ph">
            <span>Broker</span>
            <small>Redis</small>
          </div>
          <span className="viz-celery__slab">Queue</span>
          <Chips items={model.queue} empty="empty" />
          <span className="viz-celery__slab">Delivered, not yet acknowledged</span>
          <Chips items={model.unacked} empty="none" />
        </div>
        <div className="viz-celery__workers">
          {model.workers.map((w) => (
            <div
              key={w.n}
              className={[
                "viz-celery__panel",
                w.st === "down" ? "viz-celery__panel--down" : "",
                on.has(w.n) ? "viz-celery__panel--on" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="viz-celery__ph">
                <span>
                  {w.n}
                  {w.st === "down" ? " · down" : ""}
                </span>
                <small>
                  concurrency {w.conc} · may reserve {w.limit}
                </small>
              </div>
              <span className="viz-celery__slab">Running (process slots)</span>
              <div className="viz-celery__chips">
                {w.slots.map((s, i) =>
                  s ? (
                    <Chip key={`${w.n}-slot-${i}`} chip={s} />
                  ) : (
                    <span key={`${w.n}-slot-${i}`} className="viz-celery__slot">
                      free
                    </span>
                  ),
                )}
              </div>
              <span className="viz-celery__slab">Reserved, not started (prefetch buffer)</span>
              <Chips items={w.buf} empty="empty" />
              {w.note ? (
                <span className={`viz-celery__wnote${w.bad ? " viz-celery__wnote--bad" : ""}`}>
                  {w.note}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="viz-celery__panel viz-celery__panel--done">
        <span className="viz-celery__slab">Finished</span>
        <Chips items={model.done} empty="nothing yet" />
      </div>
      <ul className="viz-celery__legend">
        <li>
          <span className="viz-celery__sw viz-celery__sw--fast" />
          Quick task
        </li>
        <li>
          <span className="viz-celery__sw viz-celery__sw--slow" />
          Slow task
        </li>
        <li>
          <span className="viz-celery__sw viz-celery__sw--new" />
          Changed this step
        </li>
        <li>
          <span className="viz-celery__sw viz-celery__sw--lost" />
          Lost
        </li>
        <li>
          <span className="viz-celery__sw viz-celery__sw--dup" />
          Ran twice
        </li>
      </ul>
    </div>
  );
}
