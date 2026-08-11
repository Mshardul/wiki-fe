import { showToast } from "./render/toast.js";

function _fetchSprite() {
  return fetch("./sprite.svg").then((res) => {
    if (!res.ok) throw new Error(`sprite ${res.status}`);
    return res.text();
  });
}

function _injectSprite(svgText) {
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.display = "none";
  wrapper.innerHTML = svgText;
  document.body.prepend(wrapper);
}

export function loadIconSprite() {
  _fetchSprite()
    .catch(() => _fetchSprite())
    .then(_injectSprite)
    .catch(() => {
      showToast("Icons failed to load", 4000, null, undefined, "error");
    });
}
