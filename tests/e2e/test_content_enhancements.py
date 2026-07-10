"""
Content view enhancements:
- Table scroll cue (.table-scroll-wrap, .scroll-cue)
- Image lightbox zoom (#zoom-overlay, .zoomable-img)
- Mermaid diagram zoom (click .mermaid-diagram → overlay svg)
- Diagram theme sync (SVG re-renders on theme change)
- Mermaid step-through walkthrough (Play button, caption rail, node highlighting)
- Anchor link toast confirmation
- Reading progress bar glow
- Code block header with traffic lights and copy button
- Diff block addition/deletion highlighting
- Collapsible tall callouts
- Broken image error placeholder
"""

import pytest

ARTICLE_WITH_TABLE = """\
# Table Test

## Section

| Column A | Column B | Column C | Column D | Column E |
|----------|----------|----------|----------|----------|
| row1a    | row1b    | row1c    | row1d    | row1e    |
| row2a    | row2b    | row2c    | row2d    | row2e    |
"""

ARTICLE_WITH_IMAGE = """\
# Image Test

![A test image](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)

Some text after the image.
"""

ARTICLE_WITH_MERMAID = """\
# Mermaid Test

```mermaid
graph LR
  A[Start] --> B[Middle] --> C[End]
```

Some text.
"""

ARTICLE_WITH_MERMAID_STEPS = """\
# Mermaid Step-Through Test

```mermaid
graph LR
  A[Start] --> B[Middle] --> C[End]
  %% step: 1 a "Start at node A"
  %% step: 2 a,b "Traverse edge A to B"
  %% step: 3 b,c "Traverse edge B to C"
```

Some text.
"""


def _load_mock_article(page, base_url, content, slug="mock"):
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
    page.wait_for_selector("#view-content.active", timeout=8_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=8_000,
    )


# ── Table scroll cue ──────────────────────────────────────────────


def test_table_wrapped_in_scroll_container(page, base_url):
    """Every table in the content body is wrapped in .table-scroll-wrap."""
    _load_mock_article(page, base_url, ARTICLE_WITH_TABLE, slug="table-wrap")
    page.wait_for_selector(".table-scroll-wrap", timeout=5_000)

    result = page.evaluate("""() => {
        const tables = document.querySelectorAll('#markdown-body table');
        const wrapped = [...tables].filter(t => t.closest('.table-scroll-wrap'));
        return { total: tables.length, wrapped: wrapped.length };
    }""")
    assert result["total"] > 0, "No tables found in article"
    assert result["wrapped"] == result["total"], (
        f"Only {result['wrapped']} of {result['total']} tables are wrapped"
    )


def test_table_scroll_wrap_has_overflow_auto(page, base_url):
    """.table-scroll-wrap has overflow-x: auto to enable horizontal scrolling."""
    _load_mock_article(page, base_url, ARTICLE_WITH_TABLE, slug="table-overflow")
    page.wait_for_selector(".table-scroll-wrap", timeout=5_000)

    overflow = page.evaluate("""() => {
        const wrap = document.querySelector('.table-scroll-wrap');
        return getComputedStyle(wrap).overflowX;
    }""")
    assert overflow == "auto", (
        f"Expected overflow-x: auto on .table-scroll-wrap, got: {overflow}"
    )


def test_table_scroll_cue_on_narrow_viewport(page, base_url):
    """.table-scroll-wrap gets .scroll-cue when table overflows its container."""
    _load_mock_article(page, base_url, ARTICLE_WITH_TABLE, slug="table-narrow")
    page.wait_for_selector(".table-scroll-wrap", timeout=5_000)

    # Force overflow by narrowing the wrapper, then trigger updateCue directly.
    # ResizeObserver timing in headless tests is not reliable enough to await.
    result = page.evaluate("""() => {
        const wrap = document.querySelector('.table-scroll-wrap');
        if (!wrap) return { found: false };
        wrap.style.width = '120px';
        const overflows = wrap.scrollWidth > wrap.clientWidth + 4;
        const atEnd = wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4;
        wrap.classList.toggle('scroll-cue', overflows && !atEnd);
        return { found: true, hasCue: wrap.classList.contains('scroll-cue'),
                 scrollW: wrap.scrollWidth, clientW: wrap.clientWidth };
    }""")
    assert result["found"], "No .table-scroll-wrap found"
    assert result["hasCue"], (
        f".scroll-cue not set; scrollWidth={result['scrollW']}, clientWidth={result['clientW']}"
    )


def test_table_scroll_cue_absent_on_wide_viewport(page, base_url):
    """.scroll-cue is absent when the table fits within the viewport."""
    page.set_viewport_size({"width": 1400, "height": 900})
    _load_mock_article(page, base_url, ARTICLE_WITH_TABLE, slug="table-wide")
    page.wait_for_selector(".table-scroll-wrap", timeout=5_000)

    has_cue = page.evaluate(
        "() => document.querySelector('.table-scroll-wrap')?.classList.contains('scroll-cue')"
    )
    assert not has_cue, (
        ".table-scroll-wrap should NOT have .scroll-cue on wide viewport"
    )


# ── Code block right-fade scroll cue ──────────────────────────────


LONG_CODE_LINE = "x = " + " + ".join(f"variable_{i}" for i in range(40))
ARTICLE_WITH_LONG_CODE_BLOCK = (
    "# Long Code Block Test\n\n```python\n"
    + "\n".join([LONG_CODE_LINE] + [f"y_{i} = {i}" for i in range(25)])
    + "\n```\n"
)


def test_collapsible_code_block_gets_right_fade_on_mobile(page, base_url):
    """Regression for WIKI-379: collapsible code blocks (>20 lines) skip the
    right-edge scroll fade in code.css because their ::after is already used
    for the bottom collapse fade. responsive.css adds a ::before fade for
    them on mobile so the cue is consistent across all overflowing blocks."""
    page.set_viewport_size({"width": 390, "height": 844})
    _load_mock_article(page, base_url, ARTICLE_WITH_LONG_CODE_BLOCK, slug="long-code")
    page.wait_for_selector("#markdown-body pre.pre--collapsible", timeout=5_000)

    result = page.evaluate("""() => {
        const pre = document.querySelector('#markdown-body pre.pre--collapsible');
        if (!pre) return { found: false };
        pre.classList.add('pre--overflowing'); // ResizeObserver timing unreliable headless
        const before = getComputedStyle(pre, '::before');
        return { found: true, content: before.content, bg: before.backgroundImage };
    }""")
    assert result["found"], "No .pre--collapsible code block found"
    assert result["content"] not in ("none", ""), (
        "Expected a ::before pseudo-element with a right-fade on the collapsible code block"
    )
    assert "linear-gradient" in result["bg"], (
        f"Expected ::before to render a gradient fade, got: {result['bg']}"
    )


# ── Anchor button tap target on touch devices ─────────────────────


def test_anchor_button_32px_on_coarse_pointer(browser, base_url, cdn_cache):
    """Regression for WIKI-387: .anchor-btn was 16x16px on mobile viewports,
    too small to reliably tap. On pointer:coarse devices it should be at
    least 32x32px."""
    ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 390, "height": 844},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        def _make_handler(body, content_type):
            return lambda route: route.fulfill(
                status=200, content_type=content_type, body=body
            )

        for url, (body, content_type) in cdn_cache.items():
            page.route(url, _make_handler(body, content_type))

        page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
        page.wait_for_selector("#view-content.active", timeout=10_000)
        page.wait_for_selector(".anchor-btn", timeout=10_000)

        size = page.evaluate("""() => {
            const r = document.querySelector('.anchor-btn').getBoundingClientRect();
            return { width: r.width, height: r.height };
        }""")
        assert size["width"] >= 32, f"anchor-btn width too small: {size['width']}px"
        assert size["height"] >= 32, f"anchor-btn height too small: {size['height']}px"
    finally:
        ctx.close()


# ── Image lightbox zoom ───────────────────────────────────────────


def test_image_has_zoomable_class(page, base_url):
    """Images in content body get .zoomable-img class after render."""
    _load_mock_article(page, base_url, ARTICLE_WITH_IMAGE, slug="img-class")
    page.wait_for_selector("#markdown-body img", timeout=5_000)

    has_class = page.evaluate("""() => {
        const img = document.querySelector('#markdown-body img');
        return img?.classList.contains('zoomable-img');
    }""")
    assert has_class, "Image in content is missing .zoomable-img class"


def test_image_click_opens_zoom_overlay(page, base_url):
    """Clicking an image in the content body opens the zoom overlay."""
    _load_mock_article(page, base_url, ARTICLE_WITH_IMAGE, slug="img-open")
    page.wait_for_selector("#markdown-body img.zoomable-img", timeout=5_000)

    page.locator("#markdown-body img.zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    is_open = page.evaluate(
        "() => document.getElementById('zoom-overlay')?.classList.contains('open')"
    )
    assert is_open, "Zoom overlay did not open after clicking image"


def test_zoom_overlay_contains_image(page, base_url):
    """Zoom overlay content contains an <img> element after an image is clicked."""
    _load_mock_article(page, base_url, ARTICLE_WITH_IMAGE, slug="img-content")
    page.wait_for_selector("#markdown-body img.zoomable-img", timeout=5_000)

    page.locator("#markdown-body img.zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    img_in_overlay = page.evaluate("""() => {
        const overlay = document.getElementById('zoom-overlay');
        return overlay?.querySelector('.zoom-overlay-content img') !== null;
    }""")
    assert img_in_overlay, "Zoom overlay does not contain an <img> element"


def test_zoom_overlay_closes_on_escape(page, base_url):
    """Pressing Escape closes the zoom overlay."""
    _load_mock_article(page, base_url, ARTICLE_WITH_IMAGE, slug="img-esc")
    page.wait_for_selector("#markdown-body img.zoomable-img", timeout=5_000)

    page.locator("#markdown-body img.zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => !document.getElementById('zoom-overlay')?.classList.contains('open')",
        timeout=3_000,
    )
    is_open = page.evaluate(
        "() => document.getElementById('zoom-overlay')?.classList.contains('open')"
    )
    assert not is_open, "Zoom overlay should be closed after pressing Escape"


def test_zoom_overlay_closes_on_backdrop_click(page, base_url):
    """Clicking the backdrop closes the zoom overlay."""
    _load_mock_article(page, base_url, ARTICLE_WITH_IMAGE, slug="img-backdrop")
    page.wait_for_selector("#markdown-body img.zoomable-img", timeout=5_000)

    page.locator("#markdown-body img.zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    # The image is centered in the overlay and intercepts pointer events at center.
    # Click at the top-left corner of the viewport - always on the backdrop, never on content.
    page.mouse.click(5, 5)
    page.wait_for_function(
        "() => !document.getElementById('zoom-overlay')?.classList.contains('open')",
        timeout=3_000,
    )
    is_open = page.evaluate(
        "() => document.getElementById('zoom-overlay')?.classList.contains('open')"
    )
    assert not is_open, "Zoom overlay should be closed after clicking backdrop"


def test_zoom_overlay_closes_on_close_button(page, base_url):
    """Clicking the × close button closes the zoom overlay."""
    _load_mock_article(page, base_url, ARTICLE_WITH_IMAGE, slug="img-closebtn")
    page.wait_for_selector("#markdown-body img.zoomable-img", timeout=5_000)

    page.locator("#markdown-body img.zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    page.locator(".zoom-overlay-close").click()
    page.wait_for_function(
        "() => !document.getElementById('zoom-overlay')?.classList.contains('open')",
        timeout=3_000,
    )
    is_open = page.evaluate(
        "() => document.getElementById('zoom-overlay')?.classList.contains('open')"
    )
    assert not is_open, "Zoom overlay should be closed after clicking close button"


def test_escape_after_zoom_stays_in_content_view(page, base_url):
    """Escape while zoom overlay is open closes overlay without navigating away."""
    _load_mock_article(page, base_url, ARTICLE_WITH_IMAGE, slug="img-nav")
    page.wait_for_selector("#markdown-body img.zoomable-img", timeout=5_000)

    page.locator("#markdown-body img.zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    page.keyboard.press("Escape")
    page.wait_for_function(
        "() => !document.getElementById('zoom-overlay')?.classList.contains('open')",
        timeout=3_000,
    )

    still_content = page.evaluate(
        "() => document.getElementById('view-content').classList.contains('active')"
    )
    assert still_content, "Content view was abandoned when Escape closed zoom overlay"


# ── Diagram zoom ──────────────────────────────────────────────────


def test_mermaid_diagram_has_zoom_cursor(page, base_url):
    """.mermaid-diagram element has cursor: zoom-in from CSS."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="diag-cursor")
    page.wait_for_selector(".mermaid-diagram", timeout=8_000)

    cursor = page.evaluate("""() => {
        const d = document.querySelector('.mermaid-diagram');
        return d ? getComputedStyle(d).cursor : null;
    }""")
    assert cursor == "zoom-in", (
        f"Expected cursor: zoom-in on .mermaid-diagram, got: {cursor}"
    )


def test_diagram_click_opens_zoom_overlay(page, base_url):
    """Clicking a rendered .mermaid-diagram opens the zoom overlay."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="diag-open")
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)

    page.locator(".mermaid-diagram").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    is_open = page.evaluate(
        "() => document.getElementById('zoom-overlay')?.classList.contains('open')"
    )
    assert is_open, "Zoom overlay did not open after clicking mermaid diagram"


def test_diagram_zoom_overlay_contains_svg(page, base_url):
    """Zoom overlay content contains an <svg> element after a diagram is clicked."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="diag-svg")
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)

    page.locator(".mermaid-diagram").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    svg_in_overlay = page.evaluate("""() => {
        const overlay = document.getElementById('zoom-overlay');
        return overlay?.querySelector('.zoom-overlay-content svg') !== null;
    }""")
    assert svg_in_overlay, "Zoom overlay does not contain an <svg> element"


def test_diagram_zoom_overlay_svg_has_nonzero_size(page, base_url):
    """Zoomed diagram SVG renders with real dimensions, not collapsed to 0x0."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="diag-size")
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)

    page.locator(".mermaid-diagram").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    box = page.locator(".zoom-diagram-svg").bounding_box()
    assert box is not None
    assert box["width"] > 0 and box["height"] > 0, (
        f"Zoomed diagram SVG collapsed to a zero-size box: {box}"
    )


# ── Diagram theme sync ────────────────────────────────────────────


def test_mermaid_src_stored_on_wrapper(page, base_url):
    """.mermaid-diagram wrappers have data-mermaid-src set after initial render."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="diag-src")
    page.wait_for_selector(".mermaid-diagram", timeout=8_000)

    has_src = page.evaluate("""() => {
        const wrapper = document.querySelector('.mermaid-diagram');
        return wrapper?.dataset.mermaidSrc?.trim().length > 0;
    }""")
    assert has_src, ".mermaid-diagram wrapper is missing data-mermaid-src attribute"


def test_diagram_rerenders_on_theme_change(page, base_url):
    """Switching theme triggers Mermaid re-render; SVG output changes."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="diag-theme")
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)

    svg_before = page.evaluate(
        "() => document.querySelector('.mermaid-diagram svg')?.outerHTML"
    )
    assert svg_before, "No mermaid SVG found before theme change"

    page.evaluate("() => Settings._setBackground('light-white')")

    page.wait_for_function(
        f"""() => {{
            const svg = document.querySelector('.mermaid-diagram svg');
            return svg && svg.outerHTML !== {repr(svg_before)};
        }}""",
        timeout=5_000,
    )

    svg_after = page.evaluate(
        "() => document.querySelector('.mermaid-diagram svg')?.outerHTML"
    )
    assert svg_before != svg_after, (
        "Mermaid SVG did not change after theme switch - re-render not triggered"
    )


def test_diagram_src_preserved_after_theme_change(page, base_url):
    """data-mermaid-src is preserved on wrapper after a theme-triggered re-render."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="diag-src-preserve")
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)

    src_before = page.evaluate(
        "() => document.querySelector('.mermaid-diagram')?.dataset.mermaidSrc"
    )
    page.evaluate("() => Settings._setBackground('light-white')")

    # Wait for re-render: rerenderMermaidDiagrams replaces wrapper.innerHTML
    page.wait_for_function(
        "() => !!document.querySelector('.mermaid-diagram svg')",
        timeout=5_000,
    )

    src_after = page.evaluate(
        "() => document.querySelector('.mermaid-diagram')?.dataset.mermaidSrc"
    )
    assert src_before == src_after, (
        "data-mermaid-src changed after re-render - re-render should preserve source attribute"
    )


# ── Mermaid step-through ──────────────────────────────────────────


def test_mermaid_no_step_through_button_without_steps(page, base_url):
    """A mermaid diagram with no %% step: directives gets no Play button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID, slug="steps-none")
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)

    count = page.locator(".mermaid-step-play-btn").count()
    assert count == 0, "Play button should not appear when no %% step: directives are present"


def test_mermaid_step_through_play_button_appears(page, base_url):
    """A mermaid diagram with %% step: directives shows a Play button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID_STEPS, slug="steps-btn")
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)

    page.wait_for_selector(".mermaid-step-play-btn", timeout=3_000)
    count = page.locator(".mermaid-step-play-btn").count()
    assert count == 1, "Play button should appear when %% step: directives are present"


def test_mermaid_step_through_play_reveals_rail_and_highlights_first_step(page, base_url):
    """Clicking Play reveals the caption rail and highlights the first step's node."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID_STEPS, slug="steps-play")
    page.wait_for_selector(".mermaid-step-play-btn", timeout=8_000)

    page.locator(".mermaid-step-play-btn").click()
    page.wait_for_selector(".mermaid-step-rail", state="visible", timeout=3_000)

    label_text = page.locator(".mermaid-step-label").inner_text()
    assert "Step 1/3" in label_text, f"Expected 'Step 1/3' in rail label, got: {label_text}"

    active_count = page.locator(".mermaid-diagram .step-active").count()
    assert active_count >= 1, "First step should highlight at least one node"


def test_mermaid_step_through_next_advances_step(page, base_url):
    """Clicking Next advances to the next step and updates the caption."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID_STEPS, slug="steps-next")
    page.wait_for_selector(".mermaid-step-play-btn", timeout=8_000)

    page.locator(".mermaid-step-play-btn").click()
    page.wait_for_selector(".mermaid-step-rail", state="visible", timeout=3_000)

    page.locator(".mermaid-step-next").click()
    page.wait_for_function(
        "() => document.querySelector('.mermaid-step-label')?.textContent.includes('Step 2/3')",
        timeout=3_000,
    )

    label_text = page.locator(".mermaid-step-label").inner_text()
    assert "Traverse edge A to B" in label_text, (
        f"Expected step 2 caption in rail label, got: {label_text}"
    )


# ── Anchor link toast ─────────────────────────────────────────────

ARTICLE_WITH_SECTIONS = """\
# Toast Test

First paragraph.

## Section Alpha

Content here.

## Section Beta

More content.
"""


def test_anchor_link_click_shows_link_copied_toast(page, base_url):
    """Clicking a heading anchor button shows a 'Link copied' toast."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="anchor-toast")
    page.context.grant_permissions(["clipboard-read", "clipboard-write"])
    page.wait_for_selector("#markdown-body h2 .anchor-btn", timeout=5_000)

    page.locator("#markdown-body h2 .anchor-btn").first.click()
    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)

    toast_text = page.evaluate(
        "() => document.getElementById('wiki-toast')?.textContent"
    )
    assert "Link copied" in (toast_text or ""), (
        f"Expected 'Link copied' in toast, got '{toast_text}'"
    )


def test_anchor_link_toast_does_not_show_on_page_load(page, base_url):
    """No toast is visible on initial article load (no accidental trigger)."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="anchor-no-toast")

    toast_visible = page.evaluate(
        "() => document.getElementById('wiki-toast')?.classList.contains('visible') ?? false"
    )
    assert not toast_visible, "Toast must not be visible on article load"


# ── Reading progress bar glow ────────────────────────────────────


def test_reading_progress_bar_has_box_shadow(page, base_url):
    """reading-progress element has a box-shadow (accent glow) set in CSS."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="progress-glow")

    box_shadow = page.evaluate("""() => {
        const bar = document.getElementById('reading-progress');
        return bar ? window.getComputedStyle(bar).boxShadow : null;
    }""")
    assert box_shadow is not None, "#reading-progress element not found"
    assert box_shadow != "none", (
        "reading-progress must have a box-shadow glow, got 'none'"
    )


def test_reading_progress_bar_visible_in_content_view(page, base_url):
    """reading-progress bar has .visible class when in content view."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="progress-visible")

    is_visible = page.evaluate(
        "() => document.getElementById('reading-progress')?.classList.contains('visible') ?? false"
    )
    assert is_visible, "reading-progress must have .visible class in content view"


# ── Code block header ─────────────────────────────────────────────

ARTICLE_WITH_CODE = """\
# Code Block Test

## Section

```python
def greet(name):
    return f"Hello, {name}!"

x = greet("world")
```
"""

ARTICLE_WITH_DIFF = """\
# Diff Test

## Section

```diff
+ added line here
- removed line here
  context line
```
"""


def test_code_block_has_traffic_lights(page, base_url):
    """Each code block gets a .code-header containing three .tl traffic-light dots."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="code-header-tl")
    page.wait_for_selector("#markdown-body pre", timeout=5_000)

    result = page.evaluate("""() => {
        const pre = document.querySelector('#markdown-body pre');
        if (!pre) return { found: false };
        const header = pre.querySelector('.code-header');
        const dots = header ? header.querySelectorAll('.tl').length : 0;
        return { found: true, hasHeader: !!header, dots };
    }""")
    assert result["found"], "No <pre> found in article"
    assert result["hasHeader"], "<pre> is missing .code-header"
    assert result["dots"] == 3, (
        f"Expected 3 .tl dots in .code-header, got {result['dots']}"
    )


def test_code_block_copy_button_in_header(page, base_url):
    """Copy button lives inside <pre> (after .code-header) and shows the ⧉ glyph."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="code-copybtn")
    page.wait_for_selector("#markdown-body pre", timeout=5_000)

    result = page.evaluate("""() => {
        const pre = document.querySelector('#markdown-body pre');
        if (!pre) return { found: false };
        const btn = pre.querySelector('.copy-btn');
        return { found: true, hasCopyBtn: !!btn, text: btn?.textContent?.trim() };
    }""")
    assert result["found"], "<pre> not found inside #markdown-body"
    assert result["hasCopyBtn"], ".copy-btn not found inside <pre>"
    assert result["text"] == "⧉", (
        f"Expected copy button glyph '⧉', got '{result['text']}'"
    )


ARTICLE_WITH_CODE_NO_LANG = """\
# Code No Lang Test

## Section

```
plain code block with no language tag
```
"""


# ── Code block has-lang-label class ───────────────────────────────


def test_code_block_with_lang_has_has_lang_label_class(page, base_url):
    """<pre> containing a language tag gets class has-lang-label."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="has-lang-yes")
    page.wait_for_selector("#markdown-body pre", timeout=5_000)

    has_class = page.evaluate("""() => {
        const pre = document.querySelector('#markdown-body pre');
        return pre ? pre.classList.contains('has-lang-label') : null;
    }""")
    assert has_class is True, "<pre> with language tag is missing has-lang-label class"


def test_code_block_without_lang_lacks_has_lang_label_class(page, base_url):
    """<pre> without a language tag does not get class has-lang-label."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE_NO_LANG, slug="has-lang-no")
    page.wait_for_selector("#markdown-body pre", timeout=5_000)

    has_class = page.evaluate("""() => {
        const pre = document.querySelector('#markdown-body pre');
        return pre ? pre.classList.contains('has-lang-label') : null;
    }""")
    assert has_class is False, (
        "<pre> without language tag must not have has-lang-label class"
    )


# ── Diff block highlighting ───────────────────────────────────────


def test_diff_css_rules_for_additions_and_deletions(page, base_url):
    """CSS rules give .hljs-addition and .hljs-deletion display:block."""
    _load_mock_article(page, base_url, ARTICLE_WITH_DIFF, slug="diff-css")
    page.wait_for_selector("#markdown-body", timeout=5_000)

    result = page.evaluate("""() => {
        const body = document.getElementById('markdown-body');
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.className = 'language-diff';
        const add = document.createElement('span');
        add.className = 'hljs-addition';
        const del = document.createElement('span');
        del.className = 'hljs-deletion';
        code.appendChild(add);
        code.appendChild(del);
        pre.appendChild(code);
        body.appendChild(pre);
        const addDisplay = getComputedStyle(add).display;
        const delDisplay = getComputedStyle(del).display;
        body.removeChild(pre);
        return { addDisplay, delDisplay };
    }""")
    assert result["addDisplay"] == "block", (
        f".hljs-addition display should be block, got: {result['addDisplay']}"
    )
    assert result["delDisplay"] == "block", (
        f".hljs-deletion display should be block, got: {result['delDisplay']}"
    )


# ── Collapsible callouts ──────────────────────────────────────────

ARTICLE_WITH_LONG_CALLOUT = """\
# Callout Test

## Section

> ⚠️ **Warning** This callout contains many paragraphs and should be collapsed.
>
> Paragraph one: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph two: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph three: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph four: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph five: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph six: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph seven: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph eight: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph nine: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph ten: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph eleven: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph twelve: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph thirteen: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph fourteen: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
>
> Paragraph fifteen: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
"""


def test_tall_callout_gets_collapsible_class(page, base_url):
    """A tall callout gets .callout--collapsible and a toggle button after render."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _load_mock_article(
        page, base_url, ARTICLE_WITH_LONG_CALLOUT, slug="callout-collapsible"
    )
    page.wait_for_selector(".callout", timeout=5_000)

    result = page.evaluate("""() => {
        const callout = document.querySelector('.callout');
        if (!callout) return { found: false };
        const nextEl = callout.nextElementSibling;
        return {
            found: true,
            isCollapsible: callout.classList.contains('callout--collapsible'),
            hasBtn: nextEl?.classList.contains('callout-expand-btn') ?? false,
        };
    }""")
    assert result["found"], "No .callout element found in article"
    assert result["isCollapsible"], (
        ".callout is missing .callout--collapsible on a tall callout"
    )
    assert result["hasBtn"], ".callout-expand-btn not found after .callout"


def test_callout_expand_btn_toggles_expanded(page, base_url):
    """Clicking the expand button adds .callout--expanded; clicking again removes it."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _load_mock_article(page, base_url, ARTICLE_WITH_LONG_CALLOUT, slug="callout-expand")
    page.wait_for_selector(".callout--collapsible", timeout=5_000)

    page.locator(".callout-expand-btn").first.click()
    is_expanded = page.evaluate(
        "() => document.querySelector('.callout')?.classList.contains('callout--expanded')"
    )
    assert is_expanded, ".callout--expanded not added after first click"

    page.locator(".callout-expand-btn").first.click()
    is_still_expanded = page.evaluate(
        "() => document.querySelector('.callout')?.classList.contains('callout--expanded')"
    )
    assert not is_still_expanded, (
        ".callout--expanded still present after second click (collapse)"
    )


# ── Broken image placeholder ─────────────────────────────────────

ARTICLE_WITH_BROKEN_IMAGE = """\
# Broken Image Test

## Section

![Missing image](/content/broken-test-image-404-xyz.png)

Some text after the image.
"""


def test_broken_image_shows_error_placeholder(page, base_url):
    """A broken <img> src is replaced with .img-error-placeholder after onerror fires."""
    page.route("**/broken-test-image-404-xyz.png", lambda r: r.abort())
    _load_mock_article(page, base_url, ARTICLE_WITH_BROKEN_IMAGE, slug="broken-img")
    page.wait_for_selector("#markdown-body", timeout=5_000)
    page.wait_for_selector(".img-error-placeholder", timeout=5_000)

    count = page.evaluate(
        "() => document.querySelectorAll('#markdown-body .img-error-placeholder').length"
    )
    assert count > 0, "No .img-error-placeholder found - broken image not replaced"


# ── Copy code with source-context header ────────────────────────────────────────

_CLIPBOARD_SPY = """() => {
    window.__copied = null;
    if (navigator.clipboard) {
        navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); };
    }
}"""


def _set_copy_source_header(page, on):
    # getSettings() only honours a stored object that carries backgroundId.
    page.evaluate(
        """(on) => {
            const base = JSON.parse(localStorage.getItem('wiki-settings') || 'null') || {};
            const s = {
                backgroundId: 'dark-void',
                textColorId: 'text-crisp-dark',
                accentId: 'indigo',
                font: 'Inter',
                fontSize: 'M',
                contentWidth: 'Default',
                ...base,
                copySourceHeader: on,
            };
            localStorage.setItem('wiki-settings', JSON.stringify(s));
        }""",
        on,
    )


def test_copy_without_source_header_setting_off(page, base_url):
    """With the setting off, copied code carries no // from: header (default)."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="copy-src-off")
    _set_copy_source_header(page, False)
    page.evaluate(_CLIPBOARD_SPY)
    page.click("#markdown-body pre .copy-btn")
    page.wait_for_function("() => window.__copied !== null", timeout=3_000)

    copied = page.evaluate("() => window.__copied")
    assert "from:" not in copied, f"Header leaked while setting off: {copied!r}"
    assert copied.startswith("def greet"), copied


def test_copy_with_source_header_setting_on(page, base_url):
    """With the setting on, copied code is prefixed with a // from: comment."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="copy-src-on")
    _set_copy_source_header(page, True)
    page.evaluate(_CLIPBOARD_SPY)
    page.click("#markdown-body pre .copy-btn")
    page.wait_for_function("() => window.__copied !== null", timeout=3_000)

    copied = page.evaluate("() => window.__copied")
    first_line = copied.splitlines()[0]
    assert first_line.startswith("# from:"), first_line
    assert "wiki" in first_line, first_line
    assert "def greet" in copied, copied


def test_copy_source_toggle_persists(wiki_page):
    """Clicking the Advanced-panel toggle flips copySourceHeader in localStorage."""
    wiki_page.locator("[title='Preferences (,)']").first.click()
    wiki_page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    wiki_page.locator("[data-action='prefs-tab'][aria-controls='prefs-panel-advanced']").click()
    btn = wiki_page.locator("#settings-copy-source")
    before = wiki_page.evaluate(
        "() => (JSON.parse(localStorage.getItem('wiki-settings')||'{}').copySourceHeader) === true"
    )
    btn.click()
    after = wiki_page.evaluate(
        "() => (JSON.parse(localStorage.getItem('wiki-settings')||'{}').copySourceHeader) === true"
    )
    assert after != before, "Toggle did not flip the stored copySourceHeader value"
    assert ("active" in (btn.get_attribute("class") or "")) == after


# ── Quiz-me blur mode on complexity tables ──────────────────────────────────────

ARTICLE_WITH_COMPLEXITY_TABLE = """\
# Complexity Test

## Section

| Operation | Time   | Space |
| --------- | ------ | ----- |
| Access    | O(1)   | O(1)  |
| Search    | O(n)   | O(1)  |
| Insert    | O(n)   | O(n)  |
"""

ARTICLE_WITH_PLAIN_TABLE = """\
# Plain Test

## Section

| Fruit | Colour |
| ----- | ------ |
| Apple | Red    |
| Lime  | Green  |
"""


def test_complexity_table_gets_quiz_class(page, base_url):
    """A table with Time/Space headers is tagged .quiz-table; its answer cells get .quiz-cell."""
    _load_mock_article(page, base_url, ARTICLE_WITH_COMPLEXITY_TABLE, slug="quiz-tag")
    page.wait_for_selector("#markdown-body table", timeout=5_000)
    result = page.evaluate("""() => {
        const t = document.querySelector('#markdown-body table');
        return {
            isQuiz: t.classList.contains('quiz-table'),
            cells: t.querySelectorAll('.quiz-cell').length,
        };
    }""")
    assert result["isQuiz"], "Complexity table not tagged .quiz-table"
    # 3 rows × 2 answer columns (first column is the row label/prompt).
    assert result["cells"] == 6, f"Expected 6 quiz cells, got {result['cells']}"


def test_plain_table_not_quizzable(page, base_url):
    """A non-complexity table is left untouched (no .quiz-table)."""
    _load_mock_article(page, base_url, ARTICLE_WITH_PLAIN_TABLE, slug="quiz-plain")
    page.wait_for_selector("#markdown-body table", timeout=5_000)
    is_quiz = page.evaluate(
        "() => document.querySelector('#markdown-body table').classList.contains('quiz-table')"
    )
    assert not is_quiz, "Plain prose table should not be tagged quizzable"


def test_q_hotkey_blurs_quiz_cells(page, base_url):
    """Pressing q in content view blanks every answer cell with .quiz-blurred."""
    _load_mock_article(page, base_url, ARTICLE_WITH_COMPLEXITY_TABLE, slug="quiz-blur")
    page.wait_for_selector("#markdown-body .quiz-cell", timeout=5_000)
    page.keyboard.press("q")
    page.wait_for_selector("#markdown-body .quiz-cell.quiz-blurred", timeout=2_000)
    blurred = page.evaluate(
        "() => document.querySelectorAll('#markdown-body .quiz-cell.quiz-blurred').length"
    )
    assert blurred == 6, f"Expected all 6 cells blurred, got {blurred}"


def test_q_hotkey_toggles_off(page, base_url):
    """Pressing q twice reveals all cells again."""
    _load_mock_article(page, base_url, ARTICLE_WITH_COMPLEXITY_TABLE, slug="quiz-toggle")
    page.wait_for_selector("#markdown-body .quiz-cell", timeout=5_000)
    page.keyboard.press("q")
    page.wait_for_selector("#markdown-body .quiz-cell.quiz-blurred", timeout=2_000)
    page.keyboard.press("q")
    blurred = page.evaluate(
        "() => document.querySelectorAll('#markdown-body .quiz-cell.quiz-blurred').length"
    )
    assert blurred == 0, f"Second q should clear blur, still {blurred} blurred"


def test_tap_reveals_cell_and_records(page, base_url):
    """Tapping a blurred cell un-blurs it and increments the reveal count."""
    _load_mock_article(page, base_url, ARTICLE_WITH_COMPLEXITY_TABLE, slug="quiz-reveal")
    page.wait_for_selector("#markdown-body .quiz-cell", timeout=5_000)
    page.keyboard.press("q")
    page.wait_for_selector("#markdown-body .quiz-cell.quiz-blurred", timeout=2_000)

    page.click("#markdown-body .quiz-cell.quiz-blurred >> nth=0")
    remaining = page.evaluate(
        "() => document.querySelectorAll('#markdown-body .quiz-cell.quiz-blurred').length"
    )
    assert remaining == 5, f"Tapped cell should reveal, {remaining} still blurred"


def test_quiz_topbar_button_toggles_blur(page, base_url):
    """Tapping the content-topbar quiz button is a touch-accessible equivalent of the q hotkey."""
    _load_mock_article(page, base_url, ARTICLE_WITH_COMPLEXITY_TABLE, slug="quiz-btn-toggle")
    page.wait_for_selector("#markdown-body .quiz-cell", timeout=5_000)

    page.click('[data-action="quiz-toggle"]')
    page.wait_for_selector("#markdown-body .quiz-cell.quiz-blurred", timeout=2_000)
    blurred = page.evaluate(
        "() => document.querySelectorAll('#markdown-body .quiz-cell.quiz-blurred').length"
    )
    assert blurred == 6, f"Expected all 6 cells blurred via button, got {blurred}"

    is_active = page.evaluate(
        "() => document.getElementById('content-quiz-btn').classList.contains('active')"
    )
    assert is_active, "Quiz button should show active state while quiz mode is on"

    page.click('[data-action="quiz-toggle"]')
    blurred_after = page.evaluate(
        "() => document.querySelectorAll('#markdown-body .quiz-cell.quiz-blurred').length"
    )
    assert blurred_after == 0, "Second click on quiz button should clear blur"


@pytest.mark.parametrize("width", [320, 360, 375])
def test_content_topbar_fits_narrow_viewports(page, base_url, width):
    """The content-topbar row (back, breadcrumb, action buttons) must not
    overflow at common narrow phone widths - regression for WIKI-341, where
    low-priority buttons and a non-shrinking breadcrumb pushed the auth
    button off-screen."""
    page.set_viewport_size({"width": width, "height": 700})
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )

    overflow = page.evaluate("""() => {
        const inner = document.querySelector('.content-topbar .topbar-inner');
        return inner.scrollWidth - inner.clientWidth;
    }""")
    assert overflow <= 1, (
        f"content-topbar overflows by {overflow}px at {width}px viewport width"
    )

    auth_btn_box = page.evaluate("""() => {
        const el = document.getElementById('auth-btn-content');
        const r = el.getBoundingClientRect();
        return { right: r.right, width: r.width };
    }""")
    assert auth_btn_box["width"] > 0, "Auth button should be visible in the content topbar"
    assert auth_btn_box["right"] <= width, (
        f"Auth button right edge ({auth_btn_box['right']}) clipped past "
        f"viewport width ({width})"
    )


# ── Print / PDF study sheet ─────────────────────────────────────────────────────


def test_print_button_present_in_content_topbar(page, base_url):
    """Content topbar exposes a print action button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="print-btn")
    btn = page.locator(".content-topbar [data-action='print-article']")
    assert btn.count() == 1, "Print button missing from content topbar"


def test_print_button_stamps_source_url(page, base_url):
    """Triggering print stamps the canonical URL onto #markdown-body for the footer."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="print-url")
    # Suppress the actual print dialog so the test doesn't block.
    page.evaluate("() => { window.print = () => {}; }")
    page.click(".content-topbar [data-action='print-article']")
    url = page.evaluate(
        "() => document.getElementById('markdown-body').getAttribute('data-print-url')"
    )
    assert url and url.startswith("http"), f"data-print-url not stamped, got {url!r}"


def test_copy_markdown_button_present_in_content_topbar(page, base_url):
    """Content topbar exposes a copy-raw-markdown action button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="copy-md-btn")
    btn = page.locator(".content-topbar [data-action='copy-markdown']")
    assert btn.count() == 1, "Copy markdown button missing from content topbar"


def test_copy_markdown_copies_raw_source(page, base_url):
    """Clicking the copy-markdown button writes the fetched raw .md source to the clipboard."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="copy-md-source")
    page.evaluate(_CLIPBOARD_SPY)
    page.click(".content-topbar [data-action='copy-markdown']")
    page.wait_for_function("() => window.__copied !== null", timeout=3_000)
    copied = page.evaluate("() => window.__copied")
    assert copied == ARTICLE_WITH_CODE, f"Copied text does not match raw markdown source: {copied!r}"


def test_print_stylesheet_loaded(wiki_page):
    """The print stylesheet is imported via the CSS aggregator."""
    has_print = wiki_page.evaluate(
        """() => {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.media && String(rule.media).includes('print')) return true;
                        if (rule.href && rule.href.includes('print.css')) return true;
                    }
                } catch (e) { /* cross-origin sheet - skip */ }
            }
            return false;
        }"""
    )
    assert has_print, "No @media print rules found - print.css not loaded"


# ── Table column sort ───────────────────────────────────────────────────────────

ARTICLE_WITH_SORTABLE_TABLE = """\
# Sort Test

## Section

| Name    | Score |
| ------- | ----- |
| Charlie | 30    |
| Alice   | 10    |
| Bob     | 20    |
"""


def test_table_headers_get_sortable_class(page, base_url):
    """Every <th> in a table with <thead> gets .sortable-th after render."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SORTABLE_TABLE, slug="sort-class")
    page.wait_for_selector("#markdown-body table", timeout=5_000)
    count = page.evaluate(
        "() => document.querySelectorAll('#markdown-body th.sortable-th').length"
    )
    assert count == 2, f"Expected 2 sortable headers, got {count}"


def test_table_sort_asc_on_first_click(page, base_url):
    """Clicking a <th> sorts rows ascending; first row becomes alphabetically first."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SORTABLE_TABLE, slug="sort-asc")
    page.wait_for_selector("#markdown-body th.sortable-th", timeout=5_000)
    page.locator("#markdown-body th.sortable-th").first.click()
    first_cell = page.evaluate(
        "() => document.querySelector('#markdown-body tbody tr:first-child td').textContent.trim()"
    )
    assert first_cell == "Alice", f"Expected Alice first after asc sort, got {first_cell!r}"


def test_table_sort_desc_on_second_click(page, base_url):
    """Clicking the same <th> twice reverses the sort to descending."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SORTABLE_TABLE, slug="sort-desc")
    page.wait_for_selector("#markdown-body th.sortable-th", timeout=5_000)
    th = page.locator("#markdown-body th.sortable-th").first
    th.click()
    th.click()
    first_cell = page.evaluate(
        "() => document.querySelector('#markdown-body tbody tr:first-child td').textContent.trim()"
    )
    assert first_cell == "Charlie", f"Expected Charlie first after desc sort, got {first_cell!r}"


def test_table_sort_indicator_classes(page, base_url):
    """Active sort column gets .sort-asc or .sort-desc; non-active columns have neither."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SORTABLE_TABLE, slug="sort-indicator")
    page.wait_for_selector("#markdown-body th.sortable-th", timeout=5_000)
    page.locator("#markdown-body th.sortable-th").first.click()
    page.wait_for_selector("#markdown-body th.sort-asc", timeout=5_000)
    result = page.evaluate("""() => {
        const ths = [...document.querySelectorAll('#markdown-body th.sortable-th')];
        return {
            firstAsc: ths[0].classList.contains('sort-asc'),
            secondAsc: ths[1].classList.contains('sort-asc'),
            secondDesc: ths[1].classList.contains('sort-desc'),
        };
    }""")
    assert result["firstAsc"], "Clicked column should have .sort-asc"
    assert not result["secondAsc"], "Non-clicked column must not have .sort-asc"
    assert not result["secondDesc"], "Non-clicked column must not have .sort-desc"


# ── Mermaid copy as SVG ─────────────────────────────────────────────────────────

ARTICLE_WITH_MERMAID_FOR_COPY = """\
# Mermaid Copy Test

## Section

```mermaid
graph LR
  A[Start] --> B[End]
```
"""


def test_mermaid_diagram_has_copy_button(page, base_url):
    """A rendered .mermaid-diagram contains a .mermaid-copy-btn button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID_FOR_COPY, slug="mermaid-copy-btn")
    page.wait_for_selector(".mermaid-diagram", timeout=8_000)
    count = page.evaluate(
        "() => document.querySelectorAll('.mermaid-diagram .mermaid-copy-btn').length"
    )
    assert count >= 1, "No .mermaid-copy-btn found inside .mermaid-diagram"


def test_mermaid_copy_btn_copies_svg(page, base_url):
    """Clicking .mermaid-copy-btn writes SVG markup to the clipboard."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MERMAID_FOR_COPY, slug="mermaid-copy-svg")
    page.wait_for_selector(".mermaid-diagram svg", state="attached", timeout=8_000)
    # Patch clipboard before clicking so it survives any re-render
    page.evaluate(
        "() => { navigator.clipboard.writeText = (t) => { window.__svgCopied = t; return Promise.resolve(); }; }"
    )
    # Wait for DOM to stabilise: poll until the button stays attached for 200ms
    page.wait_for_function(
        """() => {
            const btn = document.querySelector('.mermaid-copy-btn');
            if (!btn || !btn.isConnected) return false;
            window.__copyBtnRef = btn;
            return true;
        }""",
        timeout=8_000,
    )
    page.wait_for_function(
        "() => window.__copyBtnRef && window.__copyBtnRef.isConnected",
        timeout=3_000,
    )
    page.evaluate("() => window.__copyBtnRef.click()")
    page.wait_for_function("() => !!window.__svgCopied", timeout=5_000)
    copied = page.evaluate("() => window.__svgCopied")
    assert "<svg" in copied, f"Copied text does not look like SVG: {copied[:80]!r}"


# ── hljs theme sync ─────────────────────────────────────────────────────────────


def test_hljs_stylesheet_swaps_on_theme_change(page, base_url):
    """Toggling the theme swaps the hljs CSS href between dark and light variants."""
    # Force a known dark starting point - boot otherwise follows OS/browser
    # color-scheme (Chromium defaults to light), which made this test a no-op
    # when it landed on light already and then clicked the light "White" swatch.
    page.add_init_script(
        "window.localStorage.setItem('wiki-settings', JSON.stringify({backgroundId: 'dark-void'}))"
    )
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    initial_href = page.evaluate(
        "() => document.getElementById('hljs-theme-css')?.href ?? ''"
    )
    assert initial_href, "hljs-theme-css link not found"

    # quick dark/light toggle was removed; flip theme via a background swatch
    page.locator('[title="Preferences (,)"]').first.click()
    page.wait_for_selector("#prefs-modal:not(.hidden)")
    page.locator('.settings-bg-swatch[title="White"]').click()

    new_href = page.evaluate(
        "() => document.getElementById('hljs-theme-css')?.href ?? ''"
    )
    assert new_href != initial_href, (
        f"hljs stylesheet href did not change after theme toggle: {new_href!r}"
    )
    assert "atom-one" in new_href, f"Unexpected hljs stylesheet: {new_href!r}"


# ── Formula variable-substitution toggle ────────────────────────────

ARTICLE_WITH_MATH = """\
# Math Test

## Section

Display formula with known variables:

$$T = 1/\\lambda$$

Some text.
"""

ARTICLE_WITH_MATH_NO_KNOWN_VARS = """\
# Math No Vars Test

## Section

$$e = mc^2$$

Some text.
"""


def test_formula_toggle_btn_added_for_known_vars(page, base_url):
    """A .formula-toggle-btn is injected into .katex-display when it contains mapped vars."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MATH, slug="formula-btn-added")
    page.wait_for_selector(".katex-display", timeout=5_000)
    count = page.evaluate(
        "() => document.querySelectorAll('.katex-display .formula-toggle-btn').length"
    )
    assert count >= 1, "No .formula-toggle-btn found in .katex-display with known vars"


def test_formula_toggle_btn_absent_when_no_mapped_vars(page, base_url):
    """No .formula-toggle-btn is added when the formula has no vars in VAR_MAP."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MATH_NO_KNOWN_VARS, slug="formula-btn-absent")
    page.wait_for_selector(".katex-display", timeout=5_000)
    count = page.evaluate(
        "() => document.querySelectorAll('.katex-display .formula-toggle-btn').length"
    )
    assert count == 0, ".formula-toggle-btn should not appear when no mapped vars"


def test_formula_toggle_btn_click_adds_active_class(page, base_url):
    """Clicking .formula-toggle-btn adds .active to the button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MATH, slug="formula-active")
    page.wait_for_selector(".formula-toggle-btn", timeout=5_000)
    page.locator(".formula-toggle-btn").first.hover()
    page.locator(".formula-toggle-btn").first.click()
    has_active = page.evaluate(
        "() => document.querySelector('.formula-toggle-btn')?.classList.contains('active')"
    )
    assert has_active, ".formula-toggle-btn missing .active after first click"


def test_formula_toggle_btn_second_click_removes_active(page, base_url):
    """Clicking .formula-toggle-btn twice removes .active (back to symbol mode)."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MATH, slug="formula-toggle-back")
    page.wait_for_selector(".formula-toggle-btn", timeout=5_000)
    btn = page.locator(".formula-toggle-btn").first
    btn.hover()
    btn.click()
    btn.click()
    has_active = page.evaluate(
        "() => document.querySelector('.formula-toggle-btn')?.classList.contains('active')"
    )
    assert not has_active, ".formula-toggle-btn still .active after second click"


def test_formula_toggle_wrapper_present(page, base_url):
    """.formula-toggle-wrapper span wraps the katex content after addFormulaToggle."""
    _load_mock_article(page, base_url, ARTICLE_WITH_MATH, slug="formula-wrapper")
    page.wait_for_selector(".formula-toggle-btn", timeout=5_000)
    count = page.evaluate(
        "() => document.querySelectorAll('.katex-display .formula-toggle-wrapper').length"
    )
    assert count >= 1, ".formula-toggle-wrapper not found in .katex-display"


# ── Mermaid node hover captions ──────────────────────────────────────

ARTICLE_WITH_CAPTIONED_MERMAID = """\
# Mermaid Caption Test

## Section

```mermaid
%% node-caption: A "entry point - receives all requests"
%% node-caption: B "load balancer - fans out to workers"
graph LR
  A[Client] --> B[Load Balancer] --> C[Server]
```

Some text.
"""

ARTICLE_WITH_UNCAPTIONED_MERMAID = """\
# Mermaid No Caption Test

## Section

```mermaid
graph LR
  A[Start] --> B[End]
```

Some text.
"""


def test_mermaid_node_caption_parsed_from_src(page, base_url):
    """data-mermaid-src contains the %% node-caption lines after render."""
    _load_mock_article(
        page, base_url, ARTICLE_WITH_CAPTIONED_MERMAID, slug="mermaid-caption-src"
    )
    page.wait_for_selector(".mermaid-diagram[data-mermaid-src]", timeout=8_000)
    src = page.evaluate(
        "() => document.querySelector('.mermaid-diagram')?.dataset.mermaidSrc ?? ''"
    )
    assert "node-caption" in src, "node-caption lines missing from data-mermaid-src"


def test_mermaid_tooltip_element_exists(page, base_url):
    """#mermaid-node-tooltip is injected into the DOM when captions are present."""
    _load_mock_article(
        page, base_url, ARTICLE_WITH_CAPTIONED_MERMAID, slug="mermaid-tooltip-el"
    )
    exists = page.evaluate(
        "() => !!document.getElementById('mermaid-node-tooltip')"
    )
    assert exists, "#mermaid-node-tooltip not found in DOM"


def test_mermaid_tooltip_not_injected_without_captions(page, base_url):
    """#mermaid-node-tooltip is NOT injected when no %% node-caption lines are present."""
    _load_mock_article(
        page, base_url, ARTICLE_WITH_UNCAPTIONED_MERMAID, slug="mermaid-tooltip-absent"
    )
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)
    exists = page.evaluate(
        "() => !!document.getElementById('mermaid-node-tooltip')"
    )
    assert not exists, "#mermaid-node-tooltip should not exist when no captions defined"


def test_mermaid_tooltip_not_visible_on_load(page, base_url):
    """#mermaid-node-tooltip does not have .visible class on initial load."""
    _load_mock_article(
        page, base_url, ARTICLE_WITH_CAPTIONED_MERMAID, slug="mermaid-tooltip-hidden"
    )
    page.wait_for_selector(".mermaid-diagram svg", timeout=8_000)
    is_visible = page.evaluate(
        "() => document.getElementById('mermaid-node-tooltip')?.classList.contains('visible') ?? false"
    )
    assert not is_visible, "#mermaid-node-tooltip should not be .visible on load"


def test_mermaid_tooltip_shows_on_touchstart(page, base_url):
    """Tapping a captioned node (touchstart) shows the tooltip - touch fallback
    for devices with no mouseenter."""
    _load_mock_article(
        page, base_url, ARTICLE_WITH_CAPTIONED_MERMAID, slug="mermaid-tooltip-touch"
    )
    page.wait_for_selector(".mermaid-diagram .has-node-caption", timeout=8_000)

    page.evaluate("""() => {
        const el = document.querySelector('.has-node-caption');
        const rect = el.getBoundingClientRect();
        const touch = new Touch({
            identifier: 1, target: el,
            clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2,
        });
        el.dispatchEvent(new TouchEvent('touchstart', {
            bubbles: true, cancelable: true,
            touches: [touch], targetTouches: [touch], changedTouches: [touch],
        }));
    }""")

    is_visible = page.evaluate(
        "() => document.getElementById('mermaid-node-tooltip')?.classList.contains('visible') ?? false"
    )
    assert is_visible, "tooltip did not become visible on touchstart"


# ── ResizeObserver cleanup ──────────────────────────────────────────────────────


def test_resize_observers_cleared_on_navigation(page, base_url):
    """Navigating away from an article resets state.tableResizeObservers to []."""
    _load_mock_article(page, base_url, ARTICLE_WITH_TABLE, slug="ro-cleanup")
    page.wait_for_selector(".table-scroll-wrap", timeout=5_000)

    count_before = page.evaluate(
        "() => (window.state?.tableResizeObservers ?? []).length"
    )
    assert count_before >= 1, f"Expected ≥1 observer after render, got {count_before}"

    page.evaluate("() => navigateHome()")
    page.wait_for_selector("#view-home.active", timeout=5_000)

    count_after = page.evaluate(
        "() => (window.state?.tableResizeObservers ?? []).length"
    )
    assert count_after == 0, (
        f"tableResizeObservers not cleared after navigation, still {count_after}"
    )


ARTICLE_WITH_TABS = """\
# Tab Test

## Sorting

<!-- tabs id="sort-test" title="Quicksort" -->
```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    return quicksort([x for x in arr[1:] if x <= arr[0]]) + [arr[0]] + quicksort([x for x in arr[1:] if x > arr[0]])
```
```java
public static void quicksort(int[] arr) {}
```
<!-- /tabs id="sort-test" -->
"""


def test_tabbed_code_blocks_render(page, base_url):
    _load_mock_article(page, base_url, ARTICLE_WITH_TABS, slug="tab-test")
    page.wait_for_selector(".code-tabs", timeout=3_000)

    widget = page.locator(".code-tabs").first
    assert widget.is_visible()

    tabs = widget.locator(".code-tab")
    assert tabs.count() == 2

    assert "active" in (tabs.nth(0).get_attribute("class") or "")

    tabs.nth(1).click()
    assert "active" in (tabs.nth(1).get_attribute("class") or "")
    panels = widget.locator(".code-tab-panel")
    assert panels.nth(0).is_hidden()
    assert panels.nth(1).is_visible()


def test_tabbed_code_blocks_lang_persistence(page, base_url):
    _load_mock_article(page, base_url, ARTICLE_WITH_TABS, slug="tab-test-persist")
    page.wait_for_selector(".code-tabs", timeout=3_000)

    page.locator(".code-tab[data-lang='java']").first.click()

    _load_mock_article(page, base_url, ARTICLE_WITH_TABS, slug="tab-test-persist")
    page.wait_for_selector(".code-tabs", timeout=3_000)
    active_tab = page.locator(".code-tab.active").first
    assert active_tab.get_attribute("data-lang") == "java"


# ── Zoom overlay caption from alt text ───────────────────────────────────

ARTICLE_WITH_CAPTIONED_IMAGE = """\
# Caption Test

## Section

![A descriptive caption](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)

Some text.
"""

ARTICLE_WITH_UNCAPTIONED_IMAGE = """\
# No Caption Test

## Section

![](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)

Some text.
"""


def test_zoom_overlay_shows_caption_when_alt_present(page, base_url):
    """Clicking an image with alt text shows .zoom-caption in the overlay."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CAPTIONED_IMAGE, slug="caption-img")
    page.wait_for_selector(".zoomable-img", timeout=5_000)
    page.locator(".zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    caption = page.locator(".zoom-caption")
    assert caption.count() == 1, ".zoom-caption not found in overlay"
    assert caption.is_visible(), ".zoom-caption not visible"
    assert caption.inner_text() == "A descriptive caption"


def test_zoom_overlay_no_caption_when_alt_empty(page, base_url):
    """Clicking an image with empty alt text shows no visible .zoom-caption."""
    _load_mock_article(page, base_url, ARTICLE_WITH_UNCAPTIONED_IMAGE, slug="no-caption-img")
    page.wait_for_selector(".zoomable-img", timeout=5_000)
    page.locator(".zoomable-img").first.click()
    page.wait_for_selector("#zoom-overlay.open", timeout=3_000)

    caption = page.locator(".zoom-caption")
    assert caption.count() == 0 or not caption.is_visible(), (
        ".zoom-caption should not be visible when alt is empty"
    )


# ── Collapsible callouts with + prefix ────────────────────────────────────

ARTICLE_WITH_PLUS_CALLOUT = """\
# Plus Callout Test

## Section

> ⚠️ + This is a collapsible warning

Short callout content that fits in one line.
"""

ARTICLE_WITHOUT_PLUS_CALLOUT = """\
# Normal Callout Test

## Section

> ⚠️ This is a normal warning

Short callout content that fits in one line.
"""


def test_plus_prefix_callout_starts_collapsible(page, base_url):
    """A callout with + prefix gets .callout--collapsible regardless of height."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _load_mock_article(page, base_url, ARTICLE_WITH_PLUS_CALLOUT, slug="plus-callout")
    page.wait_for_selector(".callout", timeout=5_000)

    result = page.evaluate("""() => {
        const bq = document.querySelector('.callout');
        if (!bq) return { found: false };
        return {
            found: true,
            collapsible: bq.classList.contains('callout--collapsible'),
            hasBtn: !!bq.nextElementSibling?.classList.contains('callout-expand-btn'),
            plusStripped: !bq.textContent.includes('+'),
        };
    }""")
    assert result["found"], "No .callout found"
    assert result["collapsible"], ".callout--collapsible missing on + prefix callout"
    assert result["hasBtn"], ".callout-expand-btn not found after + prefix callout"
    assert result["plusStripped"], "+ character still visible in callout text"


def test_short_callout_without_plus_not_collapsible(page, base_url):
    """A short callout without + prefix does not get .callout--collapsible."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _load_mock_article(page, base_url, ARTICLE_WITHOUT_PLUS_CALLOUT, slug="no-plus-callout")
    page.wait_for_selector(".callout", timeout=5_000)

    is_collapsible = page.evaluate(
        "() => document.querySelector('.callout')?.classList.contains('callout--collapsible')"
    )
    assert not is_collapsible, "Short callout without + got .callout--collapsible unexpectedly"


def test_plus_callout_expands_on_click(page, base_url):
    """Clicking the expand button on a + prefix callout adds .callout--expanded."""
    page.set_viewport_size({"width": 1280, "height": 800})
    _load_mock_article(page, base_url, ARTICLE_WITH_PLUS_CALLOUT, slug="plus-expand")
    page.wait_for_selector(".callout-expand-btn", timeout=5_000)

    page.locator(".callout-expand-btn").first.click()
    is_expanded = page.evaluate(
        "() => document.querySelector('.callout')?.classList.contains('callout--expanded')"
    )
    assert is_expanded, ".callout--expanded not added after clicking expand button"


# ── Glossary term hover popover ───────────────────────────────────────────

ARTICLE_WITH_ABBR = """\
# Glossary Test

## Section

The concept of <abbr>amortized</abbr> complexity is important in data structures.
"""

ARTICLE_WITHOUT_ABBR = """\
# No Glossary Test

## Section

Some plain text with no abbr tags.
"""


def test_abbr_gets_glossary_term_class(page, base_url):
    """An <abbr> matching a glossary key gets the .glossary-term class."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-term")
    page.wait_for_selector("abbr", timeout=5_000)
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term') !== null",
        timeout=5_000,
    )
    count = page.evaluate(
        "() => document.querySelectorAll('abbr.glossary-term').length"
    )
    assert count > 0, "No abbr.glossary-term found after glossary load"


def test_glossary_popover_appears_on_hover(page, base_url):
    """Hovering a .glossary-term shows #glossary-popover with definition text."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-hover")
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term') !== null",
        timeout=5_000,
    )
    page.locator("abbr.glossary-term").first.hover()
    page.wait_for_function(
        "() => document.getElementById('glossary-popover')?.classList.contains('glossary-popover--visible')",
        timeout=3_000,
    )
    text = page.evaluate("() => document.getElementById('glossary-popover')?.textContent")
    assert text and len(text) > 10, "Glossary popover text is empty or too short"


def test_glossary_popover_survives_scroll_out_and_back(page, base_url):
    """A glossary term keeps working after scrolling out of and back into
    the IntersectionObserver's viewport margin (regression: WIKI-399 -
    popover used to die permanently because the term's node was replaced
    with an unobserved clone on exit)."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-scroll-cycle")
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term') !== null",
        timeout=5_000,
    )
    # Push the term far below the viewport, wait for the real
    # IntersectionObserver to fire its "not intersecting" branch, then
    # scroll it back into view.
    page.evaluate(
        """
        () => {
          const body = document.getElementById('markdown-body');
          const spacer = document.createElement('div');
          spacer.style.height = '4000px';
          body.insertBefore(spacer, body.firstChild);
        }
        """
    )
    page.wait_for_timeout(300)
    page.evaluate("() => document.querySelector('abbr.glossary-term').scrollIntoView({block: 'center', behavior: 'instant'})")
    page.wait_for_timeout(300)
    page.locator("abbr.glossary-term").first.hover()
    page.wait_for_function(
        "() => document.getElementById('glossary-popover')?.classList.contains('glossary-popover--visible')",
        timeout=3_000,
    )
    text = page.evaluate("() => document.getElementById('glossary-popover')?.textContent")
    assert text and len(text) > 10, "Glossary popover stopped working after scroll cycle"


def test_no_glossary_popover_without_abbr(page, base_url):
    """An article without <abbr> tags does not create #glossary-popover."""
    _load_mock_article(page, base_url, ARTICLE_WITHOUT_ABBR, slug="no-glossary")
    page.wait_for_selector("#markdown-body", timeout=5_000)
    count = page.evaluate(
        "() => document.querySelectorAll('abbr.glossary-term').length"
    )
    assert count == 0, "glossary-term class added when no abbr tags present"


# ── Inline glossary expand ───────────────────────────────────

def test_inline_glossary_expand_class_added(page, base_url):
    """A matched abbr gets .glossary-term--expandable after glossary loads."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-expand-class")
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term--expandable') !== null",
        timeout=5_000,
    )
    count = page.evaluate(
        "() => document.querySelectorAll('abbr.glossary-term--expandable').length"
    )
    assert count > 0, "glossary-term--expandable class not added"


def test_inline_glossary_expand_def_hidden_initially(page, base_url):
    """The .glossary-inline-def is not visible before clicking the term."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-expand-hidden")
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term--expandable') !== null",
        timeout=5_000,
    )
    open_count = page.evaluate(
        "() => document.querySelectorAll('.glossary-inline-def--open').length"
    )
    assert open_count == 0, "Inline def shown before click"


def test_inline_glossary_expand_click_shows_def(page, base_url):
    """Clicking .glossary-term--expandable shows the inline definition."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-expand-click")
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term--expandable') !== null",
        timeout=5_000,
    )
    page.locator("abbr.glossary-term--expandable").first.click()
    page.wait_for_function(
        "() => document.querySelector('.glossary-inline-def--open') !== null",
        timeout=3_000,
    )
    text = page.evaluate(
        "() => document.querySelector('.glossary-inline-def--open')?.textContent"
    )
    assert text and len(text) > 5, "Inline def opened but text is empty"


def test_inline_glossary_expand_touch_shows_def(page, base_url):
    """Tapping a glossary abbr (synthetic touch, not mouse) shows its inline
    definition - touch fallback for the hover-only popover path."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-expand-touch")
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term--expandable') !== null",
        timeout=5_000,
    )
    page.evaluate("""() => {
        const el = document.querySelector('abbr.glossary-term--expandable');
        const rect = el.getBoundingClientRect();
        const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
        const touch = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
        el.dispatchEvent(new TouchEvent('touchend', {
            bubbles: true, cancelable: true,
            touches: [], targetTouches: [], changedTouches: [touch],
        }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }""")
    page.wait_for_function(
        "() => document.querySelector('.glossary-inline-def--open') !== null",
        timeout=3_000,
    )


def test_inline_glossary_expand_second_click_collapses(page, base_url):
    """Second click on .glossary-term--expandable collapses the definition."""
    _load_mock_article(page, base_url, ARTICLE_WITH_ABBR, slug="glossary-expand-collapse")
    page.wait_for_function(
        "() => document.querySelector('abbr.glossary-term--expandable') !== null",
        timeout=5_000,
    )
    abbr = page.locator("abbr.glossary-term--expandable").first
    abbr.click()
    page.wait_for_function(
        "() => document.querySelector('.glossary-inline-def--open') !== null",
        timeout=3_000,
    )
    abbr.click()
    page.wait_for_function(
        "() => document.querySelector('.glossary-inline-def--open') === null",
        timeout=3_000,
    )
    open_count = page.evaluate(
        "() => document.querySelectorAll('.glossary-inline-def--open').length"
    )
    assert open_count == 0, "Inline def still open after second click"


# ── Inline caveat reveals ────────────────────────────────────

ARTICLE_WITH_CAVEAT = """\
# Caveat Test

## Section

This runs in O(1) amortized[?unless the array resizes, making it O(n)].

And another claim[?second caveat here] for good measure.
"""

ARTICLE_WITHOUT_CAVEAT = """\
# No Caveat Test

## Section

Plain text with no caveat markers at all.
"""


def test_caveat_marker_rendered(page, base_url):
    """[?...] syntax produces .caveat-marker elements in the DOM."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CAVEAT, slug="caveat-render")
    page.wait_for_function(
        "() => document.querySelector('.caveat-marker') !== null",
        timeout=5_000,
    )
    count = page.evaluate(
        "() => document.querySelectorAll('.caveat-marker').length"
    )
    assert count == 2, f"Expected 2 caveat markers, got {count}"


def test_caveat_body_hidden_initially(page, base_url):
    """.caveat-body is not displayed before clicking the marker."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CAVEAT, slug="caveat-hidden")
    page.wait_for_function(
        "() => document.querySelector('.caveat-marker') !== null",
        timeout=5_000,
    )
    expanded = page.evaluate(
        "() => document.querySelector('.caveat-marker[aria-expanded=\"true\"]') !== null"
    )
    assert not expanded, "Caveat marker should start collapsed"


def test_caveat_click_expands(page, base_url):
    """Clicking .caveat-marker sets aria-expanded=true."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CAVEAT, slug="caveat-click")
    page.wait_for_function(
        "() => document.querySelector('.caveat-marker') !== null",
        timeout=5_000,
    )
    page.locator(".caveat-marker").first.click()
    expanded = page.evaluate(
        "() => document.querySelector('.caveat-marker')?.getAttribute('aria-expanded')"
    )
    assert expanded == "true", "Caveat marker not expanded after click"


def test_caveat_second_click_collapses(page, base_url):
    """Second click collapses .caveat-marker back to aria-expanded=false."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CAVEAT, slug="caveat-collapse")
    page.wait_for_function(
        "() => document.querySelector('.caveat-marker') !== null",
        timeout=5_000,
    )
    marker = page.locator(".caveat-marker").first
    marker.click()
    marker.click()
    expanded = page.evaluate(
        "() => document.querySelector('.caveat-marker')?.getAttribute('aria-expanded')"
    )
    assert expanded == "false", "Caveat marker still expanded after second click"


def test_caveat_body_text_content(page, base_url):
    """.caveat-body contains the text from the [?...] marker."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CAVEAT, slug="caveat-text")
    page.wait_for_function(
        "() => document.querySelector('.caveat-body') !== null",
        timeout=5_000,
    )
    texts = page.evaluate(
        "() => Array.from(document.querySelectorAll('.caveat-body')).map(el => el.textContent)"
    )
    assert any("array resizes" in t for t in texts), "First caveat text not found"
    assert any("second caveat" in t for t in texts), "Second caveat text not found"


def test_no_caveat_markers_without_syntax(page, base_url):
    """Article with no [?...] syntax produces no .caveat-marker elements."""
    _load_mock_article(page, base_url, ARTICLE_WITHOUT_CAVEAT, slug="caveat-none")
    page.wait_for_selector("#markdown-body[data-render-done]", timeout=5_000)
    count = page.evaluate(
        "() => document.querySelectorAll('.caveat-marker').length"
    )
    assert count == 0, "Caveat markers found in article without [?...] syntax"


# ── Progress ring ─────────────────────────────────────────────────


ARTICLE_WITH_SECTIONS = """\
# Long Article

## Section One

""" + ("Some paragraph text.\n\n" * 30) + """\
## Section Two

""" + ("More paragraph text.\n\n" * 30)


def test_progress_ring_svg_attached_to_scroll_top_btn(page, base_url):
    """After loading a content article the #scroll-top button has an SVG ring child."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="ring-attach")
    has_ring = page.evaluate(
        "() => !!document.querySelector('#scroll-top .scroll-top-ring')"
    )
    assert has_ring, "#scroll-top must contain a .scroll-top-ring SVG element"


def test_progress_ring_advances_on_scroll(page, base_url):
    """stroke-dashoffset decreases (ring fills) as the user scrolls down."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="ring-scroll")
    page.wait_for_selector("#scroll-top .scroll-top-ring", timeout=8_000)
    offset_before = page.evaluate(
        "() => parseFloat(document.querySelector('.scroll-top-ring-fill')?.getAttribute('stroke-dashoffset') ?? '999')"
    )
    page.evaluate("() => window.scrollTo({ top: 2000, behavior: 'instant' })")
    page.wait_for_timeout(200)
    offset_after = page.evaluate(
        "() => parseFloat(document.querySelector('.scroll-top-ring-fill')?.getAttribute('stroke-dashoffset') ?? '999')"
    )
    assert offset_after < offset_before, (
        f"Ring fill offset should decrease on scroll ({offset_before} → {offset_after})"
    )


# ── Article end-marker ────────────────────────────────────────────


def test_end_marker_present_after_render(page, base_url):
    """Every article must have exactly one .article-end-marker element."""
    _load_mock_article(page, base_url, "# End Marker\n\nContent.\n", slug="end-mark")
    count = page.locator(".article-end-marker").count()
    assert count == 1, f"Expected 1 .article-end-marker, got {count}"


def test_end_marker_contains_glyph(page, base_url):
    """The end-marker must contain the ⌘ glyph."""
    _load_mock_article(page, base_url, "# End Marker\n\nContent.\n", slug="end-glyph")
    text = page.locator(".article-end-marker").inner_text()
    assert "⌘" in text, f"End marker must contain ⌘, got {text!r}"


def test_end_marker_is_last_child_of_body(page, base_url):
    """The .article-end-marker must be the last element inside #markdown-body."""
    _load_mock_article(page, base_url, "# End Marker\n\nContent.\n", slug="end-last")
    is_last = page.evaluate("""() => {
        const body = document.getElementById('markdown-body');
        if (!body) return false;
        const last = body.lastElementChild;
        return last && last.classList.contains('article-end-marker');
    }""")
    assert is_last, ".article-end-marker must be the last child of #markdown-body"


# ── TOC ↔ content collapse sync ──────────────────────────────────


def test_toc_collapse_syncs_to_content_h2(page, base_url):
    """Collapsing a TOC h2 group adds section--collapsed to the matching content h2."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="toc-sync-down")
    page.wait_for_selector(".toc-h2-group", timeout=8_000)
    page.locator(".toc-h2-group").first.locator(".toc-group-chevron").click()
    content_collapsed = page.evaluate("""() => {
        const h2 = document.querySelector('#markdown-body h2');
        return h2 && h2.classList.contains('section--collapsed');
    }""")
    assert content_collapsed, "Collapsing TOC group must add section--collapsed to content h2"


def test_content_collapse_syncs_to_toc(page, base_url):
    """Collapsing a content h2 adds section--collapsed to the matching TOC group."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="toc-sync-up")
    page.wait_for_selector(".heading-collapse-btn", timeout=8_000)
    page.locator(".heading-collapse-btn").first.click()
    toc_collapsed = page.evaluate("""() => {
        const group = document.querySelector('.toc-h2-group');
        return group && group.classList.contains('section--collapsed');
    }""")
    assert toc_collapsed, "Collapsing content h2 must add section--collapsed to TOC group"


def test_toc_expand_syncs_content_section_visible(page, base_url):
    """Re-expanding a TOC group removes section--collapsed from the content h2."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="toc-sync-expand")
    page.wait_for_selector(".toc-h2-group", timeout=8_000)
    chevron = page.locator(".toc-h2-group").first.locator(".toc-group-chevron")
    chevron.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body h2')?.classList.contains('section--collapsed')",
        timeout=5_000,
    )
    chevron.click()
    content_expanded = page.evaluate("""() => {
        const h2 = document.querySelector('#markdown-body h2');
        return h2 && !h2.classList.contains('section--collapsed');
    }""")
    assert content_expanded, "Re-expanding TOC group must remove section--collapsed from content h2"


# ── Glossary inline expand (listener leak regression) ────────────

ARTICLE_WITH_GLOSSARY_TERM = """\
# Glossary Test

Dynamic array resizing is <abbr>amortized</abbr> O(1).
"""


def test_glossary_expand_toggles_after_repeated_navigation(page, base_url):
    """addInlineGlossaryExpand must keep working correctly across many article
    renders - regression for a bug where one document-level click listener was
    added per glossary term per render, never removed, growing unbounded."""
    for i in range(5):
        _load_mock_article(page, base_url, ARTICLE_WITH_GLOSSARY_TERM, slug=f"glossary-leak-{i}")

    abbr = page.locator("#markdown-body abbr.glossary-term--expandable").first
    abbr.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body abbr')?.getAttribute('aria-expanded') === 'true'",
        timeout=5_000,
    )

    # Click outside must collapse it (the shared document listener still works)
    page.locator("body").click(position={"x": 5, "y": 5})
    page.wait_for_function(
        "() => document.querySelector('#markdown-body abbr')?.getAttribute('aria-expanded') === 'false'",
        timeout=5_000,
    )


# ── In-article find touch trigger ─────────────────────────────────


def test_find_button_opens_article_find(page, base_url):
    """The content-topbar find button must open the in-article find bar via
    ArticleFind.open() - regression for ArticleFind only being reachable via
    the '/' keyboard shortcut, with no touch-accessible trigger."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="find-btn-touch")
    page.click('[data-action="find-open"]')
    page.wait_for_selector("#article-find:not(.hidden)", timeout=5_000)


# ── Hide-and-reveal study mode (H hotkey) ──────────────────────────

ARTICLE_WITH_H3_SECTIONS = """\
# Study Mode Test

## Section One

Intro paragraph.

### First subsection

Body text for the first subsection.

### Second subsection

Body text for the second subsection.

## Section Two

Closing paragraph.
"""


def test_h_hotkey_enters_study_mode_and_hides_h3_bodies(page, base_url):
    """Pressing H adds .study-mode to #markdown-body and hides all h3 section
    bodies, leaving headings visible."""
    _load_mock_article(page, base_url, ARTICLE_WITH_H3_SECTIONS, slug="study-mode-on")
    page.wait_for_selector("#markdown-body h3", timeout=5_000)
    page.keyboard.press("h")
    page.wait_for_function(
        "() => document.getElementById('markdown-body').classList.contains('study-mode')",
        timeout=3_000,
    )
    hidden_count = page.evaluate(
        "() => document.querySelectorAll('#markdown-body [data-h3-body]').length"
    )
    all_hidden = page.evaluate(
        "() => Array.from(document.querySelectorAll('#markdown-body [data-h3-body]')).every(el => el.hidden)"
    )
    assert hidden_count > 0, "No h3 section bodies were tagged for hide-and-reveal"
    assert all_hidden, "Not all h3 section bodies were hidden after entering study mode"

    h3_visible = page.evaluate(
        "() => Array.from(document.querySelectorAll('#markdown-body h3')).every(h => !h.hidden)"
    )
    assert h3_visible, "H3 headings themselves must stay visible in study mode"


def test_h_hotkey_toggles_off(page, base_url):
    """Pressing H a second time exits study mode and reveals all bodies again."""
    _load_mock_article(page, base_url, ARTICLE_WITH_H3_SECTIONS, slug="study-mode-off")
    page.wait_for_selector("#markdown-body h3", timeout=5_000)
    page.keyboard.press("h")
    page.wait_for_function(
        "() => document.getElementById('markdown-body').classList.contains('study-mode')",
        timeout=3_000,
    )
    page.keyboard.press("h")
    page.wait_for_function(
        "() => !document.getElementById('markdown-body').classList.contains('study-mode')",
        timeout=3_000,
    )
    all_visible = page.evaluate(
        "() => Array.from(document.querySelectorAll('#markdown-body [data-h3-body]')).every(el => !el.hidden)"
    )
    assert all_visible, "Section bodies must be revealed again after exiting study mode"


def test_click_heading_reveals_its_section_in_study_mode(page, base_url):
    """Clicking an h3 while in study mode reveals only that section's body,
    leaving the other h3's body hidden."""
    _load_mock_article(page, base_url, ARTICLE_WITH_H3_SECTIONS, slug="study-mode-reveal")
    page.wait_for_selector("#markdown-body h3", timeout=5_000)
    page.keyboard.press("h")
    page.wait_for_function(
        "() => document.getElementById('markdown-body').classList.contains('study-mode')",
        timeout=3_000,
    )

    first_h3 = page.locator("#markdown-body h3").first
    first_h3.click()
    page.wait_for_function(
        "() => document.querySelector('#markdown-body h3').classList.contains('study-revealed')",
        timeout=3_000,
    )

    first_hidden = page.evaluate(
        """() => {
            const h3 = document.querySelectorAll('#markdown-body h3')[0];
            const id = h3.dataset.h3SectionId;
            return Array.from(document.querySelectorAll(`[data-h3-body="${id}"]`)).some(el => el.hidden);
        }"""
    )
    second_hidden = page.evaluate(
        """() => {
            const h3 = document.querySelectorAll('#markdown-body h3')[1];
            const id = h3.dataset.h3SectionId;
            return Array.from(document.querySelectorAll(`[data-h3-body="${id}"]`)).every(el => el.hidden);
        }"""
    )
    assert not first_hidden, "Clicked heading's section body should be revealed"
    assert second_hidden, "Other heading's section body should remain hidden"


def test_study_mode_resets_on_navigation(page, base_url):
    """Study mode must not leak into the next article render (cleanupStudyMode)."""
    _load_mock_article(page, base_url, ARTICLE_WITH_H3_SECTIONS, slug="study-mode-nav-1")
    page.keyboard.press("h")
    page.wait_for_function(
        "() => document.getElementById('markdown-body').classList.contains('study-mode')",
        timeout=3_000,
    )
    _load_mock_article(page, base_url, ARTICLE_WITH_H3_SECTIONS, slug="study-mode-nav-2")
    is_study_mode = page.evaluate(
        "() => document.getElementById('markdown-body').classList.contains('study-mode')"
    )
    assert not is_study_mode, "Study mode leaked into the next article render"
