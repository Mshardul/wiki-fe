import pytest


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _bookmark_current(page):
    before = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    page.keyboard.press("b")
    page.wait_for_function("(b) => localStorage.getItem('wiki-bookmarks') !== b", arg=before)


def _go_to_index(page, base_url, slug="system-design"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)


def _go_to_dsa_article(page, base_url):
    page.goto(f"{base_url}/dsa/data-structures/array/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _open_bookmarks_modal(page):
    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+b" if is_mac else "Control+b")
    page.wait_for_selector('[role="dialog"][aria-label="Bookmarks"]', timeout=5_000)


def _bookmarks_modal(page):
    return page.locator('[role="dialog"][aria-label="Bookmarks"]')


def test_bookmarks_not_on_home(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    assert page.locator("#bookmarks-section").count() == 0


@pytest.mark.smoke
def test_bookmarks_appear_on_index(page, base_url):
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_index(page, base_url)

    section = page.locator("#bookmarks-section")
    expect_count = section.locator(".recent-chip").count()
    assert expect_count >= 1


def test_bookmark_toggle_scoped_by_wiki_id(page, base_url, seed_bookmarks):
    shared = {"path": "content/system-design/components/caching.md", "slug": "components/caching", "title": "Caching"}
    seed_bookmarks(
        {**shared, "wikiId": "system-design", "wikiTitle": "System Design"},
        {**shared, "wikiId": "dsa", "wikiTitle": "Data Structures & Algorithms"},
    )
    _go_to_article(page, base_url)

    _bookmark_current(page)

    _open_bookmarks_modal(page)
    wiki_labels = _bookmarks_modal(page).locator(".bookmarks-modal-entry-wiki").all_inner_texts()
    assert "Data Structures & Algorithms" in wiki_labels
    assert "System Design" not in wiki_labels


def test_anon_bookmark_makes_no_api_call(page, base_url):
    calls = []
    page.route(
        "**/api/v1/auth/me",
        lambda r: r.fulfill(status=401, content_type="application/json", body='{"error":{"code":"UNAUTHORIZED","message":"x"}}'),
    )
    page.route("**/api/v1/bookmarks", lambda r: (calls.append(r.request.url), r.abort()))

    _go_to_article(page, base_url)
    _bookmark_current(page)
    page.wait_for_timeout(150)
    assert all("/bookmarks" not in u for u in calls)


def test_bookmarks_empty_state_shown(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-bookmarks')")
    page.reload(wait_until="domcontentloaded")
    page.locator(".wiki-card").first.click()
    page.wait_for_selector(".index-card:not(.index-card--unavailable)", timeout=10_000)
    assert page.locator("#bookmarks-section").count() == 0


@pytest.mark.smoke
def test_cmd_b_opens_global_bookmarks_modal(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_bookmarks_modal(page)
    assert _bookmarks_modal(page).count() == 1


def test_bookmarks_modal_lists_bookmarks_across_wikis(page, base_url):
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_dsa_article(page, base_url)
    _bookmark_current(page)

    _open_bookmarks_modal(page)
    entries = _bookmarks_modal(page).locator(".bookmarks-modal-entry")
    assert entries.count() >= 2
    wiki_labels = _bookmarks_modal(page).locator(".bookmarks-modal-entry-wiki").all_inner_texts()
    assert "System Design" in wiki_labels
    assert "Data Structures & Algorithms" in wiki_labels


def test_bookmarks_modal_entry_navigates_and_closes(page, base_url):
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_index(page, base_url)

    _open_bookmarks_modal(page)
    _bookmarks_modal(page).locator(".bookmarks-modal-entry").first.click()

    page.wait_for_selector('[role="dialog"][aria-label="Bookmarks"]', state="detached", timeout=5_000)
    page.wait_for_selector("#markdown-body", timeout=10_000)
    assert "caching" in page.url


def test_bookmarks_modal_remove_updates_list_and_persists(page, base_url):
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_index(page, base_url)

    _open_bookmarks_modal(page)
    entries = _bookmarks_modal(page).locator(".bookmarks-modal-entry")
    assert entries.count() >= 1

    _bookmarks_modal(page).locator(".bookmarks-modal-remove").first.click()
    page.wait_for_selector('[role="dialog"][aria-label="Bookmarks"] .recents-empty', state="attached", timeout=5_000)

    stored = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    assert "caching" not in stored


def test_bookmarks_modal_empty_state(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.evaluate("() => localStorage.removeItem('wiki-bookmarks')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)

    _open_bookmarks_modal(page)
    empty = _bookmarks_modal(page).locator(".recents-empty")
    assert empty.is_visible()
    assert "no bookmarks anywhere yet" in empty.inner_text()
    assert empty.locator("kbd").count() > 0


def test_escape_closes_bookmarks_modal(page, base_url):
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _open_bookmarks_modal(page)

    page.keyboard.press("Escape")
    page.wait_for_selector('[role="dialog"][aria-label="Bookmarks"]', state="detached", timeout=5_000)


def test_cmd_b_again_toggles_modal_closed(page, base_url):
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    _open_bookmarks_modal(page)

    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+b" if is_mac else "Control+b")
    page.wait_for_selector('[role="dialog"][aria-label="Bookmarks"]', state="detached", timeout=5_000)
