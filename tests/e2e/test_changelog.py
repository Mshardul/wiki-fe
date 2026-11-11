"""Changelog view (/changelog/): date groups, filename filter, filenames linking to articles."""

def _wait_changelog_filtered(page, query: str, *, min_entries: int = 1, max_entries: int | None = None):
    """Client filter matches data-filenames; wait until every visible row matches the query."""
    page.wait_for_function(
        """({ q, minEntries, maxEntries }) => {
            const els = [...document.querySelectorAll('.changelog-entry')];
            if (els.length < minEntries) return false;
            if (maxEntries != null && els.length > maxEntries) return false;
            return els.every(e => (e.getAttribute('data-filenames') || '').toLowerCase().includes(q));
        }""",
        arg={
            "q": query.lower(),
            "minEntries": min_entries,
            "maxEntries": max_entries,
        },
        timeout=5_000,
    )


def _open_changelog(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.get_by_role("link", name="Changelog").click()
    page.wait_for_url("**/changelog/**", timeout=8_000)
    page.wait_for_selector("#changelog-groups", timeout=8_000)


def test_changelog_opens_from_home_topbar(page, base_url):
    _open_changelog(page, base_url)
    assert page.locator("#view-changelog").count() == 1
    assert page.locator(".changelog-group").count() > 0


def test_changelog_groups_entries_by_date(page, base_url):
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    dates = page.locator(".changelog-date").all_inner_texts()
    assert len(dates) >= 2
    assert all(len(d) == 10 and d[4] == "-" for d in dates)
    assert dates == sorted(dates, reverse=True)

    first_group_entries = page.locator(".changelog-group").first.locator(".changelog-entry")
    assert first_group_entries.count() >= 1


def test_changelog_filter_narrows_by_filename(page, base_url):
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)
    total_groups = page.locator(".changelog-group").count()

    page.locator("#changelog-filter-input").fill("load-balancer-tls")
    _wait_changelog_filtered(page, "load-balancer-tls", min_entries=1, max_entries=1)

    visible_entries = page.locator(".changelog-entry")
    assert visible_entries.count() == 1
    assert "load-balancer-tls" in (visible_entries.first.get_attribute("data-filenames") or "")

    visible_groups = page.locator(".changelog-group")
    assert visible_groups.count() >= 1
    assert visible_groups.count() < total_groups


def test_changelog_filter_cleared_shows_all(page, base_url):
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    page.wait_for_function(
        "() => document.querySelectorAll('.changelog-entry').length > 300",
        timeout=5_000,
    )
    total = page.locator(".changelog-entry").count()

    page.locator("#changelog-filter-input").fill("load-balancer-tls")
    _wait_changelog_filtered(page, "load-balancer-tls", min_entries=1, max_entries=1)
    page.locator("#changelog-filter-input").fill("")
    page.wait_for_function(
        "(expected) => document.querySelectorAll('.changelog-entry').length === expected",
        arg=total,
        timeout=5_000,
    )


def test_changelog_filename_known_becomes_link(page, base_url):
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-group", timeout=5_000)

    links = page.locator(".changelog-file-link")
    assert links.count() >= 1


def test_changelog_filename_unknown_renders_plain(page, base_url):
    _open_changelog(page, base_url)
    page.locator("#changelog-filter-input").fill("index.md")
    page.wait_for_selector(".changelog-entry", timeout=3_000)

    # system-design/index.md is listed in CHANGELOG but is not a content article in the manifest.
    plain = page.locator("code:not(.changelog-file-link)")
    assert plain.count() >= 1
    assert any("index.md" in t for t in plain.all_inner_texts())


def test_changelog_entry_without_backtick_filename_still_renders(page, base_url):
    _open_changelog(page, base_url)
    texts = page.locator(".changelog-entry").all_inner_texts()
    assert len(texts) >= 1
    assert all(t.strip() for t in texts)


def test_changelog_link_click_navigates_to_article(page, base_url):
    _open_changelog(page, base_url)
    page.wait_for_selector(".changelog-file-link", timeout=5_000)

    page.locator(".changelog-file-link").first.click()
    page.wait_for_selector("#markdown-body", timeout=10_000)
    assert "/changelog/" not in page.url
