"""Article body rendering: code copy, topbar title, TOC, math, footnotes, prerequisites."""

import re

import pytest
from playwright.sync_api import expect

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _code_ready(page, base_url, slug=SLUG):
    _article(page, base_url, slug)
    # CodeCopy injects the icon on mount, so its presence means the click handler is wired.
    page.wait_for_selector("#markdown-body pre .copy-btn svg", timeout=10_000)


@pytest.mark.smoke
def test_copy_buttons_on_code_blocks(page, base_url):
    _article(page, base_url)
    result = page.evaluate("""() => {
        const pres = document.querySelectorAll('#markdown-body pre:not(.mermaid)');
        const missing = [...pres].filter(p => !p.querySelector('.copy-btn'));
        return { total: pres.length, missing: missing.length };
    }""")
    assert result["total"] > 0, "No code blocks found in caching article"
    assert result["missing"] == 0, f"{result['missing']} of {result['total']} code blocks missing .copy-btn"


def test_copy_button_writes_to_clipboard(page, base_url):
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    _code_ready(page, base_url)
    pre_text = page.evaluate("() => document.querySelector('#markdown-body pre code').textContent")
    page.locator("#markdown-body pre .copy-btn").first.click()
    clipboard = page.evaluate("() => navigator.clipboard.readText()")
    assert clipboard.strip() == pre_text.strip()


# ── Topbar title ────────────────────────────────────────────────────────────────


def test_topbar_title_hidden_initially(page, base_url):
    _article(page, base_url)
    assert page.locator(".content-topbar .topbar-title.visible").count() == 0


def test_topbar_title_appears_after_scroll(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _article(page, base_url)
    page.evaluate("() => window.scrollTo(0, 3000)")
    page.wait_for_selector(".content-topbar .topbar-title.visible", timeout=5_000)
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_selector(".content-topbar .topbar-title.visible", state="detached", timeout=5_000)


def test_topbar_title_text_matches_article(page, base_url):
    _article(page, base_url)
    title = page.locator(".content-topbar .topbar-title").inner_text().strip()
    h1 = page.locator("#markdown-body h1").first.inner_text().strip()
    assert title, ".topbar-title should have non-empty text"
    assert title == h1


# ── TOC rendering ──────────────────────────────────────────────────────────────


def test_toc_item_click_does_not_break_path(page, base_url):
    _article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=10_000)
    page.locator("#toc-nav .toc-item").first.click()
    page.wait_for_function("() => location.search.includes('a=')", timeout=5_000)
    assert f"/{SLUG}/" in page.url, "Article path lost after TOC click"


# ── canary "text": math, footnotes, prerequisites, TOC (real build, shared read-only page) ──


def test_math_renders_inline_and_block(content_page):
    body = content_page("text").locator("#markdown-body")
    expect(body.locator(".katex-display")).to_have_count(1)
    expect(body.locator(".katex")).to_have_count(2)
    box = body.locator(".katex-display .katex").bounding_box()
    assert box and box["width"] > 0 and box["height"] > 0, "KaTeX styles must give rendered math a size"


def test_footnotes_render_as_list_without_raw_definitions(content_page):
    page = content_page("text")
    expect(page.locator("section.footnotes li")).to_have_count(2)
    expect(page.locator("#markdown-body")).not_to_contain_text("[^first]:")


def test_footnote_ref_jumps_to_definition_and_back(content_page):
    page = content_page("text")
    ref = page.locator('#markdown-body a[href="#user-content-fn-first"]')
    ref.click()
    expect(page.locator("#user-content-fn-first")).to_be_in_viewport()
    page.get_by_role("link", name="Back to reference 1").click()
    expect(ref).to_be_in_viewport()


def test_prerequisites_become_chips_and_the_source_list_is_removed(content_page):
    page = content_page("text")
    strip = page.locator(".prereqs-container")
    expect(strip.get_by_role("link", name="Array")).to_have_attribute("href", re.compile(r"/dsa/data-structures/array/$"))
    expect(strip.locator(".prereq-chip")).to_have_count(2)
    expect(strip.locator(".prereq-chip--unlinked")).to_contain_text("Pointer Aliasing")
    expect(page.get_by_role("heading", name="Prerequisites")).to_have_count(0)


def test_prerequisites_chips_stay_on_one_scrollable_row(content_page):
    strip = content_page("text").locator(".prereqs-container")
    style = strip.evaluate("el => { const s = getComputedStyle(el); return [s.display, s.flexWrap, s.overflowX]; }")
    assert style == ["flex", "nowrap", "auto"]


def test_toc_lists_h2_and_h3_with_h3_indented(content_page):
    toc = content_page("text").locator("#toc-nav")
    expect(toc.locator(".toc-item.toc-h2")).to_have_text(["Overview", "Code", "Long Form", "Footnotes"])
    expect(toc.locator(".toc-item.toc-h3")).to_have_text(["Sub-topic", "First Reading Block", "Second Reading Block", "Third Reading Block", "Fourth Reading Block", "Fifth Reading Block", "Closing Notes"])
