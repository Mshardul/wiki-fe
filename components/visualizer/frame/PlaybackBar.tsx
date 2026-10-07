import { type RepeatMode, SPEEDS, type Speed } from "@/lib/visualizer/core/playback";
import { ChoiceGroup } from "../ui/ChoiceGroup";
import { Icon } from "../ui/Icon";
import { IconButton } from "../ui/IconButton";

export interface RotateControl {
  rotated: boolean;
  defaultName: string;
  onToggle: () => void;
}

const REPEAT_VIEW: Record<RepeatMode, { label: string; icon: string }> = {
  off: { label: "Repeat: off", icon: "repeat-off" },
  once: { label: "Repeat: once", icon: "repeat-once" },
  infinite: { label: "Repeat: forever", icon: "repeat" },
};

interface PlaybackBarProps {
  frame: number;
  total: number;
  unit: string;
  playing: boolean;
  speed: Speed;
  repeat: RepeatMode;
  rotate: RotateControl | null;
  onSeek: (i: number) => void;
  onStep: (delta: number) => void;
  onToggle: () => void;
  onSpeed: (speed: Speed) => void;
  onRepeat: () => void;
}

const SPEED_OPTIONS = SPEEDS.map((s) => ({ value: s, label: `${s}×` }));

export function PlaybackBar({
  frame,
  total,
  unit,
  playing,
  speed,
  repeat,
  rotate,
  onSeek,
  onStep,
  onToggle,
  onSpeed,
  onRepeat,
}: PlaybackBarProps) {
  const repeatView = REPEAT_VIEW[repeat];
  return (
    <div className="viz-playback">
      <span className="viz-playback__count">
        {unit} {frame + 1} / {total}
      </span>
      <div className="viz-playback__controls">
        <IconButton label={`First ${unit}`} onClick={() => onSeek(0)}>
          ⏮
        </IconButton>
        <IconButton label={`Previous ${unit}`} onClick={() => onStep(-1)}>
          ‹
        </IconButton>
        <IconButton label={playing ? "Pause" : "Play"} variant="primary" onClick={onToggle}>
          {playing ? "❚❚" : "▶"}
        </IconButton>
        <IconButton label={`Next ${unit}`} onClick={() => onStep(1)}>
          ›
        </IconButton>
        <IconButton label={`Last ${unit}`} onClick={() => onSeek(total - 1)}>
          ⏭
        </IconButton>
      </div>
      <div className="viz-playback__aside">
        {rotate && (
          <IconButton
            label={
              rotate.rotated ? `Back to the default ${rotate.defaultName} view` : "Rotate view"
            }
            active={rotate.rotated}
            pressed={rotate.rotated}
            onClick={rotate.onToggle}
          >
            <Icon name="rotate" />
          </IconButton>
        )}
        <IconButton label={repeatView.label} active={repeat !== "off"} onClick={onRepeat}>
          <Icon name={repeatView.icon} />
        </IconButton>
        <ChoiceGroup
          label="Speed"
          variant="segmented"
          options={SPEED_OPTIONS}
          value={speed}
          onChange={onSpeed}
        />
      </div>
    </div>
  );
}
