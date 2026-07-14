"""
- bookmarks shown as chips on wiki index, not on home page
- clear button removes all bookmarks for the wiki
"""

import pytest


def _go_to_article(page, base_url):
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)


def _bookmark_current(page):
    btn = page.locator("#content-bookmark-btn")
    btn.wait_for(state="visible")
    if "active" not in (btn.get_attribute("class") or ""):
        btn.click()


def _go_to_index(page, base_url):
    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=5_000)


def _go_to_dsa_article(page, base_url):
    page.goto(f"{base_url}/#dsa/array", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)


def _open_bookmarks_modal(page):
    is_mac = "Mac" in page.evaluate("navigator.platform")
    page.keyboard.press("Meta+b" if is_mac else "Control+b")
    page.wait_for_selector("#bookmarks-modal:not(.hidden)", timeout=5_000)


def test_bookmarks_not_on_home(page, base_url):
    """home view has no bookmarks section."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    assert page.locator("#view-home #bookmarks-section").count() == 0


@pytest.mark.smoke
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
    page.wait_for_timeout(150)  # give any (erroneous) fire-and-forget POST time to fire
    assert all("/bookmarks" not in u for u in calls)


def test_bookmarks_empty_state_shown(page, base_url):
    """Regression for WIKI-448: empty bookmarks hides the section entirely
    (rather than un-hiding with a placeholder sentence)."""
    page.goto(base_url)
    page.evaluate("localStorage.removeItem('wiki-bookmarks')")
    page.reload()
    page.locator(".wiki-card").first.click()
    page.wait_for_selector("#bookmarks-section", state="attached")
    section = page.locator("#bookmarks-section")
    assert "hidden" in (section.get_attribute("class") or "")


@pytest.mark.smoke
def test_cmd_b_opens_global_bookmarks_modal(page, base_url):
    """Ctrl/Cmd+B opens the global bookmarks modal from any view."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=5_000)
    _open_bookmarks_modal(page)
    modal = page.locator("#bookmarks-modal")
    assert modal.is_visible()
    assert modal.get_attribute("aria-hidden") == "false"


def test_bookmarks_modal_lists_bookmarks_across_wikis(page, base_url):
    """modal groups/lists entries from more than one wiki when bookmarks exist in both."""
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_dsa_article(page, base_url)
    _bookmark_current(page)

    _open_bookmarks_modal(page)
    entries = page.locator("#bookmarks-modal-list .bookmarks-modal-entry")
    assert entries.count() >= 2
    wiki_labels = page.locator("#bookmarks-modal-list .bookmarks-modal-entry-wiki").all_inner_texts()
    assert "System Design" in wiki_labels
    assert "Data Structures & Algorithms" in wiki_labels


def test_bookmarks_modal_entry_navigates_and_closes(page, base_url):
    """clicking a bookmark entry navigates to that article and closes the modal."""
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_index(page, base_url)

    _open_bookmarks_modal(page)
    page.locator("#bookmarks-modal-list .bookmarks-modal-entry").first.click()

    # state="hidden" - default is "visible", which .hidden (display:none) can't satisfy.
    page.wait_for_selector("#bookmarks-modal.hidden", state="hidden", timeout=5_000)
    page.wait_for_selector("#view-content.active", timeout=10_000)
    assert "caching" in page.url


def test_bookmarks_modal_remove_updates_list_and_persists(page, base_url):
    """removing a bookmark from the modal updates the list and localStorage."""
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _go_to_index(page, base_url)

    _open_bookmarks_modal(page)
    entries = page.locator("#bookmarks-modal-list .bookmarks-modal-entry")
    assert entries.count() >= 1

    page.locator("#bookmarks-modal-list .bookmarks-modal-remove").first.click()
    # Removing the last bookmark closes the whole modal, so the empty-state
    # <p> renders under a now-hidden ancestor - wait for it to attach, not
    # to become visible (it may never be, if that was the only bookmark).
    page.wait_for_selector("#bookmarks-modal-list .recents-empty", state="attached", timeout=5_000)

    stored = page.evaluate("localStorage.getItem('wiki-bookmarks')")
    assert "caching" not in stored


def test_bookmarks_modal_empty_state(page, base_url):
    """empty state shows when no bookmarks exist anywhere."""
    page.goto(base_url)
    page.evaluate("localStorage.removeItem('wiki-bookmarks')")
    page.reload()
    page.wait_for_selector("#view-home.active", timeout=5_000)

    _open_bookmarks_modal(page)
    empty = page.locator("#bookmarks-modal-list .recents-empty")
    assert empty.is_visible()
    assert "no bookmarks anywhere yet" in empty.inner_text()
    assert empty.locator("kbd").count() > 0


def test_escape_closes_bookmarks_modal(page, base_url):
    _go_to_article(page, base_url)
    _bookmark_current(page)
    _open_bookmarks_modal(page)

    page.keyboard.press("Escape")
    page.wait_for_selector("#bookmarks-modal.hidden", state="hidden", timeout=5_000)
