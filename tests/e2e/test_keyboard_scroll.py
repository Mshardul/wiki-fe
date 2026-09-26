# Dropped: index-scroll persistence (wiki-index-scroll-* is orphaned, Next router owns scroll — confirmed during test_index_ux.py's sweep) and the TOC-click pulse (.toc-heading-pulse is dead CSS, Toc.tsx's onClick only scrollIntoView + history.replaceState, never toggles the class).


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def test_hotkey_b_toggles_bookmark(page, base_url):
    _go_to_article(page, base_url)
    before = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    page.keyboard.press("b")
    page.wait_for_function(
        "(before) => localStorage.getItem('wiki-bookmarks') !== before",
        arg=before,
        timeout=5_000,
    )
    assert "caching" in (page.evaluate("() => localStorage.getItem('wiki-bookmarks')") or "")

    page.keyboard.press("b")
    page.wait_for_function(
        "() => !(localStorage.getItem('wiki-bookmarks') || '').includes('caching')",
        timeout=5_000,
    )


def test_hotkey_comma_opens_preferences(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press(",")
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', timeout=5_000)


def test_hotkey_b_disabled_while_typing_in_search(page, base_url):
    _go_to_article(page, base_url)
    page.keyboard.press("Meta+k")
    page.wait_for_selector(".gsearch-input", timeout=5_000)
    page.focus(".gsearch-input")

    before = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    page.keyboard.press("b")
    page.wait_for_timeout(200)
    assert page.evaluate("() => localStorage.getItem('wiki-bookmarks')") == before
