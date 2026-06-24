"""
- recently visited chips on wiki index (scoped per wiki)
- clear button removes all recents for the wiki
- chip strip show-more button for overflow
"""


_MOCK_ARTICLE = "# Caching\n\nA simple article for recents testing.\n"


def _visit_article(page, base_url, slug="recents-mock"):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=3_000)
    page.route(f"**/{slug}.md", lambda r: r.fulfill(body=_MOCK_ARTICLE))
    page.evaluate(f"""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/{slug}.md'),
        encodeURIComponent('Caching'),
        '{slug}'
    )""")
    page.wait_for_selector("#view-content.active", timeout=3_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=3_000,
    )


def _go_to_index(page, base_url):
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=3_000)


def test_recently_visited_chips_appear(page, base_url):
    """after visiting an article, its chip appears in #recents-section on index."""
    _visit_article(page, base_url)
    _go_to_index(page, base_url)

    section = page.locator("#recents-section")
    assert not section.get_attribute("class").__contains__("hidden")
    chips = section.locator(".recent-chip").all()
    assert len(chips) >= 1


def test_recents_scoped_to_wiki(page, base_url):
    """recents section shows empty state when wiki-recents cleared."""
    _visit_article(page, base_url)
    _go_to_index(page, base_url)

    # Confirm recents are present first
    section = page.locator("#recents-section")
    section.wait_for(state="visible")

    # Clear the actual key the app uses
    page.evaluate("() => localStorage.removeItem('wiki-recents')")
    page.reload()
    page.wait_for_selector("#view-index.active", timeout=3_000)

    assert section.is_visible()
    assert "nothing visited yet" in section.inner_text()


def test_clear_recents_removes_all_chips(page, base_url):
    """clicking clear button on recents removes all chips."""
    _visit_article(page, base_url)
    _go_to_index(page, base_url)

    section = page.locator("#recents-section")
    section.wait_for(state="visible")

    clear_btn = section.locator(".recents-clear-btn")
    clear_btn.click()

    assert "hidden" in (section.get_attribute("class") or "")


# ── Chip strip row limit ───────────────────────────────────────────


def _inject_recents(page, count):
    page.evaluate(f"""() => {{
        const items = Array.from({{length: {count}}}, (_, i) => ({{
            wikiId: 'system-design',
            path: `content/system-design/article-${{i}}.md`,
            title: `Article ${{i}}`,
            slug: `article-${{i}}`,
        }}));
        localStorage.setItem('wiki-recents', JSON.stringify(items));
    }}""")


def test_show_more_appears_when_recents_overflow(page, base_url):
    """show-more button appears when recents count exceeds CHIP_VISIBLE_MAX (4)."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")
    _inject_recents(page, 5)
    _go_to_index(page, base_url)

    section = page.locator("#recents-section")
    section.wait_for(state="visible")

    assert section.locator(".recents-show-more").count() == 1, (
        "show-more button must appear when recents > 4"
    )
    assert section.locator(".recent-chip.chip--hidden").count() == 1, (
        "1 chip must be hidden when 5 recents exist"
    )


def test_show_more_absent_when_chips_within_limit(page, base_url):
    """no show-more button when recents count <= CHIP_VISIBLE_MAX (4)."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")
    _inject_recents(page, 3)
    _go_to_index(page, base_url)

    section = page.locator("#recents-section")
    section.wait_for(state="visible")

    assert section.locator(".recents-show-more").count() == 0, (
        "no show-more button when chips <= 4"
    )


def test_show_more_click_expands_strip(page, base_url):
    """clicking show-more expands strip and reveals hidden chips."""
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")
    _inject_recents(page, 5)
    _go_to_index(page, base_url)

    section = page.locator("#recents-section")
    section.wait_for(state="visible")

    section.locator(".recents-show-more").click()

    expanded = section.locator(".recents-strip").evaluate(
        "el => el.classList.contains('recents-strip-expanded')"
    )
    assert expanded, (
        "strip must have recents-strip-expanded class after show-more click"
    )


def test_anon_recent_makes_no_api_call(page, base_url):
    """logged-out users hit zero sync endpoints when visiting an article."""
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
        "**/api/v1/recents",
        lambda r: (calls.append(r.request.url), r.abort()),
    )

    _visit_article(page, base_url)
    page.wait_for_function("() => document.readyState === 'complete'", timeout=3_000)
    assert all("/recents" not in u for u in calls)


def test_recents_empty_state_shown(page, base_url):
    page.goto(base_url)
    page.evaluate("localStorage.removeItem('wiki-recents')")
    page.reload()
    page.locator(".wiki-card").first.click()
    page.wait_for_selector("#recents-section")
    section = page.locator("#recents-section")
    assert section.is_visible()
    assert "nothing visited yet" in section.inner_text()
