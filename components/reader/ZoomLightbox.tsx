"use client";

import { useEffect } from "react";

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

// Ported from js/content/zoom-lightbox.js: click an image or a rendered diagram to open a full-screen
// overlay with pinch-zoom, zoomed-pan, double-tap and swipe-down dismiss. Also wires image-load errors.
export function ZoomLightbox() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".markdown-body");
    if (!root) return;

    const overlay = document.createElement("div");
    overlay.id = "zoom-overlay";
    overlay.className = "zoom-overlay hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Zoomed view");
    overlay.innerHTML =
      '<div class="zoom-overlay-backdrop"></div>' +
      '<button class="zoom-overlay-close" type="button" aria-label="Close">' +
      '<svg class="icon" aria-hidden="true"><use href="#icon-x"></use></svg></button>' +
      '<div class="zoom-overlay-content"></div>';
    document.body.appendChild(overlay);
    const content = overlay.querySelector<HTMLElement>(".zoom-overlay-content");

    let scale = 1;
    let tx = 0;
    let ty = 0;
    let startDist = 0;
    let startScale = 1;
    let startX = 0;
    let startY = 0;
    let startTx = 0;
    let startTy = 0;
    let panning = false;
    let lastTap = 0;
    let singleTouchStart = false;
    let pinchOccurred = false;

    const target = () => content?.firstElementChild as HTMLElement | undefined;
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
    const touch = (list: TouchList, i = 0) => list[i] as Touch;
    const distOf = (t: TouchList) =>
      Math.hypot(touch(t).clientX - touch(t, 1).clientX, touch(t).clientY - touch(t, 1).clientY);
    const apply = () => {
      const el = target();
      if (el) el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    };
    const clampPan = () => {
      const el = target();
      if (!el) return;
      const r = el.getBoundingClientRect();
      const maxX = Math.max(0, (r.width - window.innerWidth) / 2 + 40);
      const maxY = Math.max(0, (r.height - window.innerHeight) / 2 + 40);
      tx = clamp(tx, -maxX, maxX);
      ty = clamp(ty, -maxY, maxY);
    };
    const reset = () => {
      scale = 1;
      tx = 0;
      ty = 0;
      apply();
    };
    const close = () => {
      overlay.classList.add("hidden");
      reset();
    };
    const open = (node: Node, caption = "") => {
      if (!content) return;
      content.replaceChildren(node);
      reset();
      let cap = overlay.querySelector<HTMLElement>(".zoom-caption");
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
      overlay.classList.remove("hidden");
    };

    overlay.querySelector(".zoom-overlay-backdrop")?.addEventListener("click", close);
    overlay.querySelector(".zoom-overlay-close")?.addEventListener("click", close);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = distOf(e.touches);
        startScale = scale;
        singleTouchStart = false;
        pinchOccurred = true;
        startX = 0;
        startY = 0;
      } else if (e.touches.length === 1) {
        startX = touch(e.touches).clientX;
        startY = touch(e.touches).clientY;
        startTx = tx;
        startTy = ty;
        panning = scale > 1;
        singleTouchStart = true;
        pinchOccurred = false;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        scale = clamp(startScale * (distOf(e.touches) / startDist), ZOOM_MIN, ZOOM_MAX);
        if (scale <= 1) {
          tx = 0;
          ty = 0;
        }
        apply();
      } else if (e.touches.length === 1 && panning && scale > 1) {
        e.preventDefault();
        tx = startTx + (touch(e.touches).clientX - startX);
        ty = startTy + (touch(e.touches).clientY - startY);
        clampPan();
        apply();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (scale <= 1.02 && scale !== 1) reset();
      if (pinchOccurred && e.touches.length === 1) {
        startX = touch(e.touches).clientX;
        startY = touch(e.touches).clientY;
        startTx = tx;
        startTy = ty;
        singleTouchStart = false;
        panning = scale > 1;
        return;
      }
      if (e.changedTouches.length === 1 && !panning) {
        const now = Date.now();
        if (now - lastTap < 300) {
          if (scale > 1) reset();
          else {
            scale = 2;
            const t = touch(e.changedTouches);
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
      if (scale <= 1 && e.changedTouches.length === 1 && singleTouchStart && !pinchOccurred) {
        const dy = touch(e.changedTouches).clientY - startY;
        const dx = touch(e.changedTouches).clientX - startX;
        if (dy > 80 && Math.abs(dx) < dy) close();
      }
      panning = false;
      singleTouchStart = false;
      if (e.touches.length === 0) pinchOccurred = false;
    };
    overlay.addEventListener("touchstart", onTouchStart, { passive: true });
    overlay.addEventListener("touchmove", onTouchMove, { passive: false });
    overlay.addEventListener("touchend", onTouchEnd, { passive: true });

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !overlay.classList.contains("hidden")) close();
    };
    document.addEventListener("keydown", onEsc);

    const imgCleanups: Array<() => void> = [];
    for (const img of root.querySelectorAll<HTMLImageElement>("img")) {
      img.loading = "lazy";
      img.classList.add("zoomable-img");
      const onClick = () => {
        const clone = img.cloneNode() as HTMLImageElement;
        clone.style.cursor = "";
        open(clone, img.alt);
      };
      const onError = () => {
        const ph = document.createElement("div");
        ph.className = "img-error-placeholder";
        ph.setAttribute("role", "img");
        const alt = img.alt || "Image failed to load";
        ph.setAttribute("aria-label", alt);
        const icon = document.createElement("span");
        icon.className = "img-error-icon";
        icon.textContent = "🖼";
        const label = document.createElement("span");
        label.className = "img-error-text";
        label.textContent = alt;
        ph.append(icon, label);
        img.replaceWith(ph);
      };
      img.addEventListener("click", onClick);
      img.addEventListener("error", onError, { once: true });
      imgCleanups.push(() => {
        img.removeEventListener("click", onClick);
        img.removeEventListener("error", onError);
      });
    }

    const onDiagramClick = (e: Event) => {
      const pre = (e.target as HTMLElement).closest<HTMLElement>("pre.mermaid");
      const svg = pre?.querySelector("svg");
      if (!svg) return;
      const clone = svg.cloneNode(true) as SVGElement;
      clone.classList.add("zoom-diagram-svg");
      open(clone);
    };
    root.addEventListener("click", onDiagramClick);

    return () => {
      document.removeEventListener("keydown", onEsc);
      root.removeEventListener("click", onDiagramClick);
      for (const c of imgCleanups) c();
      overlay.remove();
    };
  }, []);

  return null;
}
