"""Clipboard-failure toast, toast queue, theme-event resilience, iOS install nudge, mock-article regressions."""

import pytest

# Dropped: js/ source-scan tests (hotkey dupes, storage-key uniqueness) - lib/hotkeys.ts + lib/storage/keys.ts replace them, covered by vitest.
# Dropped: anchor-btn copy toast - headings use build-time autolinks now, no copy-on-click anchor button.
# Dropped: scroll restore via resume chip - duplicated by test_scroll_toc.py.
# Dropped: toast ordering (second-after-first, priority overtake) - lib/toast.test.ts owns queue semantics.
# Dropped: index.md CRLF / malformed-row parsing - vertical index is rendered at build time, no runtime parse.
# Dropped: ?debug overlay (spec §9), prefs focus/offline toggles (not ported), sprite fetch-failure toast (sprite is inlined at build).

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _code_ready(page, base_url, slug=SLUG):
    _article(page, base_url, slug)
    # CodeCopy injects the icon on mount, so its presence means the click handler is wired.
    page.wait_for_selector("#markdown-body pre .copy-btn svg", timeout=10_000)


def _deny_clipboard(page):
    page.evaluate(
        """() => {
        navigator.clipboard.writeText = () =>
            Promise.reject(new DOMException("blocked", "NotAllowedError"));
    }"""
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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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
    """Denied clipboard on copy-btn click shows the copy-failed toast."""
    _code_ready(page, base_url)
    _deny_clipboard(page)
    page.locator("#markdown-body pre .copy-btn").first.click()
    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)
    assert "Couldn't copy" in page.locator("#wiki-toast").inner_text()


def test_successful_copy_does_not_show_toast(page, base_url):
    """Successful clipboard write shows no error toast."""
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    _code_ready(page, base_url)
    btn = page.locator("#markdown-body pre .copy-btn").first
    btn.click()
    page.wait_for_function("(b) => b.classList.contains('copied')", arg=btn.element_handle(), timeout=3_000)
    assert page.locator("#wiki-toast.wiki-toast--error").count() == 0


# ── Scroll restoration ────────────────────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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
    """Ten rapid theme-change events do not throw."""
    _article(page, base_url)
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    for _ in range(10):
        page.evaluate(
            "() => document.dispatchEvent(new CustomEvent('wiki:theme-changed', { detail: { theme: 'dark' } }))"
        )
    page.wait_for_timeout(200)
    assert not errors, f"Page errors after rapid theme changes: {errors}"
    assert page.locator("#markdown-body").count() == 1


# ── Toast queue ────────────────────────────────────────────────────


def test_toast_queue_no_crash_on_rapid_triggers(page, base_url):
    """Rapid clipboard failures do not crash; toast text stays coherent."""
    _code_ready(page, base_url)
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    _deny_clipboard(page)
    btns = page.locator("#markdown-body pre .copy-btn")
    for i in range(min(btns.count(), 5)):
        btns.nth(i).click()
    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)
    assert "Couldn't copy" in page.locator("#wiki-toast").inner_text()
    assert not errors, f"Page errors after rapid toasts: {errors}"


# ── iOS install nudge ─────────────────────────────────────────────


_IOS_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
)


def test_ios_install_nudge_shown_on_ios_ua(browser, base_url):
    """iOS Safari UA sees the manual Add-to-Home-Screen toast on boot."""
    ctx = browser.new_context(user_agent=_IOS_UA, service_workers="block")
    ios_page = ctx.new_page()
    try:
        ios_page.goto(f"{base_url}/", wait_until="domcontentloaded")
        toast = ios_page.locator("#wiki-toast.visible")
        toast.wait_for(state="visible", timeout=8_000)
        assert "Add to Home Screen" in toast.text_content()
    finally:
        ctx.close()


def test_ios_install_nudge_absent_on_desktop_ua(wiki_page):
    """Default (non-iOS) UA never sees the iOS Add-to-Home-Screen toast."""
    assert wiki_page.locator("#wiki-toast.visible").count() == 0


def test_ios_install_nudge_dismiss_persists(browser, base_url):
    """Dismissing the iOS nudge keeps it from reappearing on the next visit."""
    ctx = browser.new_context(user_agent=_IOS_UA, service_workers="block")
    ios_page = ctx.new_page()
    try:
        ios_page.goto(f"{base_url}/", wait_until="domcontentloaded")
        ios_page.locator("#wiki-toast .toast-undo-btn").click()
        ios_page.wait_for_selector("#wiki-toast", state="detached", timeout=3_000)
        ios_page.reload(wait_until="domcontentloaded")
        ios_page.wait_for_selector(".home-main .wiki-card", timeout=10_000)
        # IosNudge fires from a mount effect; give it the same window the first visit needed.
        ios_page.wait_for_timeout(500)
        assert ios_page.locator("#wiki-toast.visible").count() == 0
    finally:
        ctx.close()
