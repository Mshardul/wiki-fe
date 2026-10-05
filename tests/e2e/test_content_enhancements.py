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

import json
import re

import pytest
from conftest import force_paint
from playwright.sync_api import expect

# Not ported to the Next reader (no component implements them): mermaid step-through walkthrough (Play button, caption rail, node highlight), mermaid node-caption tooltips, the copy-diagram-SVG button, and closing an open diagram zoom when the theme changes. Pinch/swipe/double-tap zoom is covered in ZoomLightbox.test.tsx.


# Dropped: quiz-me table blur (spec §9), save-as-card image export (freeze-frame, spec §9), study mode (H hotkey, removed).
# Dropped: hljs stylesheet swap / SRI - Shiki highlights at build time, no runtime theme stylesheet.
# Dropped: prefs Actions tab rows - the tab no longer exists (link-graph + section-map rows were spec §9 drops).
# Dropped: .anchor-btn 32px touch target and the anchor 'Link copied' toast - headings use build-time autolinks, no anchor button.
# Dropped: empty-body read-time badge - a stub article takes ArticleView's stub branch, which never renders the badge.

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _canary(page, base_url, name):
    """Open a canary article and wait for hydration; also safe on pages from a custom browser context."""
    page.goto(f"{base_url}/e2e-canary/{name}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_selector("html[data-hotkeys-ready]", state="attached", timeout=15_000)
    return page


def _hl_article(page, base_url, slug=SLUG, *, clear=True):
    """Real built article for highlight/marker e2e. clear=True wipes prior highlight/marker storage."""
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    if clear:
        page.evaluate(
            """() => {
                for (const k of Object.keys(localStorage)) {
                    if (k.startsWith('wiki-highlights-') || k.startsWith('wiki-markers-')) {
                        localStorage.removeItem(k);
                    }
                }
            }"""
        )
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector("#markdown-body", timeout=10_000)
    force_paint(page)


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
    force_paint(page)


# ── Video embed ───────────────────────────────────────────────────


# ── canary "tables": plain vs comparison tables, sort, column toggles, scroll cue ──

SCROLL_CUE = re.compile(r"\bscroll-cue\b")
PHONE = {"width": 390, "height": 844}


def _plain_table(page):
    return page.get_by_role("table").filter(has_text="Failover Mode")


def _small_comparison(page):
    return page.get_by_role("table").filter(has_text="Deque")


def _wrap_of(page, text):
    return page.locator("#markdown-body .table-scroll-wrap").filter(has_text=text)


def test_comparison_tables_scroll_in_a_wrapper_that_owns_the_radius(content_page):
    page = content_page("tables")
    expect(page.locator("#markdown-body .table-scroll-wrap")).to_have_count(2)
    expect(_plain_table(page).locator("xpath=ancestor::div[contains(@class,'table-scroll-wrap')]")).to_have_count(0)

    # Regression: radius + overflow:hidden on the table itself left a ghost band when scrolled inside the wrap.
    styles = _wrap_of(page, "Deque").evaluate(
        """wrap => ({
            overflowX: getComputedStyle(wrap).overflowX,
            radius: getComputedStyle(wrap).borderTopLeftRadius,
            tableOverflow: getComputedStyle(wrap.querySelector('table')).overflow,
        })"""
    )
    assert styles["overflowX"] == "auto"
    assert styles["radius"] != "0px"
    assert styles["tableOverflow"] == "visible"


def test_scroll_cue_marks_only_comparison_tables_wider_than_the_column(content_page):
    page = content_page("tables")
    expect(_wrap_of(page, "Typical Use Case")).to_have_class(SCROLL_CUE)
    expect(_wrap_of(page, "Deque")).not_to_have_class(SCROLL_CUE)


def test_scroll_cue_clears_once_the_last_column_is_scrolled_into_view(page, base_url):
    page.set_viewport_size(PHONE)
    _canary(page, base_url, "tables")
    wide = _wrap_of(page, "Typical Use Case")
    expect(wide).to_have_class(SCROLL_CUE)

    wide.hover()
    page.mouse.wheel(5_000, 0)
    expect(wide).not_to_have_class(SCROLL_CUE)


def test_plain_table_wraps_inside_the_column_and_nothing_widens_the_page_on_a_phone(page, base_url):
    page.set_viewport_size(PHONE)
    _canary(page, base_url, "tables")
    table = _plain_table(page).bounding_box()
    body = page.locator("#markdown-body").bounding_box()
    assert table and body
    assert table["x"] + table["width"] <= body["x"] + body["width"] + 1
    assert page.evaluate("() => document.documentElement.scrollWidth <= innerWidth")


def test_clicking_a_comparison_header_sorts_ascending_then_descending(page, base_url):
    _canary(page, base_url, "tables")
    table = _small_comparison(page)
    names = table.locator("tbody td:first-child")
    score = table.get_by_role("button", name="Score")
    structure = table.get_by_role("button", name="Structure")
    expect(names).to_have_text(["Stack", "Queue", "Deque"])

    score.click()
    expect(names).to_have_text(["Queue", "Deque", "Stack"])
    expect(score).to_have_class(re.compile(r"\bsort-asc\b"))
    expect(structure).not_to_have_class(re.compile(r"\bsort-(asc|desc)\b"))

    score.click()
    expect(names).to_have_text(["Stack", "Deque", "Queue"])
    expect(score).to_have_class(re.compile(r"\bsort-desc\b"))


def test_enter_and_space_sort_a_focused_comparison_header(page, base_url):
    _canary(page, base_url, "tables")
    table = _small_comparison(page)
    names = table.locator("tbody td:first-child")
    structure = table.get_by_role("button", name="Structure")

    structure.press("Enter")
    expect(names).to_have_text(["Deque", "Queue", "Stack"])
    structure.press("Space")
    expect(names).to_have_text(["Stack", "Queue", "Deque"])


def test_hidden_comparison_column_stays_hidden_after_reload(page, base_url):
    _canary(page, base_url, "tables")
    toggles = page.get_by_role("group", name="Visible comparison columns").first
    expect(toggles.get_by_role("button")).to_have_text(["Score", "Notes"])
    notes = toggles.get_by_role("button", name="Notes")
    note_cell = _small_comparison(page).get_by_role("cell", name="open at both ends")
    expect(notes).to_have_attribute("aria-pressed", "true")
    expect(note_cell).to_be_visible()

    notes.click()
    expect(notes).to_have_attribute("aria-pressed", "false")
    expect(note_cell).to_be_hidden()

    page.reload(wait_until="domcontentloaded")
    expect(notes).to_have_attribute("aria-pressed", "false")
    expect(note_cell).to_be_hidden()
    expect(_small_comparison(page).get_by_role("cell", name="Deque")).to_be_visible()


# ── Code block right-fade scroll cue ──────────────────────────────


LONG_CODE_LINE = "x = " + " + ".join(f"variable_{i}" for i in range(40))
ARTICLE_WITH_LONG_CODE_BLOCK = (
    "# Long Code Block Test\n\n```python\n"
    + "\n".join([LONG_CODE_LINE] + [f"y_{i} = {i}" for i in range(25)])
    + "\n```\n"
)


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_collapsible_code_block_gets_right_fade_on_mobile(page, base_url):
    """Regression: collapsible code blocks (>20 lines) skip the
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


def test_copy_btn_and_sortable_th_44px_on_coarse_pointer(browser, base_url):
    """On pointer:coarse, .copy-btn and .sortable-th meet the 44px touch target."""
    ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 768, "height": 1024},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        _article(page, base_url)
        copy_size = page.evaluate("""() => {
            const r = document.querySelector('#markdown-body .copy-btn').getBoundingClientRect();
            return { width: r.width, height: r.height };
        }""")
        assert copy_size["width"] >= 44, f"copy-btn width too small: {copy_size['width']}px"
        assert copy_size["height"] >= 44, f"copy-btn height too small: {copy_size['height']}px"

        _canary(page, base_url, "tables")
        th = _small_comparison(page).get_by_role("button", name="Score").bounding_box()
        assert th and th["height"] >= 44, f"sortable-th height too small: {th}"
    finally:
        ctx.close()


# ── Image lightbox zoom ───────────────────────────────────────────


def _pinch(page, el_selector, overlay_selector, start_dx, end_dx):
    return page.evaluate(
        """([elSel, overlaySel, startDx, endDx]) => {
        const el = document.querySelector(elSel);
        const overlay = document.querySelector(overlaySel);
        const rect = el.getBoundingClientRect();
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;

        function makeTouches(dx) {
            const t1 = new Touch({ identifier: 1, target: el, clientX: cx - dx, clientY: cy });
            const t2 = new Touch({ identifier: 2, target: el, clientX: cx + dx, clientY: cy });
            return [t1, t2];
        }

        const startTouches = makeTouches(startDx);
        overlay.dispatchEvent(new TouchEvent('touchstart', {
            bubbles: true, cancelable: true,
            touches: startTouches, targetTouches: startTouches, changedTouches: startTouches,
        }));

        const moveTouches = makeTouches(endDx);
        overlay.dispatchEvent(new TouchEvent('touchmove', {
            bubbles: true, cancelable: true,
            touches: moveTouches, targetTouches: moveTouches, changedTouches: moveTouches,
        }));

        return getComputedStyle(el).transform;
    }""",
        [el_selector, overlay_selector, start_dx, end_dx],
    )


# ── Diagram zoom ──────────────────────────────────────────────────


# ── Diagram theme sync ────────────────────────────────────────────


# ── Mermaid step-through ──────────────────────────────────────────


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

@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_code_block_copy_button_in_header(page, base_url):
    """Copy button lives inside <pre> (after .code-header) and shows the Tabler copy icon."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="code-copybtn")
    page.wait_for_selector("#markdown-body pre", timeout=5_000)

    result = page.evaluate("""() => {
        const pre = document.querySelector('#markdown-body pre');
        if (!pre) return { found: false };
        const btn = pre.querySelector('.copy-btn');
        const copyIcon = btn?.querySelector('.copy-btn-icon-copy use');
        const checkIcon = btn?.querySelector('.copy-btn-icon-check use');
        return {
            found: true,
            hasCopyBtn: !!btn,
            copyIconHref: copyIcon?.getAttribute('href'),
            checkIconHref: checkIcon?.getAttribute('href'),
        };
    }""")
    assert result["found"], "<pre> not found inside #markdown-body"
    assert result["hasCopyBtn"], ".copy-btn not found inside <pre>"
    assert result["copyIconHref"] == "#icon-copy", (
        f"Expected copy icon href '#icon-copy', got '{result['copyIconHref']}'"
    )
    assert result["checkIconHref"] == "#icon-check", (
        f"Expected check icon href '#icon-check', got '{result['checkIconHref']}'"
    )


ARTICLE_WITH_CODE_NO_LANG = """\
# Code No Lang Test

## Section

```
plain code block with no language tag
```
"""


# ── Code block has-lang-label class ───────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_code_block_with_lang_has_has_lang_label_class(page, base_url):
    """<pre> containing a language tag gets class has-lang-label."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="has-lang-yes")
    page.wait_for_selector("#markdown-body pre", timeout=5_000)

    has_class = page.evaluate("""() => {
        const pre = document.querySelector('#markdown-body pre');
        return pre ? pre.classList.contains('has-lang-label') : null;
    }""")
    assert has_class is True, "<pre> with language tag is missing has-lang-label class"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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


# ── Broken image placeholder ─────────────────────────────────────


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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
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
    """The Advanced-tab copy-source toggle flips copySourceHeader in localStorage."""
    wiki_page.locator("[title='Preferences (,)']:visible").first.click()
    dialog = wiki_page.locator('[role="dialog"][aria-label="Preferences"]')
    dialog.wait_for(timeout=5_000)
    dialog.get_by_role("tab", name="Advanced").click()
    btn = dialog.locator(
        "xpath=.//div[contains(@class,'prefs-section')][.//div[contains(@class,'prefs-section-label') and normalize-space()='Copy code with source comment']]//button"
    )
    stored = "() => JSON.parse(localStorage.getItem('wiki-settings') || '{}').copySourceHeader === true"
    before = wiki_page.evaluate(stored)
    btn.click()
    wiki_page.wait_for_function(f"() => ({stored})() !== {str(before).lower()}", timeout=3_000)
    assert btn.get_attribute("aria-pressed") == str(not before).lower()


# ── Topbar action buttons ──────────────────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_distraction_free_topbar_button_toggles(page, base_url):
    """Tapping the prefs Actions distraction-free button is a touch-accessible equivalent of the D hotkey."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="df-btn-toggle")
    page.wait_for_selector("#markdown-body", timeout=5_000)

    _open_actions_prefs(page)
    page.locator('#prefs-panel-actions [data-action="distraction-free-toggle"]').click()
    page.wait_for_selector("body.distraction-free", timeout=2_000)

    page.click('[data-action="distraction-free-exit"]')
    is_distraction_free = page.evaluate(
        "() => document.body.classList.contains('distraction-free')"
    )
    assert not is_distraction_free, "Distraction-free exit button should exit mode"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_wiki_switcher_topbar_button_opens_modal(page, base_url):
    """Tapping the prefs Actions wiki-switcher button is a touch-accessible equivalent of the W hotkey."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="switcher-btn-open")
    page.wait_for_selector("#markdown-body", timeout=5_000)

    _open_actions_prefs(page)
    page.locator('#prefs-panel-actions [data-action="wiki-switcher-open"]').click()
    page.wait_for_selector("#wiki-switcher-modal:not(.hidden)", timeout=2_000)


@pytest.mark.parametrize("width", [320, 360, 375])
def test_content_topbar_fits_narrow_viewports(page, base_url, width):
    """The content topbar never overflows or clips the auth button at phone widths."""
    page.set_viewport_size({"width": width, "height": 700})
    _article(page, base_url)
    overflow = page.evaluate("""() => {
        const inner = document.querySelector('.content-topbar .topbar-inner');
        return inner.scrollWidth - inner.clientWidth;
    }""")
    assert overflow <= 1, f"content-topbar overflows by {overflow}px at {width}px viewport width"
    box = page.locator(".content-topbar .topbar-auth-btn").bounding_box()
    assert box and box["width"] > 0, "Auth button should be visible in the content topbar"
    assert box["x"] + box["width"] <= width, f"Auth button clipped past viewport width ({width})"


# ── Print / PDF study sheet ─────────────────────────────────────────────────────


def _open_advanced_prefs(page):
    page.locator("[title='Preferences (,)']:visible").first.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator("[data-tab='advanced']").click()
    page.wait_for_function(
        "() => document.getElementById('prefs-panel-advanced').getAttribute('aria-hidden') === 'false'"
    )


def _open_actions_prefs(page):
    page.locator("[title='Preferences (,)']:visible").first.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator('[data-action="prefs-tab"][data-tab="actions"]').click()
    page.wait_for_function(
        "() => document.getElementById('prefs-panel-actions').getAttribute('aria-hidden') === 'false'"
    )


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_print_button_present_in_advanced_prefs(page, base_url):
    """Advanced prefs tab exposes a print action button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="print-btn")
    _open_advanced_prefs(page)
    btn = page.locator("#prefs-panel-advanced [data-action='print-article']")
    assert btn.count() == 1, "Print button missing from Advanced prefs tab"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_print_button_stamps_source_url(page, base_url):
    """Triggering print stamps the canonical URL onto #markdown-body for the footer."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="print-url")
    # Suppress the actual print dialog so the test doesn't block.
    page.evaluate("() => { window.print = () => {}; }")
    _open_advanced_prefs(page)
    page.click("#prefs-panel-advanced [data-action='print-article']")
    url = page.evaluate(
        "() => document.getElementById('markdown-body').getAttribute('data-print-url')"
    )
    assert url and url.startswith("http"), f"data-print-url not stamped, got {url!r}"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_copy_markdown_button_present_in_content_topbar(page, base_url):
    """Preferences Actions tab exposes a copy-raw-markdown action button."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="copy-md-btn")
    _open_actions_prefs(page)
    btn = page.locator('#prefs-panel-actions [data-action="copy-markdown"]')
    assert btn.count() == 1, "Copy markdown button missing from prefs Actions tab"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_copy_markdown_copies_raw_source(page, base_url):
    """Clicking the copy-markdown button writes the fetched raw .md source to the clipboard."""
    _load_mock_article(page, base_url, ARTICLE_WITH_CODE, slug="copy-md-source")
    page.evaluate(_CLIPBOARD_SPY)
    _open_actions_prefs(page)
    page.locator('#prefs-panel-actions [data-action="copy-markdown"]').click()
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


def test_open_modal_is_left_out_of_the_printout(page, base_url, open_settings):
    # Print / save as PDF fires window.print() before React unmounts the Preferences dialog.
    _canary(page, base_url, "text")
    dialog = open_settings()
    page.emulate_media(media="print")
    expect(dialog).to_be_hidden()
    expect(page.locator("#markdown-body")).to_be_visible()


# ── Mermaid copy as SVG ─────────────────────────────────────────────────────────


# ── Mermaid node hover captions ──────────────────────────────────────


# ── Zoom overlay caption from alt text ───────────────────────────────────


# ── TOC ↔ content collapse sync ─────────────────────────────────

ARTICLE_WITH_SECTIONS = """\
# Long Article

## Section One

""" + ("Some paragraph text.\n\n" * 30) + """\
## Section Two

""" + ("More paragraph text.\n\n" * 30)


@pytest.mark.skip(reason="collapsible TOC sections not ported — WIKI-652")
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


@pytest.mark.skip(reason="collapsible TOC sections not ported — WIKI-652")
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


@pytest.mark.skip(reason="collapsible TOC sections not ported — WIKI-652")
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


# ── Section/subsection DOM wrap-pass ──────────────────────────────

ARTICLE_WITH_SECTIONS_AND_SUBSECTIONS = """\
# Wrap Pass Test

Lede paragraph before any section.

## First Section

First section intro.

### First Subsection

Subsection body text.

### Second Subsection

More subsection body text.

## Second Section

Second section body, no subsections here.
"""


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_wrap_pass_produces_section_and_subsection_containers(page, base_url):
    """wrapSectionsAndSubsections nests every ## section into
    .section > .section-title + .section-body, and every ### subsection
    within it into .subsection > .subsection-title + .subsection-body."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS_AND_SUBSECTIONS, slug="wrap-shape")
    page.wait_for_selector(".section", timeout=5_000)

    shape = page.evaluate("""() => {
        const sections = document.querySelectorAll('#markdown-body > .section');
        const first = sections[0];
        return {
            sectionCount: sections.length,
            firstHasTitleAndBody: !!first?.querySelector(':scope > .section-title > h2')
                && !!first?.querySelector(':scope > .section-body'),
            subsectionCount: first?.querySelectorAll(':scope > .section-body > .subsection').length,
            subsectionHasTitleAndBody: !!first
                ?.querySelector(':scope > .section-body > .subsection > .subsection-title > h3')
                && !!first?.querySelector(':scope > .section-body > .subsection > .subsection-body'),
        };
    }""")
    assert shape["sectionCount"] == 2, "Expected two top-level .section wrappers"
    assert shape["firstHasTitleAndBody"], "First .section must have .section-title(h2) + .section-body"
    assert shape["subsectionCount"] == 2, "First section must have two .subsection wrappers"
    assert shape["subsectionHasTitleAndBody"], (
        "Subsection must have .subsection-title(h3) + .subsection-body"
    )


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_wrap_pass_leaves_lede_paragraph_unwrapped(page, base_url):
    """Content before the first ## heading stays a direct child of
    #markdown-body, not swept into any .section wrapper."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS_AND_SUBSECTIONS, slug="wrap-lede")
    page.wait_for_selector(".section", timeout=5_000)

    lede_is_direct_child = page.evaluate("""() => {
        const body = document.getElementById('markdown-body');
        const lede = Array.from(body.children).find(
            el => el.tagName === 'P' && el.textContent.includes('Lede paragraph')
        );
        return !!lede;
    }""")
    assert lede_is_direct_child, "Lede paragraph before first ## must stay a direct child of #markdown-body"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_wrap_pass_preserves_heading_id_for_anchors(page, base_url):
    """Headings keep their id (used for TOC/anchor links) after being moved
    inside .section-title/.subsection-title - the wrap-pass must move the
    existing heading element, not clone or replace it."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS_AND_SUBSECTIONS, slug="wrap-ids")
    page.wait_for_selector(".section", timeout=5_000)

    ids_present = page.evaluate("""() => {
        const h2 = document.querySelector('#markdown-body .section-title h2');
        const h3 = document.querySelector('#markdown-body .subsection-title h3');
        return { h2HasId: !!h2?.id, h3HasId: !!h3?.id };
    }""")
    assert ids_present["h2HasId"], "h2 inside .section-title must keep its id"
    assert ids_present["h3HasId"], "h3 inside .subsection-title must keep its id"


# ── In-article find touch trigger ─────────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_find_button_opens_article_find(page, base_url):
    """The prefs Actions find button must open the in-article find bar via
    ArticleFind.open() - regression for ArticleFind only being reachable via
    the '/' keyboard shortcut, with no touch-accessible trigger."""
    _load_mock_article(page, base_url, ARTICLE_WITH_SECTIONS, slug="find-btn-touch")
    _open_actions_prefs(page)
    page.locator('#prefs-panel-actions [data-action="find-open"]').click()
    page.wait_for_selector("#article-find:not(.hidden)", timeout=5_000)


ARTICLE_FIND_MARKUP_BOUNDARY = """\
# Find Boundary

Alpha <strong>bravo</strong> charlie delta.
"""


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_article_find_matches_across_inline_markup(page, base_url):
    """In-article find can match a query split across inline markup."""
    _load_mock_article(page, base_url, ARTICLE_FIND_MARKUP_BOUNDARY, slug="find-boundary")
    page.keyboard.press("/")
    page.wait_for_selector("#article-find:not(.hidden)", timeout=3_000)
    page.fill("#article-find-input", "a bravo")
    page.wait_for_selector("#markdown-body mark.article-find-hit", timeout=3_000)
    assert page.locator("#markdown-body mark.article-find-hit").count() > 0


# ── Text highlights + inline emoji markers ───────────────────────────────────────

ARTICLE_FOR_HIGHLIGHTS = """\
# Highlights Test

## Section

This is a paragraph with some selectable text in it for testing highlights and markers.
"""


def _select_word(page, word):
    """Selects the first occurrence of `word` inside #markdown-body via a real Range,
    then fires the mouseup our production code listens on.

    The word is scrolled into view (instantly - css sets smooth scrolling) and the scroll allowed to settle first:
    Highlights.tsx hides the toolbar/popover on scroll, so a late scroll event from a later click/focus would race it."""
    page.evaluate(
        """async (word) => {
            const body = document.getElementById('markdown-body');
            const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
                const idx = node.nodeValue.indexOf(word);
                if (idx !== -1) {
                    node.parentElement.scrollIntoView({ block: 'center', behavior: 'instant' });
                    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
                    const range = document.createRange();
                    range.setStart(node, idx);
                    range.setEnd(node, idx + word.length);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                    return;
                }
            }
            throw new Error('word not found: ' + word);
        }""",
        word,
    )


def _click_highlight_toolbar_btn(page):
    """Click the toolbar highlight button without Playwright scrolling (same scroll-hides-toolbar race as the emoji buttons)."""
    page.evaluate(
        """() => {
            const bar = document.querySelector('.highlight-toolbar');
            if (!bar || bar.classList.contains('hidden')) {
                throw new Error('highlight toolbar not visible');
            }
            const btn = bar.querySelector('.highlight-toolbar-btn--highlight');
            if (!btn) throw new Error('highlight toolbar button missing');
            btn.click();
        }"""
    )


def _click_emoji_toolbar_btn(page, index=0):
    """Click a toolbar emoji without Playwright scrolling.

    Locator.click scrolls the button into view; Highlights.tsx hides the toolbar on
    scroll (and clears activeRange), so the click either misses or creates nothing.
    """
    page.evaluate(
        """(i) => {
            const bar = document.querySelector('.highlight-toolbar');
            if (!bar || bar.classList.contains('hidden')) {
                throw new Error('highlight toolbar not visible');
            }
            const btn = bar.querySelectorAll('.highlight-toolbar-btn--emoji')[i];
            if (!btn) throw new Error('emoji toolbar button missing at index ' + i);
            btn.click();
        }""",
        index,
    )


def test_selecting_text_shows_highlight_toolbar(page, base_url):
    """Selecting text inside the article body reveals the floating highlight toolbar."""
    _hl_article(page, base_url)
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    assert page.locator(".highlight-toolbar-btn--highlight").is_visible()
    assert page.locator(".highlight-toolbar-btn--emoji").count() == 6


def test_highlight_create_remove_and_keyboard_remove_lifecycle(page, base_url):
    """Chained: create a highlight, remove it via the popover, re-create, then remove via keyboard Enter."""
    _hl_article(page, base_url)

    # Phase 1: create, verify DOM wrap + localStorage persistence.
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)

    mark = page.locator("#markdown-body .wiki-highlight").first
    assert mark.inner_text() == "avalanches"

    stored = page.evaluate(
        """() => {
            const key = Object.keys(localStorage).find(k => k.startsWith('wiki-highlights-'));
            if (!key) return null;
            return JSON.parse(localStorage.getItem(key));
        }"""
    )
    assert stored is not None and len(stored) == 1, (
        f"Expected exactly one persisted highlight entry, got: {stored}"
    )
    assert stored[0]["snippet"] == "avalanches"

    # Phase 2: remove via the popover, verify DOM + storage both clear.
    page.locator("#markdown-body .wiki-highlight").first.click()
    page.wait_for_selector(".highlight-remove-popover:not(.hidden)", timeout=3_000)
    force_paint(page)
    page.locator(".highlight-remove-btn").click()
    page.wait_for_function(
        "() => document.querySelectorAll('#markdown-body .wiki-highlight').length === 0",
        timeout=3_000,
    )
    remaining = page.evaluate(
        """() => {
            const key = Object.keys(localStorage).find(k => k.startsWith('wiki-highlights-'));
            if (!key) return 0;
            return JSON.parse(localStorage.getItem(key)).length;
        }"""
    )
    assert remaining == 0, "Highlight entry still present in localStorage after popover removal"

    # Phase 3: re-create, then remove via keyboard Enter + Remove instead of a click.
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)

    page.locator("#markdown-body .wiki-highlight").first.focus()
    page.keyboard.press("Enter")
    page.wait_for_selector(".highlight-remove-popover:not(.hidden)", timeout=3_000)
    force_paint(page)
    page.locator(".highlight-remove-btn").click()
    page.wait_for_function(
        "() => document.querySelectorAll('#markdown-body .wiki-highlight').length === 0",
        timeout=3_000,
    )


def test_highlight_persists_and_reapplies_on_reload(page, base_url):
    """A highlight created in one render re-appears after reloading the same article."""
    _hl_article(page, base_url)
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)

    _hl_article(page, base_url, clear=False)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)
    assert page.locator("#markdown-body .wiki-highlight").first.inner_text() == "avalanches"


def test_multiple_markers_reapply_on_reload(page, base_url):
    """Two markers at different offsets must both re-apply after reload without corrupting offsets."""
    _hl_article(page, base_url)
    _select_word(page, "absorb")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_emoji_toolbar_btn(page, 0)
    page.wait_for_selector("#markdown-body .wiki-marker", timeout=3_000)
    # First marker clears the selection; wait for toolbar hide before selecting again
    # or selectionchange/click races leave the second mouseup ignored.
    page.wait_for_function(
        "() => document.querySelector('.highlight-toolbar')?.classList.contains('hidden') === true",
        timeout=3_000,
    )
    _select_word(page, "hammer")
    force_paint(page)
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=5_000)
    _click_emoji_toolbar_btn(page, 1)
    page.wait_for_function(
        "() => document.querySelectorAll('#markdown-body .wiki-marker').length === 2",
        timeout=5_000,
    )

    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_function(
        "() => document.querySelectorAll('#markdown-body .wiki-marker').length === 2",
        timeout=5_000,
    )


def test_marker_create_and_remove_lifecycle(page, base_url):
    """Chained: create an emoji marker and verify persistence, then remove it via the popover."""
    _hl_article(page, base_url)

    # Phase 1: create, verify DOM badge + localStorage persistence.
    _select_word(page, "crucially")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_emoji_toolbar_btn(page, 0)
    page.wait_for_selector("#markdown-body .wiki-marker", timeout=3_000)

    stored = page.evaluate(
        """() => Object.keys(localStorage).find(k => k.startsWith('wiki-markers-'))"""
    )
    assert stored is not None, "No wiki-markers-* key written to localStorage"

    # Phase 2: remove via the popover, verify DOM + storage both clear.
    # Marker tick is ~3px wide — Playwright scroll/hit-testing flakes; fire a real click in-page.
    page.evaluate(
        """() => {
            const m = document.querySelector('#markdown-body .wiki-marker');
            if (!m) throw new Error('marker missing');
            m.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }"""
    )
    page.wait_for_selector(".highlight-remove-popover:not(.hidden)", timeout=3_000)
    force_paint(page)
    page.locator(".highlight-remove-btn").click()
    page.wait_for_function(
        "() => document.querySelectorAll('#markdown-body .wiki-marker').length === 0",
        timeout=3_000,
    )
    remaining = page.evaluate(
        """() => {
            const key = Object.keys(localStorage).find(k => k.startsWith('wiki-markers-'));
            if (!key) return 0;
            return JSON.parse(localStorage.getItem(key)).length;
        }"""
    )
    assert remaining == 0, "Marker entry still present in localStorage after removal"


def test_emoji_marker_persists_and_reapplies_on_reload(page, base_url):
    """A marker created in one render re-appears after reloading the same article."""
    _hl_article(page, base_url)
    _select_word(page, "crucially")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_emoji_toolbar_btn(page, 0)
    page.wait_for_selector("#markdown-body .wiki-marker", timeout=3_000)

    marker_emoji = page.locator("#markdown-body .wiki-marker").first.text_content()

    _hl_article(page, base_url, clear=False)
    page.wait_for_selector("#markdown-body .wiki-marker", timeout=3_000)
    assert page.locator("#markdown-body .wiki-marker").first.text_content() == marker_emoji


@pytest.mark.skip(reason="requires mutable mock article (snippet shift/remove) — not portable to static export; covered by vitest relocation unit tests")
def test_highlight_reanchor_and_drop_on_upstream_edit(page, base_url):
    """Chained: an upstream edit that shifts offsets re-anchors the highlight via snippet match; a second edit that removes the snippet entirely drops the stale entry with a toast instead."""
    _load_mock_article(page, base_url, ARTICLE_FOR_HIGHLIGHTS, slug="hl-reanchor-drop")
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)

    # Phase 1: shift offsets without touching the highlighted text - it re-anchors via snippet match.
    shifted = ARTICLE_FOR_HIGHLIGHTS.replace(
        "This is a paragraph",
        "This is now a much longer edited paragraph",
    )
    page.evaluate("() => sessionStorage.clear()")
    _load_mock_article(page, base_url, shifted, slug="hl-reanchor-drop")
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)
    assert page.locator("#markdown-body .wiki-highlight").first.inner_text() == "avalanches"

    # Phase 2: remove the highlighted snippet entirely - the stale entry is dropped, not misplaced.
    removed = shifted.replace("some selectable text", "completely different words")
    page.evaluate("() => sessionStorage.clear()")
    _load_mock_article(page, base_url, removed, slug="hl-reanchor-drop")
    page.wait_for_selector("#wiki-toast.visible", timeout=3_000)
    assert page.locator("#markdown-body .wiki-highlight").count() == 0

    remaining = page.evaluate(
        """() => {
            const key = Object.keys(localStorage).find(k => k.startsWith('wiki-highlights-'));
            if (!key) return 0;
            return JSON.parse(localStorage.getItem(key)).length;
        }"""
    )
    assert remaining == 0, "Stale highlight entry should be dropped from storage, not kept"


def test_highlight_toolbar_buttons_are_keyboard_labeled(page, base_url):
    """Every toolbar button (highlight + 6 emoji) has a discernible aria-label."""
    _hl_article(page, base_url)
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)

    labels = page.evaluate(
        """() => [...document.querySelectorAll('.highlight-toolbar-btn')]
            .map(b => b.getAttribute('aria-label'))"""
    )
    assert len(labels) == 7, (
        f"Expected 7 toolbar buttons (1 highlight + 6 emoji), got {len(labels)}"
    )
    assert all(label and label.strip() for label in labels), (
        f"Every toolbar button must have a non-empty aria-label, got: {labels}"
    )


def test_highlight_mark_is_keyboard_focusable(page, base_url):
    """A created highlight is a keyboard-reachable, labeled element (tabindex + aria-label)."""
    _hl_article(page, base_url)
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)

    result = page.evaluate(
        """() => {
            const mark = document.querySelector('#markdown-body .wiki-highlight');
            return { tabindex: mark.getAttribute('tabindex'), label: mark.getAttribute('aria-label') };
        }"""
    )
    assert result["tabindex"] == "0", "Highlight mark must be keyboard-focusable (tabindex=0)"
    assert result["label"], "Highlight mark must have an aria-label"


def test_keyboard_enter_removes_focused_highlight(page, base_url):
    """Pressing Enter on a focused highlight opens the remove popover and Remove clears it."""
    _hl_article(page, base_url)
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)

    page.locator("#markdown-body .wiki-highlight").first.focus()
    page.keyboard.press("Enter")
    page.wait_for_selector(".highlight-remove-popover:not(.hidden)", timeout=3_000)
    force_paint(page)

    force_paint(page)
    page.locator(".highlight-remove-btn").click()
    page.wait_for_function(
        "() => document.querySelectorAll('#markdown-body .wiki-highlight').length === 0",
        timeout=3_000,
    )


# ── Emoji markers inside code ────────────────────────────────────────────────────


def test_emoji_marker_buttons_hidden_when_selection_in_code(page, base_url):
    """484: Selecting inside a code block keeps highlight but hides emoji marker buttons."""
    _hl_article(page, base_url, slug="system-design/hld/url-shortener")
    _select_word(page, "url_mappings")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)

    assert page.locator(".highlight-toolbar-btn--highlight").is_visible()
    visible_emoji = page.evaluate(
        """() => [...document.querySelectorAll('.highlight-toolbar-btn--emoji')]
            .filter(b => !b.hidden && b.offsetParent !== null).length"""
    )
    assert visible_emoji == 0, "Emoji marker buttons must be hidden for code selections"

    # Highlight-only still works inside code.
    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)


def test_emoji_marker_is_narrow_accent_tick(page, base_url):
    """485: Marker renders as a narrow accent tick, not a full-size inline glyph."""
    _hl_article(page, base_url)
    _select_word(page, "crucially")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_emoji_toolbar_btn(page, 0)
    page.wait_for_selector("#markdown-body .wiki-marker", timeout=3_000)

    metrics = page.evaluate(
        """() => {
            const m = document.querySelector('#markdown-body .wiki-marker');
            const r = m.getBoundingClientRect();
            return { width: r.width, height: r.height, emoji: m.dataset.emoji };
        }"""
    )
    assert metrics["emoji"], "Marker must keep emoji identity on data-emoji"
    assert metrics["width"] <= 6, f"Marker tick should be ~3px wide, got {metrics['width']}"
    assert metrics["height"] >= 4, f"Marker tick should have visible height, got {metrics['height']}"


# ── Prerequisites chips ───────────────────────────────────────────

ARTICLE_WITH_PREREQUISITES = """\
# Stack

## Prerequisites

- **Big-O Notation** [Must read] - the cost model that makes O(1) claims meaningful.
- [Array](./array.md) [Must read] - the default stack is a dynamic array under the hood.
- [Linked List](./linked-list.md) [Should read] - the alternative backing store.

## Body

Some article content.
"""


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisites_render_as_chips(page, base_url):
    """Prerequisites heading+list becomes a chip row, not a plain paragraph/list."""
    _load_mock_article(page, base_url, ARTICLE_WITH_PREREQUISITES, slug="prereqs")
    page.wait_for_selector(".prereqs-container", timeout=5_000)

    result = page.evaluate("""() => ({
        heading: !!document.querySelector('#markdown-body h2'),
        chipCount: document.querySelectorAll('.prereq-chip').length,
    })""")
    assert result["chipCount"] == 3
    # Original heading/list are consumed, not left behind alongside the chips.
    assert not result["heading"] or "Prerequisites" not in page.evaluate(
        "() => document.querySelector('#markdown-body h2')?.textContent || ''"
    )


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisite_chip_link_navigates_and_has_no_title(page, base_url):
    """A linked prerequisite is an <a> with the resolved href and no native title
    tooltip - the explanation is shown via hover-preview instead."""
    _load_mock_article(page, base_url, ARTICLE_WITH_PREREQUISITES, slug="prereqs-link")

    chip = page.locator(".prereq-chip", has_text="Array").first
    assert chip.evaluate("el => el.tagName") == "A"
    href = chip.get_attribute("href") or ""
    assert "array" in href
    assert chip.get_attribute("target") == "_blank"
    assert not chip.get_attribute("title")


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisite_chip_navigation_uses_clean_title(page, base_url):
    """Prereq chips keep data-title as the clean name (not concatenated chip chrome)."""
    page.route("**/array.md", lambda r: r.fulfill(body="# Array\n\nSome content.\n"))
    _load_mock_article(page, base_url, ARTICLE_WITH_PREREQUISITES, slug="prereqs-clean-title")

    chip = page.locator(".prereq-chip", has_text="Array").first
    assert chip.get_attribute("data-title") == "Array"


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisite_chip_link_shows_hover_preview_card(page, base_url):
    """Hovering a linked prereq chip reuses the same hover-preview card as normal
    in-article links, showing the target's data/summaries.json entry."""
    page.route(
        "**/data/summaries.json",
        lambda r: r.fulfill(
            content_type="application/json",
            body=json.dumps({"content/system-design/array.md": "Contiguous, indexable memory."}),
        ),
    )
    _load_mock_article(page, base_url, ARTICLE_WITH_PREREQUISITES, slug="prereqs-link-hover")

    chip = page.locator(".prereq-chip", has_text="Array").first
    chip.hover()
    page.wait_for_selector("#hover-preview.visible", timeout=5_000)
    preview_text = page.locator("#hover-preview").inner_text()
    assert "Contiguous, indexable memory" in preview_text


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisite_chip_unlinked_item_has_no_href(page, base_url):
    """A bold (not-yet-written) prerequisite renders as a chip with no navigation target."""
    _load_mock_article(page, base_url, ARTICLE_WITH_PREREQUISITES, slug="prereqs-unlinked")

    chip = page.locator(".prereq-chip", has_text="Big-O Notation").first
    assert chip.evaluate("el => el.tagName") == "SPAN"
    assert "prereq-chip--unlinked" in (chip.get_attribute("class") or "")
    assert not chip.get_attribute("title")


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisite_chip_unlinked_item_shows_placeholder_on_hover(page, base_url):
    """Unlinked prereq chips get the same hover-preview card UI, showing a static
    'not yet written' placeholder instead of fetched content."""
    _load_mock_article(page, base_url, ARTICLE_WITH_PREREQUISITES, slug="prereqs-unlinked-hover")

    chip = page.locator(".prereq-chip", has_text="Big-O Notation").first
    chip.hover()
    page.wait_for_selector("#hover-preview.visible", timeout=5_000)
    preview_text = page.locator("#hover-preview").inner_text()
    assert "not yet written" in preview_text.lower()


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_prerequisite_chip_level_badges(page, base_url):
    """Must/Should markers render as color-coded badges inside their chip."""
    _load_mock_article(page, base_url, ARTICLE_WITH_PREREQUISITES, slug="prereqs-badges")

    must_badge = page.locator(".prereq-chip", has_text="Array").locator(".prereq-level").first
    should_badge = (
        page.locator(".prereq-chip", has_text="Linked List").locator(".prereq-level").first
    )
    assert "prereq-level--must" in (must_badge.get_attribute("class") or "")
    assert "prereq-level--should" in (should_badge.get_attribute("class") or "")


def test_code_block_disables_ligatures(page, base_url):
    """Fenced code blocks set font-variant-ligatures:none so ->/!= stay ASCII."""
    _article(page, base_url)
    lig = page.evaluate(
        "() => getComputedStyle(document.querySelector('#markdown-body pre code')).fontVariantLigatures"
    )
    lig = (lig or "").replace(" ", "").lower()
    assert "none" in lig or lig == "noligatures", f"expected ligatures none, got {lig!r}"



# ── canary "media": video embed, image zoom, mermaid (real build) ──────────────

IMAGE_ALT = "A checkerboard of indigo squares"


def _zoom_overlay(page):
    return page.get_by_role("dialog", name="Zoomed view")


def _expect_zoom_open(overlay):
    expect(overlay).to_be_visible()


# A closed overlay is hidden from the accessibility tree too, so it no longer matches by role.
def _expect_zoom_closed(overlay):
    expect(overlay).to_be_hidden()


def test_bare_video_url_becomes_a_responsive_embed_and_other_urls_stay_links(content_page):
    page = content_page("media")
    frame = page.locator(".video-embed iframe")
    expect(frame).to_have_count(1)
    expect(frame).to_have_attribute("src", "https://www.youtube.com/embed/dQw4w9WgXcQ")
    box = page.locator(".video-embed").bounding_box()
    assert box and abs(box["width"] / box["height"] - 16 / 9) < 0.05
    expect(page.get_by_role("link", name="https://example.com/plain-page")).to_be_visible()


@pytest.mark.parametrize("close", ["escape", "backdrop", "close button"])
def test_image_opens_in_zoom_overlay_with_its_alt_as_caption(page, base_url, close):
    _canary(page, base_url, "media")
    page.get_by_role("img", name=IMAGE_ALT).click()
    overlay = _zoom_overlay(page)
    _expect_zoom_open(overlay)
    expect(overlay.get_by_role("img", name=IMAGE_ALT)).to_be_visible()
    expect(overlay.locator(".zoom-caption")).to_have_text(IMAGE_ALT)

    if close == "escape":
        page.keyboard.press("Escape")
    elif close == "backdrop":
        overlay.locator(".zoom-overlay-backdrop").click(position={"x": 5, "y": 5})
    else:
        overlay.get_by_role("button", name="Close").click()
    _expect_zoom_closed(overlay)


def test_image_without_alt_text_opens_zoom_without_a_caption(page, base_url):
    _canary(page, base_url, "media")
    page.locator("#markdown-body img.zoomable-img").nth(1).click()
    overlay = _zoom_overlay(page)
    _expect_zoom_open(overlay)
    expect(overlay.locator(".zoom-caption")).to_be_hidden()


def test_escape_closes_the_zoom_without_leaving_the_article(page, base_url):
    _canary(page, base_url, "media")
    url = page.url
    page.get_by_role("img", name=IMAGE_ALT).click()
    page.keyboard.press("Escape")
    _expect_zoom_closed(_zoom_overlay(page))
    expect(page.locator("#markdown-body")).to_be_visible()
    assert page.url == url


def test_diagram_renders_and_opens_in_zoom_at_a_real_size(page, base_url):
    _canary(page, base_url, "media")
    diagram = page.locator("pre.mermaid svg")
    expect(diagram).to_be_visible()

    diagram.click()
    overlay = _zoom_overlay(page)
    _expect_zoom_open(overlay)
    zoomed = overlay.locator(".zoom-overlay-content svg")
    expect(zoomed).to_be_visible()
    box = zoomed.bounding_box()
    assert box and box["width"] > 50 and box["height"] > 20


def test_diagram_redraws_in_the_new_theme_and_keeps_its_source(page, base_url, open_settings):
    _canary(page, base_url, "media")
    diagram = page.locator("pre.mermaid")
    expect(diagram.locator("svg")).to_be_visible()
    source = diagram.get_attribute("data-mermaid-src")
    assert "Client" in source

    def node_fill():
        return diagram.locator("svg .node rect").first.evaluate("el => getComputedStyle(el).fill")

    def choose(theme):
        dialog = open_settings()
        row = dialog.locator("xpath=.//div[contains(@class,'prefs-section')][.//div[contains(@class,'prefs-section-label') and normalize-space()='Theme']]")
        row.get_by_role("button", name=theme).click()
        page.keyboard.press("Escape")
        expect(dialog).to_be_hidden()

    choose("Dark")
    dark = node_fill()
    choose("Light")
    page.wait_for_function(
        "dark => getComputedStyle(document.querySelector('pre.mermaid svg .node rect')).fill !== dark",
        arg=dark,
    )
    assert node_fill() != dark
    assert diagram.get_attribute("data-mermaid-src") == source


# ── canary "interactive": callouts, formulas, code tabs, glossary, caveats, practice answers ──

ACTIVE = re.compile(r"\bactive\b")
POPOVER_VISIBLE = re.compile(r"\bglossary-popover--visible\b")
AMORTIZED_DEF = "Average cost per operation"


def _callout(page, title):
    return page.locator("#markdown-body blockquote.callout").filter(has_text=title)


def _callout_toggle(callout):
    return callout.locator("xpath=following-sibling::*[1][self::button]")


def _glossary_term(page):
    return page.get_by_role("button", name="amortized", exact=True)


def _height(locator):
    box = locator.bounding_box()
    assert box
    return box["height"]


def test_tall_callout_folds_behind_show_more_and_unfolds_on_click(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _canary(page, base_url, "interactive")
    callout = _callout(page, "Long Warning")
    toggle = _callout_toggle(callout)
    expect(toggle).to_have_text("Show more")
    folded = _height(callout)

    toggle.click()
    expect(toggle).to_have_text("Show less")
    assert _height(callout) > folded + 40

    toggle.click()
    expect(toggle).to_have_text("Show more")
    assert _height(callout) == pytest.approx(folded, abs=1)


def test_plus_callout_starts_folded_and_a_short_callout_does_not(content_page):
    page = content_page("interactive")
    folded = _callout(page, "Folded Note")
    expect(_callout_toggle(folded)).to_have_text("Show more")
    expect(folded).not_to_contain_text("+")
    expect(_callout_toggle(_callout(page, "Short Thought"))).to_have_count(0)


def test_multiline_callout_flexes_only_its_first_line(content_page):
    # Regression: flexing the whole <p> made every br-separated run a shrink-to-fit flex item and letter-wrapped it.
    page = content_page("interactive")
    displays = _callout(page, "Interview tip").locator("p").first.evaluate(
        "p => [getComputedStyle(p).display, getComputedStyle(p.querySelector('.callout-first-line')).display]"
    )
    assert displays == ["block", "flex"]


def test_formula_toggle_swaps_symbols_for_names_and_back(page, base_url):
    _canary(page, base_url, "interactive")
    named = page.locator(".katex-display").nth(0)
    plain = page.locator(".katex-display").nth(1)
    expect(named.get_by_role("button", name="Copy LaTeX")).to_have_count(1)
    expect(plain.get_by_role("button", name="Copy LaTeX")).to_have_count(1)
    expect(plain.get_by_role("button", name="Toggle variable names")).to_have_count(0)

    toggle = named.get_by_role("button", name="Toggle variable names")
    expect(named).not_to_contain_text("time")
    toggle.click()
    expect(toggle).to_have_class(ACTIVE)
    expect(named).to_contain_text("time")
    toggle.click()
    expect(toggle).not_to_have_class(ACTIVE)
    expect(named).not_to_contain_text("time")


def test_code_tabs_switch_panels_and_remember_the_language_after_reload(page, base_url):
    _canary(page, base_url, "interactive")
    tabs = page.get_by_role("tablist")
    java = tabs.get_by_role("tab", name="java")
    panels = page.locator(".code-tabs .code-tab-panel")
    expect(tabs.get_by_role("tab", name="python")).to_have_class(ACTIVE)
    expect(panels.nth(0)).to_be_visible()
    expect(panels.nth(1)).to_be_hidden()

    java.click()
    expect(java).to_have_class(ACTIVE)
    expect(panels.nth(1)).to_be_visible()
    expect(panels.nth(0)).to_be_hidden()

    page.reload(wait_until="domcontentloaded")
    expect(java).to_have_class(ACTIVE)
    expect(panels.nth(1)).to_be_visible()


def test_hovering_a_glossary_term_shows_its_definition_beside_it(content_page):
    page = content_page("interactive")
    term = _glossary_term(page)
    popover = page.get_by_role("tooltip")
    term.hover()
    expect(popover).to_have_class(POPOVER_VISIBLE)
    expect(popover).to_contain_text(AMORTIZED_DEF)

    t, p = term.bounding_box(), popover.bounding_box()
    assert t and p
    assert p["y"] >= t["y"] + t["height"] or p["y"] + p["height"] <= t["y"], "popover must sit beside the term, not over it"
    assert abs(p["x"] - t["x"]) < 40
    assert p["x"] >= 0 and p["x"] + p["width"] <= page.viewport_size["width"]

    page.mouse.move(0, 0)
    expect(popover).not_to_have_class(POPOVER_VISIBLE)


def test_glossary_term_opens_its_definition_inline_and_closes_on_an_outside_click(page, base_url):
    _canary(page, base_url, "interactive")
    term = _glossary_term(page)
    inline = page.locator("#markdown-body .glossary-inline-def")
    expect(inline).to_be_hidden()

    term.click()
    expect(term).to_have_attribute("aria-expanded", "true")
    expect(inline).to_be_visible()
    expect(inline).to_contain_text(AMORTIZED_DEF)
    expect(page.get_by_role("tooltip")).not_to_have_class(POPOVER_VISIBLE)

    page.get_by_role("heading", name="Canary Interactive").click()
    expect(term).to_have_attribute("aria-expanded", "false")
    expect(inline).to_be_hidden()

    term.press("Enter")
    expect(inline).to_be_visible()
    term.press("Enter")
    expect(inline).to_be_hidden()


def test_tapping_a_glossary_term_opens_its_definition_inline(browser, base_url):
    ctx = browser.new_context(has_touch=True, is_mobile=True, viewport={"width": 390, "height": 844}, service_workers="block")
    try:
        page = _canary(ctx.new_page(), base_url, "interactive")
        _glossary_term(page).tap()
        expect(page.locator("#markdown-body .glossary-inline-def")).to_be_visible()
    finally:
        ctx.close()


def test_caveat_marker_reveals_and_hides_its_exception(page, base_url):
    _canary(page, base_url, "interactive")
    marker = page.locator("#markdown-body .caveat-marker").first
    exception = page.get_by_text("unless this append triggers a resize")
    expect(page.locator("#markdown-body .caveat-marker")).to_have_count(2)
    expect(exception).to_be_hidden()

    marker.click()
    expect(marker).to_have_attribute("aria-expanded", "true")
    expect(exception).to_be_visible()
    expect(page.get_by_text("second caveat body")).to_be_hidden()

    marker.press("Enter")
    expect(marker).to_have_attribute("aria-expanded", "false")
    expect(exception).to_be_hidden()


def _practice(page):
    eyes = page.get_by_role("button", name="Toggle answer visibility")
    answers = page.locator("#markdown-body .problem-answer")
    return eyes, answers


def test_practice_answer_eye_reveals_only_its_own_problem(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _canary(page, base_url, "interactive")
    eyes, answers = _practice(page)
    expect(eyes).to_have_count(2)
    expect(answers.nth(0)).to_be_hidden()
    expect(answers.nth(1)).to_be_hidden()
    expect(page.get_by_text("Return the largest value")).to_be_visible()
    box = eyes.first.bounding_box()
    assert box and box["width"] >= 32 and box["height"] >= 32

    eyes.first.click()
    expect(eyes.first).to_have_attribute("aria-pressed", "true")
    expect(answers.nth(0)).to_be_visible()
    expect(answers.nth(1)).to_be_hidden()

    eyes.first.click()
    expect(answers.nth(0)).to_be_hidden()


def test_practice_reveal_survives_folding_and_unfolding_its_section(page, base_url):
    # Regression: the section fold and the answer toggle both drove `hidden` and clobbered each other.
    _canary(page, base_url, "interactive")
    eyes, answers = _practice(page)
    eyes.first.click()
    expect(answers.nth(0)).to_be_visible()

    heading = page.locator("#markdown-body h2").filter(has_text="Practice problems")
    fold = heading.locator(".heading-collapse-btn")
    fold.click()
    expect(heading).to_have_class(re.compile(r"\bsection--collapsed\b"))
    expect(answers.nth(0)).to_be_hidden()
    fold.click()
    expect(heading).not_to_have_class(re.compile(r"\bsection--collapsed\b"))

    expect(answers.nth(0)).to_be_visible()
    expect(answers.nth(1)).to_be_hidden()


def test_practice_answers_preference_applies_live_and_on_the_next_visit(page, base_url, open_settings):
    _canary(page, base_url, "interactive")
    eyes, answers = _practice(page)
    expect(answers.nth(0)).to_be_hidden()

    dialog = open_settings()
    dialog.get_by_role("tab", name="Advanced").click()
    # The prefs toggle has no accessible name of its own; find it by its section label.
    toggle = dialog.locator(
        "xpath=.//div[contains(@class,'prefs-section')][.//div[contains(@class,'prefs-section-label') and normalize-space()='Practice problem answers']]//button"
    )
    expect(toggle).to_have_text("Hidden")
    toggle.click()
    expect(toggle).to_have_text("Shown")
    page.keyboard.press("Escape")
    expect(dialog).to_be_hidden()
    expect(answers.nth(0)).to_be_visible()
    expect(answers.nth(1)).to_be_visible()

    page.reload(wait_until="domcontentloaded")
    expect(eyes.first).to_have_attribute("aria-pressed", "true")
    expect(answers.nth(0)).to_be_visible()


def test_reader_controls_reattach_once_after_client_side_navigation_away_and_back(page, base_url):
    _canary(page, base_url, "interactive")
    page.keyboard.press("Meta+k")
    page.get_by_role("dialog").get_by_role("textbox").fill("linked list")
    page.keyboard.press("Enter")
    page.wait_for_url("**/dsa/data-structures/linked-list/")
    page.go_back()
    page.wait_for_url("**/e2e-canary/interactive/")

    eyes, _ = _practice(page)
    expect(eyes).to_have_count(2)
    expect(page.locator(".glossary-popover")).to_have_count(1)
    expect(page.locator(".katex-display .formula-toggle-btn")).to_have_count(1)
    _glossary_term(page).click()
    expect(page.locator("#markdown-body .glossary-inline-def")).to_be_visible()


# ── canary "text": reading progress, end marker, scroll restore, in-content TOC ──


def _ring_offset(page):
    return float(page.locator("#scroll-top .scroll-top-ring-fill").get_attribute("stroke-dashoffset"))


def test_scrolling_the_article_fills_the_progress_bar_and_ring(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _canary(page, base_url, "text")
    bar = page.locator("#reading-progress")
    expect(bar).to_have_css("opacity", "1")
    assert bar.evaluate("el => getComputedStyle(el).boxShadow") != "none", "progress bar lost its accent glow"
    start = _ring_offset(page)

    page.mouse.wheel(0, 2_000)
    page.wait_for_function("() => parseFloat(document.getElementById('reading-progress').style.width) > 0")
    page.wait_for_function(
        "start => parseFloat(document.querySelector('#scroll-top .scroll-top-ring-fill').getAttribute('stroke-dashoffset')) < start",
        arg=start,
    )

    page.locator("#scroll-top").click()
    page.wait_for_function("() => window.scrollY === 0")


def test_article_ends_with_the_marker_right_before_the_complete_button(content_page):
    page = content_page("text")
    marker = page.locator(".article-end-marker")
    expect(marker).to_have_count(1)
    expect(marker).to_have_text("⌘")
    expect(marker).to_have_attribute("aria-hidden", "true")
    follows = marker.evaluate("m => m.previousElementSibling?.id === 'markdown-body' && !!m.nextElementSibling?.querySelector('.complete-btn')")
    assert follows, "end marker must sit between the article body and the complete button"


def test_hand_authored_table_of_contents_is_not_rendered(page, base_url):
    _article(page, base_url, "dsa/data-structures/hash-table")
    expect(page.locator("#markdown-body").get_by_role("heading", name="Table of Contents")).to_have_count(0)
    expect(page.locator("#toc-sidebar").get_by_role("link", name="Table of Contents")).to_have_count(0)
    expect(page.locator("#toc-sidebar").get_by_role("link")).not_to_have_count(0)


def test_reading_position_is_restored_on_the_next_visit(page, base_url):
    page.set_viewport_size({"width": 1280, "height": 800})
    _canary(page, base_url, "text")
    page.mouse.wheel(0, 1_200)
    page.wait_for_function("() => window.scrollY > 600")
    saved = page.evaluate("() => window.scrollY")
    # The save is debounced 250ms after the last scroll event; wait for it to land in storage.
    page.wait_for_function(
        "() => Object.keys(localStorage).some(k => k.startsWith('wiki-toc-scroll-article-') && Number(localStorage.getItem(k)) > 600)"
    )

    page.reload(wait_until="domcontentloaded")
    page.wait_for_function("saved => Math.abs(window.scrollY - saved) < 50", arg=saved)
