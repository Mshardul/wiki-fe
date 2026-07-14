"""
- Prerequisites chips
- Copy button on all code blocks
- Topbar title visibility on scroll
- DOMPurify XSS sanitization
- KaTeX math support
- TOC items rendered in sidebar
- Article hero presence + ghost text
- H1 first-word accent span
- Lede paragraph styling
- sessionStorage HTML cache
- Footnote rendering
"""

import pytest


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
    """every <pre> block in article body has a .copy-btn child."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body pre", timeout=8_000)

    result = page.evaluate("""() => {
        const pres = document.querySelectorAll('#markdown-body pre');
        const missing = [...pres].filter(p => !p.querySelector('.copy-btn'));
        return { total: pres.length, missing: missing.length };
    }""")

    assert result["total"] > 0, "No code blocks found in caching article"
    assert result["missing"] == 0, (
        f"{result['missing']} of {result['total']} code blocks missing .copy-btn"
    )


def test_copy_button_writes_to_clipboard(page, base_url):
    """clicking .copy-btn copies block text to clipboard."""
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body pre .copy-btn", timeout=10_000)

    pre_text = page.evaluate(
        "() => document.querySelector('#markdown-body pre code').textContent"
    )
    page.locator("#markdown-body pre .copy-btn").first.click()

    clipboard = page.evaluate("() => navigator.clipboard.readText()")
    assert clipboard.strip() == pre_text.strip()


def test_prerequisites_chips_rendered(page, base_url):
    """Prerequisites paragraphs are converted to chips."""
    _load_mock_article(
        page, base_url, "# Mock Content\n\nPrerequisites:[A](./a.md) and [B](./b.md)\n"
    )
    page.wait_for_selector(".prereqs-container", timeout=5_000)

    chips = page.locator(".prereq-chip").all()
    assert len(chips) == 2
    assert chips[0].inner_text() == "A"
    assert chips[1].inner_text() == "B"


def test_prerequisites_original_paragraph_removed(page, base_url):
    """Original Prerequisites paragraph is removed after chip render."""
    _load_mock_article(page, base_url, "# Mock Content\n\nPrerequisites:[A](./a.md)\n")
    page.wait_for_selector(".prereqs-container", timeout=5_000)

    raw_p_count = page.evaluate("""() => {
        const ps = [...document.querySelectorAll('#markdown-body p')];
        return ps.filter(p => p.textContent.trim().startsWith('Prerequisites:')).length;
    }""")
    assert raw_p_count == 0, "Original Prerequisites: paragraph was not removed"


# ── Topbar title ────────────────────────────────────────────────────────────────


def test_topbar_title_hidden_initially(page, base_url):
    """#topbar-title does not have .visible on initial article load."""
    _load_mock_article(page, base_url, "# Big Title\n\nSome content.\n")

    is_visible = page.evaluate(
        "() => document.getElementById('topbar-title').classList.contains('visible')"
    )
    assert not is_visible, "#topbar-title should not be .visible before scrolling"


def test_topbar_title_appears_after_scroll(page, base_url):
    """#topbar-title gets .visible after h1 scrolls above viewport."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _load_mock_article(
        page, base_url, "# Big Title\n\n" + "Some text.\n\n" * 80, slug="scroll"
    )

    page.evaluate("() => window.scrollTo(0, 3000)")
    page.wait_for_function(
        "() => document.getElementById('topbar-title').classList.contains('visible')",
        timeout=5_000,
    )
    is_visible = page.evaluate(
        "() => document.getElementById('topbar-title').classList.contains('visible')"
    )
    assert is_visible, "#topbar-title should be .visible after scrolling past h1"


def test_topbar_title_text_matches_article(page, base_url):
    """#topbar-title text matches the loaded article title."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body h1", timeout=8_000)

    title_text = page.evaluate(
        "() => document.getElementById('topbar-title').textContent.trim()"
    )
    assert title_text, "#topbar-title should have non-empty text"


# ── DOMPurify XSS sanitization ──────────────────────────────────────


def test_dompurify_strips_script_tags(page, base_url):
    """<script> tags injected via markdown are not executed."""
    _load_mock_article(
        page, base_url, "# Test\n<script>window.__xss_fired = true;</script>Injected."
    )
    page.wait_for_selector("#markdown-body", timeout=5_000)

    fired = page.evaluate("() => window.__xss_fired === true")
    assert not fired, "XSS script tag was executed - DOMPurify not working"

    script_count = page.evaluate(
        "() => document.querySelectorAll('#markdown-body script').length"
    )
    assert script_count == 0, "Sanitized body still contains <script> elements"


def test_dompurify_strips_onerror_attributes(page, base_url):
    """onerror= event handlers are stripped from rendered HTML."""
    _load_mock_article(
        page, base_url, '# Test\n<img src="x" onerror="window.__onerror_fired=true">'
    )
    page.wait_for_selector("#markdown-body", timeout=5_000)

    fired = page.evaluate("() => window.__onerror_fired === true")
    assert not fired, "onerror= handler executed - DOMPurify not stripping event attrs"


# ── KaTeX math ───────────────────────────────────────────────────────


def test_katex_renders_block_math(page, base_url):
    """$$...$$ block math is rendered into KaTeX HTML elements."""
    _load_mock_article(page, base_url, "# Math\n\n$$E = mc^2$$\n", slug="math-block")

    page.wait_for_selector("#markdown-body .katex", timeout=5_000)
    katex_count = page.locator("#markdown-body .katex").count()
    assert katex_count > 0, "No .katex elements found - block math not rendered"


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


def test_toc_h3_items_have_indent_class(page, base_url):
    """TOC: h3 headings get .toc-h3 class for visual indent."""
    _load_mock_article(
        page, base_url, "# Title\n\n## Top\n\n### Sub\n\nText.\n", slug="toc-h3"
    )
    page.wait_for_selector("#toc-nav .toc-h3", timeout=5_000)
    assert page.locator("#toc-nav .toc-h3").count() == 1


def test_toc_item_click_does_not_break_hash(page, base_url):
    """TOC: clicking a TOC item updates ?a= param and preserves the article hash."""
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#toc-nav .toc-item", timeout=10_000)

    page.locator("#toc-nav .toc-item").first.click()
    page.wait_for_function("() => location.search.includes('?a=')", timeout=5_000)

    assert "system-design/caching" in page.url, "Hash route lost after TOC click"
    assert "?a=" in page.url, "?a= anchor param not set after TOC click"


# ── Article hero ────────────────────────────────────────────────────


def test_article_hero_present_on_content_load(page, base_url):
    """#article-hero is visible and ghost text matches article title on load."""
    _load_mock_article(page, base_url, "# Hero Article\n\nSome content.\n", slug="hero")

    assert page.locator("#article-hero").is_visible()
    ghost_text = page.evaluate(
        "() => document.getElementById('article-hero-ghost').textContent"
    )
    assert ghost_text == "Hero", f"Ghost text mismatch: got '{ghost_text}'"


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
        // Body paragraphs under a heading are wrapped in a .fold-region
        // container (depth-fold.js collapsible sections), so they're no
        // longer direct children of #markdown-body - query at any depth.
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
        // See test_lede_paragraph_has_larger_font_than_body - body paragraphs
        // are wrapped in .fold-region containers, so query at any depth.
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
    page.wait_for_selector("#zoom-overlay.open", timeout=5_000)


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
        return !overlay.classList.contains('open');
    }""")
    assert closed, "Downward swipe >80px should close the zoom overlay"


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
        return overlay.classList.contains('open');
    }""")
    assert still_open, "A <80px swipe must not close the overlay"


# ── HTML cache ──────────────────────────────────────────────────


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


def test_html_cache_populated_after_first_render(page, base_url):
    """sessionStorage should contain cached HTML after first article load."""
    _load_mock_article(page, base_url, "# Cache Test\n\nContent.\n", slug="cachetest")
    cached = page.evaluate("""() => {
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('wiki-html-cache-')) return sessionStorage.getItem(key);
        }
        return null;
    }""")
    assert cached is not None, "sessionStorage must have a wiki-html-cache-* entry"
    assert "<h1" in cached, "Cached HTML must contain the rendered heading"


def test_html_cache_used_on_revisit(page, base_url):
    """Second navigation to same article skips makeHtml (cache hit keeps same HTML)."""
    _load_mock_article(page, base_url, "# Revisit\n\nBody text.\n", slug="revisit")
    first_html = page.evaluate(
        "() => document.getElementById('markdown-body').innerHTML"
    )
    page.evaluate("""() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/revisit.md'),
        encodeURIComponent('Revisit'),
        'revisit'
    )""")
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    second_html = page.evaluate(
        "() => document.getElementById('markdown-body').innerHTML"
    )
    assert first_html and second_html, "Both renders must produce non-empty HTML"


# ── Footnotes ───────────────────────────────────────────────────


def test_footnote_section_rendered(page, base_url):
    """Articles with [^n] definitions should render a .footnotes section."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    assert page.locator(".footnotes").count() == 1, ".footnotes section must be present"


def test_footnote_list_items_rendered(page, base_url):
    """Each footnote definition becomes a .footnote-item <li>."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    items = page.locator(".footnote-item").count()
    assert items == 2, f"Expected 2 footnote items, got {items}"


def test_footnote_refs_link_to_definitions(page, base_url):
    """Inline [^a] markers become .footnote-ref links pointing to #fn-a."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    refs = page.locator(".footnote-ref").all()
    assert len(refs) >= 1, "At least one .footnote-ref must exist"
    href = refs[0].locator("a").get_attribute("href")
    assert href and href.startswith("#fn-"), f"footnote-ref href must point to #fn-*, got {href!r}"


def test_footnote_definitions_removed_from_body(page, base_url):
    """[^n]: ... definition paragraphs must not appear in the article body."""
    _load_mock_article_content(page, base_url, _ARTICLE_WITH_FOOTNOTES)
    body_text = page.locator("#markdown-body").inner_text()
    assert "[^a]:" not in body_text, "Definition paragraph [^a]: must be removed from body"
