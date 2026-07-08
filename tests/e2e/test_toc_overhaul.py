"""
TOC overhaul tests
"""


def _go_to_article(page, base_url, slug="system-design/caching"):
    page.goto(f"{base_url}/#{slug}", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


# ── Storage helpers (tested indirectly via later tasks) ──────────────

def test_toggle_collapse_helper_exposed(page, base_url):
    """toggleCollapse side-effect: collapsing a TOC H2 group writes to localStorage."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    group = page.locator(".toc-h2-group").first
    h2_id = group.get_attribute("data-h2-id")
    page.locator(".toc-group-chevron").first.click()
    key = f"wiki-toc-h2-system-design-{h2_id}"
    value = page.evaluate(f"() => localStorage.getItem({repr(key)})")
    assert value == "1", f"toggleCollapse must write '1' to localStorage[{key!r}]"


# ── H2 grouping ───────────────────────────────────────────────────────

def test_toc_h2_groups_exist(page, base_url):
    """buildTOC wraps H3 items in .toc-h2-group containers."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    groups = page.locator(".toc-h2-group").count()
    assert groups > 0, "Expected at least one .toc-h2-group in TOC"


def test_toc_group_chevron_exists(page, base_url):
    """Each H2 row in TOC has a .toc-group-chevron button."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    chevrons = page.locator(".toc-group-chevron").count()
    h2s = page.locator("#toc-nav .toc-h2").count()
    assert chevrons == h2s, f"Expected {h2s} chevrons, got {chevrons}"


def test_toc_h3_collapses_under_h2(page, base_url):
    """Clicking H2 chevron hides H3 children in that group."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector(".toc-group-chevron", timeout=5_000)

    group = page.locator(".toc-h2-group").first
    h3_count = group.locator(".toc-h3").count()
    if h3_count == 0:
        return  # article has no H3s under first H2; skip

    page.locator(".toc-group-chevron").first.click()
    page.wait_for_function(
        "() => document.querySelector('.toc-h2-group.section--collapsed') !== null",
        timeout=2_000,
    )
    h3_visible = group.locator(".toc-h3").first.is_visible()
    assert not h3_visible, "H3 items must be hidden when H2 group is collapsed"


def test_toc_h2_group_collapse_persists(page, base_url):
    """Collapsing an H2 group saves state to localStorage."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector(".toc-group-chevron", timeout=5_000)

    group = page.locator(".toc-h2-group").first
    h2_id = group.get_attribute("data-h2-id")
    page.locator(".toc-group-chevron").first.click()

    key = f"wiki-toc-h2-system-design-{h2_id}"
    value = page.evaluate(f"() => localStorage.getItem({repr(key)})")
    assert value == "1", f"localStorage[{key!r}] must be '1' after collapse"


# ── Breathing TOC states ─────────────────────────────────────────────

def test_toc_current_class_applied(page, base_url):
    """Scrolling into a section marks the corresponding TOC item .toc-current."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    page.evaluate("""() => {
        const h2 = document.querySelector('#markdown-body h2');
        if (h2) h2.scrollIntoView({ behavior: 'instant' });
    }""")
    page.wait_for_function(
        "() => document.querySelectorAll('#toc-nav .toc-current').length >= 1",
        timeout=5_000,
    )

    current_count = page.locator("#toc-nav .toc-current").count()
    assert current_count >= 1, "Expected at least one .toc-current item after scrolling"


def test_toc_passed_class_applied_after_scroll(page, base_url):
    """Headings scrolled past get .toc-passed class."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    h2_count = page.locator("#toc-nav .toc-h2").count()
    if h2_count < 2:
        return  # need at least 2 H2s to have a passed one

    page.evaluate("""() => {
        const h2s = document.querySelectorAll('#markdown-body h2');
        if (h2s[1]) h2s[1].scrollIntoView({ behavior: 'instant' });
    }""")
    page.wait_for_function(
        "() => document.querySelectorAll('#toc-nav .toc-passed').length >= 1",
        timeout=5_000,
    )

    passed_count = page.locator("#toc-nav .toc-passed").count()
    assert passed_count >= 1, "Expected at least one .toc-passed item after scrolling past first H2"


# ── Per-heading collapse on content page ──────────────────────────────

def test_heading_collapse_btn_exists(page, base_url):
    """Each H2 in article body has a .heading-collapse-btn."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)

    h2_count = page.locator("#markdown-body h2").count()
    btn_count = page.locator("#markdown-body .heading-collapse-btn").count()
    assert btn_count == h2_count, (
        f"Expected {h2_count} collapse buttons (one per H2), got {btn_count}"
    )


def test_heading_body_collapses_on_click(page, base_url):
    """Clicking the collapse button on an H2 hides its body content."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)

    h2_count = page.locator("#markdown-body h2").count()
    if h2_count == 0:
        return

    page.locator(".heading-collapse-btn").first.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body h2.section--collapsed') !== null",
        timeout=2_000,
    )
    collapsed = page.locator("#markdown-body h2.section--collapsed").count()
    assert collapsed >= 1, "Expected at least one collapsed H2"


def test_heading_collapse_persists_after_reload(page, base_url):
    """Collapsing an H2 section persists to localStorage and survives a page reload."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _go_to_article(page, base_url)

    if page.locator("#markdown-body h2").count() == 0:
        return

    page.locator(".heading-collapse-btn").first.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body h2.section--collapsed') !== null",
        timeout=2_000,
    )

    page.reload()
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )

    still_collapsed = page.locator("#markdown-body h2.section--collapsed").count()
    assert still_collapsed >= 1, "Heading collapse state must survive page reload"
