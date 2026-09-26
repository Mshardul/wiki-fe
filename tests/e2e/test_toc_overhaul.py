"""
TOC grouping/chevron/pulse tests dropped — Toc.tsx renders a flat nav (no .toc-h2-group,
no .toc-group-chevron, no .toc-passed class), same gap test_scroll_toc.py already tracks as WIKI-652.
Notes-rail 70/30 split tests dropped — no notes-scratchpad component is mounted in ReaderIslands.tsx yet.
"""

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _collapse_key(page, h2_id):
    return page.evaluate(
        """(id) => {
            const path = location.pathname.replace(/^\\/wiki-fe\\//, '').replace(/\\/$/, '');
            const [wikiId, ...rest] = path.split('/');
            return `wiki-heading-collapsed-${wikiId}-${rest.join('-')}-${id}`;
        }""",
        h2_id,
    )


# ── Per-heading collapse ───────────────────────────────────────────


def test_heading_collapse_btn_exists(page, base_url):
    """Each H2 in article body gets a .heading-collapse-btn injected by HeadingCollapse."""
    _article(page, base_url)
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)
    h2_count = page.locator("#markdown-body h2").count()
    btn_count = page.locator("#markdown-body .heading-collapse-btn").count()
    assert btn_count == h2_count, f"Expected {h2_count} collapse buttons, got {btn_count}"


def test_heading_collapse_btn_matches_topbar_icon_scale(page, base_url):
    """Desktop heading-collapse control uses the primary icon-button box, not the old 22px spec."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _article(page, base_url)
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)
    size = page.evaluate(
        """() => {
            const r = document.querySelector('.heading-collapse-btn').getBoundingClientRect();
            return { width: r.width, height: r.height };
        }"""
    )
    assert size["width"] >= 32, f"heading-collapse-btn width too small: {size['width']}px"
    assert size["height"] >= 32, f"heading-collapse-btn height too small: {size['height']}px"


def test_heading_body_collapses_on_click(page, base_url):
    """Clicking the collapse button on an H2 hides its .section-body."""
    _article(page, base_url)
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)

    h2 = page.locator("#markdown-body h2").first
    h2_id = h2.get_attribute("id")
    page.locator(".heading-collapse-btn").first.click()
    page.wait_for_function(
        "(id) => document.getElementById(id)?.classList.contains('section--collapsed')",
        arg=h2_id,
        timeout=2_000,
    )
    body_hidden = page.evaluate(
        """(id) => {
            const h2 = document.getElementById(id);
            const body = h2.closest('.section')?.querySelector(':scope > .section-body');
            return body ? body.hidden : null;
        }""",
        h2_id,
    )
    assert body_hidden is True, "Expected .section-body to be hidden after collapse"


def test_heading_collapse_persists_with_shared_key_after_reload(page, base_url):
    """Collapsing an H2 writes wiki-heading-collapsed-* and survives a reload."""
    _article(page, base_url)
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)

    h2_id = page.locator("#markdown-body h2").first.get_attribute("id")
    page.locator(".heading-collapse-btn").first.click()
    page.wait_for_function(
        "(id) => document.getElementById(id)?.classList.contains('section--collapsed')",
        arg=h2_id,
        timeout=2_000,
    )

    key = _collapse_key(page, h2_id)
    value = page.evaluate("(k) => localStorage.getItem(k)", key)
    assert value == "1", f"expected localStorage[{key!r}] == '1', got {value!r}"

    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_function(
        "(id) => document.getElementById(id)?.classList.contains('section--collapsed')",
        arg=h2_id,
        timeout=8_000,
    )


def test_stale_heading_collapse_key_pruned_on_render(page, base_url):
    """A heading-collapse key for an id no longer in the article is GC'd by gcCollapseKeys."""
    _article(page, base_url)
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)

    stale_key = page.evaluate(
        """() => {
            const path = location.pathname.replace(/^\\/wiki-fe\\//, '').replace(/\\/$/, '');
            const [wikiId, ...rest] = path.split('/');
            const key = `wiki-heading-collapsed-${wikiId}-${rest.join('-')}-no-longer-a-real-heading`;
            localStorage.setItem(key, '1');
            return key;
        }"""
    )

    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)

    value = page.evaluate("(k) => localStorage.getItem(k)", stale_key)
    assert value is None, f"stale key {stale_key!r} must be pruned on next render, got {value!r}"


# ── Breathing TOC: current-heading tracking ─────────────────────────


def test_toc_current_class_applied_on_scroll(page, base_url):
    """Scrolling a heading into view marks the corresponding #toc-nav item .toc-current."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=8_000)

    page.evaluate(
        """() => {
            const h2 = document.querySelector('#markdown-body h2');
            if (h2) h2.scrollIntoView({ behavior: 'instant' });
        }"""
    )
    page.wait_for_function(
        "() => document.querySelectorAll('#toc-nav .toc-current').length >= 1",
        timeout=5_000,
    )
    assert page.locator("#toc-nav .toc-current").count() >= 1
