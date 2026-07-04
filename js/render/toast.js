/* ═══════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════ */
const _toastQueue = [];
let _toastBusy = false;

function _drainToastQueue() {
  if (_toastBusy || !_toastQueue.length) return;
  _toastBusy = true;
  const { message, durationMs, onUndo, actionLabel } = _toastQueue.shift();
  _showToastNow(message, durationMs, onUndo, actionLabel);
}

function _showToastNow(message, durationMs, onUndo, actionLabel = "Undo") {
  let toast = document.getElementById("wiki-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "wiki-toast";
    toast.className = "wiki-toast";
    document.body.appendChild(toast);
  }

  const advance = () => {
    toast.classList.remove("visible");
    setTimeout(() => {
      _toastBusy = false;
      _drainToastQueue();
    }, 200);
  };

  if (onUndo) {
    toast.replaceChildren();
    const text = document.createElement("span");
    text.textContent = message;
    const btn = document.createElement("button");
    btn.className = "toast-undo-btn";
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      clearTimeout(toast._timer);
      onUndo();
      advance();
    });
    toast.appendChild(text);
    toast.appendChild(btn);
  } else {
    toast.textContent = message;
  }

  toast.classList.add("visible");
  toast._timer = setTimeout(advance, durationMs);
}

function showToast(message, durationMs = 3000, onUndo = null, actionLabel = "Undo") {
  _toastQueue.push({ message, durationMs, onUndo, actionLabel });
  _drainToastQueue();
}

export { showToast };
