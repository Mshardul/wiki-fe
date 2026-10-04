"""Article body rendering: code copy, topbar title, TOC, zoom overlay, math, footnotes, prerequisites."""

import re

import pytest
from playwright.sync_api import expect

# Dropped: DOMPurify tests - article HTML is trusted build-time output, no runtime sanitiser (see test_security.py).
# Dropped: sessionStorage HTML cache - no runtime markdown render to cache.

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _code_ready(page, base_url, slug=SLUG):
    _article(page, base_url, slug)
    # CodeCopy injects the icon on mount, so its presence means the click handler is wired.
    page.wait_for_selector("#markdown-body pre .copy-btn svg", timeout=10_000)


def _load_mock_article(page, base_url, content, slug="mock"):
    """Navigate to a mocked article via JS, bypassing index slug resolution.
    Waits until the loading indicator is replaced by actual content."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.route(f"**/{slug}.md", lambda r: r.fulfill(body=content))
    page.evaluate(f"""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/{slug}.md'),
        encodeURIComponent('{slug.capitalize()}'),
        '{slug}'
    )""")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    # showView fires before the fetch; wait until the loading spinner is replaced
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


@pytest.mark.smoke
def test_copy_buttons_on_code_blocks(page, base_url):
    """Every <pre> in the article body has a .copy-btn."""
    _article(page, base_url)
    result = page.evaluate("""() => {
        const pres = document.querySelectorAll('#markdown-body pre:not(.mermaid)');
        const missing = [...pres].filter(p => !p.querySelector('.copy-btn'));
        return { total: pres.length, missing: missing.length };
    }""")
    assert result["total"] > 0, "No code blocks found in caching article"
    assert result["missing"] == 0, f"{result['missing']} of {result['total']} code blocks missing .copy-btn"


def test_copy_button_writes_to_clipboard(page, base_url):
    """Clicking .copy-btn copies the block text to the clipboard."""
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    _code_ready(page, base_url)
    pre_text = page.evaluate("() => document.querySelector('#markdown-body pre code').textContent")
    page.locator("#markdown-body pre .copy-btn").first.click()
    clipboard = page.evaluate("() => navigator.clipboard.readText()")
    assert clipboard.strip() == pre_text.strip()


# ── Topbar title ────────────────────────────────────────────────────────────────


def test_topbar_title_hidden_initially(page, base_url):
    """.topbar-title has no .visible on initial article load."""
    _article(page, base_url)
    assert page.locator(".content-topbar .topbar-title.visible").count() == 0


def test_topbar_title_appears_after_scroll(page, base_url):
    """.topbar-title gets .visible once the H1 scrolls under the topbar, and loses it on scroll back."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _article(page, base_url)
    page.evaluate("() => window.scrollTo(0, 3000)")
    page.wait_for_selector(".content-topbar .topbar-title.visible", timeout=5_000)
    page.evaluate("() => window.scrollTo(0, 0)")
    page.wait_for_selector(".content-topbar .topbar-title.visible", state="detached", timeout=5_000)


def test_topbar_title_text_matches_article(page, base_url):
    """.topbar-title text matches the article H1."""
    _article(page, base_url)
    title = page.locator(".content-topbar .topbar-title").inner_text().strip()
    h1 = page.locator("#markdown-body h1").first.inner_text().strip()
    assert title, ".topbar-title should have non-empty text"
    assert title == h1


# ── KaTeX math ───────────────────────────────────────────────────────


# ── TOC rendering ──────────────────────────────────────────────────────────────


def test_toc_item_click_does_not_break_path(page, base_url):
    """Clicking a TOC item sets ?a= and keeps the article path."""
    _article(page, base_url)
    page.wait_for_selector("#toc-nav .toc-item", timeout=10_000)
    page.locator("#toc-nav .toc-item").first.click()
    page.wait_for_function("() => location.search.includes('a=')", timeout=5_000)
    assert f"/{SLUG}/" in page.url, "Article path lost after TOC click"


# ── Article hero ────────────────────────────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_article_hero_present_on_content_load(page, base_url):
    """#article-hero is visible and ghost text matches article title on load."""
    _load_mock_article(page, base_url, "# Hero Article\n\nSome content.\n", slug="hero")

    assert page.locator("#article-hero").is_visible()
    ghost_text = page.evaluate(
        "() => document.getElementById('article-hero-ghost').textContent"
    )
    assert ghost_text == "Hero", f"Ghost text mismatch: got '{ghost_text}'"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_h1_first_word_wrapped_in_accent_span(page, base_url):
    """Multi-word h1 has first word wrapped in .h1-accent span; full text intact."""
    _load_mock_article(
        page,
        base_url,
        "# Distributed Systems\n\nSome content.\n",
        slug="accent",
    )
    page.wait_for_selector("#markdown-body h1 .h1-accent", timeout=5_000)

    accent_text = page.evaluate(
        "() => document.querySelector('#markdown-body h1 .h1-accent').textContent"
    )
    assert accent_text == "Distributed", (
        f"Expected first word accented, got '{accent_text}'"
    )

    full_text = page.evaluate(
        "() => document.querySelector('#markdown-body h1').textContent.trim()"
    )
    assert full_text == "Distributed Systems", f"h1 full text altered: '{full_text}'"


# ── Lede paragraph ────────────────────────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_lede_paragraph_has_larger_font_than_body(page, base_url):
    """First <p> in article body has larger computed font-size than subsequent paragraphs."""
    _load_mock_article(
        page,
        base_url,
        "# Lede Test\n\nLede paragraph text here.\n\n## Section\n\nBody paragraph text.\n",
        slug="lede-font",
    )
    page.wait_for_selector("#markdown-body p", timeout=5_000)

    result = page.evaluate("""() => {
        const ps = document.querySelectorAll('#markdown-body p');
        if (ps.length < 2) return null;
        return {
            lede: parseFloat(window.getComputedStyle(ps[0]).fontSize),
            body: parseFloat(window.getComputedStyle(ps[1]).fontSize),
        };
    }""")
    assert result is not None, (
        "Need at least 2 <p> elements to compare lede vs body font size"
    )
    assert result["lede"] > result["body"], (
        f"Lede font ({result['lede']}px) must be larger than body font ({result['body']}px)"
    )


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_lede_paragraph_has_heading_color(page, base_url):
    """First <p> uses --text-heading color (higher contrast than body text)."""
    _load_mock_article(
        page,
        base_url,
        "# Lede Color Test\n\nLede paragraph text.\n\n## Section\n\nBody paragraph.\n",
        slug="lede-color",
    )
    page.wait_for_selector("#markdown-body p", timeout=5_000)

    result = page.evaluate("""() => {
        const ps = document.querySelectorAll('#markdown-body p');
        if (ps.length < 2) return null;
        return {
            lede: window.getComputedStyle(ps[0]).color,
            body: window.getComputedStyle(ps[1]).color,
        };
    }""")
    assert result is not None, "Need at least 2 <p> elements to compare colors"
    assert result["lede"] != result["body"], (
        f"Lede color must differ from body paragraph color (both got '{result['lede']}')"
    )


# ── Swipe down to close zoom overlay ───────────────────────────


def _open_zoom_overlay(page, base_url):
    """Load an article with an image and open the zoom overlay by clicking it."""
    img_src = (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2j"
        "AAAAJklEQVR42u3NMQ0AAAwDoMqv7KrYsQQMkB6LQCAQCAQCgUAg+BIMT/hgWyc3vW"
        "AAAAAASUVORK5CYII="
    )
    _load_mock_article(
        page,
        base_url,
        f"# Pic\n\n![diagram]({img_src})\n",
        slug="zoompic",
    )
    page.wait_for_selector(".zoomable-img", timeout=8_000)
    page.locator(".zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay:not(.hidden)", timeout=5_000)


# ── Footnotes ───────────────────────────────────────────────────


_ARTICLE_WITH_FOOTNOTES = (
    "# Notes\n\n"
    "See the first point[^a] and the second[^b].\n\n"
    "[^a]: First footnote text.\n\n"
    "[^b]: Second footnote text.\n"
)


def _load_mock_article_content(page, base_url, content, slug="fntest"):
    """Like _load_mock_article but returns after content is rendered."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
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


# ── Footnotes ───────────────────────────────────────────────────


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
