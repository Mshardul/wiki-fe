/* Converts bare YouTube/Vimeo URLs on their own line into a responsive iframe embed. */

const YOUTUBE_RE =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=([\w-]+)(?:&\S*)?|youtu\.be\/([\w-]+))\/?$/;
const VIMEO_RE = /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)\/?$/;

function embedUrlFor(rawUrl) {
  const url = rawUrl.trim();
  const yt = url.match(YOUTUBE_RE);
  if (yt) return `https://www.youtube.com/embed/${yt[1] || yt[2]}`;
  const vimeo = url.match(VIMEO_RE);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function addVideoEmbeds(contentEl) {
  contentEl.querySelectorAll("p").forEach((p) => {
    if (p.querySelector("img, a, code")) return;
    const text = p.textContent.trim();
    if (!text || /\s/.test(text)) return;

    const embedSrc = embedUrlFor(text);
    if (!embedSrc) return;

    const wrapper = document.createElement("div");
    wrapper.className = "video-embed";
    const iframe = document.createElement("iframe");
    iframe.src = embedSrc;
    iframe.loading = "lazy";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.title = "Embedded video";
    wrapper.appendChild(iframe);
    p.replaceWith(wrapper);
  });
}

export { addVideoEmbeds };
