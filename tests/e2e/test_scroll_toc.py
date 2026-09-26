"""
- scroll position persisted per article in localStorage, re-applied on revisit
- ?a= anchor param takes priority over saved scroll
- TOC sidebar visible on desktop, a drawer on mobile
- Sticky section header updates on scroll
- mobile FAB layout / body-scroll lock

Skip-marked → reader-parity tickets (surfaced by the sweep):
- resume-by-idea chip (WIKI-651) — Next silently restores instead
- collapsible TOC sections + collapse-all (WIKI-652) — Next TOC is flat
- scroll-key eviction manifest (WIKI-653) — Next writes keys with no manifest
"""

import pytest

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _scroll_key(page):
    """ScrollRestore's key: wiki-toc-scroll-article-<wikiId>-<slug-with-dashes>,
    where slug = article.slug.join('/') (no vertical prefix, no content/ , no .md)."""
    return page.evaluate(
        """() => {
        const seg = location.pathname.replace(/^\\/wiki-fe\\//, '').replace(/\\/$/, '');
        const [wikiId, ...rest] = seg.split('/');
        return 'wiki-toc-scroll-article-' + wikiId + '-' + rest.join('-');
    }"""
    )


# ── Scroll position persistence ────────────────────────────────────


def test_scroll_position_saved_and_restored(page, base_url):
    """A saved scroll offset is re-applied when the article is revisited."""
    _article(page, base_url)
    key = _scroll_key(page)
    page.evaluate("(k) => localStorage.setItem(k, '600')", key)

    page.goto(f"{base_url}/system-design/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-main", timeout=5_000)
    _article(page, base_url)

    page.wait_for_function("() => window.scrollY > 100", timeout=3_000)


def test_scroll_position_not_restored_with_anchor(page, base_url):
    """?a= anchor param wins over a saved scroll position."""
    _article(page, base_url)
    key = _scroll_key(page)
    page.evaluate("(k) => localStorage.setItem(k, '2000')", key)

    heading_id = page.evaluate("() => document.querySelector('#markdown-body [id]')?.id")
    if not heading_id:
        pytest.skip("no headings to anchor to")

    page.goto(f"{base_url}/{SLUG}/?a={heading_id}", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_timeout(400)
    # Anchored to the heading (near its offset), not the saved 2000.
    at = page.evaluate(
        "(id) => Math.abs(window.scrollY - (document.getElementById(id).getBoundingClientRect().top + window.scrollY)) < 120",
        heading_id,
    )
    assert at, "expected scroll at the anchored heading, not the saved position"


# ── TOC sidebar / drawer ──────────────────────────────────────────


def test_toc_nav_reserves_scrollbar_gutter(page, base_url):
    """#toc-nav reserves a stable scrollbar gutter so edge clicks aren't blocked."""
    _article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=10_000)
    gutter = page.evaluate(
        "() => getComputedStyle(document.getElementById('toc-nav')).scrollbarGutter"
    )
    assert gutter == "stable", f"expected scrollbar-gutter: stable, got {gutter!r}"


def test_toc_visible_on_desktop(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _article(page, base_url)
    assert page.locator("#toc-sidebar").is_visible()


def test_toc_hidden_on_mobile(page, base_url):
    page.set_viewport_size({"width": 375, "height": 812})
    _article(page, base_url)
    assert not page.locator("#toc-sidebar").is_visible()


def test_mobile_toc_open_locks_body_scroll(page, base_url):
    page.set_viewport_size({"width": 375, "height": 812})
    _article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", state="attached")
    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    assert page.evaluate("() => document.body.classList.contains('toc-open')")


def test_mobile_toc_closes_on_link_tap(page, base_url):
    page.set_viewport_size({"width": 375, "height": 812})
    _article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", state="attached")
    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    page.locator("#toc-nav .toc-item").first.click()
    page.wait_for_function(
        "() => !document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )


def test_mobile_toc_close_via_backdrop_unlocks_scroll(page, base_url):
    page.set_viewport_size({"width": 375, "height": 812})
    _article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", state="attached")
    page.locator("#toc-mobile-btn").click()
    page.wait_for_function(
        "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    page.locator("#toc-mobile-backdrop").click(position={"x": 10, "y": 10})
    page.wait_for_function(
        "() => !document.getElementById('toc-sidebar').classList.contains('mobile-open')"
    )
    assert not page.evaluate("() => document.body.classList.contains('toc-open')")


def test_toc_items_44px_on_coarse_pointer(browser, base_url):
    ctx = browser.new_context(
        has_touch=True, is_mobile=True, viewport={"width": 390, "height": 844},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        _article(page, base_url)
        page.wait_for_selector("#toc-nav .toc-item", state="attached", timeout=10_000)
        page.locator("#toc-mobile-btn").click()
        page.wait_for_function(
            "() => document.getElementById('toc-sidebar').classList.contains('mobile-open')"
        )
        h = page.evaluate(
            "() => document.querySelector('#toc-nav .toc-item').getBoundingClientRect().height"
        )
        assert h >= 44, f".toc-item too short: {h}px"
    finally:
        ctx.close()


def test_topbar_icon_btn_44px_on_coarse_pointer(browser, base_url):
    ctx = browser.new_context(
        has_touch=True, is_mobile=True, viewport={"width": 360, "height": 780},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        _article(page, base_url)
        page.wait_for_selector(".content-topbar .topbar-icon-btn", timeout=10_000)
        size = page.evaluate("""() => {
            const r = document.querySelector('.content-topbar .topbar-icon-btn').getBoundingClientRect();
            return { width: r.width, height: r.height };
        }""")
        assert size["width"] >= 44 and size["height"] >= 44, f"topbar-icon-btn too small: {size}"
    finally:
        ctx.close()


def test_mobile_fabs_do_not_share_a_corner(page, base_url):
    page.set_viewport_size({"width": 375, "height": 812})
    _article(page, base_url)
    page.evaluate("() => window.scrollTo(0, 500)")
    page.wait_for_function(
        "() => document.getElementById('scroll-top').classList.contains('visible')"
    )
    st = page.locator("#scroll-top").bounding_box()
    toc = page.locator("#toc-mobile-btn").bounding_box()
    assert st["x"] < toc["x"], "scroll-top FAB should sit left of the TOC FAB, not stacked"


def test_toc_sticky_does_not_scroll_away(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _article(page, base_url)
    page.evaluate("() => window.scrollTo(0, 1500)")
    page.wait_for_function("() => window.scrollY >= 1000", timeout=3_000)
    sidebar = page.locator("#toc-sidebar")
    assert sidebar.is_visible()
    box = sidebar.bounding_box()
    assert 0 <= box["y"] < page.viewport_size["height"]


# ── Sticky section header ─────────────────────────────────────────


def test_sticky_section_header_element_exists(page, base_url):
    _article(page, base_url)
    assert page.evaluate("() => !!document.getElementById('sticky-section-header')")


def test_sticky_section_header_shows_section_on_scroll(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _article(page, base_url)
    h2_top = page.evaluate("""() => {
        const h2 = document.querySelector('#markdown-body h2');
        return h2 ? h2.getBoundingClientRect().top + window.scrollY : null;
    }""")
    if h2_top is None:
        pytest.skip("no h2 in article")
    page.evaluate(f"() => window.scrollTo(0, {int(h2_top) + 200})")
    page.wait_for_function(
        "() => document.getElementById('sticky-section-header')?.textContent?.trim().length > 0",
        timeout=3_000,
    )


# ── Skip-marked → reader-parity tickets ──────────────────────────


@pytest.mark.skip(reason="resume-by-idea chip not ported — WIKI-651")
def test_resume_chip_shows_and_jumps():
    pass


@pytest.mark.skip(reason="collapsible TOC sections not ported — WIKI-652")
def test_toc_section_chevron_collapse():
    pass


@pytest.mark.skip(reason="scroll-key eviction manifest not ported — WIKI-653")
def test_scroll_keys_tracked_in_eviction_manifest():
    pass
