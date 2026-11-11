import type { HttpPipelineModel } from "@/lib/visualizer/core/shapes";
import { HTTP_PIPELINE_NODES, HTTP_PIPELINE_ORDER } from "./nodes";
import type { HttpPipelineFrame } from "./types";

export function frameModel(frame: HttpPipelineFrame): HttpPipelineModel {
  if (!frame.active) throw new Error("http pipeline frame missing active node");
  return {
    kind: "http-pipeline",
    order: frame.order ?? [...HTTP_PIPELINE_ORDER],
    nodes: HTTP_PIPELINE_NODES,
    down: frame.down ?? [],
    up: frame.up ?? [],
    active: frame.active,
    token: frame.token,
    ...(frame.notes ? { notes: frame.notes } : {}),
    ...(frame.skip ? { skip: frame.skip } : {}),
    ...(frame.fail ? { fail: frame.fail } : {}),
    ...(frame.workers ? { workers: frame.workers } : {}),
    ...(frame.limits ? { limits: frame.limits } : {}),
    ...(frame.clock !== undefined ? { clock: frame.clock } : {}),
    ...(frame.fired ? { fired: frame.fired } : {}),
    ...(frame.status ? { status: frame.status } : {}),
    ...(frame.statusErr ? { statusErr: true } : {}),
    ...(frame.banner ? { banner: frame.banner } : {}),
    ...(frame.buffer ? { buffer: frame.buffer } : {}),
    ...(frame.nginxMaxBody ? { nginxMaxBody: frame.nginxMaxBody } : {}),
  };
}
