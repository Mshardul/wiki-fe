"""
UX, hotkeys, and error handling:
- fetchText distinguishes 404 from network errors
- broken slug shows toast before redirecting home
- focus mode button shows active state
- = / - hotkeys change font size
- D key toggles distraction-free mode
"""


def _go_to_article(page, base_url, slug="system-design/caching"):
    page.goto(f"{base_url}/#{slug}", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


# ── Specific fetch errors ────────────────────────────────────────


def test_404_shows_not_found_message(page, base_url):
    """A 404 response shows 'not found' in the error message, not a generic HTTP error."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.route("**/nonexistent.md", lambda r: r.fulfill(status=404, body=""))
    page.evaluate("""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/nonexistent.md'),
        encodeURIComponent('Nonexistent'),
        'nonexistent'
    )""")
    page.wait_for_selector("#view-content.active", timeout=8_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )

    error_text = page.locator("#markdown-body .error").inner_text()
    assert "404" in error_text or "not found" in error_text.lower(), (
        f"Expected 404/not-found message, got: {error_text}"
    )


def test_network_error_shows_connection_message(page, base_url):
    """A network failure shows a connection-error message, not a generic HTTP error."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.route("**/offline.md", lambda r: r.abort("failed"))
    page.evaluate("""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/offline.md'),
        encodeURIComponent('Offline'),
        'offline'
    )""")
    page.wait_for_selector("#view-content.active", timeout=8_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )

    error_text = page.locator("#markdown-body .error").inner_text()
    assert "network" in error_text.lower() or "connection" in error_text.lower(), (
        f"Expected network/connection message, got: {error_text}"
    )


# ── Toast on broken slug ─────────────────────────────────────────


def test_broken_slug_shows_toast(page, base_url):
    """Navigating to an unknown slug shows a toast before redirecting home."""
    page.goto(f"{base_url}/#system-design/this-slug-does-not-exist-xyz", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=10_000)

    toast = page.locator("#wiki-toast")
    assert toast.count() > 0, "Toast element not created"
    toast_text = toast.inner_text()
    assert len(toast_text) > 0, "Toast is empty"


def test_broken_slug_redirects_home(page, base_url):
    """After a broken slug, the home view is shown."""
    page.goto(f"{base_url}/#system-design/no-such-article-abc123", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=10_000)


# ── Focus mode active indicator ──────────────────────────────────


def _open_advanced_prefs(page):
    page.locator("[title='Preferences (,)']:visible").first.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator("[data-tab='advanced']").click()
    page.wait_for_function(
        "() => document.getElementById('prefs-panel-advanced').getAttribute('aria-hidden') === 'false'"
    )


def test_focus_btn_exists_in_prefs(page, base_url):
    """prefs-focus-toggle is present in the Advanced prefs tab."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    assert page.locator("#prefs-focus-toggle").count() > 0


def test_focus_btn_becomes_active_on_f(page, base_url):
    """Pressing F adds .active to the focus button."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-focus-toggle")
    assert "active" not in (btn.get_attribute("class") or "")

    page.keyboard.press("Escape")
    page.keyboard.press("f")
    _open_advanced_prefs(page)
    assert "active" in (btn.get_attribute("class") or ""), (
        "Focus button should be active after pressing F"
    )


def test_focus_btn_deactivates_on_second_f(page, base_url):
    """Pressing F twice deactivates the focus button."""
    _go_to_article(page, base_url)
    page.keyboard.press("f")
    page.keyboard.press("f")
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-focus-toggle")
    assert "active" not in (btn.get_attribute("class") or ""), (
        "Focus button should be inactive after toggling off"
    )


def test_focus_btn_click_toggles_mode(page, base_url):
    """Clicking the focus button activates focus mode."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-focus-toggle")
    btn.click()
    assert "active" in (btn.get_attribute("class") or ""), (
        "Focus button should be active after clicking"
    )


# ── Mobile topbar overflow menu ──────────────────────────────────


def test_overflow_menu_hidden_by_default_on_mobile(page, base_url):
    """Overflow dropdown is closed until the ⋯ trigger is tapped."""
    page.set_viewport_size({"width": 375, "height": 812})
    _go_to_article(page, base_url)
    assert not page.locator("#content-overflow-menu").is_visible()


def test_overflow_trigger_opens_menu_on_mobile(page, base_url):
    """Tapping the ⋯ button reveals the low-frequency actions."""
    page.set_viewport_size({"width": 375, "height": 812})
    _go_to_article(page, base_url)
    page.locator("#content-overflow-btn").click()
    assert page.locator("#content-overflow-menu").is_visible()
    assert page.locator("#content-overflow-btn").get_attribute("aria-expanded") == "true"


def test_overflow_menu_action_closes_menu_after_click(page, base_url):
    """Clicking an action inside the overflow menu (e.g. quiz mode) closes the dropdown."""
    page.set_viewport_size({"width": 375, "height": 812})
    _go_to_article(page, base_url)
    page.locator("#content-overflow-btn").click()
    page.wait_for_selector("#content-overflow-menu.open")
    page.locator("#content-quiz-btn").click()
    assert not page.locator("#content-overflow-menu").is_visible()


def test_overflow_menu_closes_on_outside_click(page, base_url):
    """Clicking outside the overflow menu dismisses it without triggering an action."""
    page.set_viewport_size({"width": 375, "height": 812})
    _go_to_article(page, base_url)
    page.locator("#content-overflow-btn").click()
    page.wait_for_selector("#content-overflow-menu.open")
    page.locator("#content-breadcrumb").click()
    assert not page.locator("#content-overflow-menu").is_visible()


def test_overflow_menu_closes_on_escape(page, base_url):
    """Pressing Escape closes the overflow menu without navigating back."""
    page.set_viewport_size({"width": 375, "height": 812})
    _go_to_article(page, base_url)
    page.locator("#content-overflow-btn").click()
    page.wait_for_selector("#content-overflow-menu.open")
    page.keyboard.press("Escape")
    assert not page.locator("#content-overflow-menu").is_visible()
    assert page.locator("#view-content").get_attribute("class").__contains__("active"), (
        "Escape should only close the overflow menu, not navigate back from content"
    )


# ── Font size hotkeys ────────────────────────────────────────────


def test_equals_increases_font_size(page, base_url):
    """= key increments font size from M to L."""
    _go_to_article(page, base_url)
    page.evaluate("() => Settings._setSize('M')")

    page.keyboard.press("=")

    size = page.evaluate("() => localStorage.getItem('wiki-settings')")
    import json

    settings = json.loads(size)
    assert settings["fontSize"] == "L", (
        f"Expected L after pressing =, got {settings['fontSize']}"
    )


def test_minus_decreases_font_size(page, base_url):
    """- key decrements font size from M to S."""
    _go_to_article(page, base_url)
    page.evaluate("() => Settings._setSize('M')")

    page.keyboard.press("-")

    size = page.evaluate("() => localStorage.getItem('wiki-settings')")
    import json

    settings = json.loads(size)
    assert settings["fontSize"] == "S", (
        f"Expected S after pressing -, got {settings['fontSize']}"
    )


def test_font_size_does_not_exceed_large(page, base_url):
    """= at max size (L) is a no-op."""
    _go_to_article(page, base_url)
    page.evaluate("() => Settings._setSize('L')")
    page.keyboard.press("=")

    import json

    settings = json.loads(page.evaluate("() => localStorage.getItem('wiki-settings')"))
    assert settings["fontSize"] == "L"


def test_font_size_does_not_go_below_small(page, base_url):
    """- at min size (S) is a no-op."""
    _go_to_article(page, base_url)
    page.evaluate("() => Settings._setSize('S')")
    page.keyboard.press("-")

    import json

    settings = json.loads(page.evaluate("() => localStorage.getItem('wiki-settings')"))
    assert settings["fontSize"] == "S"


# ── Distraction-free mode ────────────────────────────────────────


def test_d_key_hides_topbar(page, base_url):
    """D key hides the content topbar."""
    _go_to_article(page, base_url)
    page.keyboard.press("d")

    topbar_visible = page.evaluate("""() => {
        const tb = document.querySelector('.content-topbar');
        return tb && getComputedStyle(tb).display !== 'none';
    }""")
    assert not topbar_visible, (
        "Content topbar should be hidden in distraction-free mode"
    )


def test_d_key_hides_toc(page, base_url):
    """D key hides the TOC sidebar."""
    _go_to_article(page, base_url)
    page.keyboard.press("d")

    toc_visible = page.evaluate("""() => {
        const toc = document.getElementById('toc-sidebar');
        return toc && getComputedStyle(toc).display !== 'none';
    }""")
    assert not toc_visible, "TOC sidebar should be hidden in distraction-free mode"


def test_d_key_toggle_restores_chrome(page, base_url):
    """Pressing D twice restores topbar and TOC."""
    _go_to_article(page, base_url)
    page.keyboard.press("d")
    page.keyboard.press("d")

    topbar_visible = page.evaluate("""() => {
        const tb = document.querySelector('.content-topbar');
        return tb && getComputedStyle(tb).display !== 'none';
    }""")
    assert topbar_visible, (
        "Content topbar should be visible after toggling distraction-free off"
    )


def test_distraction_free_clears_on_navigation(page, base_url):
    """Navigating away from an article exits distraction-free mode."""
    _go_to_article(page, base_url)
    page.keyboard.press("d")

    assert page.evaluate("() => document.body.classList.contains('distraction-free')")

    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    # Navigate to article again
    page.locator(".wiki-card").first.click()
    page.wait_for_selector("#view-index.active", timeout=5_000)
    page.locator(".index-card").first.click()
    page.wait_for_selector("#view-content.active", timeout=10_000)

    assert not page.evaluate(
        "() => document.body.classList.contains('distraction-free')"
    ), "distraction-free class should be removed after navigation"


def test_distraction_free_exit_button_visible_when_active(page, base_url):
    """The floating exit button only appears once distraction-free mode is active."""
    _go_to_article(page, base_url)

    hidden_before = page.evaluate("""() => {
        const btn = document.getElementById('distraction-free-exit-btn');
        return btn && getComputedStyle(btn).display === 'none';
    }""")
    assert hidden_before, "Exit button should be hidden outside distraction-free mode"

    page.keyboard.press("d")
    visible_after = page.evaluate("""() => {
        const btn = document.getElementById('distraction-free-exit-btn');
        return btn && getComputedStyle(btn).display !== 'none';
    }""")
    assert visible_after, "Exit button should appear once distraction-free mode is active"


def test_distraction_free_exit_button_click_exits(page, base_url):
    """Clicking the floating exit button turns distraction-free mode off."""
    _go_to_article(page, base_url)
    page.keyboard.press("d")
    assert page.evaluate("() => document.body.classList.contains('distraction-free')")

    page.click("#distraction-free-exit-btn")
    assert not page.evaluate(
        "() => document.body.classList.contains('distraction-free')"
    ), "distraction-free class should be removed after clicking the exit button"


# ── Reset-view escape hatch ────────────────────────────────────────
# Escape resets an active reading mode/filter in place (confirmed) instead
# of navigating away; with nothing active it falls through to the normal
# Escape-navigates-back behavior (WIKI-278).


def test_escape_prompts_confirm_dialog_when_mode_active(page, base_url):
    """Escape shows a confirm dialog instead of navigating away when a
    reading mode (e.g. focus mode) is active."""
    _go_to_article(page, base_url)
    page.keyboard.press("f")  # enter focus mode so there is something to reset

    dialogs = []
    page.on("dialog", lambda d: dialogs.append(d) or d.dismiss())

    page.keyboard.press("Escape")
    page.wait_for_timeout(200)

    assert len(dialogs) == 1, "Escape should trigger the reset confirm when a mode is active"
    # Dismissed - focus mode must NOT have been cleared, and we must still be on the article.
    assert page.evaluate(
        "() => document.getElementById('markdown-body').classList.contains('focus-mode')"
    ), "Dismissing the confirm dialog must leave the view untouched"
    assert page.locator("#view-content.active").count() == 1, (
        "Dismissing the confirm dialog must not navigate away"
    )


def test_escape_confirmed_exits_focus_mode(page, base_url):
    """Accepting the reset-view confirm turns off focus mode without navigating away."""
    _go_to_article(page, base_url)
    page.keyboard.press("f")
    assert page.evaluate(
        "() => document.getElementById('markdown-body').classList.contains('focus-mode')"
    )

    page.on("dialog", lambda d: d.accept())
    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => !document.getElementById('markdown-body').classList.contains('focus-mode')",
        timeout=3_000,
    )
    assert page.locator("#view-content.active").count() == 1, (
        "Resetting the view must not navigate away from the article"
    )


def test_escape_confirmed_exits_distraction_free(page, base_url):
    """Accepting the reset-view confirm turns off distraction-free mode too."""
    _go_to_article(page, base_url)
    page.keyboard.press("d")
    assert page.evaluate("() => document.body.classList.contains('distraction-free')")

    page.on("dialog", lambda d: d.accept())
    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => !document.body.classList.contains('distraction-free')",
        timeout=3_000,
    )


def test_escape_reset_preserves_scroll_position(page, base_url):
    """Resetting the view keeps the reader's scroll position."""
    _go_to_article(page, base_url)
    page.keyboard.press("f")
    page.evaluate('() => window.scrollTo({top: 400, behavior: "instant"})')
    page.wait_for_timeout(100)
    scroll_before = page.evaluate("() => window.scrollY")

    page.on("dialog", lambda d: d.accept())
    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => !document.getElementById('markdown-body').classList.contains('focus-mode')",
        timeout=3_000,
    )
    scroll_after = page.evaluate("() => window.scrollY")
    assert scroll_after == scroll_before, (
        f"Scroll position should be preserved: before={scroll_before}, after={scroll_after}"
    )


def test_escape_navigates_back_when_no_mode_active(page, base_url):
    """With no reading mode active, Escape still behaves as before (navigate back)
    - the reset hatch must not hijack the plain single-Escape case."""
    _go_to_article(page, base_url)

    dialogs = []
    page.on("dialog", lambda d: dialogs.append(d) or d.dismiss())

    page.keyboard.press("Escape")
    page.wait_for_selector("#view-index.active", timeout=5_000)

    assert len(dialogs) == 0, "Plain Escape with nothing active must not show the reset confirm"


def test_escape_confirmed_expands_collapsed_toc_sections(page, base_url):
    """Accepting the reset-view confirm re-expands a collapsed h2 section."""
    _go_to_article(page, base_url)
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)
    page.locator(".heading-collapse-btn").first.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body h2')?.classList.contains('section--collapsed')",
        timeout=3_000,
    )

    page.on("dialog", lambda d: d.accept())
    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => !document.querySelector('#markdown-body h2')?.classList.contains('section--collapsed')",
        timeout=3_000,
    )
    assert page.locator("#view-content.active").count() == 1, (
        "Resetting collapsed sections must not navigate away from the article"
    )


def test_escape_confirmed_clears_index_filter(page, base_url):
    """On the index view, accepting the reset-view confirm clears an active text filter."""
    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=8_000)
    page.wait_for_selector("#index-filter-input", timeout=8_000)

    page.fill("#index-filter-input", "cache")
    page.wait_for_timeout(200)  # let the 120ms input debounce apply the query

    page.on("dialog", lambda d: d.accept())
    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => document.getElementById('index-filter-input').value === ''",
        timeout=3_000,
    )
    assert page.locator("#view-index.active").count() == 1, (
        "Resetting the index filter must not navigate away"
    )
