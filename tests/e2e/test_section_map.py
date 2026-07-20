"""
Section map overlay (WIKI-256):
- Shift+G opens/closes a zoomed-out node map of the current article's section
- Plain 'g' still opens the full link graph (no regression from WIKI-088)
- Escape closes the section map
- Clicking a node navigates and closes the overlay
"""


def _go_to_article(page, base_url, slug="system-design/caching"):
    page.goto(f"{base_url}/#{slug}", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


def test_shift_g_opens_section_map(page, base_url):
    """Shift+G opens the section map overlay from content view."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay.open", timeout=3_000)


def test_plain_g_still_opens_link_graph(page, base_url):
    """Plain 'g' (no shift) still opens the full link graph, unaffected by WIKI-256."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)
    assert "open" not in (page.locator("#section-map-overlay").get_attribute("class") or "")


def test_shift_g_toggles_section_map_closed(page, base_url):
    """Pressing Shift+G again while open closes the section map."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay.open", timeout=3_000)
    page.keyboard.press("Shift+G")
    page.wait_for_function(
        "() => !document.querySelector('#section-map-overlay').classList.contains('open')",
        timeout=2_000,
    )


def test_escape_closes_section_map(page, base_url):
    """Escape closes the section map overlay."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay.open", timeout=3_000)
    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => !document.querySelector('#section-map-overlay').classList.contains('open')",
        timeout=2_000,
    )


def test_section_map_renders_canvas_with_status(page, base_url):
    """Section map draws a canvas and shows the current section heading as status."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay.open", timeout=3_000)
    page.wait_for_function(
        "() => document.querySelector('#section-map-status').textContent.length > 0",
        timeout=5_000,
    )
    assert page.locator("#section-map-canvas").is_visible()


def test_topbar_button_toggles_section_map(page, base_url):
    """The overflow-menu 'Section map' button opens the overlay."""
    _go_to_article(page, base_url)
    # overflow-toggle is display:none above 900px (responsive.css) - only the
    # "more actions" trigger is hidden on desktop, items render inline instead.
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator('[data-action="overflow-toggle"]').click()
    page.locator('[data-action="section-map-toggle"]').click()
    page.wait_for_selector("#section-map-overlay.open", timeout=3_000)
