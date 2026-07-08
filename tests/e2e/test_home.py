"""
- search entry lives in the preferences panel (WIKI-240)
- article count defaults to 0, not ellipsis
"""

import pytest


@pytest.mark.smoke
def test_search_button_visible_in_prefs_panel(wiki_page):
    """search entry present and visible in the preferences panel, not the topbar."""
    assert wiki_page.locator('.home-topbar [title="Search all (⌘K)"]').count() == 0
    wiki_page.locator('[title="Preferences (,)"]').first.click()
    wiki_page.wait_for_selector("#prefs-modal:not(.hidden)")
    btn = wiki_page.locator('[data-action="prefs-search-open"]')
    assert btn.is_visible()


def test_search_button_opens_modal(wiki_page):
    """clicking the panel's search entry closes preferences and opens global search."""
    wiki_page.locator('[title="Preferences (,)"]').first.click()
    wiki_page.wait_for_selector("#prefs-modal:not(.hidden)")
    wiki_page.locator('[data-action="prefs-search-open"]').click()
    modal = wiki_page.locator("#global-search-modal")
    assert not modal.get_attribute("class").__contains__("hidden")
    assert "hidden" in wiki_page.locator("#prefs-modal").get_attribute("class")


def test_article_count_never_ellipsis(wiki_page):
    """wiki card count shows '0 articles' before async load, never '… articles'."""
    count_el = wiki_page.locator(".wiki-card-count").first
    text = count_el.inner_text()
    assert "…" not in text
    assert "articles" in text


def test_article_count_updates_to_nonzero(wiki_page):
    """article count eventually resolves to a real number."""
    count_el = wiki_page.locator(".wiki-card-count").first
    wiki_page.wait_for_function(
        "() => !document.querySelector('.wiki-card-count').textContent.includes('0 articles')",
        timeout=10_000,
    )
    text = count_el.inner_text()
    assert "articles" in text
    assert "0 articles" not in text


def test_home_topbar_does_not_overlap_eyebrow_at_390px(wiki_page):
    """The home topbar (preferences/auth) must clear the centered
    'Documentation' eyebrow pill on narrow phones - regression for a bug
    where a max-width:390px rule shrank .home-header's top padding instead
    of growing it, letting the eyebrow slide up under the icon row."""
    wiki_page.set_viewport_size({"width": 390, "height": 844})
    wiki_page.wait_for_timeout(100)

    box = wiki_page.evaluate("""() => {
        const topbar = document.querySelector('.home-topbar').getBoundingClientRect();
        const eyebrow = document.querySelector('.home-eyebrow').getBoundingClientRect();
        return { topbarBottom: topbar.bottom, eyebrowTop: eyebrow.top };
    }""")
    assert box["eyebrowTop"] >= box["topbarBottom"], (
        f"Eyebrow badge (top={box['eyebrowTop']}) overlaps topbar "
        f"(bottom={box['topbarBottom']}) at 390px width"
    )


def test_theme_applied_before_module_js_loads(page, base_url):
    """inline head script sets data-theme before app.js module executes."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate(
        """() => localStorage.setItem('wiki-settings',
        JSON.stringify({backgroundId:'light-white',textColorId:'text-crisp-light',
        accentId:'indigo',font:'Inter',fontSize:'M',contentWidth:'Default'}))"""
    )
    # DOMContentLoaded fires after inline scripts but before ES modules
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light", (
        f"Expected 'light' at DOMContentLoaded (before module JS), got '{theme}'"
    )


def test_active_wiki_card_marked_after_navigation(page, base_url):
    """returning home after visiting a wiki marks that wiki's card .active."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    first_card = page.locator(".wiki-card").first
    wiki_id = first_card.get_attribute("data-wiki-id")
    first_card.click()
    page.wait_for_selector("#view-index.active", timeout=8_000)

    page.locator(".back-btn").first.click()
    page.wait_for_selector("#view-home.active", timeout=5_000)

    assert page.evaluate(
        f"() => document.querySelector('[data-wiki-id=\"{wiki_id}\"]')"
        f".classList.contains('active')"
    )


def test_no_active_card_on_fresh_load(page, base_url):
    """on first load with no prior navigation, no wiki card is marked active."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    active_count = page.locator(".wiki-card.active").count()
    assert active_count == 0


# ── Home hero parallax ──────────────────────────────────────────────


def test_parallax_mousemove_translates_grid(page, base_url):
    """Mousemove over #view-home sets a non-empty transform on .home-bg-grid."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    page.mouse.move(100, 100)
    page.mouse.move(400, 300)
    page.wait_for_function(
        "() => (document.querySelector('.home-bg-grid')?.style.transform || '').includes('translate')",
        timeout=3_000,
    )
    transform = page.evaluate(
        "() => document.querySelector('.home-bg-grid')?.style.transform"
    )
    assert transform and "translate" in transform, (
        f"Expected translate transform on .home-bg-grid after mousemove, got: {transform!r}"
    )


def test_parallax_mouseleave_resets_grid(page, base_url):
    """Mouseleave from #view-home clears the transform on .home-bg-grid."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    page.mouse.move(400, 300)
    page.wait_for_function(
        "() => (document.querySelector('.home-bg-grid')?.style.transform || '').includes('translate')",
        timeout=3_000,
    )
    page.mouse.move(-10, -10)
    page.wait_for_function(
        "() => !(document.querySelector('.home-bg-grid')?.style.transform || '').includes('translate')",
        timeout=3_000,
    )
    transform = page.evaluate(
        "() => document.querySelector('.home-bg-grid')?.style.transform"
    )
    assert not transform, (
        f"Expected empty transform after mouseleave, got: {transform!r}"
    )


# ── PWA manifest  ────────────────────────────────────────────────


def test_manifest_link_present(page, base_url):
    """index.html links a web app manifest."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    href = page.locator("link[rel='manifest']").first.get_attribute("href")
    assert href and href.endswith("manifest.json")


def test_icon_and_theme_color_present(page, base_url):
    """PWA icon links and theme-color meta are present for install."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    assert page.locator("link[rel='icon']").count() >= 1
    assert page.locator("link[rel='apple-touch-icon']").count() == 1
    theme = page.locator("meta[name='theme-color']").first.get_attribute("content")
    assert theme and theme.startswith("#")


def test_manifest_is_valid_and_installable(page, base_url):
    """manifest.json parses and carries the fields a browser needs to offer install."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    manifest = page.evaluate(
        """async () => {
            const href = document.querySelector("link[rel='manifest']").getAttribute('href');
            const res = await fetch(href);
            return res.ok ? await res.json() : null;
        }"""
    )
    assert manifest is not None, "manifest.json must be fetchable"
    assert manifest.get("name"), "manifest needs a name"
    assert manifest.get("start_url"), "manifest needs a start_url"
    assert manifest.get("display") == "standalone"
    assert manifest.get("icons"), "manifest needs at least one icon"


# ── Pinned/starred wikis (WIKI-297) ────────────────────────────────


def test_wiki_cards_render_pin_button(wiki_page):
    """Each home wiki card renders a ☆ pin toggle button."""
    btns = wiki_page.locator(".wiki-card-pin-btn")
    assert btns.count() == wiki_page.locator(".wiki-card").count()
    assert btns.first.inner_text() == "☆"


def test_pinning_wiki_moves_it_to_front(wiki_page):
    """Pinning the second wiki card reorders it to the first position and
    persists the pin in localStorage."""
    cards = wiki_page.locator(".wiki-card")
    second_id = cards.nth(1).get_attribute("data-wiki-id")

    cards.nth(1).locator(".wiki-card-pin-btn").click()

    wiki_page.wait_for_function(
        f"() => document.querySelector('.wiki-card').getAttribute('data-wiki-id') === '{second_id}'",
        timeout=5_000,
    )
    assert cards.first.get_attribute("data-wiki-id") == second_id
    assert cards.first.locator(".wiki-card-pin-btn").inner_text() == "★"

    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-pinned-wikis'))"
    )
    assert stored == [second_id]


def test_unpinning_wiki_restores_registry_order(wiki_page):
    """Unpinning a wiki removes it from the pinned set and the card grid
    falls back to registry order."""
    cards = wiki_page.locator(".wiki-card")
    first_id = cards.first.get_attribute("data-wiki-id")

    cards.first.locator(".wiki-card-pin-btn").click()
    wiki_page.wait_for_function(
        "() => document.querySelector('.wiki-card-pin-btn.pinned')", timeout=5_000
    )
    wiki_page.locator(".wiki-card-pin-btn.pinned").click()
    wiki_page.wait_for_function(
        "() => !document.querySelector('.wiki-card-pin-btn.pinned')", timeout=5_000
    )

    assert cards.first.get_attribute("data-wiki-id") == first_id
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-pinned-wikis'))"
    )
    assert stored == []


def test_pin_button_click_does_not_navigate(wiki_page):
    """Clicking the pin star must not trigger the card's navigate() click handler."""
    wiki_page.locator(".wiki-card-pin-btn").first.click()
    assert wiki_page.locator("#view-home").evaluate(
        "el => el.classList.contains('active')"
    )
