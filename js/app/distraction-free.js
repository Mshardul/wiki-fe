let _distractionFree = false;
function toggleDistractionFree() {
  _distractionFree = !_distractionFree;
  document.body.classList.toggle("distraction-free", _distractionFree);
}

export { toggleDistractionFree };
