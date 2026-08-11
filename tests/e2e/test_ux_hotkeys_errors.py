"""
UX, hotkeys, and error handling:
- fetchText distinguishes 404 from network errors
- broken slug shows toast before redirecting home
- focus mode button shows active state
- = / - hotkeys change font size
- D key toggles distraction-free mode
"""

import pytest


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


@pytest.mark.flaky(reruns=2, reruns_delay=1)
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


# ── Preferences Actions tab ──────────────────────────────────────


def _open_actions_prefs(page):
    page.keyboard.press(",")
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator('[data-action="prefs-tab"][data-tab="actions"]').click()
    page.wait_for_function(
        "() => document.getElementById('prefs-panel-actions').getAttribute('aria-hidden') === 'false'"
    )


def test_content_overflow_removed_from_topbar(page, base_url):
    """Content actions moved to Preferences Actions tab — no overflow menu in topbar."""
    page.set_viewport_size({"width": 950, "height": 800})
    _go_to_article(page, base_url)
    assert page.locator("#content-overflow-btn").count() == 0


def test_prefs_actions_tab_lists_content_actions(page, base_url):
    """Actions tab exposes relocated content actions with shortcut hints."""
    _go_to_article(page, base_url)
    _open_actions_prefs(page)
    actions = page.locator("#prefs-panel-actions .prefs-action-row")
    assert actions.count() >= 9
    labels = actions.locator(".prefs-action-label").all_inner_texts()
    assert "Quiz mode" in labels
    assert "Find in article" in labels
    assert page.locator('#prefs-panel-actions [data-action="section-map-toggle"] .prefs-action-shortcut').inner_text() == "Shift+G"


def test_prefs_action_closes_panel_after_click(page, base_url):
    """Choosing an action from the Actions tab closes preferences."""
    page.set_viewport_size({"width": 375, "height": 812})
    _go_to_article(page, base_url)
    _open_actions_prefs(page)
    page.locator('#prefs-panel-actions [data-action="find-open"]').click()
    page.wait_for_function(
        "() => document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.wait_for_selector("#article-find:not(.hidden)", timeout=3_000)


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


def test_distraction_free_flag_resets_on_navigation(page, base_url):
    """Regression: navigating away used to strip the distraction-free DOM
    class directly instead of calling exitDistractionFree(), leaving the
    internal flag stuck true. On the next article, the D-key toggle's first
    press would then turn distraction-free OFF instead of ON."""
    _go_to_article(page, base_url, "system-design/caching")
    page.keyboard.press("d")
    assert page.evaluate("() => document.body.classList.contains('distraction-free')")

    page.evaluate("() => window.navigate('system-design/load-balancer')")
    page.wait_for_function(
        "() => window.state.currentFilePath?.includes('load-balancer')",
        timeout=10_000,
    )
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    assert not page.evaluate(
        "() => document.body.classList.contains('distraction-free')"
    ), "distraction-free DOM class must be cleared after navigating to a new article"

    page.keyboard.press("d")
    assert page.evaluate(
        "() => document.body.classList.contains('distraction-free')"
    ), "First D press on the new article must turn distraction-free ON, not OFF"


# ── Modal-stacking hotkey gating ─────────────────────────────────


def test_w_key_does_not_open_wiki_switcher_while_bookmarks_modal_open(page, base_url):
    """'w' while bookmarks modal is open must not stack the wiki switcher on top of it."""
    _go_to_article(page, base_url)
    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+b" if is_mac else "Control+b")
    page.wait_for_selector("#bookmarks-modal:not(.hidden)", timeout=5_000)

    page.locator("#bookmarks-modal-list").click()
    page.keyboard.press("w")
    page.wait_for_timeout(100)

    switcher_hidden = page.evaluate(
        "() => document.getElementById('wiki-switcher-modal').classList.contains('hidden')"
    )
    assert switcher_hidden, "wiki switcher should not open while bookmarks modal is open"


def test_g_key_does_not_open_link_graph_while_auth_modal_open(page, base_url):
    """Single-letter content shortcuts must not fire through an open modal."""
    _go_to_article(page, base_url)
    page.evaluate("window.AuthModal.open('login')")
    page.wait_for_selector("#auth-modal:not(.hidden)", timeout=5_000)

    page.locator("#auth-modal .auth-dialog").click()
    page.keyboard.press("g")
    page.wait_for_timeout(100)

    link_graph_open = page.evaluate(
        "() => !document.getElementById('link-graph-modal').classList.contains('hidden')"
    )
    assert not link_graph_open, "link graph should not open while auth modal is open"


def test_body_scroll_locked_while_search_modal_open(page, base_url):
    """Opening a modal must lock body scroll; closing it must unlock."""
    _go_to_article(page, base_url)
    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+k" if is_mac else "Control+k")
    page.wait_for_selector("#global-search-modal:not(.hidden)", timeout=5_000)

    assert page.evaluate("document.body.classList.contains('modal-open')")

    page.keyboard.press("Escape")
    page.wait_for_selector("#global-search-modal.hidden", state="hidden", timeout=5_000)
    assert not page.evaluate("document.body.classList.contains('modal-open')")


def test_double_open_search_unlocks_after_single_close(page, base_url):
    """Calling openGlobalSearch twice must not strand body scroll-lock past one close."""
    _go_to_article(page, base_url)
    is_mac = "Mac" in page.evaluate("navigator.platform")
    shortcut = "Meta+k" if is_mac else "Control+k"
    page.keyboard.press(shortcut)
    page.keyboard.press(shortcut)
    page.wait_for_selector("#global-search-modal:not(.hidden)", timeout=5_000)
    assert page.evaluate("document.body.classList.contains('modal-open')")

    page.keyboard.press("Escape")
    page.wait_for_selector("#global-search-modal.hidden", state="hidden", timeout=5_000)
    assert not page.evaluate("document.body.classList.contains('modal-open')")


def test_escape_closes_topmost_modal_when_prefs_stacked_on_search(page, base_url):
    """Escape must close the most recently opened registered modal, not registration order."""
    _go_to_article(page, base_url)
    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+k" if is_mac else "Control+k")
    page.wait_for_selector("#global-search-modal:not(.hidden)", timeout=5_000)
    page.evaluate("() => Settings.open()")
    page.wait_for_selector("#prefs-modal:not(.hidden)", timeout=5_000)

    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    assert page.locator("#global-search-modal:not(.hidden)").count() == 1

    page.keyboard.press("Escape")
    page.wait_for_selector("#global-search-modal.hidden", state="hidden", timeout=5_000)


def test_toast_renders_above_open_modal(page, base_url):
    """Toast must render above an open modal, not underneath it."""
    # Broken-slug navigation is the simplest existing trigger for #wiki-toast (built lazily).
    page.goto(f"{base_url}/#system-design/this-slug-does-not-exist-xyz", wait_until="domcontentloaded")
    page.wait_for_selector("#wiki-toast", timeout=10_000)

    toast_z = page.evaluate("() => getComputedStyle(document.getElementById('wiki-toast')).zIndex")
    prefs_z = page.evaluate("() => getComputedStyle(document.getElementById('prefs-modal')).zIndex")
    assert int(toast_z) > int(prefs_z)


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


# ── Icon tooltip (topbar/overflow buttons) ────────────────────────


def _hover_topbar_btn(page, action):
    page.mouse.move(400, 300)
    btn = page.locator(f".topbar-icon-btn[data-action='{action}']").first
    box = btn.bounding_box()
    page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=5)
    return btn


def test_icon_tooltip_shows_after_delay_and_hides_native_title(page, base_url):
    """Hovering a topbar icon button shows the custom tooltip after the delay and strips the native title so both don't render at once."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    btn = _hover_topbar_btn(page, "search-open")
    page.wait_for_selector("#icon-tooltip.visible", timeout=3_000)
    assert page.locator("#icon-tooltip").inner_text() == "Search (⌘K)"
    assert btn.get_attribute("title") is None


def test_icon_tooltip_hides_and_restores_title_on_leave(page, base_url):
    """Moving the mouse off the button hides the tooltip and restores the native title fallback."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    btn = _hover_topbar_btn(page, "search-open")
    page.wait_for_selector("#icon-tooltip.visible", timeout=3_000)

    page.mouse.move(400, 700, steps=10)
    page.wait_for_function(
        "() => !document.getElementById('icon-tooltip')?.classList.contains('visible')",
        timeout=3_000,
    )
    assert btn.get_attribute("title") == "Search (⌘K)"


def test_icon_tooltip_never_shown_on_quick_pass_still_restores_title(page, base_url):
    """A hover that leaves before the show-delay elapses must never leave the native title stripped, even though the tooltip itself never appeared."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    btn = _hover_topbar_btn(page, "search-open")
    page.wait_for_timeout(50)  # well under the show delay
    page.mouse.move(400, 700, steps=5)
    page.wait_for_function(
        "() => document.querySelector(\"[data-action='search-open']\")?.hasAttribute('title')",
        timeout=1_000,
    )
    assert btn.get_attribute("title") == "Search (⌘K)"
    assert page.locator("#icon-tooltip.visible").count() == 0


def test_icon_tooltip_shows_on_keyboard_focus(page, base_url):
    """Tabbing to a topbar icon button shows the tooltip via focus, matching hover behavior for keyboard users."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.evaluate("() => document.querySelector(\"[data-action='search-open']\").focus()")
    page.wait_for_selector("#icon-tooltip.visible", timeout=2_000)
    assert page.locator("#icon-tooltip").inner_text() == "Search (⌘K)"

    page.evaluate("() => document.querySelector(\"[data-action='search-open']\").blur()")
    page.wait_for_function(
        "() => !document.getElementById('icon-tooltip')?.classList.contains('visible')",
        timeout=2_000,
    )
    assert (
        page.locator(".topbar-icon-btn[data-action='search-open']").first.get_attribute("title")
        == "Search (⌘K)"
    )
