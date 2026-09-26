"""
Content width control in Preferences - Narrow/Default/Wide.
"""


def _open_settings(page):
    page.locator("[title='Preferences (,)']:visible").first.click()
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', timeout=5_000)


def _prefs_dialog(page):
    return page.locator('[role="dialog"][aria-label="Preferences"]')


def _width_row(page):
    return _prefs_dialog(page).locator(
        "xpath=.//div[contains(@class,'prefs-section')]"
        "[.//div[contains(@class,'prefs-section-label') and normalize-space()='Content width']]"
    )


def _get_layout_padding(page):
    return page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--layout-padding').trim()"
    )


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


# ── rendering ──────────────────────────────────────────────────────────────────


def test_content_width_renders_three_buttons(wiki_page):
    _open_settings(wiki_page)
    btns = _width_row(wiki_page).locator(".settings-size-btn").all()
    labels = [b.inner_text() for b in btns]
    assert labels == ["Narrow", "Default", "Wide"]


def test_content_width_default_is_active_on_open(wiki_page):
    _open_settings(wiki_page)
    default_btn = _width_row(wiki_page).locator(".settings-size-btn").nth(1)
    assert "active" in default_btn.get_attribute("class")


# ── CSS var application ────────────────────────────────────────────────────────


def test_narrow_sets_layout_padding_20pct(wiki_page):
    _open_settings(wiki_page)
    _width_row(wiki_page).locator(".settings-size-btn").nth(0).click()  # Narrow
    assert _get_layout_padding(wiki_page) == "20%"


def test_default_sets_layout_padding_10pct(wiki_page):
    _open_settings(wiki_page)
    _width_row(wiki_page).locator(".settings-size-btn").nth(0).click()  # Narrow first
    _width_row(wiki_page).locator(".settings-size-btn").nth(1).click()  # Default
    assert _get_layout_padding(wiki_page) == "10%"


def test_wide_sets_layout_padding_5pct(wiki_page):
    _open_settings(wiki_page)
    _width_row(wiki_page).locator(".settings-size-btn").nth(2).click()  # Wide
    assert _get_layout_padding(wiki_page) == "5%"


def test_width_button_gets_active_class(wiki_page):
    _open_settings(wiki_page)
    row = _width_row(wiki_page)
    wide_btn = row.locator(".settings-size-btn").nth(2)
    wide_btn.click()
    assert "active" in wide_btn.get_attribute("class")
    narrow_btn = row.locator(".settings-size-btn").nth(0)
    assert "active" not in narrow_btn.get_attribute("class")


# ── tablet floor (WIKI-378) ─────────────────────────────────────────────────────


def test_wide_has_min_margin_on_tablet_portrait(page, base_url):
    page.set_viewport_size({"width": 768, "height": 1024})
    _go_to_article(page, base_url)

    page.locator("[title='Preferences (,)']:visible").first.click()
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', timeout=5_000)
    _width_row(page).locator(".settings-size-btn").nth(2).click()  # Wide
    page.wait_for_function(
        "() => document.documentElement.style.getPropertyValue('--layout-padding').trim() === '5%'"
    )

    margin = page.evaluate("""() => {
        const r = document.querySelector('.content-main').getBoundingClientRect();
        return Math.min(r.left, window.innerWidth - r.right);
    }""")
    assert margin >= 40 - 1, f"Wide content-width margin too small on tablet: {margin}px"


# ── persistence ────────────────────────────────────────────────────────────────


def test_content_width_persists_across_reload(wiki_page, base_url):
    _open_settings(wiki_page)
    _width_row(wiki_page).locator(".settings-size-btn").nth(0).click()  # Narrow
    wiki_page.wait_for_function(
        "() => document.documentElement.style.getPropertyValue('--layout-padding').trim() === '20%'"
    )

    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).contentWidth"
    )
    assert stored == "Narrow"

    wiki_page.reload(wait_until="domcontentloaded")
    wiki_page.wait_for_selector(".wiki-card", timeout=8_000)

    stored_after = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).contentWidth"
    )
    assert stored_after == "Narrow"

    padding = _get_layout_padding(wiki_page)
    assert padding == "20%"
