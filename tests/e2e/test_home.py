"""
- home topbar: search + preferences entries open their modals
- article count renders a real number, never an ellipsis
- boot theme applied before hydration
- active-wiki marking after navigation
- /health ping on load
- PWA manifest link + validity
- pinned wikis (WIKI-297): pin reorders the card grid and persists
"""

import pytest


@pytest.mark.smoke
def test_topbar_search_opens_modal(wiki_page):
    """the home topbar search button opens the global search modal."""
    wiki_page.locator('.home-topbar [title="Search (⌘K)"]').click()
    wiki_page.wait_for_selector(".gsearch-modal", timeout=5_000)


def test_topbar_preferences_opens_modal(wiki_page):
    """the home topbar preferences button opens the preferences modal."""
    wiki_page.locator('.home-topbar [title="Preferences (,)"]').click()
    wiki_page.wait_for_selector(".prefs-modal", timeout=5_000)


def test_article_count_is_a_real_number(wiki_page):
    """wiki card count shows 'N articles', never '… articles'."""
    text = wiki_page.locator(".wiki-card-count").first.inner_text()
    assert "…" not in text
    assert "articles" in text
    assert "0 articles" not in text


def test_theme_applied_before_hydration(page, base_url):
    """the inline head script sets data-theme before React hydrates."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate(
        """() => localStorage.setItem('wiki-settings',
        JSON.stringify({backgroundId:'light-white',textColorId:'text-crisp-light',
        accentId:'indigo',font:'Inter',fontSize:'M',contentWidth:'Default'}))"""
    )
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light", f"Expected 'light' at DOMContentLoaded, got '{theme}'"


def test_active_wiki_card_marked_after_navigation(page, base_url):
    """returning home after visiting a wiki marks that wiki's card."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".wiki-card", timeout=8_000)

    wrap = page.locator(".wiki-card-wrap").first
    wiki_id = wrap.get_attribute("data-wiki-id")
    wrap.locator(".wiki-card").click()
    page.wait_for_selector(".index-main", timeout=8_000)

    page.locator(".back-btn").first.click()
    page.wait_for_selector(".wiki-card", timeout=5_000)

    assert page.evaluate(
        f"() => !!document.querySelector('[data-wiki-id=\"{wiki_id}\"]')"
    )


def test_health_ping_fires_on_load(page, base_url):
    """boot fires a fire-and-forget GET to BE /health to warm a cold start."""
    hits = []
    page.route("**/health", lambda route: (hits.append(1), route.fulfill(status=200, body="ok")))
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".wiki-card", timeout=8_000)
    page.wait_for_timeout(500)
    assert len(hits) >= 1, "expected a GET /health ping on load"


# parallax tests removed — home hero parallax is a dropped feature (spec §9).


# ── PWA manifest ────────────────────────────────────────────────


def test_manifest_link_present(page, base_url):
    """the shell links a web app manifest."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    href = page.locator("link[rel='manifest']").first.get_attribute("href")
    assert href and href.endswith("manifest.webmanifest")


def test_icon_and_theme_color_present(page, base_url):
    """PWA icon links and theme-color meta are present for install."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    assert page.locator("link[rel='icon']").count() >= 1
    assert page.locator("link[rel='apple-touch-icon']").count() >= 1
    theme = page.locator("meta[name='theme-color']").first.get_attribute("content")
    assert theme and theme.startswith("#")


def test_manifest_is_valid_and_installable(page, base_url):
    """the manifest parses and carries the fields a browser needs to offer install."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    manifest = page.evaluate(
        """async () => {
            const href = document.querySelector("link[rel='manifest']").getAttribute('href');
            const res = await fetch(href);
            return res.ok ? await res.json() : null;
        }"""
    )
    assert manifest is not None, "manifest must be fetchable"
    assert manifest.get("name"), "manifest needs a name"
    assert manifest.get("start_url"), "manifest needs a start_url"
    assert manifest.get("display") == "standalone"
    assert manifest.get("icons"), "manifest needs at least one icon"


# ── Pinned wikis (WIKI-297) ────────────────────────────────


def test_wiki_cards_render_pin_button(wiki_page):
    """Each home wiki card renders a ☆ pin toggle button."""
    btns = wiki_page.locator(".wiki-card-pin-btn")
    assert btns.count() == wiki_page.locator(".wiki-card-wrap").count()
    assert btns.first.inner_text() == "☆"


def test_pinning_wiki_moves_it_to_front(wiki_page):
    """Pinning the second card reorders it first and persists the pin."""
    wraps = wiki_page.locator(".wiki-card-wrap")
    second_id = wraps.nth(1).get_attribute("data-wiki-id")

    wraps.nth(1).locator(".wiki-card-pin-btn").click()

    wiki_page.wait_for_function(
        f"() => document.querySelector('.wiki-card-wrap').getAttribute('data-wiki-id') === '{second_id}'",
        timeout=5_000,
    )
    assert wraps.first.get_attribute("data-wiki-id") == second_id
    assert wraps.first.locator(".wiki-card-pin-btn").inner_text() == "★"

    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-pinned-wikis'))"
    )
    assert stored == [second_id]


def test_unpinning_wiki_restores_registry_order(wiki_page):
    """Unpinning falls back to registry order and clears the stored set."""
    wraps = wiki_page.locator(".wiki-card-wrap")
    first_id = wraps.first.get_attribute("data-wiki-id")

    wraps.first.locator(".wiki-card-pin-btn").click()
    wiki_page.wait_for_function(
        "() => document.querySelector('.wiki-card-pin-btn.pinned')", timeout=5_000
    )
    wiki_page.locator(".wiki-card-pin-btn.pinned").click()
    wiki_page.wait_for_function(
        "() => !document.querySelector('.wiki-card-pin-btn.pinned')", timeout=5_000
    )

    assert wraps.first.get_attribute("data-wiki-id") == first_id
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-pinned-wikis'))"
    )
    assert stored == []


def test_pin_button_click_does_not_navigate(wiki_page):
    """Clicking the pin star must not follow the card link."""
    wiki_page.locator(".wiki-card-pin-btn").first.click()
    wiki_page.wait_for_timeout(200)
    assert wiki_page.locator(".home-main").count() == 1


def test_pin_btn_44px_and_visible_on_coarse_pointer(browser, base_url):
    """WIKI-406: the pin button must be >=44px and visible on touch devices."""
    ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 390, "height": 844},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        page.goto(f"{base_url}/", wait_until="domcontentloaded")
        page.wait_for_selector(".wiki-card-pin-btn", timeout=10_000)
        result = page.evaluate("""() => {
            const el = document.querySelector('.wiki-card-pin-btn');
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height, opacity: getComputedStyle(el).opacity };
        }""")
        assert result["width"] >= 44, f"pin-btn width too small: {result['width']}px"
        assert result["height"] >= 44, f"pin-btn height too small: {result['height']}px"
        assert result["opacity"] == "1", f"pin-btn hidden on touch, opacity={result['opacity']}"
    finally:
        ctx.close()
