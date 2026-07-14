import { WIKIS, state } from "../state.js";

/* ─── Card layout constants ─── */
const CARD_WIDTH = 1200;
const CARD_MAX_HEIGHT = 1600;
const CARD_PADDING = 72;
const ACCENT_BAR_WIDTH = 6;
const TEXT_FONT_SIZE = 40;
const TEXT_LINE_HEIGHT = 58;
const FOOTER_FONT_SIZE = 24;
const FOOTER_GAP = 48;
const MAX_PASSAGE_CHARS = 480;

function _token(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function _truncatePassage(text) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= MAX_PASSAGE_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_PASSAGE_CHARS).trimEnd()}…`;
}

/* Standard canvas word-wrap: measure each candidate line, break when it overflows maxWidth. */
function _wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function _buildDownloadName() {
  const wikiId = state.currentWikiId || "wiki";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${wikiId}-card-${stamp}.png`;
}

function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSelectionAsCard(selectedText) {
  const passage = _truncatePassage(selectedText || "");
  if (!passage) return;

  const bg = _token("--glass-bg", _token("--surface", "#161b27"));
  const accent = _token("--accent", "#6366f1");
  const accentLight = _token("--accent-light", "#818cf8");
  const heading = _token("--text-heading", "#f1f5f9");
  const body = _token("--text-body", "#cbd5e1");
  const fontMono = _token("--font-mono", '"JetBrains Mono", monospace');

  const wiki = WIKIS.find((w) => w.id === state.currentWikiId);
  const wikiTitle = wiki?.title || "Wiki";
  const articleTitle = state.currentTitle || "";

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const textWidth = CARD_WIDTH - CARD_PADDING * 2 - ACCENT_BAR_WIDTH - 24;
  ctx.font = `${TEXT_FONT_SIZE}px ${fontMono}`;
  const lines = _wrapText(ctx, passage, textWidth);

  const textBlockHeight = lines.length * TEXT_LINE_HEIGHT;
  const footerBlockHeight = FOOTER_GAP + FOOTER_FONT_SIZE + 16;
  const height = Math.min(
    CARD_MAX_HEIGHT,
    CARD_PADDING * 2 + textBlockHeight + footerBlockHeight,
  );

  canvas.width = CARD_WIDTH * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${CARD_WIDTH}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, height);

  // Accent bar along the left edge
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, ACCENT_BAR_WIDTH, height);

  // Passage text
  ctx.font = `${TEXT_FONT_SIZE}px ${fontMono}`;
  ctx.fillStyle = heading;
  ctx.textBaseline = "top";
  const textX = CARD_PADDING + ACCENT_BAR_WIDTH + 24;
  let textY = CARD_PADDING;
  const maxLines = Math.floor((height - CARD_PADDING * 2 - footerBlockHeight) / TEXT_LINE_HEIGHT);
  lines.slice(0, maxLines).forEach((line) => {
    ctx.fillText(line, textX, textY);
    textY += TEXT_LINE_HEIGHT;
  });

  // Footer divider
  const footerY = height - footerBlockHeight;
  ctx.strokeStyle = accentLight;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(textX, footerY);
  ctx.lineTo(CARD_WIDTH - CARD_PADDING, footerY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Footer branding: wiki name (+ article title if known)
  ctx.font = `${FOOTER_FONT_SIZE}px ${fontMono}`;
  ctx.fillStyle = body;
  const footerLabel = articleTitle ? `${wikiTitle} · ${articleTitle}` : wikiTitle;
  ctx.fillText(footerLabel, textX, footerY + 20);

  canvas.toBlob((blob) => {
    if (blob) _triggerDownload(blob, _buildDownloadName());
  }, "image/png");
}

export { exportSelectionAsCard };
