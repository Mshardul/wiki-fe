/* ═══════════════════════════════════════════════════════════════
   HOME HERO PARALLAX
   ═══════════════════════════════════════════════════════════════ */
(function bindHomeParallax() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) return;

  const homeView = document.getElementById("view-home");
  if (!homeView) return;

  let rafId = null;
  homeView.addEventListener(
    "mousemove",
    (e) => {
      if (reduced.matches) return;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const grid = homeView.querySelector(".home-bg-grid");
        if (!grid) return;
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = ((e.clientX - cx) / cx) * 8;
        const dy = ((e.clientY - cy) / cy) * 8;
        grid.style.transform = `translate(${dx}px, ${dy}px)`;
      });
    },
    { passive: true },
  );

  homeView.addEventListener(
    "mouseleave",
    () => {
      const grid = homeView.querySelector(".home-bg-grid");
      if (grid) grid.style.transform = "";
    },
    { passive: true },
  );
})();
