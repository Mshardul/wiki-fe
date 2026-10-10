import { type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { layoutRows, maxColsFor } from "@/lib/visualizer/core/layout";
import { moveItem } from "@/lib/visualizer/core/order";
import type { RevisionCard } from "@/lib/visualizer/core/types";
import { useElementSize } from "../hooks/useElementSize";
import { FlowDiagram } from "../shapes/FlowDiagram";
import { Shape } from "../shapes/Shape";

interface RevisionGridProps {
  cards: RevisionCard[];
  order: string[];
  onOrder: (next: string[]) => void;
  lit: number;
  pulse: boolean;
  subject: string;
  onInfo: (id: string) => void;
}

function useInnerWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

interface TileProps {
  card: RevisionCard;
  lit: number;
  pulse: boolean;
  subject: string;
  state: { grabbed: boolean; dragging: boolean; over: boolean };
  handlers: {
    onInfo: () => void;
    onGripDown: () => void;
    onGripKey: (e: KeyboardEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
}

function RevisionTile({ card, lit, pulse, subject, state, handlers }: TileProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(stageRef);
  const own = Math.max(0, Math.min(lit, card.steps));
  const visual = card.render(own);
  const cls = [
    "viz-card",
    state.grabbed && "is-grabbed",
    state.dragging && "is-dragging",
    state.over && "is-over",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section
      className={cls}
      aria-label={card.name}
      draggable
      onDragStart={handlers.onDragStart}
      onDragOver={handlers.onDragOver}
      onDrop={handlers.onDrop}
      onDragEnd={handlers.onDragEnd}
    >
      <header className="viz-card__head">
        <button
          type="button"
          className="viz-card__grip"
          data-grip={card.id}
          aria-label={`Reorder ${card.name}`}
          aria-pressed={state.grabbed}
          onMouseDown={handlers.onGripDown}
          onKeyDown={handlers.onGripKey}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <h3 className="viz-card__name">{card.name}</h3>
        <button
          type="button"
          className="viz-card__info"
          aria-label={`About ${card.name}`}
          onClick={handlers.onInfo}
        >
          <span aria-hidden="true">i</span>
        </button>
      </header>
      <div className="viz-stage viz-card__stage" ref={stageRef}>
        {visual.kind === "flow" ? (
          <FlowDiagram flow={visual.flow} title={card.name} pulse={pulse} />
        ) : (
          size.w > 0 &&
          size.h > 0 && <Shape model={visual.model} rotated={false} size={size} subject={subject} />
        )}
      </div>
      <ol className="viz-rev__sr">
        {card.stepsText.map((t, i) => (
          // The list is positional and two steps can read the same, so the text is not a unique key.
          <li key={`${i}-${t}`}>{t}</li>
        ))}
      </ol>
    </section>
  );
}

export function RevisionGrid({
  cards,
  order,
  onOrder,
  lit,
  pulse,
  subject,
  onInfo,
}: RevisionGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useInnerWidth(ref);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const ordered = useMemo(() => order.flatMap((id) => byId.get(id) ?? []), [order, byId]);
  const ids = ordered.map((c) => c.id);
  const rows = layoutRows(ordered.length, maxColsFor(width));
  const cols = Math.max(1, ...rows);

  const [grabbed, setGrabbed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const startOrder = useRef<string[] | null>(null);
  const gripDown = useRef(false);

  // A press that never became a drag must not arm a later drag from elsewhere on a card.
  useEffect(() => {
    const release = () => {
      gripDown.current = false;
    };
    document.addEventListener("mouseup", release);
    return () => document.removeEventListener("mouseup", release);
  }, []);

  // Moving a card can remount its grip; keep the keyboard on it while it is picked up.
  useLayoutEffect(() => {
    if (grabbed === null) return;
    ref.current?.querySelector<HTMLElement>(`[data-grip="${grabbed}"]`)?.focus();
  }, [grabbed, order]);

  const onGripKey = (id: string, name: string) => (e: KeyboardEvent) => {
    const at = ids.indexOf(id);
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (grabbed === id) {
        setGrabbed(null);
        startOrder.current = null;
        setSaid(`${name} dropped at position ${at + 1} of ${ids.length}.`);
      } else {
        setGrabbed(id);
        startOrder.current = ids;
        setSaid(
          `${name} picked up at position ${at + 1} of ${ids.length}. Use the arrow keys to move it.`,
        );
      }
    } else if (grabbed === id && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      const to = at + (e.key === "ArrowRight" ? 1 : -1);
      const next = moveItem(ids, at, to);
      if (next === ids) return;
      onOrder(next);
      setSaid(`${name} moved to position ${next.indexOf(id) + 1} of ${ids.length}.`);
    } else if (grabbed === id && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (startOrder.current) onOrder(startOrder.current);
      setGrabbed(null);
      startOrder.current = null;
      setSaid(`Move cancelled. ${name} is back at its original position.`);
    }
  };

  const clearDrag = () => {
    setDragging(null);
    setOver(null);
    gripDown.current = false;
  };

  const lines = rows.map((n, r) => {
    const from = rows.slice(0, r).reduce((a, b) => a + b, 0);
    return ordered.slice(from, from + n);
  });

  return (
    <div className="viz-rev__scroll" ref={ref}>
      <div className="viz-rev__inner" style={{ ["--viz-cols" as string]: cols }}>
        {lines.flatMap((line, r) => [
          ...line.map((card) => (
            <RevisionTile
              key={card.id}
              card={card}
              lit={lit}
              pulse={pulse}
              subject={subject}
              state={{
                grabbed: grabbed === card.id,
                dragging: dragging === card.id,
                over: over === card.id,
              }}
              handlers={{
                onInfo: () => onInfo(card.id),
                onGripDown: () => {
                  gripDown.current = true;
                },
                onGripKey: onGripKey(card.id, card.name),
                onDragStart: (e) => {
                  if (!gripDown.current) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData("text/plain", card.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDragging(card.id);
                },
                onDragOver: (e) => {
                  if (dragging === null) return;
                  e.preventDefault();
                  setOver(card.id);
                },
                onDrop: (e) => {
                  if (dragging === null) return;
                  e.preventDefault();
                  const next = moveItem(ids, ids.indexOf(dragging), ids.indexOf(card.id));
                  if (next !== ids) onOrder(next);
                  clearDrag();
                },
                onDragEnd: clearDrag,
              }}
            />
          )),
          r < lines.length - 1 ? (
            <span key={`break-${r}`} className="viz-rev__break" aria-hidden="true" />
          ) : null,
        ])}
        <p className="viz-rev__sr" aria-live="polite">
          {said}
        </p>
      </div>
    </div>
  );
}
