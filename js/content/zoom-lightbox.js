/* ─── Zoom Overlay (shared by image lightbox + diagram zoom) ─── */
function getZoomOverlay() {
  let overlay = document.getElementById("zoom-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "zoom-overlay";
    overlay.className = "zoom-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Zoomed view");
    overlay.innerHTML = `
      <div class="zoom-overlay-backdrop"></div>
      <button class="zoom-overlay-close" aria-label="Close">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="zoom-overlay-content"></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".zoom-overlay-backdrop").addEventListener("click", closeZoomOverlay);
    overlay.querySelector(".zoom-overlay-close").addEventListener("click", closeZoomOverlay);

    bindZoomGestures(overlay);
  }
  return overlay;
}

/* ─── Lightbox touch gestures: pinch-zoom, zoomed-pan, swipe-down dismiss ─── */
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

function bindZoomGestures(overlay) {
  const target = () => overlay.querySelector(".zoom-overlay-content")?.firstElementChild;

  let scale = 1;
  let tx = 0;
  let ty = 0;

  // pinch state
  let startDist = 0;
  let startScale = 1;
  // single-finger state
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;
  let panning = false;
  // double-tap
  let lastTap = 0;

  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function apply() {
    const el = target();
    if (el) el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function clampPan() {
    const el = target();
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxX = Math.max(0, (r.width - window.innerWidth) / 2 + 40);
    const maxY = Math.max(0, (r.height - window.innerHeight) / 2 + 40);
    tx = clamp(tx, -maxX, maxX);
    ty = clamp(ty, -maxY, maxY);
  }

  function reset() {
    scale = 1;
    tx = 0;
    ty = 0;
    apply();
  }

  overlay.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        startDist = dist(e.touches);
        startScale = scale;
      } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTx = tx;
        startTy = ty;
        panning = scale > 1;
      }
    },
    { passive: true },
  );

  overlay.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        if (startDist > 0) {
          scale = clamp(startScale * (dist(e.touches) / startDist), ZOOM_MIN, ZOOM_MAX);
          if (scale <= 1) {
            tx = 0;
            ty = 0;
          }
          apply();
        }
      } else if (e.touches.length === 1 && panning && scale > 1) {
        e.preventDefault();
        tx = startTx + (e.touches[0].clientX - startX);
        ty = startTy + (e.touches[0].clientY - startY);
        clampPan();
        apply();
      }
    },
    { passive: false },
  );

  overlay.addEventListener(
    "touchend",
    (e) => {
      if (scale <= 1.02 && scale !== 1) reset();

      if (e.changedTouches.length === 1 && !panning) {
        const now = Date.now();
        if (now - lastTap < 300) {
          if (scale > 1) {
            reset();
          } else {
            scale = 2;
            const t = e.changedTouches[0];
            tx = (window.innerWidth / 2 - t.clientX) * (scale - 1);
            ty = (window.innerHeight / 2 - t.clientY) * (scale - 1);
            clampPan();
            apply();
          }
          lastTap = 0;
          return;
        }
        lastTap = now;
      }

      if (scale <= 1 && e.changedTouches.length === 1) {
        const dy = e.changedTouches[0].clientY - startY;
        const dx = e.changedTouches[0].clientX - startX;
        if (dy > 80 && Math.abs(dx) < dy) closeZoomOverlay();
      }
      panning = false;
    },
    { passive: true },
  );

  overlay._resetZoom = reset;
}

function closeZoomOverlay() {
  const overlay = document.getElementById("zoom-overlay");
  overlay?.classList.remove("open");
  overlay?._resetZoom?.();
}

function openZoomOverlay(node, caption = "") {
  const overlay = getZoomOverlay();
  const contentEl = overlay.querySelector(".zoom-overlay-content");
  contentEl.innerHTML = "";
  contentEl.appendChild(node);
  overlay._resetZoom?.();

  let cap = overlay.querySelector(".zoom-caption");
  if (caption) {
    if (!cap) {
      cap = document.createElement("p");
      cap.className = "zoom-caption";
      overlay.appendChild(cap);
    }
    cap.textContent = caption;
    cap.hidden = false;
  } else if (cap) {
    cap.hidden = true;
  }

  overlay.classList.add("open");
}

/* ─── Image Lightbox ─── */
function addImageLightbox(contentEl) {
  contentEl.querySelectorAll("img").forEach((img) => {
    img.addEventListener(
      "error",
      () => {
        const placeholder = document.createElement("div");
        placeholder.className = "img-error-placeholder";
        placeholder.setAttribute("role", "img");
        const altText = img.alt || "Image failed to load";
        placeholder.setAttribute("aria-label", altText);
        const icon = document.createElement("span");
        icon.className = "img-error-icon";
        icon.textContent = "🖼";
        const label = document.createElement("span");
        label.className = "img-error-text";
        label.textContent = altText;
        placeholder.appendChild(icon);
        placeholder.appendChild(label);
        img.replaceWith(placeholder);
      },
      { once: true },
    );
    img.loading = "lazy";
    img.classList.add("zoomable-img");
    img.addEventListener("click", () => {
      const clone = img.cloneNode();
      clone.style.cursor = "";
      openZoomOverlay(clone, img.alt);
    });
  });
}

/* ─── Diagram Zoom ─── */
function addDiagramZoom(contentEl) {
  contentEl.querySelectorAll(".mermaid-diagram").forEach((diagram) => {
    diagram.addEventListener("click", () => {
      const svgEl = diagram.querySelector("svg");
      if (!svgEl) return;
      const clone = svgEl.cloneNode(true);
      // Preserve viewBox so CSS can size it; set explicit 100% dims so
      // the element has a non-zero bounding box inside the flex overlay.
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.setAttribute("width", "100%");
      clone.setAttribute("height", "100%");
      clone.classList.add("zoom-diagram-svg");
      openZoomOverlay(clone);
    });
  });
}

export { closeZoomOverlay, openZoomOverlay, addImageLightbox, addDiagramZoom };
