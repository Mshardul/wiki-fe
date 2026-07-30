// Wraps flat markdown-derived siblings into real nested containers so
// downstream features (collapse, study mode, per-problem toggles, ...) can
// target "everything under this heading" by element instead of re-deriving
// section boundaries with a heading.nextElementSibling walk every time.
function _collectUntil(startEl, stopTagRe) {
  const collected = [];
  let el = startEl;
  while (el && !stopTagRe.test(el.tagName)) {
    const next = el.nextElementSibling;
    collected.push(el);
    el = next;
  }
  return collected;
}

function _wrapRun(heading, body, titleClass, bodyClass, wrapperClass) {
  const wrapper = document.createElement("div");
  wrapper.className = wrapperClass;
  const title = document.createElement("div");
  title.className = titleClass;
  const bodyEl = document.createElement("div");
  bodyEl.className = bodyClass;

  heading.replaceWith(wrapper);
  title.appendChild(heading);
  body.forEach((el) => bodyEl.appendChild(el));

  wrapper.appendChild(title);
  wrapper.appendChild(bodyEl);
  return wrapper;
}

function wrapSectionsAndSubsections(contentEl) {
  Array.from(contentEl.querySelectorAll(":scope > h2")).forEach((h2) => {
    const body = _collectUntil(h2.nextElementSibling, /^H[12]$/);
    _wrapRun(h2, body, "section-title", "section-body", "section");
  });

  contentEl.querySelectorAll(".section-body").forEach((sectionBody) => {
    Array.from(sectionBody.querySelectorAll(":scope > h3")).forEach((h3) => {
      const body = _collectUntil(h3.nextElementSibling, /^H[123]$/);
      _wrapRun(h3, body, "subsection-title", "subsection-body", "subsection");
    });
  });
}

export { wrapSectionsAndSubsections };
