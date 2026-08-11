"""
- Index cards must not be clickable before stub detection completes.
- Index section headers collapse/expand card grids; state persists in localStorage.
- Unavailable cards have tooltip title and allow pointer events.
- Section collapse uses a JS-measured height transition, not display:none.
- DSA index Learning Paths cards show an N/M completed progress badge.
"""

import pytest


def _go_to_index(page, base_url):
    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=20_000)


def _go_to_dsa_index(page, base_url):
    page.goto(f"{base_url}/#dsa", wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=20_000)


# ── Scroll position on fresh index visit ─────────────────────────────


def test_index_view_resets_scroll_when_no_saved_position(page, base_url):
    """Regression: view-index is exempt from the router's generic scroll
    reset (it restores a saved position after content loads), but a fresh
    visit with nothing saved for that wiki used to leave the previous view's
    scroll position on screen until content finished loading."""
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.evaluate("() => window.scrollTo({ top: 1000, behavior: 'instant' })")
    page.wait_for_function("() => window.scrollY > 500")

    page.evaluate("() => localStorage.removeItem('wiki-index-scroll-dsa')")
    page.evaluate("() => window.navigate('dsa')")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    scroll_y = page.evaluate("() => window.scrollY")
    assert scroll_y < 50, (
        f"Index view must reset scroll immediately when no position is saved, got scrollY={scroll_y}"
    )


# ── Stub card click guard ───────────────────────────────────────────


def test_cards_not_clickable_while_loading(page, base_url):
    """Cards must have pointer-events:none while index-sections--loading class is present."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    # Verify CSS rule: manually add loading class and check computed style of a card
    result = page.evaluate("""() => {
        const el = document.getElementById('index-sections');
        if (!el) return false;
        el.classList.add('index-sections--loading');
        const card = el.querySelector('.index-card');
        if (!card) return false;
        const pe = window.getComputedStyle(card).pointerEvents;
        el.classList.remove('index-sections--loading');
        return pe === 'none';
    }""")
    assert result is True, (
        "Cards must have pointer-events:none when index-sections--loading is present"
    )


def test_cards_clickable_after_load(page, base_url):
    """After populateIndexReadTimes completes, loading class must be gone."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    has_loading = page.evaluate("""() =>
        document.getElementById('index-sections')?.classList.contains('index-sections--loading')
    """)
    assert has_loading is False


# ── Collapsible index sections ──────────────────────────────────────


def test_section_collapses_on_header_click(page, base_url):
    """Clicking a section header collapses the card grid via a height transition."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    page.locator(".section-header").first.click()

    # Collapse uses height:0 (not display:none), so is_hidden() is unreliable.
    # Wait until computed height reaches 0px (transition complete).
    page.wait_for_function(
        """() => {
            const section = document.querySelector('.index-section.section--collapsed');
            if (!section) return false;
            const grid = section.querySelector('.index-card-grid');
            return grid && window.getComputedStyle(grid).height === '0px';
        }""",
        timeout=3_000,
    )


def test_section_expands_on_second_click(page, base_url):
    """Clicking a collapsed section header expands it again."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    header = page.locator(".section-header").first
    header.click()  # collapse
    header.click()  # expand

    first_section = page.locator(".index-section").first
    grid = first_section.locator(".index-card-grid")
    grid.wait_for(state="visible")


def test_section_collapse_persists_in_localstorage(page, base_url):
    """Collapsing a section saves its state to localStorage."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    heading = page.locator(".section-title").first.inner_text()
    page.locator(".section-header").first.click()

    key = f"wiki-section-collapsed-system-design-{heading}"
    value = page.evaluate(f"() => localStorage.getItem({repr(key)})")
    assert value == "1", f"localStorage[{key!r}] must be '1' after collapse"


def test_section_collapse_restored_on_revisit(page, base_url):
    """Collapsed state is restored when returning to the index view."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    page.locator(".section-header").first.click()  # collapse

    # Navigate away then back
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    is_collapsed = page.locator(".index-section").first.evaluate(
        "el => el.classList.contains('section--collapsed')"
    )
    assert is_collapsed, "Section must remain collapsed after navigating away and back"


# ── Unavailable card grayscale ──────────────────────────────────────


@pytest.mark.flaky(reruns=2, reruns_delay=1)
def test_unavailable_card_has_grayscale_filter(page, base_url):
    """Cards with .index-card--unavailable must have filter: grayscale(1)."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=25_000
    )

    result = page.evaluate("""() => {
        const card = document.querySelector('.index-card');
        if (!card) return null;
        card.classList.add('index-card--unavailable');
        const f = window.getComputedStyle(card).filter;
        card.classList.remove('index-card--unavailable');
        return f;
    }""")
    assert result is not None, "No .index-card found on page"
    assert "grayscale" in result, (
        f"Expected grayscale filter on .index-card--unavailable, got: {result!r}"
    )


# ── Unavailable card tooltip ───────────────────────────────────────


@pytest.mark.flaky(reruns=2, reruns_delay=1)
def test_unavailable_card_allows_pointer_events(page, base_url):
    """unavailable cards must not have pointer-events:none so tooltip is reachable."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=25_000
    )

    result = page.evaluate("""() => {
        const card = document.querySelector('.index-card');
        if (!card) return null;
        card.classList.add('index-card--unavailable');
        const pe = window.getComputedStyle(card).pointerEvents;
        card.classList.remove('index-card--unavailable');
        return pe;
    }""")
    assert result is not None, "No .index-card found on page"
    assert result != "none", (
        f"Unavailable cards must allow pointer events for tooltip hover, got: {result!r}"
    )


def test_unavailable_card_has_tooltip_title(page, base_url):
    """real unavailable (stub) cards have a 'Coming soon' title attribute."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    result = page.evaluate("""() => {
        const card = document.querySelector('.index-card--unavailable');
        if (!card) return 'no-stubs';
        return card.getAttribute('title') || '';
    }""")

    if result == "no-stubs":
        return  # no stub cards in this wiki; test is vacuously satisfied

    assert "Coming soon" in result, (
        f"Unavailable card title must contain 'Coming soon', got: {result!r}"
    )


# ── Section collapse animation ────────────────────────────────────


def test_section_grid_has_css_transition(page, base_url):
    """index-card-grid has a CSS transition property set (height animation)."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    transition = page.evaluate("""() => {
        const grid = document.querySelector('.index-card-grid');
        return grid ? window.getComputedStyle(grid).transition : null;
    }""")
    assert transition, "index-card-grid must have a CSS transition"
    assert "height" in transition, (
        f"Transition must include height for smooth collapse, got: '{transition}'"
    )


def test_collapsed_grid_not_display_none(page, base_url):
    """Collapsed section grid uses height:0, not display:none."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    page.locator(".section-header").first.click()

    # Poll until the JS-measured height transition has settled - a fixed wait
    # flakes when the machine is under load and the transition runs long.
    page.wait_for_function(
        """() => {
            const grid = document.querySelector('.index-section.section--collapsed .index-card-grid');
            if (!grid) return false;
            return window.getComputedStyle(grid).height === '0px';
        }""",
        timeout=5_000,
    )

    result = page.evaluate("""() => {
        const grid = document.querySelector('.index-section.section--collapsed .index-card-grid');
        const style = window.getComputedStyle(grid);
        return { display: style.display, height: style.height };
    }""")
    assert result["display"] != "none", (
        "Collapsed grid must not use display:none - must use height transition"
    )
    assert result["height"] == "0px", (
        f"Collapsed grid height must be 0px, got '{result['height']}'"
    )


def test_expanded_grid_height_cleared_after_transition(page, base_url):
    """After expanding, inline height style is cleared so content isn't clipped by a stale value."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    header = page.locator(".section-header").first
    header.click()  # collapse
    header.click()  # expand

    page.wait_for_function(
        """() => {
            const grid = document.querySelector('.index-card-grid');
            return grid && grid.style.height === '';
        }""",
        timeout=5_000,
    )


# ── Inline index filter ──────────────────────────────────────────────


def _visible_card_count(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('#index-sections .index-card')]
              .filter(c => !c.classList.contains('index-card--filtered')).length"""
    )


@pytest.mark.flaky(reruns=2, reruns_delay=1)
def test_filter_input_narrows_cards(page, base_url):
    """Typing in the filter input hides cards whose title/desc don't match."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=25_000
    )

    total = _visible_card_count(page)
    assert total > 0

    page.fill("#index-filter-input", "zzzznotarealarticle")
    page.wait_for_function(
        "() => [...document.querySelectorAll('#index-sections .index-card')].every(c => c.classList.contains('index-card--filtered'))",
        timeout=5_000,
    )
    assert _visible_card_count(page) == 0, (
        "A non-matching query must hide every card"
    )


def test_filter_clears_restores_cards(page, base_url):
    """Clearing the filter input restores all cards."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    total = _visible_card_count(page)

    page.fill("#index-filter-input", "zzzznotarealarticle")
    page.wait_for_function(
        "() => [...document.querySelectorAll('#index-sections .index-card')].every(c => c.classList.contains('index-card--filtered'))",
        timeout=5_000,
    )
    assert _visible_card_count(page) == 0

    page.fill("#index-filter-input", "")
    page.wait_for_function(
        f"() => [...document.querySelectorAll('#index-sections .index-card')].filter(c => !c.classList.contains('index-card--filtered')).length === {total}",
        timeout=5_000,
    )
    assert _visible_card_count(page) == total, (
        "Clearing the filter must restore all cards"
    )


def test_empty_section_hidden_when_no_matches(page, base_url):
    """Sections with no matching cards get .index-section--no-matches."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    page.fill("#index-filter-input", "zzzznotarealarticle")
    page.wait_for_function(
        "() => document.querySelector('.index-section.index-section--no-matches') !== null",
        timeout=5_000,
    )

    sections = page.locator(".index-section").count()
    no_match = page.locator(".index-section.index-section--no-matches").count()
    assert no_match == sections, (
        "Every section must be marked no-matches when nothing matches"
    )


def test_unread_toggle_filters_read_cards(page, base_url):
    """Activating 'Unread only' hides cards already marked read."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    # Seed first card's path into the read-tracking store -> re-render index for read dot
    seeded = page.evaluate(
        """() => {
            const badge = document.querySelector(
                '.index-card:not(.index-card--unavailable) .index-card-read-time[data-path]'
            );
            if (!badge) return null;
            const path = badge.dataset.path.replace(/^\\.\\//, '');
            const key = 'wiki-read-system-design';
            const cur = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cur.includes(path)) cur.push(path);
            localStorage.setItem(key, JSON.stringify(cur));
            return path;
        }"""
    )
    assert seeded, "Expected at least one available card to seed as read"

    # Reload so isRead() picks up the seeded value on render.
    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    page.wait_for_selector(".index-card-read-dot.visible", timeout=8_000)

    select = page.locator("#index-filter-read-select")
    select.select_option("unread")
    page.wait_for_function(
        "() => document.getElementById('index-filter-read-select').value === 'unread'",
        timeout=3_000,
    )
    # No visible card may contain a visible read-dot.
    leaked = page.evaluate(
        """() => [...document.querySelectorAll('#index-sections .index-card')]
              .filter(c => !c.classList.contains('index-card--filtered'))
              .filter(c => c.querySelector('.index-card-read-dot.visible')).length"""
    )
    assert leaked == 0, "Unread-only filter must hide cards marked read"


def test_read_only_filter_hides_unread_cards(page, base_url):
    """Selecting 'Read only' hides cards that are not marked read."""
    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    seeded = page.evaluate(
        """() => {
            const badge = document.querySelector(
                '.index-card:not(.index-card--unavailable) .index-card-read-time[data-path]'
            );
            if (!badge) return null;
            const path = badge.dataset.path.replace(/^\\.\\//, '');
            const key = 'wiki-read-system-design';
            const cur = JSON.parse(localStorage.getItem(key) || '[]');
            if (!cur.includes(path)) cur.push(path);
            localStorage.setItem(key, JSON.stringify(cur));
            return path;
        }"""
    )
    assert seeded, "Expected at least one available card to seed as read"

    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    page.wait_for_selector(".index-card-read-dot.visible", timeout=8_000)

    select = page.locator("#index-filter-read-select")
    select.select_option("read")
    page.wait_for_function(
        "() => document.getElementById('index-filter-read-select').value === 'read'",
        timeout=3_000,
    )
    # Every visible card must have a visible read-dot.
    unread_visible = page.evaluate(
        """() => [...document.querySelectorAll('#index-sections .index-card')]
              .filter(c => !c.classList.contains('index-card--filtered'))
              .filter(c => !c.querySelector('.index-card-read-dot.visible')).length"""
    )
    assert unread_visible == 0, "Read-only filter must hide cards not marked read"


def test_index_ctrl_and_filter_44px_on_coarse_pointer(browser, base_url, cdn_cache):
    """Regression for WIKI-406: .index-ctrl-btn and .index-filter-input are
    under 44px on touch devices with no pointer:coarse fallback."""
    ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 768, "height": 1024},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        def _make_handler(body, content_type):
            return lambda route: route.fulfill(
                status=200, content_type=content_type, body=body
            )

        for url, (body, content_type) in cdn_cache.items():
            page.route(url, _make_handler(body, content_type))

        _go_to_index(page, base_url)
        page.wait_for_selector(".index-ctrl-btn", timeout=10_000)

        sizes = page.evaluate("""() => {
            const ctrl = document.querySelector('.index-ctrl-btn').getBoundingClientRect();
            const filterInput = document.getElementById('index-filter-input').getBoundingClientRect();
            return { ctrlHeight: ctrl.height, filterHeight: filterInput.height };
        }""")
        assert sizes["ctrlHeight"] >= 44, f"index-ctrl-btn height too small: {sizes['ctrlHeight']}px"
        assert sizes["filterHeight"] >= 44, f"index-filter-input height too small: {sizes['filterHeight']}px"
    finally:
        ctx.close()


# ── "Changed since you last read" index dot ──────────────────────────

_CACHING_ROUTE_GLOB = "**/content/system-design/components/caching.md"
# Index cards render data-path from the search-index entry, which is "./"-prefixed - use this to match DOM/data-path.
_CACHING_PATH = "./content/system-design/components/caching.md"
# getLastOpened()/isRead() key off the normalized (no "./") shape - use this when seeding localStorage directly.
_CACHING_PATH_NORMALIZED = "content/system-design/components/caching.md"
_CACHING_KEY = "wiki-read-dates-system-design"


def _mock_caching_article(page, updated_date):
    # Body must be >= STUB_THRESHOLD (state.js, 5000 bytes) or home-index.js
    # marks the card a stub, strips its .index-card-updated-dot entirely,
    # and any wait for that element hangs forever.
    padding = "Filler paragraph text to clear the stub-detection length threshold. " * 80
    body = f"---\nupdated: {updated_date}\n---\n# Caching\n\n{padding}\n"
    page.route(
        _CACHING_ROUTE_GLOB,
        lambda r: r.fulfill(status=200, content_type="text/markdown", body=body),
    )


def _seed_last_opened(page, iso_date):
    page.evaluate(
        f"""() => {{
            const map = {{}};
            map[{_CACHING_PATH_NORMALIZED!r}] = {iso_date!r};
            localStorage.setItem({_CACHING_KEY!r}, JSON.stringify(map));
        }}"""
    )


def _caching_card(page):
    return page.locator(f'.index-card:has(.index-card-read-time[data-path="{_CACHING_PATH}"])')


def test_updated_dot_shown_when_newer_than_last_opened(page, base_url):
    """Dot appears when the article's updated: date is newer than the recorded last-opened date."""
    _mock_caching_article(page, "2026-06-01")
    # localStorage needs a real origin - page starts at about:blank.
    page.goto(base_url, wait_until="domcontentloaded")
    _seed_last_opened(page, "2025-01-01T00:00:00.000Z")

    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    dot = _caching_card(page).locator(".index-card-updated-dot")
    dot.wait_for(state="attached")
    page.wait_for_function(
        f"""() => {{
            const card = [...document.querySelectorAll('.index-card')]
                .find(c => c.querySelector('.index-card-read-time[data-path="{_CACHING_PATH}"]'));
            return !!card?.querySelector('.index-card-updated-dot.visible');
        }}""",
        timeout=10_000,
    )


def test_updated_dot_hidden_when_never_opened(page, base_url):
    """No last-opened baseline means no dot, even if the article has an updated: date."""
    _mock_caching_article(page, "2026-06-01")
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate(f"() => localStorage.removeItem({_CACHING_KEY!r})")

    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    page.wait_for_function(
        f"""() => {{
            const card = [...document.querySelectorAll('.index-card')]
                .find(c => c.querySelector('.index-card-read-time[data-path="{_CACHING_PATH}"]'));
            return card && card.querySelector('.index-card-read-time').textContent !== '…';
        }}""",
        timeout=10_000,
    )

    dot = _caching_card(page).locator(".index-card-updated-dot")
    assert "visible" not in (dot.get_attribute("class") or ""), (
        "updated-dot must not show without a recorded last-opened date"
    )


def test_updated_dot_hidden_when_up_to_date(page, base_url):
    """No dot when the recorded last-opened date is at or after the article's updated: date."""
    _mock_caching_article(page, "2025-01-01")
    page.goto(base_url, wait_until="domcontentloaded")
    _seed_last_opened(page, "2026-06-01T00:00:00.000Z")

    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    page.wait_for_function(
        f"""() => {{
            const card = [...document.querySelectorAll('.index-card')]
                .find(c => c.querySelector('.index-card-read-time[data-path="{_CACHING_PATH}"]'));
            return card && card.querySelector('.index-card-read-time').textContent !== '…';
        }}""",
        timeout=10_000,
    )

    dot = _caching_card(page).locator(".index-card-updated-dot")
    assert "visible" not in (dot.get_attribute("class") or ""), (
        "updated-dot must not show when the reader is already up to date"
    )


def test_last_opened_date_recorded_on_article_visit(page, base_url):
    """Visiting an article records a last-opened timestamp for it, per wiki."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)

    # recordOpened() (content-view.js) keys this map on normalizePath()'s
    # output, which strips a leading "./" - unlike the search-index-sourced
    # card.path used by the updated-dot tests above (_CACHING_PATH), which
    # keeps it. Same article, two different key formats in this app.
    recorded = page.evaluate(
        f"""() => {{
            const map = JSON.parse(localStorage.getItem({_CACHING_KEY!r}) || '{{}}');
            return map["content/system-design/components/caching.md"] || null;
        }}"""
    )
    assert recorded is not None, "last-opened date must be recorded after visiting the article"
    # Recorded value must be a real, parseable ISO timestamp - not a truthy placeholder.
    parsed = page.evaluate(f"() => !Number.isNaN(new Date({recorded!r}).getTime())")
    assert parsed, f"recorded last-opened value is not a valid date: {recorded!r}"


# ── Stale-knowledge fade on index cards ───────────────────────────────

_READ_SET_KEY = "wiki-read-system-design"


def _mark_caching_read(page):
    page.evaluate(
        f"""() => {{
            const cur = JSON.parse(localStorage.getItem({_READ_SET_KEY!r}) || '[]');
            if (!cur.includes({_CACHING_PATH_NORMALIZED!r})) cur.push({_CACHING_PATH_NORMALIZED!r});
            localStorage.setItem({_READ_SET_KEY!r}, JSON.stringify(cur));
        }}"""
    )


def _card_fade(page):
    return page.evaluate(
        f"""() => {{
            const card = [...document.querySelectorAll('.index-card')]
                .find(c => c.querySelector('.index-card-read-time[data-path="{_CACHING_PATH}"]'));
            return card ? card.style.getPropertyValue('--fade') : null;
        }}"""
    )


def _wait_for_read_time_loaded(page):
    page.wait_for_function(
        f"""() => {{
            const card = [...document.querySelectorAll('.index-card')]
                .find(c => c.querySelector('.index-card-read-time[data-path="{_CACHING_PATH}"]'));
            return card && card.querySelector('.index-card-read-time').textContent !== '…';
        }}""",
        timeout=10_000,
    )


def test_recently_read_card_has_no_or_full_fade(page, base_url):
    """A card read moments ago gets --fade at/near 1, or no --fade set at all."""
    _mock_caching_article(page, "2020-01-01")
    page.goto(base_url, wait_until="domcontentloaded")
    _mark_caching_read(page)
    # _seed_last_opened takes a literal ISO string, so stamp "now" directly via JS.
    page.evaluate(
        f"""() => {{
            const map = {{}};
            map[{_CACHING_PATH!r}] = new Date().toISOString();
            localStorage.setItem({_CACHING_KEY!r}, JSON.stringify(map));
        }}"""
    )

    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    _wait_for_read_time_loaded(page)

    fade = _card_fade(page)
    if fade in (None, ""):
        return  # no fade applied at all is an acceptable "fresh" representation
    assert float(fade) >= 0.95, f"Recently-read card should be near-full fade, got {fade!r}"


def test_long_ago_read_card_has_reduced_fade(page, base_url):
    """A card read long ago gets a visibly reduced --fade value."""
    _mock_caching_article(page, "2020-01-01")
    page.goto(base_url, wait_until="domcontentloaded")
    _mark_caching_read(page)
    _seed_last_opened(page, "2020-01-01T00:00:00.000Z")

    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    _wait_for_read_time_loaded(page)

    fade = _card_fade(page)
    assert fade not in (None, ""), "Long-ago-read card must have a --fade value set"
    assert float(fade) < 0.9, f"Long-ago-read card should be visibly faded, got {fade!r}"


def test_fade_never_drops_below_floor(page, base_url):
    """Even a very old read date is clamped to the fade floor, never fully desaturated."""
    _mock_caching_article(page, "2020-01-01")
    page.goto(base_url, wait_until="domcontentloaded")
    _mark_caching_read(page)
    _seed_last_opened(page, "2000-01-01T00:00:00.000Z")

    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    _wait_for_read_time_loaded(page)

    fade = _card_fade(page)
    assert fade not in (None, ""), "Very-old-read card must have a --fade value set"
    fade_val = float(fade)
    assert fade_val > 0, "Fade floor must be above 0 so cards never fully vanish"
    assert fade_val >= 0.3, f"Fade floor seems too low ({fade_val}), cards should stay legible"


def test_unread_card_has_no_fade(page, base_url):
    """A never-opened card gets no --fade applied - fade is only for read articles."""
    _mock_caching_article(page, "2020-01-01")
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate(f"() => localStorage.removeItem({_CACHING_KEY!r})")
    page.evaluate(f"() => localStorage.removeItem({_READ_SET_KEY!r})")

    _go_to_index(page, base_url)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    _wait_for_read_time_loaded(page)

    fade = _card_fade(page)
    assert fade in (None, ""), f"Unread card must not have --fade set, got {fade!r}"


def test_swipe_hint_visible_on_coarse_pointer_only(browser, base_url, cdn_cache):
    """WIKI-414: index cards show a persistent swipe-hint icon on touch
    devices (pointer:coarse), and never on mouse-driven viewports."""
    def _make_handler(body, content_type):
        return lambda route: route.fulfill(status=200, content_type=content_type, body=body)

    touch_ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 390, "height": 844},
        service_workers="block",
    )
    mouse_ctx = browser.new_context(
        has_touch=False,
        viewport={"width": 1280, "height": 900},
        service_workers="block",
    )
    try:
        touch_page = touch_ctx.new_page()
        for url, (body, content_type) in cdn_cache.items():
            touch_page.route(url, _make_handler(body, content_type))
        _go_to_index(touch_page, base_url)
        touch_page.wait_for_selector(".index-card-swipe-hint", timeout=10_000)
        touch_display = touch_page.evaluate(
            "() => getComputedStyle(document.querySelector('.index-card-swipe-hint')).display"
        )
        assert touch_display != "none", "Swipe hint should be visible on pointer:coarse"

        mouse_page = mouse_ctx.new_page()
        for url, (body, content_type) in cdn_cache.items():
            mouse_page.route(url, _make_handler(body, content_type))
        _go_to_index(mouse_page, base_url)
        mouse_page.wait_for_selector(".index-card", timeout=10_000)
        mouse_display = mouse_page.evaluate(
            "() => getComputedStyle(document.querySelector('.index-card-swipe-hint')).display"
        )
        assert mouse_display == "none", "Swipe hint must stay hidden on mouse-driven viewports"
    finally:
        touch_ctx.close()
        mouse_ctx.close()


# ── DSA Learning Paths progress badge ────────────────────────────────────────


def _standard_swe_card(page):
    return page.locator(".index-card[data-title='Standard SWE']")


def test_learning_path_card_shows_zero_progress_with_no_completions(page, base_url):
    """Standard SWE card shows '0/N completed' when nothing is marked completed."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate("() => localStorage.removeItem('wiki-completed-dsa')")
    _go_to_dsa_index(page, base_url)

    card = _standard_swe_card(page)
    card.scroll_into_view_if_needed()
    progress = card.locator(".index-card-path-progress")
    progress.wait_for(state="visible", timeout=8_000)
    text = progress.inner_text()
    assert text.startswith("0/"), f"expected zero progress, got: {text!r}"
    assert text.endswith(" completed")


def test_learning_path_card_reflects_completed_articles(page, base_url):
    """Standard SWE card counts completed articles that belong to that track."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate(
        """() => {
            localStorage.setItem('wiki-completed-dsa', JSON.stringify([
                './content/dsa/algorithms/recursion.md',
                './content/dsa/data-structures/array.md',
            ]));
        }"""
    )
    _go_to_dsa_index(page, base_url)

    card = _standard_swe_card(page)
    card.scroll_into_view_if_needed()
    progress = card.locator(".index-card-path-progress")
    progress.wait_for(state="visible", timeout=8_000)
    text = progress.inner_text()
    assert text.startswith("2/"), f"expected 2 completed, got: {text!r}"
