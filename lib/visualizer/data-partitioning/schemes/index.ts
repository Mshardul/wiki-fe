import type { Scheme, SchemeId } from "../types";
import { directory } from "./directory";
import { modN } from "./mod-n";
import { range } from "./range";
import { rendezvous } from "./rendezvous";
import { ring } from "./ring";

export const SCHEMES: Record<SchemeId, Scheme> = {
  "mod-n": modN,
  range,
  ring,
  directory,
  rendezvous,
};
