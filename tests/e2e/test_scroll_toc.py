"""Scroll restore, TOC sidebar and mobile drawer, sticky section header."""

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _scroll_key(page):
    return page.evaluate(
        """() => {
        const seg = location.pathname.replace(/^\\/wiki-fe\\//, '').replace(/\\/$/, '');
        const [wikiId, ...rest] = seg.split('/');
        return 'wiki-toc-scroll-article-' + wikiId + '-' + rest.join('-');
    }"""
    )


# ── Scroll position persistence ────────────────────────────────────


def test_scroll_position_saved_and_restored(page, base_url):
    _article(page, base_url)
    key = _scroll_key(page)
    page.evaluate("(k) => localStorage.setItem(k, '600')", key)

    page.goto(f"{base_url}/system-design/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-main", timeout=5_000)
    _article(page, base_url)

    page.wait_for_function("() => window.scrollY > 100", timeout=3_000)


def test_scroll_position_not_restored_with_anchor(page, base_url):
    _article(page, base_url)
    key = _scroll_key(page)
    page.evaluate("(k) => localStorage.setItem(k, '2000')", key)

    heading = page.evaluate(
        """() => {
            const h = [...document.querySelectorAll('#markdown-body h2[id]')].at(-1);
            return h && { id: h.id, top: h.getBoundingClientRect().top + window.scrollY };
        }"""
    )
    assert heading and abs(heading["top"] - 2000) > 500, f"need a heading far from the saved offset, got {heading}"

    page.goto(f"{base_url}/{SLUG}/?a={heading['id']}", wait_until="domcontentloaded")
    page.wait_for_function(
        "(id) => Math.abs(document.getElementById(id).getBoundingClientRect().top) < 120",
        arg=heading["id"],
        timeout=5_000,
    )


# ── TOC sidebar / drawer ──────────────────────────────────────────


def test_toc_nav_reserves_scrollbar_gutter(page, base_url):
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
    assert h2_top is not None, "article has no h2"
    page.evaluate(f"() => window.scrollTo(0, {int(h2_top) + 200})")
    page.wait_for_function(
        "() => document.getElementById('sticky-section-header')?.textContent?.trim().length > 0",
        timeout=3_000,
    )
