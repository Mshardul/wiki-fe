import json
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).parent.parent
OUT_DIR = REPO_ROOT / "out"
BASE_PREFIX = "/wiki-fe"


def force_paint(page):
    """Forces a compositor frame: actionability checks can pass on stale hit-test geometry for JS-positioned elements."""
    cdp = page.context.new_cdp_session(page)
    cdp.send("Page.captureScreenshot", {"format": "png"})
    cdp.detach()


NO_ANIMATIONS_JS = """
    (() => {
        const s = document.createElement('style');
        s.textContent = '*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; transition-delay: 0s !important; animation-delay: 0s !important; }';
        if (document.head) {
            document.head.appendChild(s);
        } else {
            document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
        }
    })();
"""


@pytest.fixture(autouse=True)
def disable_animations(page):
    page.add_init_script(NO_ANIMATIONS_JS)


@pytest.fixture(autouse=True)
def wait_for_hotkeys_ready(page):
    """Hotkeys bind after hydration, so every in-app goto/reload waits for them or early key presses are lost."""
    original_goto = page.goto
    original_reload = page.reload

    def wait_ready():
        page.wait_for_selector("html[data-hotkeys-ready]", state="attached", timeout=15_000)

    def goto(url, **kwargs):
        response = original_goto(url, **kwargs)
        if url.startswith("http://localhost") and BASE_PREFIX in url:
            wait_ready()
        return response

    def reload(**kwargs):
        response = original_reload(**kwargs)
        if BASE_PREFIX in page.url:
            wait_ready()
        return response

    page.goto = goto
    page.reload = reload


@pytest.fixture(scope="session", autouse=True)
def _ensure_build():
    """Builds the e2e export (with canary pages) when out/ is missing; a stale build is the developer's call."""
    if (OUT_DIR / "index.html").exists():
        return
    subprocess.run(["pnpm", "build:e2e"], cwd=REPO_ROOT, check=True)


@pytest.fixture
def browser_context_args(browser_context_args):
    # Block the SW so it can't serve stale shells between runs; PWA tests override this locally.
    return {**browser_context_args, "service_workers": "block"}


@pytest.fixture(scope="session")
def base_url():
    """Serves out/ under /wiki-fe/, matching the GitHub Pages subpath."""

    class Handler(SimpleHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(OUT_DIR), **kwargs)

        def translate_path(self, path):
            if path.startswith(BASE_PREFIX):
                path = path[len(BASE_PREFIX) :] or "/"
            return super().translate_path(path)

        def do_GET(self):
            # trailingSlash: true, so an extensionless path redirects to its directory index like Next does.
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

    yield f"http://localhost:{port}{BASE_PREFIX}"

    server.shutdown()
    server._pool.shutdown(wait=False)


@pytest.fixture
def wiki_page(page, base_url, disable_animations):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=10_000)
    return page


@pytest.fixture(scope="module")
def content_page(browser, base_url):
    """Read-only canary page opened once per module and reset to the top per test; mutating tests use `page`."""
    context = browser.new_context(service_workers="block")
    context.add_init_script(NO_ANIMATIONS_JS)
    pages = {}

    def open_canary(name):
        if name not in pages:
            page = context.new_page()
            response = page.goto(f"{base_url}/e2e-canary/{name}/", wait_until="domcontentloaded")
            if response is None or response.status != 200:
                pytest.fail(f"canary page {name!r} not served; rebuild with `pnpm build:e2e`")
            page.wait_for_selector("#markdown-body", timeout=10_000)
            page.wait_for_selector("html[data-hotkeys-ready]", state="attached", timeout=15_000)
            pages[name] = page
        page = pages[name]
        page.evaluate("() => { history.replaceState(null, '', location.pathname); scrollTo(0, 0); }")
        return page

    yield open_canary
    context.close()


@pytest.fixture
def open_settings(page):
    """Open the Preferences dialog on the current page and return its locator."""

    def _open():
        page.locator("[title='Preferences (,)']:visible").first.click()
        dialog = page.get_by_role("dialog", name="Preferences")
        dialog.wait_for()
        return dialog

    return _open


def _fulfill_json(body, status=200):
    payload = json.dumps(body)
    return lambda route: route.fulfill(status=status, content_type="application/json", body=payload)


@pytest.fixture
def logged_in(page):
    """Signed-in session before the first goto; tests can re-route an endpoint afterwards since the latest route wins."""

    def _login(role=None, synced=None):
        user = {"id": "1", "email": "a@example.com", **({"role": role} if role else {})}
        page.add_init_script("localStorage.setItem('wiki-session-token', 'test-token')")
        page.route("**/api/v1/auth/me", _fulfill_json({"user": user}))
        for domain, rows in {"bookmarks": [], "completions": [], "recents": [], **(synced or {})}.items():
            page.route(f"**/api/v1/{domain}", _fulfill_json(rows))

    return _login


@pytest.fixture
def seed_bookmarks(page):
    """Seeds wiki-bookmarks before boot, once per tab, so a reload doesn't re-add entries a test removed."""

    def _seed(*entries):
        page.add_init_script(
            "if (!sessionStorage.getItem('e2e-seeded-bookmarks')) {"
            f"localStorage.setItem('wiki-bookmarks', {json.dumps(json.dumps(list(entries)))});"
            "sessionStorage.setItem('e2e-seeded-bookmarks', '1');}"
        )

    return _seed
