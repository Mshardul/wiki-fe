// Shared flag: while an index-card swipe is in progress, the global edge-swipe stands down.
let cardSwipeActive = false;

export function setCardSwipeActive(v: boolean): void {
  cardSwipeActive = v;
}

export function isCardSwipeActive(): boolean {
  return cardSwipeActive;
}
