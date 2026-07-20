const channel = "BroadcastChannel" in window ? new BroadcastChannel("wiki-sidecar-toc") : null;
const nav = document.getElementById("toc-nav");
const title = document.getElementById("sidecar-title");
const empty = document.getElementById("sidecar-empty");

function render(payload) {
  if (!payload || !payload.html) {
    nav.innerHTML = "";
    empty.hidden = false;
    title.textContent = "On this page";
    return;
  }
  empty.hidden = true;
  title.textContent = payload.articleTitle || "On this page";
  if (nav.dataset.sig !== payload.sig) {
    nav.innerHTML = payload.html;
    nav.dataset.sig = payload.sig;
  }
  nav.querySelectorAll(".toc-current, .toc-passed").forEach((el) => {
    el.classList.remove("toc-current", "toc-passed");
  });
  (payload.currentIds || []).forEach((id) => {
    const link = nav.querySelector(`a[href="#${CSS.escape(id)}"]`);
    link?.classList.add("toc-current");
  });
  (payload.passedIds || []).forEach((id) => {
    const link = nav.querySelector(`a[href="#${CSS.escape(id)}"]`);
    link?.classList.add("toc-passed");
  });
}

nav.addEventListener("click", (e) => {
  const a = e.target.closest("a.toc-item");
  if (!a) return;
  e.preventDefault();
  channel?.postMessage({ type: "navigate", id: a.getAttribute("href").slice(1) });
});

if (channel) {
  channel.onmessage = (e) => {
    if (e.data?.type === "state") render(e.data);
  };
  channel.postMessage({ type: "ready" });
} else {
  empty.hidden = false;
  empty.textContent = "This browser doesn't support the sidecar sync channel.";
}

window.addEventListener("beforeunload", () => {
  channel?.postMessage({ type: "closed" });
});
