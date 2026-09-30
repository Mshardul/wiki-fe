"""Article body rendering: code copy, topbar title, TOC, zoom overlay, math, footnotes, prerequisites."""

import pytest

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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisites_chips_rendered(page, base_url):
    """Prerequisites section (H2 heading + list) is converted to chips."""
    _load_mock_article(
        page,
        base_url,
        "# Mock Content\n\n## Prerequisites\n\n- [A](./a.md) [Must read] - reason A\n"
        "- [B](./b.md) [Should read] - reason B\n\n## Body\n\ncontent\n",
    )
    page.wait_for_selector(".prereqs-container", timeout=5_000)

    chips = page.locator(".prereq-chip").all()
    assert len(chips) == 2
    assert chips[0].inner_text().startswith("A")
    assert chips[1].inner_text().startswith("B")


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisites_original_paragraph_removed(page, base_url):
    """Original Prerequisites heading + list is removed after chip render."""
    _load_mock_article(
        page,
        base_url,
        "# Mock Content\n\n## Prerequisites\n\n- [A](./a.md) [Must read] - reason A\n\n## Body\n\ncontent\n",
    )
    page.wait_for_selector(".prereqs-container", timeout=5_000)

    remaining = page.evaluate("""() => {
        const heading = [...document.querySelectorAll('#markdown-body h2')]
            .find(h => h.textContent.trim() === 'Prerequisites');
        return !!heading;
    }""")
    assert not remaining, "Original Prerequisites heading was not removed"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisites_strip_scrolls_horizontally(page, base_url):
    """Prerequisites chips stay on one nowrap row with overflow-x scroll (same strip language as related)."""
    _load_mock_article(
        page,
        base_url,
        "# Mock Content\n\n## Prerequisites\n\n"
        "- [Alpha](./a.md) [Must read] - a\n"
        "- [Beta](./b.md) [Should read] - b\n"
        "- [Gamma](./c.md) [Must read] - c\n"
        "- [Delta](./d.md) [Should read] - d\n\n"
        "## Body\n\ncontent\n",
    )
    page.wait_for_selector(".prereqs-container", timeout=5_000)

    style = page.evaluate("""() => {
        const el = document.querySelector('.prereqs-container');
        const s = getComputedStyle(el);
        return { display: s.display, flexWrap: s.flexWrap, overflowX: s.overflowX, paddingBottom: s.paddingBottom };
    }""")
    assert style["display"] == "flex", f"expected flex, got: {style}"
    assert style["flexWrap"] == "nowrap", f"expected nowrap, got: {style}"
    assert style["overflowX"] in ("auto", "scroll"), f"expected overflow-x scroll, got: {style}"
    assert style["paddingBottom"] != "0px", (
        f"expected padding-bottom gap above the scrollbar, got: {style}"
    )


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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_katex_renders_block_math(page, base_url):
    """$$...$$ block math is rendered into KaTeX HTML elements."""
    _load_mock_article(page, base_url, "# Math\n\n$$E = mc^2$$\n", slug="math-block")

    page.wait_for_selector("#markdown-body .katex", timeout=5_000)
    katex_count = page.locator("#markdown-body .katex").count()
    assert katex_count > 0, "No .katex elements found - block math not rendered"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_katex_renders_inline_math(page, base_url):
    """$...$ inline math is rendered into KaTeX HTML elements."""
    _load_mock_article(
        page,
        base_url,
        "# Inline Math\n\nEnergy is $E = mc^2$ by Einstein.\n",
        slug="math-inline",
    )

    page.wait_for_selector("#markdown-body .katex", timeout=5_000)
    katex_count = page.locator("#markdown-body .katex").count()
    assert katex_count > 0, "No .katex elements found - inline math not rendered"


# ── TOC rendering ──────────────────────────────────────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_toc_items_rendered_in_sidebar(page, base_url):
    """TOC: sidebar nav contains one item per h2/h3 in article content."""
    _load_mock_article(
        page,
        base_url,
        "# Title\n\n## Section One\n\nText.\n\n## Section Two\n\nText.\n\n### Subsection\n\nText.\n",
        slug="toc-test",
    )
    page.wait_for_selector("#toc-nav .toc-item", timeout=5_000)

    toc_count = page.locator("#toc-nav .toc-item").count()
    assert toc_count == 3, f"Expected 3 TOC items (2×h2 + 1×h3), got {toc_count}"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_toc_h3_items_have_indent_class(page, base_url):
    """TOC: h3 headings get .toc-h3 class for visual indent."""
    _load_mock_article(
        page, base_url, "# Title\n\n## Top\n\n### Sub\n\nText.\n", slug="toc-h3"
    )
    page.wait_for_selector("#toc-nav .toc-h3", timeout=5_000)
    assert page.locator("#toc-nav .toc-h3").count() == 1


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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_swipe_down_closes_zoom_overlay(page, base_url):
    """A downward swipe (>80px) on the overlay closes it on touch devices."""
    _open_zoom_overlay(page, base_url)

    # Synthesize a downward touch swipe on the overlay.
    closed = page.evaluate("""() => {
        const overlay = document.getElementById('zoom-overlay');
        const touch = (y) =>
            new Touch({ identifier: 1, target: overlay, clientX: 0, clientY: y });
        overlay.dispatchEvent(new TouchEvent('touchstart', {
            bubbles: true, touches: [touch(100)], changedTouches: [touch(100)],
        }));
        overlay.dispatchEvent(new TouchEvent('touchend', {
            bubbles: true, touches: [], changedTouches: [touch(300)],
        }));
        return overlay.classList.contains('hidden');
    }""")
    assert closed, "Downward swipe >80px should close the zoom overlay"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_small_swipe_does_not_close_zoom_overlay(page, base_url):
    """A small vertical move (<80px) must not dismiss the overlay."""
    _open_zoom_overlay(page, base_url)

    still_open = page.evaluate("""() => {
        const overlay = document.getElementById('zoom-overlay');
        const touch = (y) =>
            new Touch({ identifier: 1, target: overlay, clientX: 0, clientY: y });
        overlay.dispatchEvent(new TouchEvent('touchstart', {
            bubbles: true, touches: [touch(100)], changedTouches: [touch(100)],
        }));
        overlay.dispatchEvent(new TouchEvent('touchend', {
            bubbles: true, touches: [], changedTouches: [touch(130)],
        }));
        return !overlay.classList.contains('hidden');
    }""")
    assert still_open, "A <80px swipe must not close the overlay"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_pinch_release_does_not_swipe_dismiss_with_stale_coords(page, base_url):
    """505: After a 1-finger gesture then a pinch-to-1x, release must not swipe-dismiss
    using stale startX/startY from the earlier single-finger touch."""
    _open_zoom_overlay(page, base_url)

    still_open = page.evaluate("""() => {
        const overlay = document.getElementById('zoom-overlay');
        const t = (id, x, y) =>
            new Touch({ identifier: id, target: overlay, clientX: x, clientY: y });

        // 1) Brief single-finger drag that plants startX/startY high on the page.
        overlay.dispatchEvent(new TouchEvent('touchstart', {
            bubbles: true, touches: [t(1, 0, 50)], changedTouches: [t(1, 0, 50)],
        }));
        overlay.dispatchEvent(new TouchEvent('touchend', {
            bubbles: true, touches: [], changedTouches: [t(1, 0, 60)],
        }));

        // 2) Two-finger pinch (must clear stale coords / set pinchOccurred).
        overlay.dispatchEvent(new TouchEvent('touchstart', {
            bubbles: true,
            touches: [t(1, 100, 200), t(2, 140, 200)],
            changedTouches: [t(1, 100, 200), t(2, 140, 200)],
        }));
        overlay.dispatchEvent(new TouchEvent('touchmove', {
            bubbles: true, cancelable: true,
            touches: [t(1, 100, 200), t(2, 180, 200)],
            changedTouches: [t(1, 100, 200), t(2, 180, 200)],
        }));
        // Pinch back toward start distance (scale ~1).
        overlay.dispatchEvent(new TouchEvent('touchmove', {
            bubbles: true, cancelable: true,
            touches: [t(1, 100, 200), t(2, 140, 200)],
            changedTouches: [t(1, 100, 200), t(2, 140, 200)],
        }));
        // Lift one finger at a Y that would look like a >80px downward swipe
        // against the stale startY=50 from step 1 (200-50=150).
        overlay.dispatchEvent(new TouchEvent('touchend', {
            bubbles: true,
            touches: [t(1, 100, 200)],
            changedTouches: [t(2, 140, 200)],
        }));
        return !overlay.classList.contains('hidden');
    }""")
    assert still_open, "Pinch release must not swipe-dismiss via stale single-finger coords"


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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_footnote_section_rendered(page, base_url):
    """Articles with [^n] definitions should render a .footnotes section."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    assert page.locator(".footnotes").count() == 1, ".footnotes section must be present"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_footnote_list_items_rendered(page, base_url):
    """Each footnote definition becomes a .footnote-item <li>."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    items = page.locator(".footnote-item").count()
    assert items == 2, f"Expected 2 footnote items, got {items}"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_footnote_refs_link_to_definitions(page, base_url):
    """Inline [^a] markers become .footnote-ref links pointing to #fn-a."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    refs = page.locator(".footnote-ref").all()
    assert len(refs) >= 1, "At least one .footnote-ref must exist"
    href = refs[0].locator("a").get_attribute("href")
    assert href and href.startswith("#fn-"), f"footnote-ref href must point to #fn-*, got {href!r}"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_footnote_definitions_removed_from_body(page, base_url):
    """[^n]: ... definition paragraphs must not appear in the article body."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    body_text = page.locator("#markdown-body").inner_text()
    assert "[^a]:" not in body_text, "Definition paragraph [^a]: must be removed from body"
