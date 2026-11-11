import type { InfoContent, RelatedLink } from "../core/types";
import { type MechanismSlug, mechanismArticleHref, mechanismRelated } from "./links";

interface ScenarioCopy {
  q: string;
  short: string;
  tab: string;
  take: string;
  gen: string;
}

export function mechanismInfo(sc: ScenarioCopy, slug: MechanismSlug): InfoContent {
  return {
    heading: sc.q,
    name: sc.short,
    chip: sc.tab,
    rule: sc.q,
    about: [
      ["Takeaway", sc.take],
      ["Generalizes to", sc.gen],
    ],
    tries: [],
    articleHref: mechanismArticleHref(slug),
    related: mechanismRelated(slug),
  };
}

export function mechanismRelatedLinks(slug: MechanismSlug): RelatedLink[] {
  return mechanismRelated(slug);
}
