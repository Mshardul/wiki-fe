# Not ported: per-section clear button, show-more/overflow strip, undo-after-clear toast - RecentsStrip.tsx renders a plain unconditional chip list now (RECENTS_MAX=6, nothing ever hidden).
# Only clear path is the global "Clear everything" in Preferences -> Advanced (window.confirm() gate, deliberately replaces the undo-toast) - already covered by test_settings.py::test_clear_everything_wipes_local_data.

DWELL_TRIGGER_SCROLL = 500


def _visit_article(page, base_url, path="system-design/components/caching/"):
    page.goto(f"{base_url}/{path}", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    before = page.evaluate("() => localStorage.getItem('wiki-recents')")
    page.evaluate(f"() => window.scrollTo(0, {DWELL_TRIGGER_SCROLL})")
    page.wait_for_function(
        "(before) => localStorage.getItem('wiki-recents') !== before",
        arg=before,
        timeout=5_000,
    )


def _go_to_index(page, base_url, slug="system-design"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)


def test_recently_visited_chips_appear(page, base_url):
    _visit_article(page, base_url)
    _go_to_index(page, base_url)
    section = page.locator("#recents-section")
    section.wait_for(state="visible")
    assert section.locator(".recent-chip").count() >= 1


def test_recents_not_shown_for_other_wiki(page, base_url):
    _visit_article(page, base_url)
    _go_to_index(page, base_url, slug="dsa")
    assert page.locator("#recents-section").count() == 0


def test_recents_newest_first(page, base_url):
    _visit_article(page, base_url, path="system-design/components/caching/")
    _visit_article(page, base_url, path="system-design/components/dns/")
    _go_to_index(page, base_url)
    section = page.locator("#recents-section")
    section.wait_for(state="visible")
    titles = section.locator(".recent-chip").all_inner_texts()
    assert titles[0] == "DNS"


def test_recent_chip_navigates_to_article(page, base_url):
    _visit_article(page, base_url)
    _go_to_index(page, base_url)
    section = page.locator("#recents-section")
    section.wait_for(state="visible")
    section.locator(".recent-chip").first.click()
    page.wait_for_selector("#markdown-body", timeout=10_000)
    assert "caching" in page.url


def test_anon_recent_makes_no_api_call(page, base_url):
    calls = []
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(status=401, content_type="application/json", body='{"error":{"code":"UNAUTHORIZED","message":"x"}}'),
    )
    page.route("**/api/v1/recents", lambda r: (calls.append(r.request.url), r.abort()))
    _visit_article(page, base_url)
    page.wait_for_timeout(150)
    assert all("/recents" not in u for u in calls)


def test_recents_absent_when_none_visited(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-recents')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    page.locator(".wiki-card").first.click()
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)
    assert page.locator("#recents-section").count() == 0


def test_short_dwell_does_not_record_a_recent(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_timeout(300)
    _go_to_index(page, base_url)
    assert page.locator("#recents-section").count() == 0
