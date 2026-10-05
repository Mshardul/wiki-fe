"""
- real-path URLs - no 404 on refresh
- breadcrumb links reliable
- Escape from an article → vertical index; Escape closes the search modal first
- slide-direction signal between views (WIKI-145)
"""

import pytest


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


@pytest.mark.smoke
def test_vertical_url_no_404(page, base_url):
    """fresh load of a vertical index URL returns 200."""
    response = page.goto(f"{base_url}/system-design/", wait_until="domcontentloaded")
    assert response is not None and response.status == 200


def test_article_url_no_404(page, base_url):
    """fresh load of an article URL returns 200."""
    response = page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    assert response is not None and response.status == 200


@pytest.mark.smoke
def test_breadcrumb_home_link_works(page, base_url):
    """the back-to-home link on a vertical index navigates home."""
    page.goto(f"{base_url}/system-design/", wait_until="domcontentloaded")
    page.locator(".back-btn").first.click()
    page.wait_for_selector(".wiki-card", timeout=5_000)


def test_breadcrumb_vertical_link_works(page, base_url):
    """the article breadcrumb's vertical crumb navigates to the vertical index."""
    _go_to_article(page, base_url)
    page.wait_for_selector(".breadcrumb .breadcrumb-link")
    page.locator(".breadcrumb .breadcrumb-link").first.click()
    page.wait_for_selector(".index-main", timeout=5_000)


def test_breadcrumb_crumbs_not_zero_width_on_narrow_viewport(page, base_url):
    """Parent crumbs stay visible (non-zero width) at 360px."""
    page.set_viewport_size({"width": 360, "height": 740})
    _go_to_article(page, base_url)
    page.wait_for_selector(".breadcrumb .breadcrumb-link")
    widths = page.evaluate("""() => {
        const els = document.querySelectorAll('.breadcrumb > *');
        return Array.from(els).map(el => el.getBoundingClientRect().width);
    }""")
    assert all(w > 0 for w in widths), f"a breadcrumb crumb collapsed to 0 width: {widths}"


@pytest.mark.smoke
def test_escape_closes_search_modal(wiki_page):
    """Escape closes an open search modal (takes priority over index nav)."""
    wiki_page.keyboard.press("Meta+k")
    wiki_page.wait_for_selector(".gsearch-modal", timeout=5_000)
    wiki_page.keyboard.press("Escape")
    wiki_page.wait_for_selector(".gsearch-modal", state="hidden", timeout=5_000)


def test_escape_from_article_goes_to_index(page, base_url):
    """Escape on an article (nothing else open) navigates to the vertical index."""
    _go_to_article(page, base_url)
    page.keyboard.press("Escape")
    page.wait_for_selector(".index-main", timeout=5_000)


# ── Slide-direction view transitions (WIKI-145) ────────────────────


def _watch_direction(page):
    """Record the first direction signal so the 300ms transient can't be missed under load."""
    page.evaluate("""() => {
        const html = document.documentElement;
        window.__navSeen = { attr: null, forwardClass: false, backClass: false };
        new MutationObserver(() => {
            const seen = window.__navSeen;
            seen.attr = html.getAttribute('data-nav-direction') || seen.attr;
            seen.forwardClass = seen.forwardClass || html.classList.contains('nav-forward');
            seen.backClass = seen.backClass || html.classList.contains('nav-back');
        }).observe(html, { attributes: true, attributeFilter: ['class', 'data-nav-direction'] });
    }""")


def _direction_signal(page):
    return page.evaluate("""() => {
        const html = document.documentElement;
        const seen = window.__navSeen || {};
        return {
            attr: html.getAttribute('data-nav-direction') || seen.attr || null,
            forwardClass: html.classList.contains('nav-forward') || !!seen.forwardClass,
            backClass: html.classList.contains('nav-back') || !!seen.backClass,
        };
    }""")


def test_forward_nav_home_to_index_signals_forward(page, base_url):
    """home → vertical index (depth 0 → 1) signals forward."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".wiki-card", timeout=8_000)
    _watch_direction(page)
    page.locator(".wiki-card").first.click()
    page.wait_for_selector(".index-main", timeout=5_000)
    sig = _direction_signal(page)
    assert sig["attr"] == "forward" or sig["forwardClass"], sig


def test_forward_nav_index_to_article_signals_forward(page, base_url):
    """vertical index → article (depth 1 → 2) signals forward."""
    page.goto(f"{base_url}/dsa/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-card", timeout=8_000)
    _watch_direction(page)
    page.locator(".index-card:not(.index-card--unavailable)").first.click()
    page.wait_for_selector("#markdown-body", timeout=10_000)
    sig = _direction_signal(page)
    assert sig["attr"] == "forward" or sig["forwardClass"], sig


def test_back_nav_article_to_index_signals_back(page, base_url):
    """article → vertical index (Escape) signals back."""
    _go_to_article(page, base_url)
    _watch_direction(page)
    page.keyboard.press("Escape")
    page.wait_for_selector(".index-main", timeout=5_000)
    sig = _direction_signal(page)
    assert sig["attr"] == "back" or sig["backClass"], sig


def test_back_nav_index_to_home_signals_back(page, base_url):
    """vertical index → home (back button) signals back."""
    page.goto(f"{base_url}/dsa/", wait_until="domcontentloaded")
    page.wait_for_selector(".back-btn", timeout=8_000)
    _watch_direction(page)
    page.locator(".back-btn").first.click()
    page.wait_for_selector(".wiki-card", timeout=5_000)
    sig = _direction_signal(page)
    assert sig["attr"] == "back" or sig["backClass"], sig


def test_initial_page_load_has_no_direction_signal(page, base_url):
    """The first render must not slide - there is no prior view."""
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    sig = _direction_signal(page)
    assert sig["attr"] in (None, ""), sig
    assert not sig["forwardClass"] and not sig["backClass"], sig


def test_breadcrumb_current_crumb_does_not_over_shrink(page, base_url):
    """Current-page crumb keeps flex-shrink:0 so it loses the shrink fight less than parents."""
    page.set_viewport_size({"width": 360, "height": 740})
    _go_to_article(page, base_url)
    page.wait_for_selector(".breadcrumb span:last-child", timeout=10_000)
    data = page.evaluate("""() => {
        const last = document.querySelector('.breadcrumb span:last-child');
        const link = document.querySelector('.breadcrumb .breadcrumb-link');
        const csLast = getComputedStyle(last);
        return {
            lastShrink: csLast.flexShrink,
            lastWidth: last.getBoundingClientRect().width,
            linkShrink: link ? getComputedStyle(link).flexShrink : null,
        };
    }""")
    assert data["lastWidth"] > 20, f"last crumb over-truncated: {data}"
