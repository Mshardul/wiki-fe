import { useCallback, useMemo, useState } from "react";
import {
  clearVisualizerOrder,
  getVisualizerOrder,
  setVisualizerOrder,
} from "@/lib/storage/visualizer-prefs";
import { reconcileOrder } from "@/lib/visualizer/core/order";
import type { VisualizerModule } from "@/lib/visualizer/core/types";
import { useLoopClock } from "../hooks/useLoopClock";
import { useVizHotkeys } from "../hooks/useVizHotkeys";
import { RevisionFooter } from "./RevisionFooter";
import { RevisionGrid } from "./RevisionGrid";
import { RevisionPopup } from "./RevisionPopup";

interface RevisionViewProps {
  mod: VisualizerModule;
  glossary: Record<string, string>;
  onOpen: (id: string) => void;
}

export function RevisionView({ mod, glossary, onOpen }: RevisionViewProps) {
  const cards = useMemo(() => mod.revision ?? [], [mod]);
  const defaults = useMemo(() => cards.map((c) => c.id), [cards]);
  const [order, setOrder] = useState(() => reconcileOrder(getVisualizerOrder(mod.slug), defaults));
  const [infoId, setInfoId] = useState<string | null>(null);
  // The legend explains flow-diagram edges, so it only shows when some card draws one.
  const hasFlow = useMemo(() => cards.some((c) => c.render(0).kind === "flow"), [cards]);
  const maxSteps = Math.max(1, ...cards.map((c) => c.steps));
  const clock = useLoopClock(maxSteps);
  useVizHotkeys({ toggle: clock.toggle, enabled: infoId === null });

  const saveOrder = useCallback(
    (next: string[]) => {
      setOrder(next);
      setVisualizerOrder(mod.slug, next);
    },
    [mod.slug],
  );
  const resetOrder = useCallback(() => {
    clearVisualizerOrder(mod.slug);
    setOrder(defaults);
  }, [mod.slug, defaults]);

  const infoCard = cards.find((c) => c.id === infoId) ?? null;
  return (
    <div className="viz-rev">
      <RevisionGrid
        cards={cards}
        order={order}
        onOrder={saveOrder}
        lit={clock.lit}
        pulse={clock.phase === "play" && clock.running}
        subject={mod.subject}
        onInfo={setInfoId}
      />
      <RevisionFooter
        legend={hasFlow}
        running={clock.running}
        reduced={clock.reduced}
        onToggle={clock.toggle}
        onReset={resetOrder}
      />
      {infoCard && (
        <RevisionPopup
          card={infoCard}
          glossary={glossary}
          onClose={() => setInfoId(null)}
          onOpen={() => {
            setInfoId(null);
            onOpen(infoCard.id);
          }}
        />
      )}
    </div>
  );
}
