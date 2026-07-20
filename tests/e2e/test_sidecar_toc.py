"""
Sidecar TOC companion window (WIKI-284):
- Pop-out button opens toc-companion.html in a new window (large screens only)
- Companion window renders a synced clone of the main TOC via BroadcastChannel
- Clicking a heading in the companion scrolls the main window and highlights it back
"""


def _go_to_article(page, base_url, slug="system-design/caching"):
    page.goto(f"{base_url}/#{slug}", wait_until="domcontentloaded")
    page.set_viewport_size({"width": 1400, "height": 900})
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


def test_sidecar_button_visible_on_large_screen(page, base_url):
    """The pop-out TOC button is visible on a wide viewport."""
    _go_to_article(page, base_url)
    assert page.locator("#toc-sidecar-open").is_visible()


def test_sidecar_button_hidden_on_small_screen(page, base_url):
    """The pop-out TOC button is hidden below the large-screen breakpoint."""
    _go_to_article(page, base_url)
    page.set_viewport_size({"width": 700, "height": 900})
    assert not page.locator("#toc-sidecar-open").is_visible()


def test_opening_sidecar_opens_companion_window(page, base_url):
    """Clicking the pop-out button opens toc-companion.html in a new window."""
    _go_to_article(page, base_url)
    with page.context.expect_page() as popup_info:
        page.locator("#toc-sidecar-open").click()
    popup = popup_info.value
    popup.wait_for_load_state("domcontentloaded")
    assert "toc-companion.html" in popup.url
    popup.close()


def test_companion_window_receives_toc_content(page, base_url):
    """The companion window renders the same headings as the main TOC."""
    _go_to_article(page, base_url)
    main_items = page.locator("#toc-nav .toc-item").count()
    assert main_items > 0

    with page.context.expect_page() as popup_info:
        page.locator("#toc-sidecar-open").click()
    popup = popup_info.value
    popup.wait_for_selector("#toc-nav .toc-item", timeout=5_000)
    assert popup.locator("#toc-nav .toc-item").count() == main_items
    popup.close()


def test_clicking_companion_heading_scrolls_main_window(page, base_url):
    """Clicking a heading link in the companion window scrolls the main article."""
    _go_to_article(page, base_url)
    with page.context.expect_page() as popup_info:
        page.locator("#toc-sidecar-open").click()
    popup = popup_info.value
    popup.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    before = page.evaluate("() => window.scrollY")
    popup.locator("#toc-nav .toc-item").nth(-1).click()
    page.wait_for_function(
        "(before) => window.scrollY !== before",
        arg=before,
        timeout=5_000,
    )
    popup.close()
