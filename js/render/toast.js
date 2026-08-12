/* TOAST */
const _toastQueue = [];
let _toastBusy = false;

function _drainToastQueue() {
  if (_toastBusy || !_toastQueue.length) return;
  _toastBusy = true;
  const { message, durationMs, onUndo, actionLabel, type } = _toastQueue.shift();
  _showToastNow(message, durationMs, onUndo, actionLabel, type);
}

function _showToastNow(message, durationMs, onUndo, actionLabel = "Undo", type = null) {
  let toast = document.getElementById("wiki-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "wiki-toast";
    document.body.appendChild(toast);
  }
  toast.className = "wiki-toast";
  if (type) toast.classList.add(`wiki-toast--${type}`);

  const advance = () => {
    toast.classList.remove("visible");
    setTimeout(() => {
      _toastBusy = false;
      _drainToastQueue();
    }, 200);
  };

  toast.replaceChildren();
  const text = document.createElement("span");
  text.className = "wiki-toast-msg";
  text.textContent = message;
  toast.appendChild(text);

  if (onUndo) {
    const btn = document.createElement("button");
    btn.className = "toast-undo-btn";
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      clearTimeout(toast._timer);
      onUndo();
      advance();
    });
    toast.appendChild(btn);
  }

  toast.classList.add("visible");
  toast._timer = setTimeout(advance, durationMs);
}

// Higher priority jumps ahead of already-queued lower-priority toasts (stable among equal priority) - lets a time-sensitive toast (e.g. SW update) overtake a long-running low-priority one (e.g. install nudge) still sitting in the queue.
function showToast(
  message,
  durationMs = 3000,
  onUndo = null,
  actionLabel = "Undo",
  type = null,
  priority = 0,
) {
  const entry = { message, durationMs, onUndo, actionLabel, type, priority };
  const insertAt = _toastQueue.findIndex((t) => t.priority < priority);
  if (insertAt === -1) _toastQueue.push(entry);
  else _toastQueue.splice(insertAt, 0, entry);
  _drainToastQueue();
}

export { showToast };
