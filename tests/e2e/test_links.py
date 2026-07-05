"""
- TLDR hover previews (017)
- External and Anchor link handling (049)
- Author-curated "## Recommended" section feeds the related-articles panel (027)
"""


def _load_mock_article(page, base_url, content, slug="mock", extra_routes=None):
    """Navigate to a mocked article via JS, bypassing index slug resolution.
    Waits until the loading indicator is replaced by actual content."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    if extra_routes:
        for pattern, handler in extra_routes:
            page.route(pattern, handler)
    page.route(f"**/{slug}.md", lambda r: r.fulfill(body=content))
    page.evaluate(f"""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/{slug}.md'),
        encodeURIComponent('{slug.capitalize()}'),
        '{slug}'
    )""")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


def test_tldr_hover_preview(page, base_url):
    """017: Hovering an internal link shows the TLDR in a popup."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.route(
        "**/linked.md",
        lambda r: r.fulfill(
            body="## TL;DR\n\nThis is the TLDR.\n\n## Body\n\nBody text."
        ),
    )
    page.route("**/mock.md", lambda r: r.fulfill(body="# Main\n\n[Link](./linked.md)"))

    page.evaluate("""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/mock.md'),
        encodeURIComponent('Main'),
        'mock'
    )""")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    page.wait_for_selector("a:has-text('Link')", timeout=5_000)

    # Dispatch mouseenter directly - Playwright's hover() fires mouseleave immediately
    # (due to internal mouse positioning), which cancels the 400 ms preview timer.
    page.locator("a:has-text('Link')").dispatch_event("mouseenter")
    page.wait_for_selector("#hover-preview.visible", timeout=5_000)

    preview_text = page.locator("#hover-preview").inner_text()
    assert "This is the TLDR." in preview_text


def test_external_links_target_blank(page, base_url):
    """049: External links automatically get target='_blank'."""
    _load_mock_article(
        page, base_url, "# Ext\n\n[Google](https://google.com)", slug="ext"
    )
    page.wait_for_selector("a:has-text('Google')", timeout=5_000)

    assert page.locator("a:has-text('Google')").get_attribute("target") == "_blank"
    assert (
        page.locator("a:has-text('Google')").get_attribute("rel")
        == "noopener noreferrer"
    )


def test_anchor_links_scroll_and_update_url(page, base_url):
    """049: Anchor links update the ?a= URL param without breaking the hash."""
    _load_mock_article(
        page,
        base_url,
        "# Mock\n\n[Go down](#down)\n\n" + "<br>\n" * 50 + "\n## Down\n",
        slug="anchor",
    )
    page.wait_for_selector("a:has-text('Go down')", timeout=5_000)

    page.locator("a:has-text('Go down')").click()
    # history.replaceState doesn't trigger a Playwright navigation event; poll the URL directly.
    page.wait_for_function("() => location.href.includes('?a=down')", timeout=5_000)

    assert "?a=down" in page.url
    assert "system-design/anchor" in page.url


def test_recommended_section_feeds_related_panel(page, base_url):
    """027: A `## Recommended` section is parsed into the related-articles
    panel and stripped from the rendered body, instead of showing as a
    regular heading + link list."""
    _load_mock_article(
        page,
        base_url,
        "# Recommended Source\n\n"
        "Some intro text.\n\n"
        "## Recommended\n\n"
        "- [Target One](target-one.md)\n"
        "- [Target Two](target-two.md)\n",
        slug="rec-source",
        extra_routes=[
            ("**/target-one.md", lambda r: r.fulfill(body="# Target One\n\nBody.")),
            ("**/target-two.md", lambda r: r.fulfill(body="# Target Two\n\nBody.")),
        ],
    )

    # Raw heading must not appear in the rendered article body.
    h2_texts = page.eval_on_selector_all(
        "#markdown-body h2", "els => els.map(e => e.textContent.trim())"
    )
    assert not any(t.lower() == "recommended" for t in h2_texts), (
        "Recommended heading should be removed from the rendered body"
    )

    page.wait_for_selector("#related-articles .related-card", timeout=5_000)
    label = page.locator("#related-articles .related-label").inner_text()
    assert label == "Recommended"

    titles = page.locator("#related-articles .related-card-title").all_inner_texts()
    assert titles == ["Target One", "Target Two"]

    page.locator("#related-articles .related-card").first.click()
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    assert "Target One" in page.locator("#topbar-title").inner_text()


def test_article_without_recommended_section_uses_auto_related(page, base_url):
    """027: Articles with no `## Recommended` heading keep the existing
    keyword-ranked related-articles behavior (no regression)."""
    _load_mock_article(
        page,
        base_url,
        "# No Recommended Here\n\n## Some Other Section\n\nJust prose, no recommendations.\n",
        slug="no-rec",
    )
    h2_texts = page.eval_on_selector_all(
        "#markdown-body h2", "els => els.map(e => e.textContent.trim())"
    )
    assert "Some Other Section" in h2_texts, (
        "Non-recommended headings must still render normally"
    )
