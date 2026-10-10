"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { writeToClipboard } from "@/lib/clipboard";
import { showToast } from "@/lib/toast";
import { applyChange, type FieldValue } from "@/lib/visualizer/core/fields";
import { defaultAxis } from "@/lib/visualizer/core/shapes";
import type { Experiment, VisualizerModule } from "@/lib/visualizer/core/types";
import { encodeState, parseState, type ViewMode } from "@/lib/visualizer/core/url-state";
import { stepVariant, variantOptions } from "@/lib/visualizer/core/variants";
import { MODULES } from "@/lib/visualizer/modules";
import { usePanelPrefs } from "../hooks/usePanelPrefs";
import { usePlayback } from "../hooks/usePlayback";
import { useUrlSync } from "../hooks/useUrlSync";
import { useVizHotkeys } from "../hooks/useVizHotkeys";
import { Shape } from "../shapes/Shape";
import { Icon } from "../ui/Icon";
import { ConfigPanel } from "./ConfigPanel";
import { InfoPanel } from "./InfoPanel";
import { PlaybackBar } from "./PlaybackBar";
import { RevisionView } from "./RevisionView";
import { SidePanel } from "./SidePanel";
import { Stage } from "./Stage";
import { TimelineStrip } from "./TimelineStrip";
import { VizHeader } from "./VizHeader";

const subscribeNoop = () => () => {};

interface VisualizerAppProps {
  slug: string;
  glossary: Record<string, string>;
}

export function VisualizerApp({ slug, glossary }: VisualizerAppProps) {
  const mod = MODULES[slug];
  // Server and hydration render the placeholder, so the random default seed never lands in static HTML.
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!mod) throw new Error(`Unknown visualizer: ${slug}`);
  if (!isClient) return <main className="viz-app viz-app--loading" aria-busy="true" />;
  return <VisualizerBody mod={mod} glossary={glossary} />;
}

function VisualizerBody({
  mod,
  glossary,
}: {
  mod: VisualizerModule;
  glossary: Record<string, string>;
}) {
  const [boot] = useState(() => parseState(window.location.search, mod.sections, mod.defaults()));
  const [values, setValues] = useState(boot.values);
  const [rotated, setRotated] = useState(boot.view.rotated);
  const hasRevision = (mod.revision?.length ?? 0) > 0;
  const [view, setView] = useState<ViewMode>(hasRevision ? boot.view.view : "single");
  const result = useMemo(() => mod.run(values), [mod, values]);
  const pb = usePlayback(result.frames, boot.view.frame);
  const { restart, toggle, step, pause, seek } = pb;
  const panels = usePanelPrefs();
  const availability = useMemo(() => mod.availability?.(values), [mod, values]);

  const variantKey = mod.variants?.key;
  const variantIds = useMemo(
    () => (variantKey ? variantOptions(mod.sections, variantKey).map((o) => o.value) : []),
    [mod, variantKey],
  );
  const variant = variantKey ? String(values[variantKey] ?? "") : "";
  const restartOnSwitch = mod.variants?.restartOnSwitch === true;
  const switchVariant = useCallback(
    (id: string) => {
      if (!variantKey) return;
      setValues((v) => ({ ...v, [variantKey]: id }));
      if (restartOnSwitch) restart();
    },
    [variantKey, restartOnSwitch, restart],
  );
  const stepVariantBy = useCallback(
    (delta: number) => switchVariant(stepVariant(variantIds, variant, delta)),
    [switchVariant, variantIds, variant],
  );
  // Re-seek once the new variant's frames have landed so the sub-step matches its path.
  const seenVariant = useRef(variant);
  useEffect(() => {
    if (seenVariant.current === variant) return;
    seenVariant.current = variant;
    seek(pb.frame);
  }, [variant, seek, pb.frame]);

  useVizHotkeys({
    toggle,
    step,
    variant: variantIds.length > 1 ? stepVariantBy : undefined,
    enabled: view === "single",
  });
  useUrlSync(mod.sections, values, pb.frame, rotated, hasRevision ? view : undefined);

  const change = useCallback(
    (key: string, value: FieldValue) => {
      if (key === variantKey && typeof value === "string") {
        switchVariant(value);
        return;
      }
      setValues((v) => applyChange(mod.sections, v, key, value));
      restart();
    },
    [mod, variantKey, switchVariant, restart],
  );
  const runTry = useCallback(
    (e: Experiment) => {
      setValues((v) => ({ ...v, ...e.patch }));
      restart();
    },
    [restart],
  );
  const changeView = useCallback(
    (next: ViewMode) => {
      if (next === "revision") pause();
      setView(next);
    },
    [pause],
  );
  const focusAfterOpen = useRef(false);
  const openInSingle = useCallback(
    (id: string) => {
      focusAfterOpen.current = true;
      switchVariant(id);
      setView("single");
      restart();
    },
    [switchVariant, restart],
  );
  // The popup's trigger is gone after Open in Single, so move focus to the active variant chip.
  useEffect(() => {
    if (view !== "single" || !focusAfterOpen.current) return;
    focusAfterOpen.current = false;
    document.querySelector<HTMLElement>(".viz-config [aria-pressed='true']")?.focus();
  }, [view]);
  const copyLink = useCallback(() => {
    const search = encodeState(mod.sections, values, {
      frame: pb.frame,
      rotated,
      view: hasRevision ? view : undefined,
    });
    const url = `${window.location.origin}${window.location.pathname}${search}`;
    writeToClipboard(url).then(
      () => showToast("Link copied"),
      () => showToast("Couldn't copy the link"),
    );
  }, [mod, values, pb.frame, rotated, hasRevision, view]);

  const frame = result.frames[pb.frame];
  if (!frame) return null;
  const className = [
    "viz-app",
    panels.left && "viz-app--left-collapsed",
    panels.right && "viz-app--right-collapsed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={className}>
      <VizHeader
        title={mod.title}
        subtitle={mod.subtitle}
        articleHref={result.info.articleHref}
        onCopyLink={copyLink}
        view={hasRevision ? { value: view, onChange: changeView } : undefined}
      />
      {view === "revision" ? (
        <RevisionView mod={mod} glossary={glossary} onOpen={openInSingle} />
      ) : (
        <div className="viz-app__body">
          <SidePanel
            side="left"
            title={mod.sections[0]?.title || "Configure"}
            railLabel="Configure"
            railIcon={<Icon name="settings" />}
            collapsed={panels.left}
            onToggle={() => panels.toggle("left")}
          >
            <ConfigPanel
              sections={mod.sections}
              values={values}
              sequence={result.sequence}
              onChange={change}
              availability={availability}
              variantNav={
                variantKey && variantIds.length > 1
                  ? { key: variantKey, onStep: stepVariantBy }
                  : undefined
              }
            />
          </SidePanel>
          <div className="viz-app__centre">
            <Stage metric={frame.metric} metricLabel={result.metricLabel} caption={frame.caption}>
              {(size) => (
                <Shape model={frame.model} rotated={rotated} size={size} subject={mod.subject} />
              )}
            </Stage>
            <div className="viz-foot">
              <PlaybackBar
                frame={pb.frame}
                total={result.frames.length}
                unit={mod.unit}
                playing={pb.playing}
                speed={pb.speed}
                repeat={pb.repeat}
                rotate={
                  defaultAxis(frame.model)
                    ? {
                        rotated,
                        defaultName: result.info.chip.toLowerCase(),
                        onToggle: () => setRotated((r) => !r),
                      }
                    : null
                }
                onSeek={pb.seek}
                onStep={step}
                onToggle={toggle}
                onSpeed={pb.setSpeed}
                onRepeat={pb.cycleRepeat}
              />
              <TimelineStrip
                frames={result.frames}
                current={pb.frame}
                unit={mod.unit}
                onSeek={pb.seek}
              />
            </div>
          </div>
          <SidePanel
            side="right"
            title={result.info.heading}
            railLabel="Details"
            railIcon={<Icon name="help" />}
            collapsed={panels.right}
            onToggle={() => panels.toggle("right")}
          >
            <InfoPanel
              info={result.info}
              frames={result.frames}
              frame={pb.frame}
              sub={pb.sub}
              unit={mod.unit}
              onSeek={pb.seek}
              onTry={runTry}
            />
          </SidePanel>
        </div>
      )}
    </main>
  );
}
