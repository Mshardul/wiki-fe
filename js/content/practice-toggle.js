import { getSettings } from "../storage/settings-theme.js";

// Matches the leading "**Approach:**"/"**Complexity:**" bold label Showdown leaves as a <strong> at the start of a paragraph.
const APPROACH_RE = /^Approach[.:]?$/;
const COMPLEXITY_RE = /^Complexity[.:]?$/;

function _labelText(el) {
  return el.tagName === "P" ? el.querySelector("strong")?.textContent.trim() : null;
}

function _wrapAnswer(subsectionBody) {
  const children = Array.from(subsectionBody.children);
  const start = children.findIndex((el) => APPROACH_RE.test(_labelText(el) || ""));
  if (start === -1) return null;

  let end = start;
  for (let i = start; i < children.length; i++) {
    end = i;
    if (COMPLEXITY_RE.test(_labelText(children[i]) || "")) break;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "problem-answer";
  children[start].before(wrapper);
  for (let i = start; i <= end; i++) wrapper.appendChild(children[i]);
  return wrapper;
}

function _wireProblem(h3, hidden) {
  const subsection = h3.closest(".subsection");
  const subsectionBody = subsection?.querySelector(":scope > .subsection-body");
  if (!subsectionBody) return;

  const answer = _wrapAnswer(subsectionBody);
  if (!answer) return;

  const btn = document.createElement("button");
  btn.className = "practice-eye-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "Toggle answer visibility");
  h3.appendChild(btn);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    _setAnswerHidden(h3, answer, answer.hidden !== true);
  });

  _setAnswerHidden(h3, answer, hidden);
}

function _setAnswerHidden(h3, answer, hidden) {
  answer.hidden = hidden;
  const btn = h3.querySelector(".practice-eye-btn");
  if (!btn) return;
  btn.innerHTML = hidden
    ? '<svg class="icon" aria-hidden="true"><use href="#icon-eye-off"></use></svg>'
    : '<svg class="icon" aria-hidden="true"><use href="#icon-eye"></use></svg>';
  btn.setAttribute("aria-pressed", String(!hidden));
}

function addPracticeAnswerToggles(contentEl) {
  const heading = Array.from(contentEl.querySelectorAll("h2")).find(
    (h2) => h2.textContent.replace(/#+\s*$/, "").trim() === "Practice problems",
  );
  if (!heading) return;

  const sectionBody = heading.closest(".section")?.querySelector(":scope > .section-body");
  if (!sectionBody) return;

  const hidden = Boolean(getSettings().practiceAnswersHidden);
  sectionBody.querySelectorAll(":scope > .subsection > .subsection-title > h3").forEach((h3) => {
    _wireProblem(h3, hidden);
  });
}

export { addPracticeAnswerToggles };
