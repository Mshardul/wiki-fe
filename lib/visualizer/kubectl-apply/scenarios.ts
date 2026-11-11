import type { K8sHubActorRow } from "@/lib/visualizer/core/shapes";
import data from "./scenarios.data.json";
import type { KubectlScenario } from "./types";

export const KUBECTL_ACTORS = data.actors as K8sHubActorRow[];
export const KUBECTL_SCENARIOS = data.scenarios as KubectlScenario[];
