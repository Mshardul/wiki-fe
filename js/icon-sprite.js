export function loadIconSprite() {
  fetch("./sprite.svg")
    .then((res) => res.text())
    .then((svgText) => {
      const wrapper = document.createElement("div");
      wrapper.setAttribute("aria-hidden", "true");
      wrapper.style.display = "none";
      wrapper.innerHTML = svgText;
      document.body.prepend(wrapper);
    });
}
