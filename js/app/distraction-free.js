let _distractionFree = false;
function toggleDistractionFree() {
  _distractionFree = !_distractionFree;
  document.body.classList.toggle("distraction-free", _distractionFree);
}

function isDistractionFree() {
  return _distractionFree;
}

function exitDistractionFree() {
  if (!_distractionFree) return;
  _distractionFree = false;
  document.body.classList.remove("distraction-free");
}

export { toggleDistractionFree, isDistractionFree, exitDistractionFree };
