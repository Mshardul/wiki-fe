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
    page.wait_for_selector("#section-map-overlay:not(.hidden)", timeout=3_000)


def test_plain_g_still_opens_link_graph(page, base_url):
    """Plain 'g' (no shift) still opens the full link graph, unaffected by WIKI-256."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)
    assert "hidden" in (page.locator("#section-map-overlay").get_attribute("class") or "")


def test_shift_g_toggles_section_map_closed(page, base_url):
    """Pressing Shift+G again while open closes the section map."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay:not(.hidden)", timeout=3_000)
    page.keyboard.press("Shift+G")
    page.wait_for_function(
        "() => document.querySelector('#section-map-overlay').classList.contains('hidden')",
        timeout=2_000,
    )


def test_escape_closes_section_map(page, base_url):
    """Escape closes the section map overlay."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay:not(.hidden)", timeout=3_000)
    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => document.querySelector('#section-map-overlay').classList.contains('hidden')",
        timeout=2_000,
    )


def test_section_map_traps_focus(page, base_url):
    """616: section map overlay traps Tab focus like other modals."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay:not(.hidden)", timeout=3_000)

    page.evaluate("""() => {
        document.getElementById('section-map-search').focus();
    }""")
    page.keyboard.press("Tab")
    focused_outside = page.evaluate("""() => {
        const overlay = document.getElementById('section-map-overlay');
        return !overlay.contains(document.activeElement);
    }""")
    assert not focused_outside, "Focus trap missing on section map overlay"


def test_link_graph_traps_focus(page, base_url):
    """616: link graph modal traps Tab focus like other modals."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)

    page.evaluate("""() => {
        document.getElementById('link-graph-close').focus();
    }""")
    page.keyboard.press("Tab")
    focused_outside = page.evaluate("""() => {
        const modal = document.getElementById('link-graph-modal');
        return !modal.contains(document.activeElement);
    }""")
    assert not focused_outside, "Focus trap missing on link graph modal"


def test_section_map_renders_canvas_with_status(page, base_url):
    """Section map draws a canvas and shows the current section heading as status."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay:not(.hidden)", timeout=3_000)
    page.wait_for_function(
        "() => document.querySelector('#section-map-status').textContent.length > 0",
        timeout=5_000,
    )
    assert page.locator("#section-map-canvas").is_visible()


def test_section_map_search_locates_node(page, base_url):
    """Typing a matching title in the section-map search box locates that node."""
    _go_to_article(page, base_url)
    page.keyboard.press("Shift+G")
    page.wait_for_selector("#section-map-overlay:not(.hidden)", timeout=3_000)
    page.wait_for_function(
        "() => document.querySelector('#section-map-status').textContent.length > 0",
        timeout=5_000,
    )
    page.locator("#section-map-search").fill("a")
    page.wait_for_function(
        "() => (document.getElementById('section-map-canvas').dataset.locatedTitle || '').length > 0",
        timeout=3_000,
    )


def _open_actions_prefs(page):
    page.keyboard.press(",")
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator('[data-action="prefs-tab"][data-tab="actions"]').click()
    page.wait_for_function(
        "() => document.getElementById('prefs-panel-actions').getAttribute('aria-hidden') === 'false'"
    )


def test_topbar_button_toggles_section_map(page, base_url):
    """The Actions-tab 'Section map' row opens the overlay."""
    _go_to_article(page, base_url)
    _open_actions_prefs(page)
    page.locator('[data-action="section-map-toggle"]').click()
    page.wait_for_selector("#section-map-overlay:not(.hidden)", timeout=3_000)


def test_section_map_toast_when_unindexed(page, base_url):
    """Articles outside the index show a toast instead of silently no-oping."""
    page.goto(f"{base_url}/#changelog", wait_until="domcontentloaded")
    page.wait_for_selector("#view-changelog.active", timeout=10_000)
    page.keyboard.press("Shift+G")
    page.wait_for_selector(".wiki-toast.visible", timeout=3_000)
    assert "section map" in page.locator(".wiki-toast").inner_text().lower()
    assert page.locator("#section-map-overlay").evaluate(
        "el => el.classList.contains('hidden')"
    )
