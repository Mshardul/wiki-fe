"""
- Changelog view (#changelog): date-grouped entries parsed from content/CHANGELOG.md (286)
- Filename filter narrows entries in real time
- Filenames resolvable in the search index link to their article
"""

import json


def _stub_search_index(page, entries=None):
    index = {
        "system-design": [
            {
                "heading": "Components",
                "cards": [
                    {
                        "title": "Message Queues",
                        "path": "./content/system-design/components/message-queues.md",
                        "slug": "message-queues",
                        "description": "desc",
                    }
                ],
            }
        ],
        "dsa": [],
    }
    if entries is not None:
        index = entries
    page.route(
        "**/content/search-index.json",
        lambda r: r.fulfill(content_type="application/json", body=json.dumps(index)),
    )


def _stub_changelog(page, markdown):
    page.route("**/content/CHANGELOG.md", lambda r: r.fulfill(body=markdown))


def _open_changelog(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.locator('[data-action="changelog-open"]').click()
    page.wait_for_selector("#view-changelog.active", timeout=8_000)


CHANGELOG_MD = """\
# Content Changelog

## 2026-07-10
- `message-queues.md` - expanded: "Delivery Semantics"
- `unknown-file.md` - new article

## 2026-07-05
- `message-queues.md` - new article
"""


def test_changelog_opens_from_home_topbar(page, base_url):
    _stub_search_index(page)
    _stub_changelog(page, CHANGELOG_MD)
    _open_changelog(page, base_url)
    assert page.locator("#view-changelog.active").count() == 1


def test_changelog_groups_entries_by_date(page, base_url):
    _stub_search_index(page)
    _stub_changelog(page, CHANGELOG_MD)
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    dates = page.locator(".changelog-date").all_inner_texts()
    assert dates == ["2026-07-10", "2026-07-05"]

    first_group_entries = page.locator(".changelog-group").first.locator(".changelog-entry")
    assert first_group_entries.count() == 2


def test_changelog_filter_narrows_by_filename(page, base_url):
    _stub_search_index(page)
    _stub_changelog(page, CHANGELOG_MD)
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    page.locator("#changelog-filter-input").fill("unknown-file")

    visible_entries = page.locator(".changelog-entry:visible")
    assert visible_entries.count() == 1
    assert "unknown-file.md" in visible_entries.first.inner_text()

    # Group with only-hidden entries should also hide.
    groups = page.locator(".changelog-group")
    visible_groups = [g for g in groups.all() if g.is_visible()]
    assert len(visible_groups) == 1


def test_changelog_filter_cleared_shows_all(page, base_url):
    _stub_search_index(page)
    _stub_changelog(page, CHANGELOG_MD)
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    page.locator("#changelog-filter-input").fill("unknown-file")
    page.locator("#changelog-filter-input").fill("")

    assert page.locator(".changelog-entry:visible").count() == 3


def test_changelog_filename_known_in_index_becomes_link(page, base_url):
    _stub_search_index(page)
    _stub_changelog(page, CHANGELOG_MD)
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    links = page.locator(".changelog-file-link")
    assert links.count() == 2  # message-queues.md appears in both entries
    assert all("message-queues.md" in t for t in links.all_inner_texts())


def test_changelog_filename_unknown_in_index_renders_plain(page, base_url):
    _stub_search_index(page)
    _stub_changelog(page, CHANGELOG_MD)
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    plain_codes = page.locator("code:not(.changelog-file-link)")
    texts = plain_codes.all_inner_texts()
    assert any("unknown-file.md" in t for t in texts)


def test_changelog_link_click_navigates_to_article(page, base_url):
    _stub_search_index(page)
    _stub_changelog(page, CHANGELOG_MD)
    page.route(
        "**/message-queues.md",
        lambda r: r.fulfill(body="# Message Queues\n\nBody."),
    )
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-file-link", timeout=5_000)

    page.locator(".changelog-file-link").first.click()
    page.wait_for_selector("#view-content.active", timeout=8_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )
    assert "Message Queues" in page.locator("#topbar-title").inner_text()
