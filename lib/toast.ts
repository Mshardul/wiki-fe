export interface ToastOptions {
  durationMs?: number;
  variant?: "info" | "success" | "error" | null;
  onUndo?: (() => void) | null;
  actionLabel?: string;
  priority?: number;
}

export interface ActiveToast {
  message: string;
  durationMs: number;
  variant: ToastOptions["variant"];
  onUndo: ToastOptions["onUndo"];
  actionLabel: string;
  priority: number;
}

type Listener = (toast: ActiveToast | null) => void;

const queue: ActiveToast[] = [];
const listeners = new Set<Listener>();
let current: ActiveToast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

// Higher priority jumps ahead of queued lower-priority toasts (stable among equal). Ported from js/render/toast.js.
export function showToast(message: string, opts: ToastOptions = {}): void {
  const entry: ActiveToast = {
    message,
    durationMs: opts.durationMs ?? 3000,
    variant: opts.variant ?? null,
    onUndo: opts.onUndo ?? null,
    actionLabel: opts.actionLabel ?? "Undo",
    priority: opts.priority ?? 0,
  };
  if (current?.message === message || queue.some((t) => t.message === message)) return;

  const insertAt = queue.findIndex((t) => t.priority < entry.priority);
  if (insertAt === -1) queue.push(entry);
  else queue.splice(insertAt, 0, entry);
  drain();
}

export function subscribeToast(fn: Listener): () => void {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function dismissCurrentToast(): void {
  if (timer) clearTimeout(timer);
  advance();
}

function drain(): void {
  if (current || !queue.length) return;
  current = queue.shift() ?? null;
  emit();
  if (current) timer = setTimeout(advance, current.durationMs);
}

function advance(): void {
  timer = null;
  current = null;
  emit();
  drain();
}

function emit(): void {
  for (const fn of listeners) fn(current);
}

export function _resetToasts(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  current = null;
  queue.length = 0;
  listeners.clear();
}
