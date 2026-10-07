"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { writeToClipboard } from "@/lib/clipboard";
import { showToast } from "@/lib/toast";
import { applyChange, type FieldValue } from "@/lib/visualizer/core/fields";
import { defaultAxis } from "@/lib/visualizer/core/shapes";
import type { Experiment, VisualizerModule } from "@/lib/visualizer/core/types";
import { encodeState, parseState } from "@/lib/visualizer/core/url-state";
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
import { SidePanel } from "./SidePanel";
import { Stage } from "./Stage";
import { TimelineStrip } from "./TimelineStrip";
import { VizHeader } from "./VizHeader";

const subscribeNoop = () => () => {};

export function VisualizerApp({ slug }: { slug: string }) {
  const mod = MODULES[slug];
  // Server and hydration render the placeholder, so the random default seed never lands in static HTML.
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!mod) throw new Error(`Unknown visualizer: ${slug}`);
  if (!isClient) return <main className="viz-app viz-app--loading" aria-busy="true" />;
  return <VisualizerBody mod={mod} />;
}

function VisualizerBody({ mod }: { mod: VisualizerModule }) {
  const [boot] = useState(() => parseState(window.location.search, mod.sections, mod.defaults()));
  const [values, setValues] = useState(boot.values);
  const [rotated, setRotated] = useState(boot.view.rotated);
  const result = useMemo(() => mod.run(values), [mod, values]);
  const pb = usePlayback(result.frames, boot.view.frame);
  const { restart, toggle, step } = pb;
  useVizHotkeys({ toggle, step });
  useUrlSync(mod.sections, values, pb.frame, rotated);
  const panels = usePanelPrefs();

  const change = useCallback(
    (key: string, value: FieldValue) => {
      setValues((v) => applyChange(mod.sections, v, key, value));
      restart();
    },
    [mod, restart],
  );
  const runTry = useCallback(
    (e: Experiment) => {
      setValues((v) => ({ ...v, ...e.patch }));
      restart();
    },
    [restart],
  );
  const copyLink = useCallback(() => {
    const search = encodeState(mod.sections, values, { frame: pb.frame, rotated });
    const url = `${window.location.origin}${window.location.pathname}${search}`;
    writeToClipboard(url).then(
      () => showToast("Link copied"),
      () => showToast("Couldn't copy the link"),
    );
  }, [mod, values, pb.frame, rotated]);

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
      />
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
    </main>
  );
}
