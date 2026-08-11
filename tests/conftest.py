import hashlib
import json
import threading
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent

# CDN assets served from memory per session — goto(wait_until="load") otherwise blocks on live CDN latency.
_CDN_ASSETS = [
    "https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
]

# Mermaid stubbed in disable_animations; abort the CDN request to dodge index.html SRI on the script tag.
_MERMAID_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/mermaid@10.9.5/dist/mermaid.min.js"

# Version-pinned URLs — disk cache survives re-runs and xdist workers.
_DISK_CACHE_DIR = REPO_ROOT / "tests" / ".cdn-cache"


def _disk_cache_path(url):
    digest = hashlib.sha256(url.encode()).hexdigest()
    return _DISK_CACHE_DIR / f"{digest}.json"


@pytest.fixture(scope="session")
def cdn_cache():
    cache = {}
    for url in _CDN_ASSETS:
        cache_path = _disk_cache_path(url)
        if cache_path.exists():
            stored = json.loads(cache_path.read_text())
            cache[url] = (stored["body"].encode("latin-1"), stored["content_type"])
            continue
        with urllib.request.urlopen(url, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "application/javascript")
            body = resp.read()
        cache[url] = (body, content_type)
        _DISK_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps({"body": body.decode("latin-1"), "content_type": content_type})
        )
    return cache


def _make_cdn_fulfill_handler(body, content_type):
    def handler(route):
        route.fulfill(status=200, content_type=content_type, body=body)

    return handler


@pytest.fixture(autouse=True)
def mock_cdn_assets(page, cdn_cache):
    for url, (body, content_type) in cdn_cache.items():
        page.route(url, _make_cdn_fulfill_handler(body, content_type))
    page.route(_MERMAID_SCRIPT_URL, lambda route: route.abort())


@pytest.fixture
def browser_context_args(browser_context_args):
    # Block SW so page.route() intercepts .md fetches.
    return {**browser_context_args, "service_workers": "block"}


_MERMAID_STUB = """
if (typeof window.mermaid === 'undefined') {
    var _mermaidConfig = {};
    window.mermaid = {
        initialize: function(cfg) { _mermaidConfig = cfg || {}; },
        render: function(id, src) {
            var theme = _mermaidConfig.theme || 'default';
            // One <g> per parsed node id for hover/step-through assertions.
            var nodeIds = {};
            var re = /\\b([A-Za-z0-9_]+)[\\[\\(]/g;
            var m;
            while ((m = re.exec(src)) !== null) nodeIds[m[1]] = true;
            var groups = Object.keys(nodeIds).map(function (nid) {
                return '<g id="flowchart-' + nid + '-0" class="node"><text class="nodeLabel">' + nid + '</text></g>';
            }).join('');
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" id="' + id + '" data-theme="' + theme + '" width="100" height="50"><text y="20">stub</text>' + groups + '</svg>';
            return Promise.resolve({ svg: svg });
        }
    };
}
"""


@pytest.fixture(autouse=True)
def disable_animations(page):
    page.add_init_script(_MERMAID_STUB)
    page.add_init_script("""
        (() => {
            const s = document.createElement('style');
            s.textContent = '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; transition-delay: 0s !important; animation-delay: 0s !important; }';
            // about:blank has no <head> yet when init scripts run.
            if (document.head) {
                document.head.appendChild(s);
            } else {
                document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
            }
        })();
    """)


def force_paint(page):
    """Force a real compositor frame via CDP - Playwright's actionability check can pass on stale hit-test geometry for a JS-positioned element without this."""
    cdp = page.context.new_cdp_session(page)
    cdp.send("Page.captureScreenshot", {"format": "png"})
    cdp.detach()


@pytest.fixture(scope="session")
def base_url():
    class Handler(SimpleHTTPRequestHandler):
        # HTTP/1.1 keep-alive — HTTP/1.0 closes after every response; ~40 ES module imports per page load.
        protocol_version = "HTTP/1.1"

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

        def log_message(self, *args):
            pass

        def handle_one_request(self):
            # Swallow client aborts on any write path (including 404 send_error).
            try:
                super().handle_one_request()
            except (BrokenPipeError, ConnectionResetError):
                self.close_connection = True

        def copyfile(self, source, outputfile):
            try:
                super().copyfile(source, outputfile)
            except (BrokenPipeError, ConnectionResetError):
                self.close_connection = True

    class Server(ThreadingHTTPServer):
        daemon_threads = True
        # Default backlog 5; app.js import graph can burst ~30 simultaneous requests.
        request_queue_size = 128

        # Bounded pool — unbounded per-request threads multiply across xdist workers.
        _pool = ThreadPoolExecutor(max_workers=12, thread_name_prefix="wiki-test-http")

        def process_request(self, request, client_address):
            self._pool.submit(self.process_request_thread, request, client_address)

        def handle_error(self, request, client_address):
            # Client disconnects are expected during navigation; don't dump them.
            pass

    server = Server(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    yield f"http://localhost:{port}"

    server.shutdown()
    server._pool.shutdown(wait=False)


@pytest.fixture
def wiki_page(page, base_url, disable_animations):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    return page
