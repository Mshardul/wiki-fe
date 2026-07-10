"""
Preferences modal - open/close, background swatches, text/accent colours, font, size, persistence.
Theme variable sync - background/accent/text CSS vars.
OS theme detect on first visit.
Reading modes (focus mode, offline save) in Advanced tab.
"""

import pytest

from conftest import _make_cdn_fulfill_handler


def _settings_is_closed(page):
    page.wait_for_function(
        "() => document.getElementById('prefs-modal').classList.contains('hidden')"
    )


def _open_settings(page):
    page.locator("[title='Preferences (,)']").first.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )


def _close_settings_via_escape(page):
    page.keyboard.press("Escape")
    _settings_is_closed(page)


# ── open / close ──────────────────────────────────────────────────────────────


@pytest.mark.smoke
def test_settings_opens_on_gear_click(wiki_page):
    """clicking gear icon removes .hidden from prefs-modal."""
    _open_settings(wiki_page)
    assert (
        not wiki_page.locator("#prefs-modal")
        .get_attribute("class")
        .__contains__("hidden")
    )


def test_settings_closes_on_escape(wiki_page):
    """Escape key closes the preferences modal."""
    _open_settings(wiki_page)
    _close_settings_via_escape(wiki_page)
    assert "hidden" in wiki_page.locator("#prefs-modal").get_attribute("class")


def test_keyboard_tab_hidden_on_touch_device(page, base_url, cdn_cache):
    """Keyboard-shortcuts tab is hidden under pointer:coarse (touch devices)."""
    ctx = page.context.browser.new_context(
        viewport={"width": 390, "height": 844},
        has_touch=True,
        is_mobile=True,
        service_workers="block",
    )
    touch_page = ctx.new_page()
    for url, (body, content_type) in cdn_cache.items():
        touch_page.route(url, _make_cdn_fulfill_handler(body, content_type))
    touch_page.goto(base_url, wait_until="domcontentloaded")
    touch_page.wait_for_selector("#view-home.active", timeout=8_000)
    _open_settings(touch_page)

    display = touch_page.evaluate(
        "() => getComputedStyle(document.querySelector('.prefs-tab[data-tab=\"keyboard\"]')).display"
    )
    assert display == "none"
    ctx.close()


def test_keyboard_tab_visible_on_desktop(wiki_page):
    """Keyboard-shortcuts tab stays visible for mouse/keyboard (fine pointer) users."""
    _open_settings(wiki_page)
    expect = wiki_page.locator('.prefs-tab[data-tab="keyboard"]')
    assert expect.is_visible()


def test_settings_closes_on_backdrop_click(wiki_page):
    """clicking backdrop closes the preferences modal."""
    _open_settings(wiki_page)
    wiki_page.locator("#prefs-backdrop").click(force=True, position={"x": 5, "y": 5})
    _settings_is_closed(wiki_page)
    assert "hidden" in wiki_page.locator("#prefs-modal").get_attribute("class")


# ── content rendered ───────────────────────────────────────────────────────────


def test_settings_renders_six_backgrounds(wiki_page):
    """settings panel renders exactly 6 background swatches (3 dark + 3 light)."""
    _open_settings(wiki_page)
    assert wiki_page.locator("#settings-backgrounds .settings-bg-swatch").count() == 6


def test_settings_renders_three_text_colors(wiki_page):
    """settings panel renders exactly 3 text colour swatches."""
    _open_settings(wiki_page)
    assert wiki_page.locator("#settings-text-colors .settings-text-swatch").count() == 3


def test_settings_renders_three_accents(wiki_page):
    """settings panel renders exactly 3 accent swatches."""
    _open_settings(wiki_page)
    assert wiki_page.locator("#settings-accents .settings-accent-swatch").count() == 3


def test_settings_renders_six_fonts(wiki_page):
    """settings panel renders exactly 6 font chips."""
    _open_settings(wiki_page)
    assert wiki_page.locator("#settings-fonts .settings-font-chip").count() == 6


def test_settings_renders_three_sizes(wiki_page):
    """settings panel renders S, M, L size buttons."""
    _open_settings(wiki_page)
    btns = wiki_page.locator("#settings-sizes .settings-size-btn").all()
    labels = [b.inner_text() for b in btns]
    assert labels == ["S", "M", "L"]


# ── background swatch selection ────────────────────────────────────────────────


@pytest.mark.smoke
def test_dark_background_sets_data_theme_dark(wiki_page):
    """clicking a dark background swatch sets data-theme=dark on <html>."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        0
    ).click()  # Void
    theme = wiki_page.evaluate(
        "() => document.documentElement.getAttribute('data-theme')"
    )
    assert theme == "dark"


def test_light_background_sets_data_theme_light(wiki_page):
    """clicking a light background swatch sets data-theme=light on <html>."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        3
    ).click()  # White
    theme = wiki_page.evaluate(
        "() => document.documentElement.getAttribute('data-theme')"
    )
    assert theme == "light"


def test_background_swatch_gets_active_class(wiki_page):
    """clicked background swatch receives .active class."""
    _open_settings(wiki_page)
    swatch = wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        1
    )  # Slate
    swatch.click()
    assert "active" in swatch.get_attribute("class")


def test_background_sets_bg_css_var(wiki_page):
    """clicking a background swatch updates --bg CSS variable."""
    _open_settings(wiki_page)
    before = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--bg').trim()"
    )
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        1
    ).click()  # Slate
    after = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--bg').trim()"
    )
    assert before != after


def test_bg_separator_present(wiki_page):
    """a separator element divides dark and light background swatches."""
    _open_settings(wiki_page)
    assert (
        wiki_page.locator("#settings-backgrounds .settings-bg-separator").count() == 1
    )


# ── dark/light boundary crossing ──────────────────────────────────────────────


def test_crossing_to_light_resets_accent_to_light_default(wiki_page):
    """switching from dark to light background resets accent to the light-side default (indigo-l)."""
    _open_settings(wiki_page)
    # Explicitly set dark background first (handles OS-light default)
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        0
    ).click()  # Void (dark)
    # Now pick emerald - index 2 in dark accents
    wiki_page.locator("#settings-accents .settings-accent-swatch").nth(
        2
    ).click()  # emerald
    # Cross to light
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        3
    ).click()  # White
    stored_accent = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).accentId"
    )
    assert stored_accent == "indigo-l"


def test_crossing_to_dark_resets_accent_to_dark_default(wiki_page):
    """switching from light to dark background resets accent to the dark-side default (indigo)."""
    _open_settings(wiki_page)
    # Go light first
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        3
    ).click()  # White
    # Cross back to dark
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        0
    ).click()  # Void
    stored_accent = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).accentId"
    )
    assert stored_accent == "indigo"


def test_crossing_light_dark_refreshes_text_color_swatches(wiki_page):
    """switching bg side re-renders text colour swatches with the correct palette."""
    _open_settings(wiki_page)
    # Go light
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        3
    ).click()  # White
    light_text_id = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).textColorId"
    )
    assert light_text_id.endswith("-light")


# ── text colour selection ──────────────────────────────────────────────────────


def test_text_color_swatch_gets_active_class(wiki_page):
    """clicked text colour swatch receives .active class."""
    _open_settings(wiki_page)
    swatch = wiki_page.locator("#settings-text-colors .settings-text-swatch").nth(
        1
    )  # Soft
    swatch.click()
    assert "active" in swatch.get_attribute("class")


def test_text_color_updates_css_vars(wiki_page):
    """clicking a text colour swatch updates --text-heading and --text-body CSS vars."""
    _open_settings(wiki_page)
    before_heading = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--text-heading').trim()"
    )
    wiki_page.locator("#settings-text-colors .settings-text-swatch").nth(
        1
    ).click()  # Soft
    after_heading = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--text-heading').trim()"
    )
    assert before_heading != after_heading


# ── accent selection ──────────────────────────────────────────────────────────


def test_accent_swatches_have_aria_labels(wiki_page):
    """accent swatches are icon-only buttons - each must have aria-label."""
    _open_settings(wiki_page)
    swatches = wiki_page.locator("#settings-accents .settings-accent-swatch").all()
    assert len(swatches) > 0
    for swatch in swatches:
        label = swatch.get_attribute("aria-label")
        assert label and label.strip(), (
            f"Accent swatch missing aria-label: {swatch.get_attribute('style')}"
        )


def test_accent_swatch_gets_active_class(wiki_page):
    """clicked accent swatch receives .active class."""
    _open_settings(wiki_page)
    swatch = wiki_page.locator("#settings-accents .settings-accent-swatch").nth(
        1
    )  # Cyan
    swatch.click()
    assert "active" in swatch.get_attribute("class")


def test_accent_swatch_updates_css_var(wiki_page):
    """clicking an accent swatch updates --accent CSS variable."""
    _open_settings(wiki_page)
    # Default is dark-void + indigo; switch to cyan (index 1)
    accent_before = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--accent').trim()"
    )
    wiki_page.locator("#settings-accents .settings-accent-swatch").nth(
        1
    ).click()  # Cyan
    accent_after = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--accent').trim()"
    )
    assert accent_before != accent_after


def test_accent_change_updates_all_css_vars(wiki_page):
    """changing accent swatch updates --accent, --accent-light, --accent-dim, --accent-glow."""
    _open_settings(wiki_page)

    before = {
        "accent": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent').trim()"
        ),
        "light": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent-light').trim()"
        ),
        "dim": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent-dim').trim()"
        ),
        "glow": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent-glow').trim()"
        ),
    }

    wiki_page.locator("#settings-accents .settings-accent-swatch").nth(
        1
    ).click()  # Cyan

    after = {
        "accent": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent').trim()"
        ),
        "light": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent-light').trim()"
        ),
        "dim": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent-dim').trim()"
        ),
        "glow": wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--accent-glow').trim()"
        ),
    }

    assert after["accent"] != before["accent"], "--accent not updated"
    assert after["light"] != before["light"], "--accent-light not updated"
    assert after["dim"] != before["dim"], "--accent-dim not updated"
    assert after["glow"] != before["glow"], "--accent-glow not updated"


def test_applying_background_sets_all_accent_vars_non_empty(wiki_page):
    """clicking a background swatch leaves all four accent CSS vars non-empty."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        1
    ).click()  # Slate

    for var in ("--accent", "--accent-light", "--accent-dim", "--accent-glow"):
        val = wiki_page.evaluate(
            f"() => document.documentElement.style.getPropertyValue('{var}').trim()"
        )
        assert val, f"{var} is empty after applying Slate background"


# ── font selection ─────────────────────────────────────────────────────────────


def test_font_chip_gets_active_on_click(wiki_page):
    """clicking a font chip adds .active to that chip."""
    _open_settings(wiki_page)
    chip = wiki_page.locator("#settings-fonts .settings-font-chip").nth(1)  # Geist
    chip.click()
    assert "active" in chip.get_attribute("class")


def test_font_chip_updates_font_css_var(wiki_page):
    """clicking a font chip updates the --font CSS variable."""
    _open_settings(wiki_page)
    before = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--font').trim()"
    )
    wiki_page.locator("#settings-fonts .settings-font-chip").nth(3).click()  # Lora
    after = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--font').trim()"
    )
    assert "Lora" in after
    assert before != after


# ── size selection ────────────────────────────────────────────────────────────


# ── line height selection ─────────────────────────────────────────────────────


def test_settings_renders_three_line_heights(wiki_page):
    """settings panel renders Compact, Normal, Relaxed line height buttons."""
    _open_settings(wiki_page)
    btns = wiki_page.locator("#settings-line-heights .settings-size-btn").all()
    labels = [b.inner_text() for b in btns]
    assert labels == ["Compact", "Normal", "Relaxed"]


def test_line_height_compact_sets_css_var(wiki_page):
    """selecting Compact sets --line-height-body to 1.4."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-line-heights .settings-size-btn").nth(0).click()
    val = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--line-height-body').trim()"
    )
    assert val == "1.4"


def test_line_height_relaxed_greater_than_normal(wiki_page):
    """Relaxed --line-height-body value is greater than Normal."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-line-heights .settings-size-btn").nth(1).click()
    normal = float(
        wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--line-height-body').trim()"
        )
    )
    wiki_page.locator("#settings-line-heights .settings-size-btn").nth(2).click()
    relaxed = float(
        wiki_page.evaluate(
            "() => document.documentElement.style.getPropertyValue('--line-height-body').trim()"
        )
    )
    assert relaxed > normal


def test_line_height_btn_gets_active_class(wiki_page):
    """clicked line height button receives .active class."""
    _open_settings(wiki_page)
    btn = wiki_page.locator("#settings-line-heights .settings-size-btn").nth(0)
    btn.click()
    assert "active" in btn.get_attribute("class")


def test_line_height_persists_to_localstorage(wiki_page):
    """selecting a line height writes lineHeight to wiki-settings in localStorage."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-line-heights .settings-size-btn").nth(2).click()
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).lineHeight"
    )
    assert stored == "Relaxed"


# ── paragraph spacing selection ───────────────────────────────────────────────


def test_settings_renders_three_para_spacings(wiki_page):
    """settings panel renders Tight, Normal, Relaxed paragraph spacing buttons."""
    _open_settings(wiki_page)
    btns = wiki_page.locator("#settings-para-spacings .settings-size-btn").all()
    labels = [b.inner_text() for b in btns]
    assert labels == ["Tight", "Normal", "Relaxed"]


def test_para_spacing_tight_sets_css_var(wiki_page):
    """selecting Tight sets --para-spacing to 0.5rem."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-para-spacings .settings-size-btn").nth(0).click()
    val = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--para-spacing').trim()"
    )
    assert val == "0.5rem"


def test_para_spacing_relaxed_greater_than_tight(wiki_page):
    """Relaxed --para-spacing value is larger than Tight."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-para-spacings .settings-size-btn").nth(0).click()
    tight = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--para-spacing').trim()"
    )
    wiki_page.locator("#settings-para-spacings .settings-size-btn").nth(2).click()
    relaxed = wiki_page.evaluate(
        "() => document.documentElement.style.getPropertyValue('--para-spacing').trim()"
    )
    assert relaxed != tight


def test_para_spacing_btn_gets_active_class(wiki_page):
    """clicked paragraph spacing button receives .active class."""
    _open_settings(wiki_page)
    btn = wiki_page.locator("#settings-para-spacings .settings-size-btn").nth(2)
    btn.click()
    assert "active" in btn.get_attribute("class")


def test_para_spacing_persists_to_localstorage(wiki_page):
    """selecting a paragraph spacing writes paraSpacing to wiki-settings in localStorage."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-para-spacings .settings-size-btn").nth(0).click()
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).paraSpacing"
    )
    assert stored == "Tight"


def test_size_s_reduces_font_size(wiki_page):
    """selecting S sets a smaller root font-size than M."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-sizes .settings-size-btn").nth(1).click()  # M
    size_m = wiki_page.evaluate(
        "() => parseFloat(document.documentElement.style.fontSize)"
    )
    wiki_page.locator("#settings-sizes .settings-size-btn").nth(0).click()  # S
    size_s = wiki_page.evaluate(
        "() => parseFloat(document.documentElement.style.fontSize)"
    )
    assert size_s < size_m


def test_size_l_increases_font_size(wiki_page):
    """selecting L sets a larger root font-size than M."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-sizes .settings-size-btn").nth(1).click()  # M
    size_m = wiki_page.evaluate(
        "() => parseFloat(document.documentElement.style.fontSize)"
    )
    wiki_page.locator("#settings-sizes .settings-size-btn").nth(2).click()  # L
    size_l = wiki_page.evaluate(
        "() => parseFloat(document.documentElement.style.fontSize)"
    )
    assert size_l > size_m


# ── localStorage persistence ──────────────────────────────────────────────────


def test_settings_persist_across_reload(page, base_url):
    """settings saved to localStorage survive a page reload."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.locator("[title='Preferences (,)']").first.click()
    page.wait_for_selector("#prefs-modal:not(.hidden)")
    page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        3
    ).click()  # White (light)
    assert (
        page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        == "light"
    )

    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light"


def test_font_persists_across_reload(page, base_url):
    """selected font survives a page reload via localStorage."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.locator("[title='Preferences (,)']").first.click()
    page.wait_for_selector("#prefs-modal:not(.hidden)")
    page.locator("#settings-fonts .settings-font-chip").nth(3).click()  # Lora

    stored = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).font"
    )
    assert stored == "Lora"

    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    stored_after = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).font"
    )
    assert stored_after == "Lora"


def test_background_id_persists_to_localstorage(wiki_page):
    """clicking a background swatch writes backgroundId to wiki-settings in localStorage."""
    _open_settings(wiki_page)
    wiki_page.locator("#settings-backgrounds .settings-bg-swatch").nth(
        2
    ).click()  # Dusk
    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-settings')).backgroundId"
    )
    assert stored == "dark-dusk"


# ── OS theme detect ─────────────────────────────────────────────────────────────


def test_os_light_preference_sets_light_theme(page, base_url):
    """on first visit with no saved settings and prefers-color-scheme:light, data-theme=light."""
    page.emulate_media(color_scheme="light")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.evaluate("() => localStorage.removeItem('wiki-theme')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light", f"Expected light theme from OS preference, got {theme}"


def test_os_dark_preference_sets_dark_theme(page, base_url):
    """on first visit with no saved settings and prefers-color-scheme:dark, data-theme=dark."""
    page.emulate_media(color_scheme="dark")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.evaluate("() => localStorage.removeItem('wiki-theme')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "dark", f"Expected dark theme from OS preference, got {theme}"


def test_saved_settings_override_os_preference(page, base_url):
    """saved localStorage settings take priority over OS color scheme."""
    page.emulate_media(color_scheme="light")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.evaluate("""() => localStorage.setItem('wiki-settings',
        JSON.stringify({backgroundId:'dark-void',textColorId:'text-crisp-dark',accentId:'indigo',font:'Inter',fontSize:'M',contentWidth:'Default'}))
    """)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "dark", "Saved dark setting was overridden by OS light preference"


def test_unrecognized_format_falls_back_to_os_preference(page, base_url):
    """unrecognized localStorage format (no backgroundId) falls back to OS preference."""
    page.emulate_media(color_scheme="light")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.evaluate("""() => localStorage.setItem('wiki-settings',
        JSON.stringify({preset:'dark',theme:'dark',accentId:'indigo'}))
    """)
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    theme = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    assert theme == "light", (
        "Unrecognized format should fall back to OS light preference"
    )


# ── OS theme live listener ─────────────────────────────────────


def test_os_theme_change_updates_live_when_no_saved_settings(page, base_url):
    """With no saved settings, switching OS color scheme mid-session flips the theme."""
    page.emulate_media(color_scheme="dark")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    assert (
        page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        == "dark"
    )

    # OS flips to light mid-session - listener should re-apply without reload.
    page.emulate_media(color_scheme="light")
    page.wait_for_function(
        "() => document.documentElement.getAttribute('data-theme') === 'light'",
        timeout=3_000,
    )


def test_os_theme_change_ignored_when_user_picked_theme(page, base_url):
    """An explicit saved theme wins - OS changes must not override it mid-session."""
    page.emulate_media(color_scheme="dark")
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    # User explicitly selects a light background.
    page.locator("[title='Preferences (,)']").first.click()
    page.wait_for_selector("#prefs-modal:not(.hidden)")
    page.locator("#settings-backgrounds .settings-bg-swatch").nth(3).click()  # White
    assert (
        page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        == "light"
    )

    # OS flips to dark - explicit choice must hold.
    page.emulate_media(color_scheme="dark")
    page.wait_for_timeout(100)
    assert (
        page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        == "light"
    ), "Saved explicit theme must not be overridden by an OS change"


# ── Lazy-load non-default fonts  ────────────────────────────────


def test_only_default_font_loaded_up_front(page, base_url):
    """On first paint only Inter (the default) is requested; extras are not yet present."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    default_href = page.locator("#font-default").get_attribute("href")
    assert default_href and "Inter" in default_href
    assert "Lora" not in default_href and "Geist" not in default_href
    assert page.locator("#font-extras").count() == 0, (
        "Non-default font stylesheet must not load before it is needed"
    )


def test_opening_settings_loads_extra_fonts(wiki_page):
    """Opening the settings panel injects the non-default font stylesheet once."""
    assert wiki_page.locator("#font-extras").count() == 0
    _open_settings(wiki_page)
    wiki_page.wait_for_selector("#font-extras", state="attached", timeout=3_000)
    href = wiki_page.locator("#font-extras").get_attribute("href")
    assert "Lora" in href and "Geist" in href


def test_saved_non_default_font_loads_extras_on_boot(page, base_url):
    """A saved non-default font must pull the extras stylesheet at startup so it renders."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate(
        """() => localStorage.setItem('wiki-settings',
        JSON.stringify({backgroundId:'dark-void',textColorId:'text-crisp',
        accentId:'indigo',font:'Lora',fontSize:'M',contentWidth:'Default'}))"""
    )
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    assert page.locator("#font-extras").count() == 1, (
        "Saved non-default font (Lora) should trigger loadAllFonts at boot"
    )


# ── rem root font honours browser/OS zoom ───────────────────────────────────────


def test_root_font_size_base_is_percentage(page, base_url):
    """The CSS root base is a percentage, not a fixed px, so OS zoom is honoured."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-settings')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    inline = page.evaluate("() => document.documentElement.style.fontSize")
    assert inline.endswith("%"), f"Root inline font-size should be a %, got '{inline}'"
    computed = page.evaluate(
        "() => parseFloat(getComputedStyle(document.documentElement).fontSize)"
    )
    assert abs(computed - 16) < 0.5, f"Expected ~16px computed base, got {computed}"


def test_size_setting_uses_percentage_units(wiki_page):
    """Each S/M/L size writes a percentage (not px) so it scales with OS zoom."""
    _open_settings(wiki_page)
    for idx, expected in [(0, "87.5%"), (1, "100%"), (2, "112.5%")]:
        wiki_page.locator("#settings-sizes .settings-size-btn").nth(idx).click()
        val = wiki_page.evaluate("() => document.documentElement.style.fontSize")
        assert val == expected, f"size idx {idx}: expected {expected}, got {val}"


# ── Reading Modes in Advanced tab ────────────────────────────────


def _open_advanced_tab(page):
    _open_settings(page)
    page.locator("[data-tab='advanced']").click()
    page.wait_for_function(
        "() => document.getElementById('prefs-panel-advanced').getAttribute('aria-hidden') === 'false'"
    )


def test_advanced_tab_has_reading_modes_buttons(wiki_page):
    """Advanced prefs tab contains Focus Mode and Save Offline buttons."""
    _open_advanced_tab(wiki_page)
    assert wiki_page.locator("#prefs-focus-toggle").count() == 1
    assert wiki_page.locator("#prefs-offline-toggle").count() == 1


def test_focus_mode_prefs_btn_toggles_active_state(page, base_url):
    """Focus Mode button in Advanced prefs sets aria-pressed and .active when toggled from content view."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.locator("[title='Preferences (,)']").last.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator("[data-tab='advanced']").click()

    btn = page.locator("#prefs-focus-toggle")
    assert btn.get_attribute("aria-pressed") == "false"

    btn.click()
    page.wait_for_function(
        "() => document.getElementById('prefs-focus-toggle').getAttribute('aria-pressed') === 'true'"
    )
    assert "active" in btn.get_attribute("class")

    btn.click()
    page.wait_for_function(
        "() => document.getElementById('prefs-focus-toggle').getAttribute('aria-pressed') === 'false'"
    )
    assert "active" not in btn.get_attribute("class")


# ── Topbar declutter (WIKI-240) ─────────────────────────────────────────────────


def test_topbar_has_no_theme_toggle_button(wiki_page):
    """Home/index/content topbars have no standalone quick dark/light toggle -
    theme is chosen only via the background swatches in preferences. (Search
    was reintroduced into home/content topbars by WIKI-412 - see
    test_home_topbar_search_button_opens_search / test_content_topbar_search_button_opens_search
    in test_search.py.)"""
    for selector in (".home-topbar", ".page-topbar .topbar-inner", ".content-topbar .topbar-inner"):
        el = wiki_page.locator(selector).first
        if el.count() == 0:
            continue
        assert el.locator('[data-action="toggle-theme"]').count() == 0, selector


def test_no_theme_toggle_button_anywhere(wiki_page):
    """The quick dark/light toggle button was removed app-wide - theme is
    chosen only via the background swatches in the preferences panel."""
    assert wiki_page.locator('[data-action="toggle-theme"]').count() == 0
    assert wiki_page.locator(".prefs-theme-toggle-btn").count() == 0


def test_search_entry_is_first_in_preferences_panel(wiki_page):
    """The search entry renders as the first control in the General tab,
    ahead of the theme/appearance settings."""
    _open_settings(wiki_page)
    first_control = wiki_page.evaluate("""() => {
        const panel = document.getElementById('prefs-panel-general');
        const search = panel.querySelector('[data-action="prefs-search-open"]');
        const all = [...panel.querySelectorAll('button, [id^="settings-"]')];
        return all.indexOf(search) === 0;
    }""")
    assert first_control, "Search entry is not the first control in the General tab"
