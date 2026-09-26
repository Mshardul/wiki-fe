import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
OUT_DIR = REPO_ROOT / "out"
BASE_PREFIX = "/wiki-fe"


def _make_cdn_fulfill_handler(body, content_type):
    """Kept for tests that still call it directly; Next bundles its own assets so this is
    only used by a handful of tests that fulfil a specific request themselves."""

    def handler(route):
        route.fulfill(status=200, content_type=content_type, body=body)

    return handler


def force_paint(page):
    """Force a real compositor frame via CDP - Playwright's actionability check can pass on
    stale hit-test geometry for a JS-positioned element without this."""
    cdp = page.context.new_cdp_session(page)
    cdp.send("Page.captureScreenshot", {"format": "png"})
    cdp.detach()


@pytest.fixture(autouse=True)
def disable_animations(page):
    page.add_init_script("""
        (() => {
            const s = document.createElement('style');
            s.textContent = '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; transition-delay: 0s !important; animation-delay: 0s !important; }';
            if (document.head) {
                document.head.appendChild(s);
            } else {
                document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
            }
        })();
    """)


@pytest.fixture(scope="session", autouse=True)
def _ensure_build():
    """The e2e suite runs against the static Next export. Build it if it's missing; a stale
    build is the developer's responsibility (run `pnpm build` before the suite)."""
    if (OUT_DIR / "index.html").exists():
        return
    subprocess.run(["pnpm", "build"], cwd=REPO_ROOT, check=True)


@pytest.fixture
def browser_context_args(browser_context_args):
    # Most tests don't exercise the SW; block it so it can't serve stale shells between runs.
    # PWA/offline tests override this fixture locally to unblock.
    return {**browser_context_args, "service_workers": "block"}


@pytest.fixture(scope="session")
def base_url():
    """Serve the Next `out/` build under /wiki-fe/, matching the GitHub Pages subpath."""

    class Handler(SimpleHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(OUT_DIR), **kwargs)

        def translate_path(self, path):
            # Strip the /wiki-fe prefix, then resolve against out/.
            if path.startswith(BASE_PREFIX):
                path = path[len(BASE_PREFIX) :] or "/"
            return super().translate_path(path)

        def do_GET(self):
            # trailingSlash: true — redirect an extensionless path with no trailing slash so
            # the directory index resolves, mirroring Next's own behaviour.
            p = self.path.split("?", 1)[0]
            if not p.endswith("/") and "." not in p.rsplit("/", 1)[-1]:
                self.send_response(308)
                self.send_header("Location", p + "/")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            # GitHub Pages serves out/404.html for any unknown path.
            rel = p[len(BASE_PREFIX) :] if p.startswith(BASE_PREFIX) else p
            target = OUT_DIR / rel.lstrip("/")
            if not (target.is_file() or (target / "index.html").is_file()):
                body = (OUT_DIR / "404.html").read_bytes()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            return super().do_GET()

        def log_message(self, *args):
            pass

        def handle_one_request(self):
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
        request_queue_size = 128
        _pool = ThreadPoolExecutor(max_workers=12, thread_name_prefix="wiki-test-http")

        def process_request(self, request, client_address):
            self._pool.submit(self.process_request_thread, request, client_address)

        def handle_error(self, request, client_address):
            pass

    server = Server(("127.0.0.1", 0), Handler)
    port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    # base_url ends at the subpath; tests do f"{base_url}/dsa/patterns/x/".
    yield f"http://localhost:{port}{BASE_PREFIX}"

    server.shutdown()
    server._pool.shutdown(wait=False)


@pytest.fixture
def wiki_page(page, base_url, disable_animations):
    """Home, ready for interaction. Replaces the vanilla `#view-home.active` +
    `window.navigateToContent` waits."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=10_000)
    return page
