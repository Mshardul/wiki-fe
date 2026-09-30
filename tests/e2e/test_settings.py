import pytest

# Not ported to the PreferencesModal UI: haptic-feedback toggle, Advanced-tab Focus Mode/Save Offline buttons (focus mode is hotkey-only via `f`), font-extras lazy stylesheet, accent-swatch aria-labels, bg-side separator, paragraph-spacing picker (paraSpacing stays in the schema, no UI).


def _settings_is_open(page):
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', timeout=5_000)


def _settings_is_closed(page):
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', state="detached")


def _open_settings(page):
    page.locator("[title='Preferences (,)']:visible").first.click()
    _settings_is_open(page)


def _close_settings_via_escape(page):
    page.keyboard.press("Escape")
    _settings_is_closed(page)


def _prefs_dialog(page):
    return page.locator('[role="dialog"][aria-label="Preferences"]')


def _swatch_row(page, label):
    return _prefs_dialog(page).locator(
        f"xpath=.//div[contains(@class,'prefs-section')][.//div[contains(@class,'prefs-section-label') and normalize-space()='{label}']]"
    )


# ── open / close ──────────────────────────────────────────────────────────────


@pytest.mark.smoke
def test_settings_opens_on_gear_click(wiki_page):
    _open_settings(wiki_page)
    assert _prefs_dialog(wiki_page).count() == 1


def test_settings_closes_on_escape(wiki_page):
    _open_settings(wiki_page)
    _close_settings_via_escape(wiki_page)
    assert _prefs_dialog(wiki_page).count() == 0


def test_keyboard_tab_visible_on_desktop(wiki_page):
    _open_settings(wiki_page)
    tab = wiki_page.get_by_role("tab", name="Shortcuts")
    assert tab.is_visible()


def test_settings_closes_on_backdrop_click(wiki_page):
    _open_settings(wiki_page)
    wiki_page.locator(".prefs-modal").click(force=True, position={"x": 5, "y": 5})
    _settings_is_closed(wiki_page)


# ── content rendered ───────────────────────────────────────────────────────────


def test_settings_renders_three_backgrounds_for_current_side(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Background")
    assert row.locator(".settings-size-btn").count() == 3


def test_settings_renders_three_text_colors(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Text colour")
    assert row.locator(".settings-size-btn").count() == 3


def test_settings_renders_three_accents(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Accent")
    assert row.locator(".settings-size-btn").count() == 3


def test_settings_renders_six_fonts(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Font")
    assert row.locator(".settings-size-btn").count() == 6


def test_settings_renders_three_sizes(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Font size")
    labels = [b.inner_text() for b in row.locator(".settings-size-btn").all()]
    assert labels == ["Small", "Medium", "Large"]


# ── theme (dark/light) toggle ──────────────────────────────────────────────────


@pytest.mark.smoke
def test_dark_theme_button_sets_data_theme_dark(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Dark").click()
    theme = wiki_page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "dark"


def test_light_theme_button_sets_data_theme_light(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Light").click()
    theme = wiki_page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light"


def test_theme_button_gets_active_class(wiki_page):
    _open_settings(wiki_page)
    btn = _swatch_row(wiki_page, "Theme").get_by_role("button", name="Light")
    btn.click()
    assert "active" in btn.get_attribute("class")
    assert btn.get_attribute("aria-pressed") == "true"


# ── background swatch selection ────────────────────────────────────────────────


def test_background_swatch_gets_active_class(wiki_page):
    _open_settings(wiki_page)
    swatch = _swatch_row(wiki_page, "Background").locator(".settings-size-btn").nth(1)
    swatch.click()
    assert "active" in swatch.get_attribute("class")


def test_background_sets_bg_css_var(wiki_page):
    _open_settings(wiki_page)
    before = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--bg').trim()"
    )
    _swatch_row(wiki_page, "Background").locator(".settings-size-btn").nth(1).click()
    after = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--bg').trim()"
    )
    assert before != after


# ── dark/light boundary crossing ──────────────────────────────────────────────


def test_crossing_to_light_resets_accent_to_light_default(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Dark").click()
    _swatch_row(wiki_page, "Accent").locator(".settings-size-btn").nth(2).click()  # Emerald
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Light").click()
    stored_accent = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).accentId"
    )
    assert stored_accent == "indigo-l"


def test_crossing_to_dark_resets_accent_to_dark_default(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Light").click()
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Dark").click()
    stored_accent = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).accentId"
    )
    assert stored_accent == "indigo"


def test_crossing_light_dark_refreshes_text_color_swatches(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Light").click()
    light_text_id = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).textColorId"
    )
    assert light_text_id.endswith("-light")


# ── text colour selection ──────────────────────────────────────────────────────


def test_text_color_swatch_gets_active_class(wiki_page):
    _open_settings(wiki_page)
    swatch = _swatch_row(wiki_page, "Text colour").locator(".settings-size-btn").nth(1)  # Soft
    swatch.click()
    assert "active" in swatch.get_attribute("class")


def test_text_color_updates_css_vars(wiki_page):
    _open_settings(wiki_page)
    before_heading = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--text-heading').trim()"
    )
    _swatch_row(wiki_page, "Text colour").locator(".settings-size-btn").nth(1).click()  # Soft
    after_heading = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--text-heading').trim()"
    )
    assert before_heading != after_heading


# ── accent selection ──────────────────────────────────────────────────────────


def test_accent_swatch_gets_active_class(wiki_page):
    _open_settings(wiki_page)
    swatch = _swatch_row(wiki_page, "Accent").locator(".settings-size-btn").nth(1)  # Cyan
    swatch.click()
    assert "active" in swatch.get_attribute("class")


def test_accent_swatch_updates_css_var(wiki_page):
    _open_settings(wiki_page)
    accent_before = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--accent').trim()"
    )
    _swatch_row(wiki_page, "Accent").locator(".settings-size-btn").nth(1).click()  # Cyan
    accent_after = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--accent').trim()"
    )
    assert accent_before != accent_after


def test_accent_change_updates_all_css_vars(wiki_page):
    _open_settings(wiki_page)

    def snapshot():
        return {
            v: wiki_page.evaluate(
                f"() => document.documentElement.style.getPropertyValue('--{v}').trim()"
            )
            for v in ("accent", "accent-light", "accent-dim", "accent-glow")
        }

    before = snapshot()
    _swatch_row(wiki_page, "Accent").locator(".settings-size-btn").nth(1).click()  # Cyan
    after = snapshot()

    for v in before:
        assert after[v] != before[v], f"--{v} not updated"


def test_applying_background_sets_all_accent_vars_non_empty(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Background").locator(".settings-size-btn").nth(1).click()

    for var in ("--accent", "--accent-light", "--accent-dim", "--accent-glow"):
        val = wiki_page.evaluate(
            f"() => document.documentElement.style.getPropertyValue('{var}').trim()"
        )
        assert val, f"{var} is empty after applying a background"


# ── font selection ─────────────────────────────────────────────────────────────


def test_font_chip_gets_active_on_click(wiki_page):
    _open_settings(wiki_page)
    chip = _swatch_row(wiki_page, "Font").locator(".settings-size-btn").nth(1)  # Geist
    chip.click()
    assert "active" in chip.get_attribute("class")


def test_font_chip_updates_font_css_var(wiki_page):
    _open_settings(wiki_page)
    before = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--font').trim()"
    )
    _swatch_row(wiki_page, "Font").locator(".settings-size-btn").nth(3).click()  # Lora
    after = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--font').trim()"
    )
    assert "Lora" in after
    assert before != after


# ── line height selection ─────────────────────────────────────────────────────


def test_settings_renders_three_line_heights(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Line height")
    labels = [b.inner_text() for b in row.locator(".settings-size-btn").all()]
    assert labels == ["Tight", "Normal", "Relaxed"]


def test_line_height_tight_sets_css_var(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Line height").locator(".settings-size-btn").nth(0).click()
    val = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--line-height').trim()"
    )
    assert val == "1.5"


def test_line_height_relaxed_greater_than_normal(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Line height")
    row.locator(".settings-size-btn").nth(1).click()
    normal = float(
        wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--line-height').trim()"
        )
    )
    row.locator(".settings-size-btn").nth(2).click()
    relaxed = float(
        wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--line-height').trim()"
        )
    )
    assert relaxed > normal


def test_line_height_btn_gets_active_class(wiki_page):
    _open_settings(wiki_page)
    btn = _swatch_row(wiki_page, "Line height").locator(".settings-size-btn").nth(0)
    btn.click()
    assert "active" in btn.get_attribute("class")


def test_line_height_persists_to_localstorage(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Line height").locator(".settings-size-btn").nth(2).click()
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).lineHeight"
    )
    assert stored == "Relaxed"


# ── content width selection ───────────────────────────────────────────────────


def test_settings_renders_three_content_widths(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Content width")
    labels = [b.inner_text() for b in row.locator(".settings-size-btn").all()]
    assert labels == ["Narrow", "Default", "Wide"]


def test_content_width_updates_css_var(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Content width")
    row.locator(".settings-size-btn").nth(0).click()  # Narrow
    narrow = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--layout-padding').trim()"
    )
    row.locator(".settings-size-btn").nth(2).click()  # Wide
    wide = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--layout-padding').trim()"
    )
    assert narrow != wide


def test_content_width_persists_to_localstorage(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Content width").locator(".settings-size-btn").nth(0).click()
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).contentWidth"
    )
    assert stored == "Narrow"


def test_size_s_reduces_font_size(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Font size")
    row.locator(".settings-size-btn").nth(1).click()  # Medium
    size_m = wiki_page.evaluate("() => parseFloat(document.documentElement.style.fontSize)")
    row.locator(".settings-size-btn").nth(0).click()  # Small
    size_s = wiki_page.evaluate("() => parseFloat(document.documentElement.style.fontSize)")
    assert size_s < size_m


def test_size_l_increases_font_size(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Font size")
    row.locator(".settings-size-btn").nth(1).click()  # Medium
    size_m = wiki_page.evaluate("() => parseFloat(document.documentElement.style.fontSize)")
    row.locator(".settings-size-btn").nth(2).click()  # Large
    size_l = wiki_page.evaluate("() => parseFloat(document.documentElement.style.fontSize)")
    assert size_l > size_m


# ── localStorage persistence ──────────────────────────────────────────────────


def test_settings_persist_across_reload(wiki_page, base_url):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Light").click()
    assert (
        wiki_page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        == "light"
    )

    wiki_page.reload(wait_until="domcontentloaded")
    wiki_page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    theme = wiki_page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light"


def test_font_persists_across_reload(wiki_page, base_url):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Font").locator(".settings-size-btn").nth(3).click()  # Lora

    stored = wiki_page.evaluate("() => JSON.parse(localStorage.getItem('wiki-settings')).font")
    assert stored == "Lora"

    wiki_page.reload(wait_until="domcontentloaded")
    wiki_page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    stored_after = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).font"
    )
    assert stored_after == "Lora"


def test_background_id_persists_to_localstorage(wiki_page):
    _open_settings(wiki_page)
    _swatch_row(wiki_page, "Theme").get_by_role("button", name="Dark").click()
    _swatch_row(wiki_page, "Background").locator(".settings-size-btn").nth(2).click()  # Dusk
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).backgroundId"
    )
    assert stored == "dark-dusk"


# ── OS theme detect ─────────────────────────────────────────────────────────────


def test_os_light_preference_sets_light_theme(page, base_url):
    page.emulate_media(color_scheme="light")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light", f"Expected light theme from OS preference, got {theme}"


def test_os_dark_preference_sets_dark_theme(page, base_url):
    page.emulate_media(color_scheme="dark")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "dark", f"Expected dark theme from OS preference, got {theme}"


# ── Cross-tab settings sync ───────────────────────────────────────────────────


def test_settings_change_in_other_tab_updates_this_tab(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    tab2 = page.context.new_page()
    tab2.goto(f"{base_url}/", wait_until="domcontentloaded")
    tab2.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    font_before = tab2.evaluate(
        "() => document.documentElement.style.getPropertyValue('--font')"
    )

    page.evaluate(
        """() => {
            const s = JSON.parse(localStorage.getItem('wiki-settings') || '{}');
            s.backgroundId = s.backgroundId || 'dark-void';
            s.font = 'Lora';
            localStorage.setItem('wiki-settings', JSON.stringify(s));
        }"""
    )

    tab2.wait_for_function(
        "(before) => document.documentElement.style.getPropertyValue('--font') !== before",
        arg=font_before,
    )
    font_after = tab2.evaluate(
        "() => document.documentElement.style.getPropertyValue('--font')"
    )
    assert "Lora" in font_after
    tab2.close()


def test_saved_settings_override_os_preference(page, base_url):
    page.emulate_media(color_scheme="light")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    page.evaluate("""() => localStorage.setItem('wiki-settings',
        JSON.stringify({backgroundId:'dark-void',textColorId:'text-crisp-dark',accentId:'indigo',font:'Inter',fontSize:'M',contentWidth:'Default'}))
    """)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "dark", "Saved dark setting was overridden by OS light preference"


def test_unrecognized_format_falls_back_to_os_preference(page, base_url):
    page.emulate_media(color_scheme="light")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    page.evaluate("""() => localStorage.setItem('wiki-settings',
        JSON.stringify({preset:'dark',theme:'dark',accentId:'indigo'}))
    """)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light", (
        "Unrecognized format should fall back to OS light preference"
    )


# ── OS theme live listener ─────────────────────────────────────


def test_os_theme_change_updates_live_when_no_saved_settings(page, base_url):
    page.emulate_media(color_scheme="dark")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    assert (
        page.evaluate("() => document.documentElement.getAttribute('data-theme')") == "dark"
    )

    # OS flips to light mid-session - listener should re-apply without reload.
    page.emulate_media(color_scheme="light")
    page.wait_for_function(
        "() => document.documentElement.getAttribute('data-theme') === 'light'",
        timeout=3_000,
    )


def test_os_theme_change_ignored_when_user_picked_theme(page, base_url):
    page.emulate_media(color_scheme="dark")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    _open_settings(page)
    _swatch_row(page, "Theme").get_by_role("button", name="Light").click()
    assert (
        page.evaluate("() => document.documentElement.getAttribute('data-theme')") == "light"
    )

    # OS flips to dark - explicit choice must hold.
    page.emulate_media(color_scheme="dark")
    page.wait_for_timeout(100)
    assert (
        page.evaluate("() => document.documentElement.getAttribute('data-theme')") == "light"
    ), "Saved explicit theme must not be overridden by an OS change"


# ── rem root font honours browser/OS zoom ───────────────────────────────────────


def test_root_font_size_base_is_percentage(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    inline = page.evaluate("() => document.documentElement.style.fontSize")
    assert inline.endswith("%"), f"Root inline font-size should be a %, got '{inline}'"
    computed = page.evaluate(
        "() => parseFloat(getComputedStyle(document.documentElement).fontSize)"
    )
    assert abs(computed - 16) < 0.5, f"Expected ~16px computed base, got {computed}"


def test_size_setting_uses_percentage_units(wiki_page):
    _open_settings(wiki_page)
    row = _swatch_row(wiki_page, "Font size")
    for idx, expected in [(0, "87.5%"), (1, "100%"), (2, "112.5%")]:
        row.locator(".settings-size-btn").nth(idx).click()
        val = wiki_page.evaluate("() => document.documentElement.style.fontSize")
        assert val == expected, f"size idx {idx}: expected {expected}, got {val}"


def test_auth_and_search_inputs_stay_16px_at_smallest_font_size(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_settings(page)
    _swatch_row(page, "Font size").locator(".settings-size-btn").nth(0).click()  # Small
    page.keyboard.press("Escape")
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', state="detached")

    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+k" if is_mac else "Control+k")
    page.wait_for_selector(".gsearch-input", timeout=5_000)
    search_size = page.evaluate(
        "() => parseFloat(getComputedStyle(document.querySelector('.gsearch-input')).fontSize)"
    )
    assert search_size >= 16, f".gsearch-input font-size under 16px: {search_size}"
    page.keyboard.press("Escape")

    page.locator(".topbar-auth-btn").click()
    page.wait_for_selector('input[aria-label="Password"]', timeout=5_000)
    auth_size = page.evaluate(
        "() => parseFloat(getComputedStyle(document.querySelector('input[aria-label=\"Password\"]')).fontSize)"
    )
    assert auth_size >= 16, f"auth password input font-size under 16px: {auth_size}"


# ── Advanced tab (copy-source-header, practice answers, clear data) ─────────────


def _open_advanced_tab(page):
    _open_settings(page)
    page.get_by_role("tab", name="Advanced").click()


def test_advanced_tab_has_clear_data_and_toggles(wiki_page):
    _open_advanced_tab(wiki_page)
    dialog = _prefs_dialog(wiki_page)
    assert dialog.get_by_text("Copy code with source comment").count() == 1
    assert dialog.get_by_text("Practice problem answers").count() == 1
    assert dialog.get_by_role("button", name="Clear everything").count() == 1


def test_clear_everything_wipes_local_data(wiki_page):
    wiki_page.evaluate(
        """() => localStorage.setItem('wiki-bookmarks',
        JSON.stringify([{wikiId:'dsa',path:'x',slug:'x',title:'X',wikiTitle:'D'}]))"""
    )
    wiki_page.once("dialog", lambda d: d.accept())
    _open_advanced_tab(wiki_page)
    _prefs_dialog(wiki_page).get_by_role("button", name="Clear everything").click()
    stored = wiki_page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    assert stored == "[]"


# ── Focus mode (hotkey-only in Next, no Advanced-tab button) ────────────────────


def test_focus_mode_hotkey_toggles_class_on_markdown_body(page, base_url):
    """`f` on an article toggles .focus-mode on .markdown-body (Advanced-tab button dropped; hotkey-only)."""
    page.goto(f"{base_url}/dsa/patterns/sliding-window/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)

    page.keyboard.press("f")
    page.wait_for_function(
        "() => document.querySelector('.markdown-body')?.classList.contains('focus-mode')"
    )
    page.keyboard.press("f")
    page.wait_for_function(
        "() => !document.querySelector('.markdown-body')?.classList.contains('focus-mode')"
    )


# ── Topbar declutter ─────────────────────────────────────────────────


def test_no_theme_toggle_button_anywhere(wiki_page):
    """The quick dark/light toggle button was removed app-wide - theme is chosen only via the Theme buttons in the preferences panel."""
    assert wiki_page.locator('[data-action="toggle-theme"]').count() == 0
    assert wiki_page.locator(".prefs-theme-toggle-btn").count() == 0


def test_accent_swatch_44px_on_coarse_pointer(browser, base_url):
    ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 390, "height": 844},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        page.goto(f"{base_url}/", wait_until="domcontentloaded")
        page.wait_for_selector(".home-main .wiki-card", timeout=10_000)
        _open_settings(page)
        row = _swatch_row(page, "Accent")
        row.locator(".settings-size-btn").first.wait_for(timeout=5_000)

        size = row.locator(".settings-size-btn").first.evaluate(
            "(el) => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; }"
        )
        assert size["height"] >= 44, f"accent option height too small: {size['height']}px"
    finally:
        ctx.close()


def test_corrupt_settings_json_falls_back_to_defaults(page, base_url):
    """Invalid wiki-settings JSON does not crash the app - getJSON silently falls back to DEFAULT_SETTINGS (no reset-toast behaviour ported; the vanilla version showed one)."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.setItem('wiki-settings', '{not-json')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme in ("dark", "light")
    # the corrupt string is left in place - getJSON tolerates it on every read, nothing clears it.
    assert page.evaluate("() => localStorage.getItem('wiki-settings')") == "{not-json"
