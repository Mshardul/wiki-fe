import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent


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
