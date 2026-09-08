import { expandQuery } from "./synonyms";

// Sentence-based snippet extraction. Ported from js/search/search-features.js extractSnippet.
// Returns { before, match, after } segments so the caller renders the highlight (no innerHTML).
export interface Snippet {
  before: string;
  match: string;
  after: string;
}

function sentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g) ?? [text];
}

export function extractSnippet(description: string, query: string): Snippet | null {
  if (!description) return null;
  const terms = expandQuery(query);
  const sents = sentences(description);
  for (const term of terms) {
    const tl = term.toLowerCase();
    for (const sentence of sents) {
      if (sentence.toLowerCase().includes(tl)) return split(sentence.trim(), tl);
    }
  }
  return split((sents[0] ?? "").trim(), (terms[0] ?? "").toLowerCase());
}

function split(sentence: string, term: string): Snippet {
  const idx = sentence.toLowerCase().indexOf(term);
  if (idx === -1) return { before: sentence, match: "", after: "" };
  return {
    before: sentence.slice(0, idx),
    match: sentence.slice(idx, idx + term.length),
    after: sentence.slice(idx + term.length),
  };
}
