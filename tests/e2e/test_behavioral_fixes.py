"""Clipboard-failure toast, toast queue, theme-event resilience, iOS install nudge."""

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


# ── Clipboard failure toast ──────────────────────────────────────


def test_copy_button_failure_shows_toast(page, base_url):
    _code_ready(page, base_url)
    _deny_clipboard(page)
    page.locator("#markdown-body pre .copy-btn").first.click()
    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)
    assert "Couldn't copy" in page.locator("#wiki-toast").inner_text()
    # An undefined surface token renders the toast transparent over article text.
    bg = page.locator("#wiki-toast").evaluate("el => getComputedStyle(el).backgroundColor")
    assert bg not in ("rgba(0, 0, 0, 0)", "transparent"), f"toast background must be opaque, got {bg}"


def test_successful_copy_does_not_show_toast(page, base_url):
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    _code_ready(page, base_url)
    btn = page.locator("#markdown-body pre .copy-btn").first
    btn.click()
    page.wait_for_function("(b) => b.classList.contains('copied')", arg=btn.element_handle(), timeout=3_000)
    assert page.locator("#wiki-toast.wiki-toast--error").count() == 0


# ── Mermaid debounce + viewport-aware ──────────────────────────────


def test_rapid_theme_changes_do_not_crash(page, base_url):
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
    assert wiki_page.locator("#wiki-toast.visible").count() == 0


def test_ios_install_nudge_dismiss_persists(browser, base_url):
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
