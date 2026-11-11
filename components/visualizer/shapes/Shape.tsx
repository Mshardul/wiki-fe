import { isDense, type Size } from "@/lib/visualizer/core/geometry";
import { resolveAxis, type ShapeModel } from "@/lib/visualizer/core/shapes";
import { BtreeShape } from "./BtreeShape";
import { CacheStampedeShape } from "./CacheStampedeShape";
import { CeleryBoardShape } from "./CeleryBoardShape";
import { CompositeShape } from "./CompositeShape";
import { ConnectionPoolShape } from "./ConnectionPoolShape";
import { ConnLadderShape } from "./ConnLadderShape";
import { DnsCachingShape } from "./DnsCachingShape";
import { HistogramShape } from "./HistogramShape";
import { HttpPipelineShape } from "./HttpPipelineShape";
import { K8sHubShape } from "./K8sHubShape";
import { K8sServiceShape } from "./K8sServiceShape";
import { LanesShape } from "./LanesShape";
import { LinearShape } from "./LinearShape";
import { MvccShape } from "./MvccShape";
import { RankingShape } from "./RankingShape";
import { ResourceGaugesShape } from "./ResourceGaugesShape";
import { RingShape } from "./RingShape";
import { ScheduleShape } from "./ScheduleShape";
import { TimelineShape } from "./TimelineShape";
import { WalShape } from "./WalShape";

interface ShapeProps {
  model: ShapeModel;
  rotated: boolean;
  size: Size;
  subject: string;
  dense?: boolean;
}

export function Shape({ model, rotated, size, subject, dense = isDense(size) }: ShapeProps) {
  if (model.kind === "ring") return <RingShape model={model} subject={subject} />;
  if (model.kind === "ranking") return <RankingShape model={model} subject={subject} />;
  if (model.kind === "lanes") return <LanesShape model={model} subject={subject} />;
  if (model.kind === "schedule") return <ScheduleShape model={model} subject={subject} />;
  if (model.kind === "mvcc") return <MvccShape model={model} subject={subject} />;
  if (model.kind === "btree") return <BtreeShape model={model} subject={subject} />;
  if (model.kind === "wal") return <WalShape model={model} subject={subject} />;
  if (model.kind === "http-pipeline") return <HttpPipelineShape model={model} subject={subject} />;
  if (model.kind === "k8s-hub") return <K8sHubShape model={model} subject={subject} />;
  if (model.kind === "k8s-service") return <K8sServiceShape model={model} subject={subject} />;
  if (model.kind === "resource-gauges")
    return <ResourceGaugesShape model={model} subject={subject} />;
  if (model.kind === "dns-caching") return <DnsCachingShape model={model} subject={subject} />;
  if (model.kind === "conn-ladder") return <ConnLadderShape model={model} subject={subject} />;
  if (model.kind === "connection-pool")
    return <ConnectionPoolShape model={model} subject={subject} />;
  if (model.kind === "cache-stampede")
    return <CacheStampedeShape model={model} subject={subject} />;
  if (model.kind === "celery-board") return <CeleryBoardShape model={model} subject={subject} />;
  if (model.kind === "timeline")
    return <TimelineShape model={model} size={size} subject={subject} dense={dense} />;
  if (model.kind === "composite") {
    return (
      <CompositeShape
        model={model}
        size={size}
        subject={subject}
        renderPart={(part, partSize) => (
          <Shape model={part} rotated={false} size={partSize} subject={subject} dense={dense} />
        )}
      />
    );
  }
  const axis = resolveAxis(model, rotated) ?? model.defaultAxis;
  if (model.kind === "linear") {
    return <LinearShape model={model} axis={axis} size={size} subject={subject} />;
  }
  return <HistogramShape model={model} axis={axis} subject={subject} />;
}
