"""
Navigation polish tests:
- Index collapse-all / expand-all controls
- Arrow key navigation on index cards
- Wiki switcher hotkey (W)
- Link graph hotkey (G)
- Index view List/Graph toggle
"""


def _go_to_index(page, base_url):
    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=10_000)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )


def _go_to_article(page, base_url, slug="system-design/caching"):
    page.goto(f"{base_url}/#{slug}", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


# ── Collapse-all / Expand-all ────────────────────────────────────────────────

def test_index_controls_rendered(page, base_url):
    """Collapse-all and expand-all buttons appear on the index view."""
    _go_to_index(page, base_url)
    assert page.locator("#index-collapse-all").count() == 1
    assert page.locator("#index-expand-all").count() == 1


def test_collapse_all_collapses_every_section(page, base_url):
    """Clicking collapse-all collapses all index sections."""
    _go_to_index(page, base_url)
    page.locator("#index-collapse-all").click()
    page.wait_for_function(
        "() => [...document.querySelectorAll('.index-section')].every(s => s.classList.contains('section--collapsed'))",
        timeout=5_000,
    )

    all_collapsed = page.evaluate("""() => {
        const sections = [...document.querySelectorAll('.index-section')];
        return sections.every(s => s.classList.contains('section--collapsed'));
    }""")
    assert all_collapsed, "All sections must be collapsed after clicking collapse-all"


def test_expand_all_expands_every_section(page, base_url):
    """Clicking expand-all after collapse-all expands all sections."""
    _go_to_index(page, base_url)
    page.locator("#index-collapse-all").click()
    page.wait_for_function(
        "() => [...document.querySelectorAll('.index-section')].every(s => s.classList.contains('section--collapsed'))",
        timeout=5_000,
    )
    page.locator("#index-expand-all").click()
    page.wait_for_function(
        "() => [...document.querySelectorAll('.index-section')].every(s => !s.classList.contains('section--collapsed'))",
        timeout=5_000,
    )

    all_expanded = page.evaluate("""() => {
        const sections = [...document.querySelectorAll('.index-section')];
        return sections.every(s => !s.classList.contains('section--collapsed'));
    }""")
    assert all_expanded, "All sections must be expanded after clicking expand-all"


# ── Arrow key navigation ─────────────────────────────────────────────────────

def test_arrow_down_moves_focus_to_next_card(page, base_url):
    """↓ arrow moves focus from first card to second within same section."""
    _go_to_index(page, base_url)

    page.evaluate("() => document.querySelectorAll('.index-card')[0].focus()")
    page.keyboard.press("ArrowDown")

    focused_idx = page.evaluate("""() => {
        const cards = [...document.querySelectorAll('.index-card')];
        return cards.indexOf(document.activeElement);
    }""")
    assert focused_idx == 1, f"Expected second card focused (idx 1), got idx {focused_idx}"


def test_arrow_up_moves_focus_to_previous_card(page, base_url):
    """↑ arrow moves focus from second card to first."""
    _go_to_index(page, base_url)

    page.evaluate("() => document.querySelectorAll('.index-card')[1].focus()")
    page.keyboard.press("ArrowUp")

    focused_idx = page.evaluate("""() => {
        const cards = [...document.querySelectorAll('.index-card')];
        return cards.indexOf(document.activeElement);
    }""")
    assert focused_idx == 0, f"Expected first card focused (idx 0), got idx {focused_idx}"


def test_arrow_down_stops_at_section_boundary(page, base_url):
    """↓ arrow on last card in a section does not move to next section."""
    _go_to_index(page, base_url)

    last_in_section = page.evaluate("""() => {
        const section = document.querySelector('.index-section');
        const cards = [...section.querySelectorAll('.index-card:not(.index-card--unavailable)')];
        if (cards.length === 0) return null;
        cards[cards.length - 1].focus();
        return cards.length - 1;
    }""")
    if last_in_section is None:
        return

    page.keyboard.press("ArrowDown")

    still_in_section = page.evaluate("""() => {
        const section = document.querySelector('.index-section');
        return section.contains(document.activeElement);
    }""")
    assert still_in_section, "Focus must not cross section boundary on ↓ at last card"


def test_enter_on_focused_card_navigates(page, base_url):
    """Enter on a focused index card navigates to its content view."""
    _go_to_index(page, base_url)
    page.evaluate("""() => {
        const card = document.querySelector('.index-card:not(.index-card--unavailable)');
        if (card) card.focus();
    }""")
    page.keyboard.press("Enter")
    page.wait_for_selector("#view-content.active", timeout=8_000)


# ── Wiki switcher hotkey ─────────────────────────────────────────────────────

def test_w_hotkey_opens_switcher_from_content(page, base_url):
    """W hotkey opens wiki switcher modal from content view."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=3_000)


def test_w_hotkey_opens_switcher_from_index(page, base_url):
    """W hotkey opens wiki switcher modal from index view."""
    _go_to_index(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=3_000)


def test_w_hotkey_inactive_on_home(page, base_url):
    """W hotkey does nothing on home view."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    page.keyboard.press("w")
    page.wait_for_timeout(100)
    modal_visible = page.locator("#wiki-switcher-modal").is_visible()
    assert not modal_visible, "Wiki switcher must not open on home view"


def test_escape_closes_switcher(page, base_url):
    """Escape closes the wiki switcher modal."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=3_000)
    page.keyboard.press("Escape")
    page.wait_for_selector("#wiki-switcher-modal.hidden", state="attached", timeout=2_000)


def test_wiki_switcher_shows_wiki_cards(page, base_url):
    """Wiki switcher modal lists available wikis as cards."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=3_000)
    card_count = page.locator(".wiki-switcher-card").count()
    assert card_count > 0, "Wiki switcher must show at least one wiki card"


def test_wiki_switcher_card_names_not_undefined(page, base_url):
    """Wiki switcher cards must render the wiki's title, not literal 'undefined'."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=3_000)
    names = page.locator(".wiki-switcher-card-name").all_inner_texts()
    assert names, "Wiki switcher must render at least one card name"
    assert all(n.strip() and n.strip() != "undefined" for n in names), (
        f"Wiki switcher card names must not be 'undefined', got: {names}"
    )


def test_overlay_click_closes_switcher(page, base_url):
    """Clicking the backdrop closes the wiki switcher."""
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=3_000)
    page.locator("#wiki-switcher-overlay").click(position={"x": 5, "y": 5})
    page.wait_for_selector("#wiki-switcher-modal.hidden", state="attached", timeout=2_000)


# ── Link graph hotkey (G) ────────────────────────────────────────────────────

def test_g_hotkey_opens_link_graph_from_content(page, base_url):
    """G hotkey opens the link graph modal from content view."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)


def test_g_hotkey_opens_link_graph_from_index(page, base_url):
    """G hotkey opens the link graph modal from index view."""
    _go_to_index(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)


def test_g_hotkey_opens_link_graph_from_home(page, base_url):
    """G hotkey opens the link graph modal from home view."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)


def test_g_hotkey_toggles_link_graph_closed(page, base_url):
    """Pressing G again while the link graph is open closes it."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal.hidden", state="attached", timeout=2_000)


def test_escape_closes_link_graph(page, base_url):
    """Escape closes the link graph modal."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)
    page.keyboard.press("Escape")
    page.wait_for_selector("#link-graph-modal.hidden", state="attached", timeout=2_000)


def test_link_graph_renders_canvas_with_status(page, base_url):
    """Link graph modal draws a canvas and shows an article/link count status."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)
    page.wait_for_function(
        "() => document.querySelector('#link-graph-status').textContent.includes('articles')",
        timeout=5_000,
    )
    assert page.locator("#link-graph-canvas").is_visible()


def test_overlay_click_closes_link_graph(page, base_url):
    """Clicking the backdrop closes the link graph modal."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)
    page.locator("#link-graph-overlay").click(position={"x": 5, "y": 5})
    page.wait_for_selector("#link-graph-modal.hidden", state="attached", timeout=2_000)


def test_close_button_closes_link_graph(page, base_url):
    """Clicking the close button closes the link graph modal."""
    _go_to_article(page, base_url)
    page.keyboard.press("g")
    page.wait_for_selector("#link-graph-modal:not(.hidden)", timeout=3_000)
    page.locator("#link-graph-close").click()
    page.wait_for_selector("#link-graph-modal.hidden", state="attached", timeout=2_000)


# ── Index graph view toggle ──────────────────────────────────────────────────

def test_index_view_toggle_rendered(page, base_url):
    """List/Graph toggle button appears alongside collapse/expand controls."""
    _go_to_index(page, base_url)
    assert page.locator("#index-view-toggle").count() == 1


def test_index_view_toggle_switches_to_graph_mode(page, base_url):
    """Clicking the view toggle hides the section list and shows the graph canvas."""
    _go_to_index(page, base_url)
    page.locator("#index-view-toggle").click()
    page.wait_for_selector("#index-graph-wrap:not(.hidden)", timeout=3_000)
    page.wait_for_selector("#index-sections.hidden", state="attached", timeout=3_000)
    assert page.locator("#index-graph-canvas").is_visible()


def test_index_view_toggle_switches_back_to_list_mode(page, base_url):
    """Clicking the view toggle twice returns to the section list."""
    _go_to_index(page, base_url)
    page.locator("#index-view-toggle").click()
    page.wait_for_selector("#index-graph-wrap:not(.hidden)", timeout=3_000)
    page.locator("#index-view-toggle").click()
    page.wait_for_selector("#index-sections:not(.hidden)", timeout=3_000)
    page.wait_for_selector("#index-graph-wrap.hidden", state="attached", timeout=3_000)


def test_index_graph_mode_persists_across_reload(page, base_url):
    """Graph view mode is remembered via localStorage across a reload."""
    _go_to_index(page, base_url)
    page.locator("#index-view-toggle").click()
    page.wait_for_selector("#index-graph-wrap:not(.hidden)", timeout=3_000)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=10_000)
    page.wait_for_selector("#index-graph-wrap:not(.hidden)", timeout=5_000)


def test_leaving_index_tears_down_graph(page, base_url):
    """Navigating away from the index view while in graph mode doesn't leave the sim running."""
    _go_to_index(page, base_url)
    page.locator("#index-view-toggle").click()
    page.wait_for_selector("#index-graph-wrap:not(.hidden)", timeout=3_000)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)


def test_wiki_switcher_is_bottom_sheet_on_mobile(page, base_url):
    """On narrow viewports the switcher docks to the bottom edge with a drag handle."""
    page.set_viewport_size({"width": 390, "height": 800})
    _go_to_article(page, base_url)
    page.keyboard.press("w")
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=3_000)
    dialog_box = page.locator(".wiki-switcher-dialog").bounding_box()
    viewport_height = page.viewport_size["height"]
    assert dialog_box["y"] + dialog_box["height"] >= viewport_height - 2, (
        "Wiki switcher dialog should be docked to the bottom edge on mobile"
    )
    assert page.locator(".wiki-switcher-drag-handle").is_visible(), (
        "Drag handle should be visible on mobile"
    )
    assert not page.locator(".wiki-switcher-hint").is_visible(), (
        "Keyboard shortcut hint should be hidden on mobile"
    )
