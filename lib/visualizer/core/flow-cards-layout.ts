import type { FlowCardsModel } from "./shapes";

export const FLOW_PAD = 12;
export const FLOW_INTAKE_W = 96;
export const FLOW_INTAKE_H = 40;
export const FLOW_HUB_W = 88;
export const FLOW_HUB_H = 96;
export const FLOW_ARROW_W = 48;
export const FLOW_CARD_H = 64;
export const FLOW_CARD_GAP = 10;
export const FLOW_NAME_W = 84;
export const FLOW_CARD_PAD = 12;
export const FLOW_CHIP_W = 84;
export const FLOW_CHIP_H = 40;
export const FLOW_CHIP_GAP = 8;
export const FLOW_PANEL_W = 236;
export const FLOW_PANEL_H = 210;
export const FLOW_PANEL_GAP = 32;
export const FLOW_NOTE_CHARS = 34;
const INTAKE_GAP = 20;

export interface FlowCardsLayout {
  width: number;
  height: number;
  intake: { x: number; y: number };
  hub: { x: number; y: number };
  cardX: number;
  cardW: number;
  cardY: number[];
  panelX: number;
  panelY: number;
  chips: Map<string, { x: number; y: number }>;
}

export function flowCardsLayout(model: FlowCardsModel): FlowCardsLayout {
  const n = model.cards.length;
  const slots = Math.max(1, model.slots);
  const cardsH = n * FLOW_CARD_H + Math.max(0, n - 1) * FLOW_CARD_GAP;
  const height = Math.max(cardsH, FLOW_PANEL_H) + 2 * FLOW_PAD;
  const top = (height - cardsH) / 2;
  const hubX = FLOW_PAD + FLOW_INTAKE_W + INTAKE_GAP;
  const cardX = hubX + FLOW_HUB_W + FLOW_ARROW_W;
  const cardW = FLOW_NAME_W + 2 * FLOW_CARD_PAD + slots * FLOW_CHIP_W + (slots - 1) * FLOW_CHIP_GAP;
  const panelX = cardX + cardW + FLOW_PANEL_GAP;
  const cardY = model.cards.map((_, i) => top + i * (FLOW_CARD_H + FLOW_CARD_GAP));
  const chips = new Map<string, { x: number; y: number }>();
  model.cards.forEach((card, i) => {
    card.chips.forEach((chip, j) => {
      chips.set(chip.id, {
        x: cardX + FLOW_NAME_W + FLOW_CARD_PAD + j * (FLOW_CHIP_W + FLOW_CHIP_GAP),
        y: (cardY[i] as number) + (FLOW_CARD_H - FLOW_CHIP_H) / 2,
      });
    });
  });
  return {
    width: panelX + FLOW_PANEL_W + FLOW_PAD,
    height,
    intake: { x: FLOW_PAD, y: height / 2 - FLOW_INTAKE_H / 2 },
    hub: { x: hubX, y: height / 2 - FLOW_HUB_H / 2 },
    cardX,
    cardW,
    cardY,
    panelX,
    panelY: (height - FLOW_PANEL_H) / 2,
    chips,
  };
}

export function wrapNote(text: string, max: number = FLOW_NOTE_CHARS): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line !== "" && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line === "" ? word : `${line} ${word}`;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}
