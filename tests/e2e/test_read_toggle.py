"""
Completion button - presence, toggle, persistence, haptic milestone.
"""

ARTICLE_HASH = "system-design/caching"
DSA_ARTICLE_HASH = "dsa/array"


def _go_to_article(page, base_url, article_hash=ARTICLE_HASH, completed_key="wiki-completed-system-design"):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.evaluate(f"() => localStorage.removeItem('{completed_key}')")
    page.goto(f"{base_url}/#{article_hash}", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector(".completion-btn", timeout=8_000)


# ── presence ───────────────────────────────────────────────────────────────────


def test_completion_btn_present_on_system_design_article(page, base_url):
    """.completion-btn renders on every wiki, including System Design."""
    _go_to_article(page, base_url)
    assert page.locator(".completion-btn").count() == 1


def test_completion_btn_present_on_dsa_article(page, base_url):
    """.completion-btn renders on DSA articles too."""
    _go_to_article(page, base_url, DSA_ARTICLE_HASH, "wiki-completed-dsa")
    assert page.locator(".completion-btn").count() == 1


def test_completion_btn_initial_label(page, base_url):
    """button reads 'Mark as completed' before any completion state."""
    _go_to_article(page, base_url)
    assert page.locator(".completion-btn").inner_text() == "Mark as completed"


# ── mark completed ─────────────────────────────────────────────────────────────


def test_clicking_completion_btn_marks_article_completed(page, base_url):
    """clicking button adds article path to wiki-completed-* in localStorage."""
    _go_to_article(page, base_url)
    page.locator(".completion-btn").click()

    completed = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-completed-' + state.currentWikiId) || '[]')"
    )
    assert any("caching" in path for path in completed)


def test_completion_btn_shows_done_state_after_click(page, base_url):
    """button gets .completion-btn--done and updated label after marking completed."""
    _go_to_article(page, base_url)
    btn = page.locator(".completion-btn")
    btn.click()
    assert "completion-btn--done" in btn.get_attribute("class")
    assert btn.inner_text() == "Completed - undo"


def test_clicking_completion_btn_again_marks_uncompleted(page, base_url):
    """clicking a second time removes the article from wiki-completed-* and reverts label."""
    _go_to_article(page, base_url)
    btn = page.locator(".completion-btn")
    btn.click()
    btn.click()

    completed = page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-completed-' + state.currentWikiId) || '[]')"
    )
    assert not any("caching" in path for path in completed)
    assert btn.inner_text() == "Mark as completed"
    assert "completion-btn--done" not in btn.get_attribute("class")


def test_completion_state_persists_on_revisit(page, base_url):
    """article stays marked completed when navigating away and back."""
    _go_to_article(page, base_url)
    page.locator(".completion-btn").click()

    page.locator("#content-back-btn").click()
    page.wait_for_selector("#view-index.active", timeout=5_000)

    page.evaluate(f"() => {{ location.hash = '#{ARTICLE_HASH}'; }}")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector(".completion-btn.completion-btn--done", timeout=8_000)


def test_anon_completion_makes_no_reads_api_call(page, base_url):
    """logged-out users hit zero /reads endpoints when marking completed."""
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
    page.route(
        "**/api/v1/completions",
        lambda r: (calls.append(r.request.url), r.abort()),
    )

    _go_to_article(page, base_url)
    page.locator(".completion-btn").click()
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


def test_completion_btn_calls_vibrate_when_setting_on(page, base_url):
    """Marking an article completed fires navigator.vibrate when hapticFeedback is on."""
    page.emulate_media(reduced_motion="no-preference")
    page.add_init_script(_VIBRATE_SPY)
    _go_to_article(page, base_url)
    page.evaluate("""() => {
        const s = JSON.parse(localStorage.getItem('wiki-settings') || '{}');
        s.backgroundId = s.backgroundId || 'dark-void';
        s.hapticFeedback = true;
        localStorage.setItem('wiki-settings', JSON.stringify(s));
    }""")
    page.locator(".completion-btn").click()
    calls = page.evaluate("() => window.__vibrateCalls || []")
    assert len(calls) == 1


def test_completion_btn_skips_vibrate_when_setting_off(page, base_url):
    """Marking completed does not call navigator.vibrate by default (off)."""
    page.add_init_script(_VIBRATE_SPY)
    _go_to_article(page, base_url)
    page.locator(".completion-btn").click()
    calls = page.evaluate("() => window.__vibrateCalls || []")
    assert len(calls) == 0


def test_uncompleting_does_not_call_vibrate(page, base_url):
    """Undoing completion is not a milestone - no second vibrate call."""
    page.emulate_media(reduced_motion="no-preference")
    page.add_init_script(_VIBRATE_SPY)
    _go_to_article(page, base_url)
    page.evaluate("""() => {
        const s = JSON.parse(localStorage.getItem('wiki-settings') || '{}');
        s.backgroundId = s.backgroundId || 'dark-void';
        s.hapticFeedback = true;
        localStorage.setItem('wiki-settings', JSON.stringify(s));
    }""")
    btn = page.locator(".completion-btn")
    btn.click()
    btn.click()
    calls = page.evaluate("() => window.__vibrateCalls || []")
    assert len(calls) == 1
