"""
- Clipboard failure toast
- Scroll position persistence
- Hover preview improvements (abort, position clamp, metadata filter)
- Mermaid debounce + viewport-aware re-render
- Toast queue (FIFO, 200ms gap)
- parseIndexMd CRLF + malformed row guards
- Debug overlay via ?debug URL param
- Hotkey conflict detection
- localStorage key uniqueness
"""

import re
from pathlib import Path

import pytest

from conftest import _make_cdn_fulfill_handler

JS_DIR = Path(__file__).parent.parent.parent / "js"


def test_no_duplicate_hotkey_bindings():
    """No two key+modifier combos in app.js keydown handlers share the same binding."""
    src = (JS_DIR / "app.js").read_text()

    # Extract key bindings: e.key === "X" comparisons, classified by whether
    # their enclosing `if` line requires meta/ctrl, explicitly excludes it
    # (e.g. `!e.metaKey && !e.ctrlKey`), or says nothing either way - these
    # are three distinct binding spaces, not one, since e.g. plain "B" and
    # Cmd/Ctrl+B never fire on the same keypress.
    key_pattern = re.compile(r'e\.key\s*===\s*["\'](.+?)["\']')

    seen = {}
    conflicts = []
    for line_no, line in enumerate(src.splitlines(), start=1):
        keys = key_pattern.findall(line)
        if not keys:
            continue
        excludes_modifier = bool(re.search(r"!e\.(metaKey|ctrlKey)", line))
        requires_modifier = bool(
            re.search(r"(?<!!)e\.(metaKey|ctrlKey|shiftKey|altKey)", line)
        )
        if excludes_modifier:
            modifier = "no-meta-ctrl"
        elif requires_modifier:
            modifier = "meta-ctrl-or-other"
        else:
            modifier = "none"
        # dedupe within the line first - `e.key === "b" || e.key === "B"` is
        # one case-insensitive binding, not a self-conflict.
        for key in {k.lower() for k in keys}:
            combo = f"{modifier}+{key}"
            if combo in seen:
                conflicts.append(f"{combo} at lines {seen[combo]} and {line_no}")
            else:
                seen[combo] = line_no

    assert not conflicts, f"Duplicate hotkey bindings found:\n" + "\n".join(conflicts)


def test_localStorage_keys_are_unique():
    """All localStorage keys defined in js/storage/ are unique and article-scoped keys are wiki-prefixed."""
    src = "\n".join(p.read_text() for p in sorted((JS_DIR / "storage").glob("*.js")))

    # Extract string constant key names (e.g. "wiki-bookmarks", "wiki-recents", etc.)
    const_key_pattern = re.compile(r'const\s+\w+_KEY\w*\s*=\s*["\']([^"\']+)["\']')
    keys = const_key_pattern.findall(src)

    # All static keys must be unique
    seen = {}
    dupes = []
    for k in keys:
        if k in seen:
            dupes.append(k)
        seen[k] = True
    assert not dupes, f"Duplicate localStorage key constants: {dupes}"

    # Article-scoped key templates must include wiki id
    template_pattern = re.compile(r'`([^`]*localStorage[^`]*)`|localStorage\.[sg]etItem\(`([^`]+)`')
    for m in re.finditer(r'localStorage\.\w+\(`([^`]+)`', src):
        key_template = m.group(1)
        # If it contains a path variable it must also contain a wiki id variable
        if "${" in key_template and "path" in key_template.lower():
            assert "wikiId" in key_template or "wiki.id" in key_template or "currentWikiId" in key_template or "_wikiId" in key_template, (
                f"Article-scoped key missing wiki prefix: {key_template!r}"
            )


def _load_mock_article(page, base_url, content, slug="mock", extra_routes=None):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    if extra_routes:
        for pattern, handler in extra_routes:
            page.route(pattern, handler)
    page.route(f"**/{slug}.md", lambda r: r.fulfill(body=content))
    page.evaluate(
        f"""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/{slug}.md'),
        encodeURIComponent('{slug.capitalize()}'),
        '{slug}'
    )"""
    )
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


# ── In-content Table of Contents suppression ─────────────────────


def test_in_content_toc_section_does_not_render(page, base_url):
    """The hand-authored '## Table of Contents' section (for raw-file
    readers) must not render in the app - the app builds its own live TOC
    sidebar, so showing both is a duplicate nav."""
    content = (
        "# Mock Article\n\n"
        "## Prerequisites\n\n- [Array](./array.md)\n\n"
        "## Table of Contents\n\n"
        "- [Prerequisites](#prerequisites)\n"
        "- [Table of Contents](#table-of-contents)\n"
        "- [What it is](#what-it-is)\n\n"
        "## What it is\n\nSome real content here.\n"
    )
    _load_mock_article(page, base_url, content)

    heading_count = page.locator("#markdown-body h2:has-text('Table of Contents')").count()
    assert heading_count == 0, "In-content Table of Contents heading must not render"

    body_text = page.locator("#markdown-body").inner_text()
    assert "What it is" in body_text, "Content after the TOC section must still render"

    # The app's own live sidebar TOC must still build normally.
    sidebar_links = page.locator("#toc-nav a").count()
    assert sidebar_links > 0, "App's own sidebar TOC must still be built"


# ── Stub-article toolbar button sync ─────────────────────────────


def test_stub_article_syncs_bookmark_read_offline_buttons(page, base_url):
    """A stub (empty-body) article must still sync the bookmark/read/offline
    toolbar buttons - the stub branch returns early and used to skip them."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.evaluate(
        """() => localStorage.setItem('wiki-bookmarks', JSON.stringify([
        { wikiId: 'system-design', path: 'content/system-design/mock.md', title: 'Mock' }
    ]))"""
    )
    page.route("**/mock.md", lambda r: r.fulfill(body="# Mock\n"))
    page.evaluate(
        """() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/mock.md'),
        encodeURIComponent('Mock'),
        'mock'
    )"""
    )
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.wait_for_selector(".content-stub", timeout=5_000)

    is_active = page.evaluate(
        "() => document.getElementById('prefs-bookmark-toggle')?.classList.contains('active')"
    )
    assert is_active, "Bookmark toggle must reflect state even on a stub article"


# ── Clipboard failure toast ──────────────────────────────────────


def test_copy_button_failure_shows_toast(page, base_url):
    """denied clipboard on copy-btn click shows 'Copy failed' toast."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body pre .copy-btn", timeout=10_000)

    page.evaluate(
        """() => {
        navigator.clipboard.writeText = () =>
            Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }"""
    )
    page.locator("#markdown-body pre .copy-btn").first.click()

    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)
    assert "Copy failed" in page.locator("#wiki-toast").inner_text()


def test_anchor_copy_failure_shows_toast(page, base_url):
    """denied clipboard on anchor-btn click shows 'Copy failed' toast."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body .anchor-btn", timeout=10_000)

    page.evaluate(
        """() => {
        navigator.clipboard.writeText = () =>
            Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }"""
    )
    page.locator("#markdown-body .anchor-btn").first.click()

    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)
    assert "Copy failed" in page.locator("#wiki-toast").inner_text()


def test_successful_copy_does_not_show_toast(page, base_url):
    """successful clipboard write does not show error toast."""
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body pre .copy-btn", timeout=10_000)

    page.locator("#markdown-body pre .copy-btn").first.click()
    page.wait_for_timeout(200)

    toast_visible = page.evaluate(
        "() => document.getElementById('wiki-toast')?.classList.contains('visible') ?? false"
    )
    # Toast should not be visible (or if it is, should not say "Copy failed")
    if toast_visible:
        assert "Copy failed" not in page.locator("#wiki-toast").inner_text()


# ── Scroll restoration ────────────────────────────────────────────


def test_scroll_position_restored_after_navigation(page, base_url):
    """scroll position is saved on article revisit; since a heading exists
    above the saved position, the resume chip (WIKI-253) is offered instead
    of an automatic scroll, and clicking it restores the position."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )

    page.evaluate("() => window.scrollTo({ top: 600, behavior: 'instant' })")
    page.wait_for_function(
        "() => localStorage.getItem('scroll-' + window.state.currentWikiId + '-' + window.state.currentFilePath) !== null",
        timeout=5_000,
    )

    saved = page.evaluate(
        "() => localStorage.getItem('scroll-' + window.state.currentWikiId + '-' + window.state.currentFilePath)"
    )
    assert saved is not None, "Scroll position not saved to localStorage"
    assert int(saved) > 0, f"Saved scroll should be > 0 (got {saved})"

    # Full page reload to home avoids SPA render-race that resets scrollY
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)

    page.evaluate(
        """() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/components/caching.md'),
        encodeURIComponent('Caching'),
        'caching'
    )"""
    )
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )
    page.wait_for_selector("#resume-chip", timeout=3_000)
    page.click(".resume-chip-jump")
    page.wait_for_function("() => window.scrollY > 0", timeout=3_000)

    scroll_y = page.evaluate("() => window.scrollY")
    assert scroll_y > 0, f"Scroll not restored after clicking resume chip (scrollY={scroll_y})"


def test_scroll_position_stable_after_revisit(page, base_url):
    """scroll position is not reset on second visit to same article."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _load_mock_article(
        page,
        base_url,
        "# Mock\n\n" + "Paragraph text.\n\n" * 80,
        slug="scroll-stable",
    )
    page.evaluate("() => window.scrollTo(0, 400)")
    page.wait_for_function("() => window.scrollY > 0", timeout=3_000)

    scroll_y = page.evaluate("() => window.scrollY")
    assert scroll_y > 0, "Scroll should be non-zero after scrollTo"


# ── Hover preview improvements ────────────────────────────────────


def test_hover_preview_hidden_after_mouseleave_during_fetch(page, base_url):
    """mouseleave during slow summaries.json fetch hides preview; stale content not shown."""
    import json
    import threading

    ready = threading.Event()

    def slow_handler(route):
        ready.wait(timeout=2.0)
        route.fulfill(
            content_type="application/json",
            body=json.dumps(
                {"content/system-design/slow-link.md": "Stale content that must not appear."}
            ),
        )

    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.route("**/data/summaries.json", slow_handler)
    page.route("**/slow-link.md", lambda r: r.fulfill(body="# L\n\nBody."))
    page.route(
        "**/abort-host.md",
        lambda r: r.fulfill(body="# Host\n\n[Link](./slow-link.md)"),
    )
    page.evaluate(
        """() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/abort-host.md'),
        encodeURIComponent('Host'),
        'abort-host'
    )"""
    )
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.wait_for_selector("a:has-text('Link')", timeout=5_000)

    page.locator("a:has-text('Link')").dispatch_event("mouseenter")
    page.wait_for_selector("#hover-preview.visible", timeout=3_000)

    # Mouseleave before fetch resolves
    page.locator("a:has-text('Link')").dispatch_event("mouseleave")
    page.wait_for_function(
        "() => !document.getElementById('hover-preview').classList.contains('visible')",
        timeout=3_000,
    )

    # Now let the fetch complete
    ready.set()
    # Brief wait for any post-fetch render attempt to settle (no DOM signal available)
    page.wait_for_timeout(200)

    # Preview must remain hidden; stale content must not be shown
    is_visible = page.evaluate(
        "() => document.getElementById('hover-preview').classList.contains('visible')"
    )
    assert not is_visible, "Preview must stay hidden after mouseleave"

    text = page.evaluate("() => document.getElementById('hover-preview').innerText")
    assert "Stale content" not in (text or ""), (
        "Stale content must not appear after abort"
    )


def test_hover_preview_left_clamped_near_right_edge(page, base_url):
    """preview left is clamped to >= 8px when viewport is narrower than preview."""
    import json

    # 320px viewport is narrower than the 340px preview; clamping always fires
    page.set_viewport_size({"width": 320, "height": 800})
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)

    page.route(
        "**/data/summaries.json",
        lambda r: r.fulfill(
            content_type="application/json",
            body=json.dumps({"content/system-design/right-linked.md": "Content."}),
        ),
    )
    page.route(
        "**/right-host.md",
        lambda r: r.fulfill(body="# Host\n\n[Link](./right-linked.md)\n"),
    )
    page.evaluate(
        """() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/right-host.md'),
        encodeURIComponent('Host'),
        'right-host'
    )"""
    )
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.wait_for_selector("a:has-text('Link')", timeout=5_000)

    page.locator("a:has-text('Link')").dispatch_event("mouseenter")
    page.wait_for_selector("#hover-preview.visible", timeout=5_000)

    left = page.evaluate(
        "() => parseInt(document.getElementById('hover-preview').style.left)"
    )
    assert left >= 8, f"Preview left ({left}px) should be clamped to >= 8px"


# ── Mermaid debounce + viewport-aware ──────────────────────────────


def test_rapid_theme_changes_do_not_crash(page, base_url):
    """10 rapid theme changes via debounce do not throw errors."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )

    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))

    for _ in range(10):
        page.evaluate(
            "() => document.dispatchEvent(new CustomEvent('wiki:themechange', { detail: { theme: 'dark' } }))"
        )

    page.wait_for_timeout(200)

    assert not errors, f"Page errors after rapid theme changes: {errors}"
    assert page.locator("#view-content.active").count() == 1, (
        "View should still be active"
    )


# ── Toast queue ────────────────────────────────────────────────────


def test_toast_queue_no_crash_on_rapid_triggers(page, base_url):
    """multiple rapid clipboard failures do not crash; toast stays coherent."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre .copy-btn", timeout=10_000)

    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))

    page.evaluate("""() => {
        navigator.clipboard.writeText = () =>
            Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }""")

    btns = page.locator("#markdown-body pre .copy-btn")
    for i in range(min(btns.count(), 5)):
        btns.nth(i).click()

    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)

    # Toast text must be the expected message, not garbled from concurrent writes
    assert "Copy failed" in page.locator("#wiki-toast").inner_text()
    assert not errors, f"Page errors after rapid toasts: {errors}"


@pytest.mark.slow
def test_toast_queue_second_message_appears_after_first(page, base_url):
    """queued second toast appears after first expires; not dropped."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre .copy-btn", timeout=10_000)

    page.evaluate("""() => {
        navigator.clipboard.writeText = () =>
            Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }""")

    btns = page.locator("#markdown-body pre .copy-btn")
    if btns.count() < 2:
        return  # need at least 2 copy buttons to queue 2 toasts

    # Click 2 buttons rapidly - queues 2 "Copy failed" toasts (3000ms each)
    btns.nth(0).click()
    btns.nth(1).click()

    # First toast visible immediately
    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)

    # After first toast expires + 200ms gap, second toast must appear
    # Total window: 3000ms (first) + 200ms (gap) + 500ms (render buffer) = 3700ms
    page.wait_for_function(
        "() => document.getElementById('wiki-toast')?.classList.contains('visible')",
        timeout=4_500,
        polling=100,
    )
    assert "Copy failed" in page.locator("#wiki-toast").inner_text()


# ── parseIndexMd CRLF + malformed row guards ──────────────────────


def test_index_renders_with_crlf_line_endings(page, base_url):
    """wiki index with CRLF line endings renders article cards correctly."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    crlf_index = (
        "## Components\r\n"
        "\r\n"
        "| Title | Description |\r\n"
        "| --- | --- |\r\n"
        "| [Caching](./components/caching.md) | Caching fundamentals |\r\n"
        "| [Load Balancing](./components/load-balancing.md) | Load balancing |\r\n"
    )
    page.route("**/system-design/index.md", lambda r: r.fulfill(body=crlf_index))

    page.evaluate("() => navigate('system-design')")
    page.wait_for_selector("#view-index.active", timeout=8_000)

    cards = page.locator(".index-card")
    assert cards.count() > 0, "No index cards rendered from CRLF index.md"


def test_index_malformed_row_does_not_crash(page, base_url):
    """malformed link row in index.md is skipped; valid rows still render."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    index_with_bad_row = (
        "## Components\n"
        "\n"
        "| Title | Description |\n"
        "| --- | --- |\n"
        "| [Caching](./components/caching.md) | Valid card |\n"
        "| [Bad link without closing paren(./broken.md | Malformed |\n"
    )
    page.route(
        "**/system-design/index.md", lambda r: r.fulfill(body=index_with_bad_row)
    )

    page.evaluate("() => navigate('system-design')")
    page.wait_for_selector("#view-index.active", timeout=8_000)

    # Valid card must still render; malformed row must be silently skipped
    cards = page.locator(".index-card")
    assert cards.count() >= 1, "Valid card missing after malformed row in index"


# ── ?debug URL param dev info overlay ───────────────────────────────


def test_debug_overlay_appears_with_debug_param(page, base_url):
    """?debug param mounts the debug info overlay."""
    page.goto(f"{base_url}/?debug", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    overlay = page.locator("#debug-overlay")
    assert overlay.count() == 1, "#debug-overlay must be present when ?debug is in URL"
    assert overlay.is_visible(), "#debug-overlay must be visible"


def test_debug_overlay_absent_without_param(page, base_url):
    """debug overlay must not appear without ?debug param."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    assert page.locator("#debug-overlay").count() == 0, (
        "#debug-overlay must not exist without ?debug param"
    )


def test_debug_overlay_close_removes_it(page, base_url):
    """clicking the close button removes the debug overlay from DOM."""
    page.goto(f"{base_url}/?debug", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.locator(".debug-close").click()

    assert page.locator("#debug-overlay").count() == 0, (
        "#debug-overlay must be removed after close button click"
    )


_IOS_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)


def test_ios_install_nudge_shown_on_ios_ua(page, base_url, cdn_cache):
    """iOS Safari UA sees the manual Add-to-Home-Screen toast on boot."""
    ctx = page.context.browser.new_context(user_agent=_IOS_UA, service_workers="block")
    ios_page = ctx.new_page()
    for url, (body, content_type) in cdn_cache.items():
        ios_page.route(url, _make_cdn_fulfill_handler(body, content_type))
    ios_page.goto(base_url, wait_until="domcontentloaded")

    toast = ios_page.locator("#wiki-toast.visible")
    toast.wait_for(state="visible", timeout=8_000)
    assert "Add to Home Screen" in toast.text_content()
    ctx.close()


def test_ios_install_nudge_absent_on_desktop_ua(wiki_page):
    """Default (non-iOS) UA never sees the iOS Add-to-Home-Screen toast."""
    assert wiki_page.locator("#wiki-toast.visible").count() == 0


def test_ios_install_nudge_dismiss_persists(page, base_url, cdn_cache):
    """Dismissing the iOS nudge keeps it from reappearing on the next visit."""
    ctx = page.context.browser.new_context(user_agent=_IOS_UA, service_workers="block")
    ios_page = ctx.new_page()
    for url, (body, content_type) in cdn_cache.items():
        ios_page.route(url, _make_cdn_fulfill_handler(body, content_type))
    ios_page.goto(base_url, wait_until="domcontentloaded")

    ios_page.locator("#wiki-toast .toast-undo-btn").click()
    ios_page.wait_for_function("() => !document.getElementById('wiki-toast').classList.contains('visible')")

    ios_page.reload(wait_until="domcontentloaded")
    ios_page.wait_for_selector("#view-home.active", timeout=8_000)
    assert ios_page.locator("#wiki-toast.visible").count() == 0, (
        "iOS nudge must not reappear after being dismissed once"
    )
    ctx.close()


def _open_prefs(page):
    page.locator("#view-content [title='Preferences (,)']").click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator("[data-action='prefs-tab'][data-tab='advanced']").click()
    page.wait_for_selector("#prefs-panel-advanced.active")


def test_focus_toggle_visible_on_desktop(page, base_url):
    """focus-toggle button is visible on desktop."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    _open_prefs(page)
    assert page.locator("[data-action='focus-toggle']").first.is_visible()


def test_offline_toggle_visible_on_desktop(page, base_url):
    """offline-toggle button (in prefs modal) is visible and only one instance exists."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    _open_prefs(page)
    toggles = page.locator("[data-action='offline-toggle']")
    assert toggles.count() == 1
    assert toggles.first.is_visible()
