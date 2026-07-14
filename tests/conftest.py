import hashlib
import json
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent

# index.html loads these from live CDNs. page.goto(..., wait_until="load") (Playwright's
# default) blocks until every one of them resolves, so any CDN slowness times out whichever
# test happens to be navigating at that moment - a different test each run. Fetch each real
# asset once per test session and serve it from memory for every page after that, removing
# the live-network dependency without changing what code actually runs (real showdown/hljs/
# DOMPurify/katex - not stubs, since tests assert on their real output).
_CDN_ASSETS = [
    "https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js",
    "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css",
]

# mermaid.min.js is deliberately NOT fetched for real: disable_animations below stubs
# window.mermaid before any page script runs, and existing tests assert on that stub's
# fake SVG output. The live <script src="...mermaid..."> tag still fires a real request
# though (it's what was hanging goto), so it needs a route too. index.html pins this
# script's `integrity="sha384-..."` attribute, and any fulfilled body that doesn't hash
# to that exact value gets blocked by the browser's own SRI check - so the route aborts
# the request instead of fulfilling it, skipping SRI hashing entirely.
_MERMAID_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/mermaid@10.9.5/dist/mermaid.min.js"

# On-disk cache so re-running tests (and every xdist worker) doesn't re-hit live CDNs.
# Every URL above is version-pinned, so a cached response is valid forever - the only way
# it goes stale is a version bump, which changes the URL (and therefore the cache path).
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
    # window.mermaid is already provided by the stub init script (see disable_animations,
    # runs before any page script). Abort rather than fulfill so the browser never hashes
    # a body against the page's pinned `integrity` attribute for this script.
    page.route(_MERMAID_SCRIPT_URL, lambda route: route.abort())


@pytest.fixture
def browser_context_args(browser_context_args):
    # Block service workers so page.route() mock intercepts work correctly.
    # The SW intercepts all .md fetches before Playwright sees them otherwise.
    return {**browser_context_args, "service_workers": "block"}


_MERMAID_STUB = """
if (typeof window.mermaid === 'undefined') {
    var _mermaidConfig = {};
    window.mermaid = {
        initialize: function(cfg) { _mermaidConfig = cfg || {}; },
        render: function(id, src) {
            var theme = _mermaidConfig.theme || 'default';
            // Fake a <g> per node id (e.g. "A", "B") so tests asserting on
            // hover-captions / step-through highlighting have real elements to match.
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
            // Init scripts also fire on the initial about:blank document, where
            // <head> may not exist yet - wait for it rather than assuming it's there.
            if (document.head) {
                document.head.appendChild(s);
            } else {
                document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
            }
        })();
    """)


@pytest.fixture(scope="session")
def base_url():
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

        def log_message(self, *args):
            pass

        def handle_one_request(self):
            # The client (Playwright) can abort a request at any point - not
            # just mid-body (copyfile), but before headers are even fully
            # written (send_response/send_header/send_error all write to
            # the same socket). An abort during send_error specifically
            # happens on every 404 for a stray/incorrect asset path the app
            # requests, which happens often enough over a long run to matter.
            # Wrapping the whole request here, rather than just copyfile,
            # is the only place that covers every write path at once.
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

        def handle_error(self, request, client_address):
            # Client disconnects are expected during navigation; don't dump them.
            pass

    server = Server(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    yield f"http://localhost:{port}"

    server.shutdown()


@pytest.fixture
def wiki_page(page, base_url, disable_animations):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    return page
