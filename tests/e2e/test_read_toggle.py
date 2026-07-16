"""
- Mark as unread toggle - button presence, state, toggle, persistence.
"""

ARTICLE_HASH = "system-design/caching"


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate("() => localStorage.removeItem('wiki-read-system-design')")
    page.goto(f"{base_url}/#{ARTICLE_HASH}", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body h1, #markdown-body h2", timeout=8_000)


def _open_advanced_prefs(page):
    page.locator("[title='Preferences (,)']:visible").first.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator("[data-tab='advanced']").click()
    page.wait_for_function(
        "() => document.getElementById('prefs-panel-advanced').getAttribute('aria-hidden') === 'false'"
    )


def _click_read_toggle(page):
    _open_advanced_prefs(page)
    page.locator("#prefs-read-toggle").click()


# ── presence ───────────────────────────────────────────────────────────────────


def test_read_btn_present_in_advanced_prefs(page, base_url):
    """#prefs-read-toggle exists in the Advanced prefs tab."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    assert page.locator("#prefs-read-toggle").count() == 1


def test_read_btn_initial_title_is_mark_as_read(page, base_url):
    """button title is 'Mark as read' when article not yet read."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    title = page.locator("#prefs-read-toggle").get_attribute("title")
    assert title == "Mark as read"


def test_read_btn_initially_not_active(page, base_url):
    """button does not have .active class when article is unread."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    cls = page.locator("#prefs-read-toggle").get_attribute("class")
    assert "active" not in cls


# ── mark as read ───────────────────────────────────────────────────────────────


def test_clicking_read_btn_marks_article_read(page, base_url):
    """clicking button adds article path to wiki-read in localStorage."""
    _go_to_article(page, base_url)
    _click_read_toggle(page)

    read_set = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-read-' + state.currentWikiId) || '[]')"
    )
    assert any("caching" in path for path in read_set)


def test_read_btn_becomes_active_after_click(page, base_url):
    """button gets .active class after clicking to mark as read."""
    _go_to_article(page, base_url)
    _click_read_toggle(page)
    cls = page.locator("#prefs-read-toggle").get_attribute("class")
    assert "active" in cls


def test_read_btn_title_changes_to_mark_as_unread(page, base_url):
    """button title becomes 'Mark as unread' after marking read."""
    _go_to_article(page, base_url)
    _click_read_toggle(page)
    title = page.locator("#prefs-read-toggle").get_attribute("title")
    assert title == "Mark as unread"


# ── mark as unread ─────────────────────────────────────────────────────────────


def test_clicking_again_marks_article_unread(page, base_url):
    """clicking button a second time removes article from wiki-read."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-read-toggle")
    btn.click()  # mark read
    btn.click()  # mark unread

    read_set = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-read-' + state.currentWikiId) || '[]')"
    )
    assert not any("caching" in path for path in read_set)


def test_read_btn_loses_active_after_unmark(page, base_url):
    """button loses .active class after clicking to mark as unread."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-read-toggle")
    btn.click()  # mark read
    btn.click()  # mark unread
    cls = btn.get_attribute("class")
    assert "active" not in cls


def test_read_btn_title_reverts_after_unmark(page, base_url):
    """button title reverts to 'Mark as read' after unmarking."""
    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-read-toggle")
    btn.click()  # mark read
    btn.click()  # mark unread
    title = btn.get_attribute("title")
    assert title == "Mark as read"


# ── persistence across navigation ──────────────────────────────────────────────


def test_read_state_persists_on_revisit(page, base_url):
    """article stays marked read when navigating away and back."""
    _go_to_article(page, base_url)
    _click_read_toggle(page)

    # Close prefs, go back to wiki index
    page.keyboard.press("Escape")
    page.locator("#content-back-btn").click()
    page.wait_for_selector("#view-index.active", timeout=5_000)

    # Navigate back to article via hash change (goto unreliable for same-origin hash nav)
    page.evaluate(f"() => {{ location.hash = '#{ARTICLE_HASH}'; }}")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    _open_advanced_prefs(page)

    cls = page.locator("#prefs-read-toggle").get_attribute("class")
    assert "active" in cls


def test_anon_read_makes_no_api_call(page, base_url):
    """logged-out users hit zero sync endpoints when marking read."""
    calls = []
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=401,
            content_type="application/json",
            body='{"error":{"code":"UNAUTHORIZED","message":"x"}}',
        ),
    )
    page.route(
        "**/api/v1/reads",
        lambda r: (calls.append(r.request.url), r.abort()),
    )

    _go_to_article(page, base_url)
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-read-toggle")
    btn.wait_for(state="visible")
    if "active" not in (btn.get_attribute("class") or ""):
        btn.click()
    page.wait_for_timeout(150)
    assert all("/reads" not in u for u in calls)


# ── Haptic + sound on study milestone ───────────────────────────────────────

_VIBRATE_SPY = """
navigator.vibrate = function(pattern) {
    window.__vibrateCalls = window.__vibrateCalls || [];
    window.__vibrateCalls.push(pattern);
    return true;
};
"""


def test_read_toggle_calls_vibrate_when_setting_on(page, base_url):
    """Marking an article read fires navigator.vibrate when hapticFeedback is on."""
    page.add_init_script(_VIBRATE_SPY)
    _go_to_article(page, base_url)
    page.evaluate("""() => {
        // getSettings() only treats a stored blob as valid if it has
        // backgroundId - otherwise it discards it and falls back to
        // defaults (hapticFeedback: false), silently dropping this seed.
        const s = JSON.parse(localStorage.getItem('wiki-settings') || '{}');
        s.backgroundId = s.backgroundId || 'dark-void';
        s.hapticFeedback = true;
        localStorage.setItem('wiki-settings', JSON.stringify(s));
    }""")
    _click_read_toggle(page)
    calls = page.evaluate("() => window.__vibrateCalls || []")
    assert len(calls) == 1


def test_read_toggle_skips_vibrate_when_setting_off(page, base_url):
    """Marking an article read does not call navigator.vibrate by default (off)."""
    page.add_init_script(_VIBRATE_SPY)
    _go_to_article(page, base_url)
    _click_read_toggle(page)
    calls = page.evaluate("() => window.__vibrateCalls || []")
    assert len(calls) == 0


def test_unmarking_read_does_not_call_vibrate(page, base_url):
    """Marking an article back to unread is not a milestone - no vibrate call."""
    page.add_init_script(_VIBRATE_SPY)
    _go_to_article(page, base_url)
    page.evaluate("""() => {
        const s = JSON.parse(localStorage.getItem('wiki-settings') || '{}');
        s.backgroundId = s.backgroundId || 'dark-void';
        s.hapticFeedback = true;
        localStorage.setItem('wiki-settings', JSON.stringify(s));
    }""")
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-read-toggle")
    btn.click()  # mark read - fires once
    btn.click()  # mark unread - should not fire again
    calls = page.evaluate("() => window.__vibrateCalls || []")
    assert len(calls) == 1
