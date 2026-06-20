"""
- bookmarks shown as chips on wiki index, not on home page
- clear button removes all bookmarks for the wiki
"""


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/#system-design/caching")
    page.wait_for_selector("#view-content.active", timeout=10_000)


def _bookmark_current(page):
    btn = page.locator("#content-bookmark-btn")
    btn.wait_for(state="visible")
    if "active" not in (btn.get_attribute("class") or ""):
        btn.click()


def _go_to_index(page, base_url):
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=5_000)


def test_bookmarks_not_on_home(page, base_url):
    """home view has no bookmarks section."""
    page.goto(f"{base_url}/")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    assert page.locator("#view-home #bookmarks-section").count() == 0


def test_bookmarks_appear_on_index(page, base_url):
    """after bookmarking, chip appears in #bookmarks-section on wiki index."""
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_index(page, base_url)

    section = page.locator("#bookmarks-section")
    assert not (section.get_attribute("class") or "").count("hidden")
    chips = section.locator(".recent-chip").all()
    assert len(chips) >= 1


def test_clear_bookmarks_removes_all(page, base_url):
    """clicking clear button on bookmarks section hides it."""
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_index(page, base_url)

    section = page.locator("#bookmarks-section")
    section.wait_for(state="visible")

    section.locator(".recents-clear-btn").click()
    assert "hidden" in (section.get_attribute("class") or "")


def test_anon_bookmark_makes_no_api_call(page, base_url):
    """logged-out users hit zero sync endpoints when bookmarking."""
    calls = []
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(
            status=401,
            content_type="application/json",
            body='{"error":{"code":"UNAUTHORIZED","message":"x"}}',
        ),
    )
    # record then abort any sync-endpoint call (none should happen while anon)
    page.route(
        "**/api/v1/bookmarks",
        lambda r: (calls.append(r.request.url), r.abort()),
    )

    _go_to_article(page, base_url)
    _bookmark_current(page)
    page.wait_for_timeout(300)  # give any (erroneous) fire-and-forget POST time to fire
    assert all("/bookmarks" not in u for u in calls)
