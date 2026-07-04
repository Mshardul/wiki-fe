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
# though (it's what was hanging goto), so it needs a route fulfilled too - just with an
# empty body instead of the real library, so it never overwrites the stub.
_MERMAID_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/mermaid@10.9.5/dist/mermaid.min.js"


@pytest.fixture(scope="session")
def cdn_cache():
    cache = {_MERMAID_SCRIPT_URL: (b"/* stubbed for tests */", "application/javascript")}
    for url in _CDN_ASSETS:
        with urllib.request.urlopen(url, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "application/javascript")
            cache[url] = (resp.read(), content_type)
    return cache


def _make_cdn_fulfill_handler(body, content_type):
    def handler(route):
        route.fulfill(status=200, content_type=content_type, body=body)

    return handler


@pytest.fixture(autouse=True)
def mock_cdn_assets(page, cdn_cache):
    for url, (body, content_type) in cdn_cache.items():
        page.route(url, _make_cdn_fulfill_handler(body, content_type))


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
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" id="' + id + '" data-theme="' + theme + '" width="100" height="50"><text y="20">stub</text></svg>';
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
            document.head.appendChild(s);
        })();
    """)


@pytest.fixture(scope="session")
def base_url():
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

        def log_message(self, *args):
            pass

        def copyfile(self, source, outputfile):
            try:
                super().copyfile(source, outputfile)
            except (BrokenPipeError, ConnectionResetError):
                pass

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
    return page
