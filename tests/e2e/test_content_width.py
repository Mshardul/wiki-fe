"""
- Content width control in settings - Narrow/Default/Wide.
"""


def _open_settings(page):
    page.locator("[title='Preferences (,)']").first.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )


def _get_content_width_var(page):
    return page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--layout-padding').trim()"
    )


# ── rendering ──────────────────────────────────────────────────────────────────


def test_content_width_renders_three_buttons(wiki_page):
    """settings panel renders Narrow, Default, Wide buttons."""
    _open_settings(wiki_page)
    btns = wiki_page.locator("#settings-widths .settings-size-btn").all()
    labels = [b.inner_text() for b in btns]
    assert labels == ["Narrow", "Default", "Wide"]


def test_content_width_default_is_active_on_open(wiki_page):
    """Default button has .active class on first open (default setting)."""
    _open_settings(wiki_page)
    default_btn = wiki_page.locator("#settings-widths .settings-size-btn").nth(1)
    assert "active" in default_btn.get_attribute("class")


# ── CSS var application ────────────────────────────────────────────────────────


def test_narrow_sets_content_width_68ch(wiki_page):
    """clicking Narrow sets --layout-padding to 20%."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-widths .settings-size-btn").nth(0).click()  # Narrow
    assert _get_content_width_var(wiki_page) == "20%"


def test_default_sets_content_width_80ch(wiki_page):
    """clicking Default sets --layout-padding to 10%."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-widths .settings-size-btn").nth(
        0
    ).click()  # Narrow first
    wiki_page.locator("#settings-widths .settings-size-btn").nth(1).click()  # Default
    assert _get_content_width_var(wiki_page) == "10%"


def test_wide_sets_content_width_120ch(wiki_page):
    """clicking Wide sets --layout-padding to 5%."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-widths .settings-size-btn").nth(2).click()  # Wide
    assert _get_content_width_var(wiki_page) == "5%"


def test_width_button_gets_active_class(wiki_page):
    """clicked width button receives .active, others lose it."""
    _open_settings(wiki_page)
    wide_btn = wiki_page.locator("#settings-widths .settings-size-btn").nth(2)
    wide_btn.click()
    assert "active" in wide_btn.get_attribute("class")
    narrow_btn = wiki_page.locator("#settings-widths .settings-size-btn").nth(0)
    assert "active" not in narrow_btn.get_attribute("class")


# ── persistence ────────────────────────────────────────────────────────────────


# ── tablet floor (WIKI-378) ─────────────────────────────────────────────────────


def test_wide_has_min_margin_on_tablet_portrait(page, base_url):
    """Regression for WIKI-378: Wide (5% padding) left almost no side margin
    on tablet portrait widths (641-900px). A floor keeps content readable."""
    page.set_viewport_size({"width": 768, "height": 1024})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)

    # `.first` would hit the hidden home-view button; only content-view's is visible here.
    page.locator("[title='Preferences (,)']:visible").click()
    page.wait_for_selector("#prefs-modal:not(.hidden)")
    page.locator("#settings-widths .settings-size-btn").nth(2).click()  # Wide

    # .content-layout has no margin of its own; .content-main is what's actually inset.
    margin = page.evaluate("""() => {
        const r = document.querySelector('.content-main').getBoundingClientRect();
        return Math.min(r.left, window.innerWidth - r.right);
    }""")
    assert margin >= 40 - 1, f"Wide content-width margin too small on tablet: {margin}px"


def test_content_width_persists_across_reload(page, base_url):
    """selected content width survives a page reload via localStorage."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.locator("[title='Preferences (,)']").first.click()
    page.wait_for_selector("#prefs-modal:not(.hidden)")
    page.locator("#settings-widths .settings-size-btn").nth(0).click()  # Narrow

    stored = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).contentWidth"
    )
    assert stored == "Narrow"

    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    stored_after = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).contentWidth"
    )
    assert stored_after == "Narrow"

    width_var = page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--layout-padding').trim()"
    )
    assert width_var == "20%"
