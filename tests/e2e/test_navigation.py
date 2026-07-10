"""
- hash-only URLs - no 404 on refresh
- breadcrumb links reliable
- Escape from content → wiki index; Escape closes search modal first
"""

import pytest


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)


@pytest.mark.smoke
def test_hash_url_no_404(page, base_url):
    """fresh load of wiki index hash URL returns 200."""
    response = page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    assert response is not None and response.status == 200


def test_hash_url_content_no_404(page, base_url):
    """fresh load of article hash URL returns 200."""
    response = page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    assert response is not None and response.status == 200


@pytest.mark.smoke
def test_breadcrumb_home_link_works(wiki_page, base_url):
    """home breadcrumb link navigates back to home view."""
    _go_to_article(wiki_page, base_url)
    wiki_page.wait_for_selector("#content-breadcrumb .breadcrumb-link")
    wiki_page.locator("#content-breadcrumb .breadcrumb-link").first.click()
    wiki_page.wait_for_selector("#view-home.active", timeout=5_000)


def test_breadcrumb_wiki_link_works(wiki_page, base_url):
    """wiki breadcrumb link navigates to wiki index view."""
    _go_to_article(wiki_page, base_url)
    links = wiki_page.locator("#content-breadcrumb .breadcrumb-link").all()
    assert len(links) >= 2
    links[1].click()
    wiki_page.wait_for_selector("#view-index.active", timeout=5_000)


def test_breadcrumb_crumbs_not_zero_width_on_narrow_viewport(page, base_url):
    """Parent crumbs stay visible (non-zero width) at 360px instead of collapsing."""
    page.set_viewport_size({"width": 360, "height": 740})
    _go_to_article(page, base_url)
    page.wait_for_selector("#content-breadcrumb .breadcrumb-link")

    widths = page.evaluate("""() => {
        const els = document.querySelectorAll('#content-breadcrumb > *');
        return Array.from(els).map(el => el.getBoundingClientRect().width);
    }""")
    assert all(w > 0 for w in widths), f"a breadcrumb crumb collapsed to 0 width: {widths}"


@pytest.mark.smoke
def test_escape_closes_search_modal(wiki_page):
    """Escape closes open search modal (takes priority over index nav)."""
    wiki_page.keyboard.press("Meta+k")
    wiki_page.wait_for_selector("#global-search-modal:not(.hidden)")
    wiki_page.keyboard.press("Escape")
    modal = wiki_page.locator("#global-search-modal")
    assert "hidden" in modal.get_attribute("class")


def test_escape_from_content_goes_to_index(wiki_page, base_url):
    """Escape from content view (with modal closed) navigates to wiki index."""
    _go_to_article(wiki_page, base_url)
    wiki_page.keyboard.press("Escape")
    wiki_page.wait_for_selector("#view-index.active", timeout=5_000)


# ── Slide-direction view transitions (WIKI-145) ────────────────────


def _direction_signal(page):
    """Read whichever direction signal router.js used: the View Transitions
    API attribute, or the class-based fallback (no VT support / reduced motion)."""
    return page.evaluate("""() => {
        const html = document.documentElement;
        return {
            attr: html.getAttribute('data-nav-direction'),
            forwardClass: html.classList.contains('nav-forward'),
            backClass: html.classList.contains('nav-back'),
        };
    }""")


def test_forward_nav_home_to_index_signals_forward(wiki_page, base_url):
    """Navigating home → wiki index (depth 0 → 1) signals a forward direction."""
    wiki_page.locator(".wiki-card").first.click()
    wiki_page.wait_for_selector("#view-index.active", timeout=5_000)
    sig = _direction_signal(wiki_page)
    assert sig["attr"] == "forward" or sig["forwardClass"], sig


def test_forward_nav_index_to_content_signals_forward(wiki_page, base_url):
    """Navigating wiki index → article (depth 1 → 2) signals a forward direction."""
    wiki_page.locator(".wiki-card").first.click()
    wiki_page.wait_for_selector("#view-index.active", timeout=5_000)
    wiki_page.locator(".index-card").first.click()
    wiki_page.wait_for_selector("#view-content.active", timeout=10_000)
    sig = _direction_signal(wiki_page)
    assert sig["attr"] == "forward" or sig["forwardClass"], sig


def test_back_nav_content_to_index_signals_back(wiki_page, base_url):
    """Navigating article → wiki index (depth 2 → 1, e.g. Escape) signals back."""
    _go_to_article(wiki_page, base_url)
    wiki_page.keyboard.press("Escape")
    wiki_page.wait_for_selector("#view-index.active", timeout=5_000)
    sig = _direction_signal(wiki_page)
    assert sig["attr"] == "back" or sig["backClass"], sig


def test_back_nav_index_to_home_signals_back(wiki_page, base_url):
    """Navigating wiki index → home (depth 1 → 0) via breadcrumb signals back."""
    wiki_page.locator(".wiki-card").first.click()
    wiki_page.wait_for_selector("#view-index.active", timeout=5_000)
    wiki_page.locator("#index-breadcrumb .breadcrumb-link").first.click()
    wiki_page.wait_for_selector("#view-home.active", timeout=5_000)
    sig = _direction_signal(wiki_page)
    assert sig["attr"] == "back" or sig["backClass"], sig


def test_initial_page_load_has_no_direction_signal(page, base_url):
    """The very first render (page boot) must not slide - there is no prior
    view to slide away from."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    sig = _direction_signal(page)
    assert sig["attr"] in (None, ""), sig
    assert not sig["forwardClass"] and not sig["backClass"], sig
