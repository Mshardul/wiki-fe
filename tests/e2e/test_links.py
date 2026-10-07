"""In-article anchors, related-articles strip, Mentioned-by backlinks."""

import re

from playwright.sync_api import expect


def _canary(page, base_url, name):
    page.goto(f"{base_url}/e2e-canary/{name}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_selector("html[data-hotkeys-ready]", state="attached", timeout=15_000)
    return page


def _jump_link(page):
    return page.locator("#markdown-body").get_by_role("link", name="jump to the sub-topic", exact=True)


# ── In-article anchors ─────────────────────────────────────────────


def test_in_article_anchor_scrolls_to_heading_and_sets_a_param(content_page):
    page = content_page("text")
    _jump_link(page).click()
    expect(page).to_have_url(re.compile(r"/e2e-canary/text/\?a=sub-topic$"))
    expect(page.locator("#sub-topic")).to_be_in_viewport()


def test_in_article_anchor_expands_a_collapsed_parent_section(page, base_url):
    _canary(page, base_url, "text")
    page.locator("#code").get_by_role("button", name="Toggle section").click()
    expect(page.locator("#sub-topic")).to_be_hidden()

    _jump_link(page).click()
    expect(page.locator("#sub-topic")).to_be_in_viewport()
    expect(page.locator("#code")).not_to_have_class(re.compile(r"\bsection--collapsed\b"))


# ── Related strip and Mentioned by ─────────────────────────────────


def test_related_strip_scrolls_horizontally_not_grid(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    related = page.locator("#related-articles")
    expect(related.locator(".related-card").first).to_be_visible()
    style = related.locator(".related-grid").evaluate(
        "el => { const s = getComputedStyle(el); return [s.display, s.flexWrap, s.overflowX]; }"
    )
    assert style[:2] == ["flex", "nowrap"], style
    assert style[2] in ("auto", "scroll"), style


def test_backlink_spine_lists_articles_that_link_here(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    spine = page.locator("#backlink-spine")
    expect(spine.locator(".related-label")).to_have_text(re.compile(r"^mentioned by$", re.I))
    expect(spine.locator(".related-card").first).to_be_visible()


def test_backlink_spine_absent_without_incoming_links(page, base_url):
    page.goto(f"{base_url}/dsa/data-structures/treap/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    expect(page.locator("#backlink-spine")).to_have_count(0)
