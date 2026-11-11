"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { writeToClipboard } from "@/lib/clipboard";
import { showToast } from "@/lib/toast";
import { swatchesIn } from "@/lib/visualizer/core/schedule";
import { encodeState, parseState } from "@/lib/visualizer/core/url-state";
import { MODULES } from "@/lib/visualizer/modules";
import { useElementSize } from "../hooks/useElementSize";
import { usePlayback } from "../hooks/usePlayback";
import { useUrlSync } from "../hooks/useUrlSync";
import { useVizHotkeys } from "../hooks/useVizHotkeys";
import { Shape } from "../shapes/Shape";
import { RichText } from "../ui/RichText";
import { PlaybackBar } from "./PlaybackBar";
import { TimelineStrip } from "./TimelineStrip";

const subscribeNoop = () => () => {};

interface MechanismAppProps {
  slug: string;
  glossary: Record<string, string>;
}

export function MechanismApp({ slug, glossary }: MechanismAppProps) {
  const mod = MODULES[slug];
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!mod) throw new Error(`Unknown visualizer: ${slug}`);
  if (!isClient) return <main className="viz-app viz-app--loading" aria-busy="true" />;
  return <MechanismBody slug={slug} glossary={glossary} />;
}

function MechanismBody({ slug, glossary }: MechanismAppProps) {
  const mod = MODULES[slug];
  if (!mod) throw new Error(`Unknown visualizer: ${slug}`);
  const [boot] = useState(() => parseState(window.location.search, mod.sections, mod.defaults()));
  const [values, setValues] = useState(boot.values);
  const result = mod.run(values);
  const scenarioKey = mod.variants?.key ?? "scenario";
  const scenarioId = String(values[scenarioKey] ?? "");
  const pb = usePlayback(result.frames, boot.view.frame);
  const { restart, toggle, step, seek } = pb;
  const stageRef = useRef<HTMLDivElement>(null);
  const stepWrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(stageRef);
  const stepWrap = useElementSize(stepWrapRef);
  const [stepMin, setStepMin] = useState<number>();
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    let max = 0;
    for (const child of root.children) max = Math.max(max, (child as HTMLElement).offsetHeight);
    setStepMin(max > 0 ? max : undefined);
  }, [stepWrap.w, scenarioId]);
  useVizHotkeys({ toggle, step, enabled: true });
  useUrlSync(mod.sections, values, pb.frame, false);

  const field = mod.sections.flatMap((s) => s.fields).find((f) => f.key === scenarioKey);
  const options = field?.kind === "chips" ? field.options : [];

  const selectScenario = useCallback(
    (id: string) => {
      setValues((v) => ({ ...v, [scenarioKey]: id }));
      restart({ play: false });
    },
    [restart, scenarioKey],
  );

  const copyLink = useCallback(() => {
    const search = encodeState(mod.sections, values, { frame: pb.frame, rotated: false });
    const url = `${window.location.origin}${window.location.pathname}${search}`;
    writeToClipboard(url).then(
      () => showToast("Link copied"),
      () => showToast("Couldn't copy the link"),
    );
  }, [mod, values, pb.frame]);

  const frame = result.frames[pb.frame];
  if (!frame) return null;
  const drawn = swatchesIn(result.frames);
  const legend = (mod.legend ?? []).filter((item) => drawn === null || drawn.has(item.swatch));
  const glossaryDef =
    mod.glossaryTerm && glossary[mod.glossaryTerm] ? glossary[mod.glossaryTerm] : null;
  const related = result.info.related ?? [];

  return (
    <main className="viz-mech">
      <header className="viz-head">
        <div className="viz-head__text">
          {mod.kicker && <p className="viz-mech__kicker">{mod.kicker}</p>}
          {glossaryDef && <p className="viz-mech__glossary">{glossaryDef}</p>}
          <h1 className="viz-head__title">{mod.title}</h1>
          <p className="viz-head__sub">{mod.subtitle}</p>
        </div>
        <div className="viz-head__actions">
          {result.info.articleHref !== "" && (
            <a className="viz-btn" href={result.info.articleHref}>
              Read article
            </a>
          )}
          <button type="button" className="viz-btn" onClick={copyLink}>
            Copy link
          </button>
        </div>
      </header>
      <div className="viz-tabs" role="tablist">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="tab"
            className={`viz-tabs__tab${values[scenarioKey] === opt.value ? " is-on" : ""}`}
            aria-selected={values[scenarioKey] === opt.value}
            onClick={() => selectScenario(opt.value)}
          >
            {opt.label}
            {opt.detail ? <span className="viz-mech__tabdetail">{opt.detail}</span> : null}
          </button>
        ))}
      </div>
      <h2 className="viz-mech__question">{result.info.heading}</h2>
      <div className="viz-mech__stepwrap" ref={stepWrapRef}>
        <div className="viz-mech__step-measure" ref={measureRef} aria-hidden="true">
          {result.frames.map((candidate) => (
            <div key={candidate.index} className="viz-mech__step">
              <h3>{candidate.label}</h3>
              <p>
                <RichText value={candidate.lines[0] ?? []} />
              </p>
            </div>
          ))}
        </div>
        <div
          className="viz-mech__step"
          aria-live="polite"
          style={stepMin ? { minHeight: stepMin } : undefined}
        >
          <h3>{frame.label}</h3>
          <p>
            <RichText value={frame.lines[0] ?? []} />
          </p>
        </div>
      </div>
      <div className="viz-mech__stage" ref={stageRef}>
        {size.w > 0 && (
          <Shape model={frame.model} rotated={false} size={size} subject={mod.subject} />
        )}
      </div>
      {legend.length > 0 && (
        <ul className="viz-mech__legend">
          {legend.map((item) => (
            <li key={item.label}>
              <span className={`viz-mech__swatch viz-mech__swatch--${item.swatch}`} />
              {item.label}
            </li>
          ))}
        </ul>
      )}
      <PlaybackBar
        frame={pb.frame}
        total={result.frames.length}
        unit={mod.unit}
        playing={pb.playing}
        speed={pb.speed}
        rotate={null}
        onSeek={seek}
        onStep={step}
        onToggle={toggle}
        onSpeed={pb.setSpeed}
      />
      <TimelineStrip
        frames={result.frames}
        current={pb.frame}
        unit={mod.unit}
        onSeek={seek}
        numbered
      />
      <div className="viz-mech__notes">
        {result.info.about.map(([title, body]) => (
          <div key={title} className="viz-mech__note">
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
        {related.length > 0 && (
          <div className="viz-mech__note">
            <h3>See also</h3>
            <ul className="viz-mech__related">
              {related.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {mod.footnote && <p className="viz-mech__foot">{mod.footnote}</p>}
    </main>
  );
}
