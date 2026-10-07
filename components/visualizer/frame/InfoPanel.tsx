import { useId, useState } from "react";
import type { Experiment, InfoContent, VizFrame } from "@/lib/visualizer/core/types";
import { Tabs } from "../ui/Tabs";
import { AboutTab, LogTab, StepTab, TryTab } from "./InfoTabs";

type TabId = "step" | "log" | "about" | "try";
const TABS: { id: TabId; label: string }[] = [
  { id: "step", label: "Step" },
  { id: "log", label: "Log" },
  { id: "about", label: "About" },
  { id: "try", label: "Try" },
];

interface InfoPanelProps {
  info: InfoContent;
  frames: VizFrame[];
  frame: number;
  sub: number;
  unit: string;
  onSeek: (i: number) => void;
  onTry: (e: Experiment) => void;
}

export function InfoPanel({ info, frames, frame, sub, unit, onSeek, onTry }: InfoPanelProps) {
  const [tab, setTab] = useState<TabId>("step");
  const id = useId();
  const current = frames[frame];
  return (
    <div className="viz-info">
      <div className="viz-info__top">
        <div className="viz-info__name">
          <h3>{info.name}</h3>
          <span className="viz-pill">{info.chip}</span>
        </div>
        <p className="viz-info__rule">{info.rule}</p>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} idPrefix={id} />
      <div
        className="viz-info__body"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
      >
        {tab === "step" && current && (
          <StepTab frame={current} prev={frames[frame - 1] ?? null} sub={sub} unit={unit} />
        )}
        {tab === "log" && <LogTab frames={frames} current={frame} onSeek={onSeek} />}
        {tab === "about" && <AboutTab about={info.about} />}
        {tab === "try" && <TryTab tries={info.tries} onTry={onTry} />}
      </div>
    </div>
  );
}
