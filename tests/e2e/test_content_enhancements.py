"""Article reader e2e: tables, code, zoom, diagrams, highlights, interactive and text canaries, print."""

import re

import pytest
from conftest import force_paint
from playwright.sync_api import expect

SLUG = "system-design/components/caching"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _canary(page, base_url, name):
    page.goto(f"{base_url}/e2e-canary/{name}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.wait_for_selector("html[data-hotkeys-ready]", state="attached", timeout=15_000)
    return page


def _hl_article(page, base_url, slug=SLUG, *, clear=True):
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

    # Radius + overflow:hidden on the table itself leaves a ghost band when scrolled inside the wrap.
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


# ── Touch targets ─────────────────────────────────────────────────


def test_copy_btn_and_sortable_th_44px_on_coarse_pointer(browser, base_url):
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


# ── Topbar and Preferences actions ─────────────────────────────────


@pytest.mark.parametrize("width", [320, 360, 375])
def test_content_topbar_fits_narrow_viewports(page, base_url, width):
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


def test_print_button_in_advanced_prefs_stamps_the_article_url(page, base_url, open_settings):
    _canary(page, base_url, "text")
    page.evaluate("() => { window.print = () => {}; }")
    dialog = open_settings()
    dialog.get_by_role("tab", name="Advanced").click()
    dialog.get_by_role("button", name="Print / save as PDF").click()
    expect(page.locator("#markdown-body")).to_have_attribute(
        "data-print-url", re.compile(r"^http.*/e2e-canary/text/")
    )


def test_print_stylesheet_loaded(wiki_page):
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


# ── Text highlights + inline emoji markers ───────────────────────────────────────


def _select_word(page, word):
    """Scrolls first and lets it settle: Highlights hides the toolbar on scroll, so a late scroll races the selection."""
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
    page.locator(".highlight-toolbar:not(.hidden) .highlight-toolbar-btn--highlight").click()


def _click_emoji_toolbar_btn(page, index=0):
    page.locator(".highlight-toolbar:not(.hidden) .highlight-toolbar-btn--emoji").nth(index).click()


def test_selecting_text_shows_highlight_toolbar(page, base_url):
    _hl_article(page, base_url)
    _select_word(page, "avalanches")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    assert page.locator(".highlight-toolbar-btn--highlight").is_visible()
    assert page.locator(".highlight-toolbar-btn--emoji").count() == 6


def test_highlight_create_remove_and_keyboard_remove_lifecycle(page, base_url):
    _hl_article(page, base_url)

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
    _hl_article(page, base_url)
    _select_word(page, "absorb")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_emoji_toolbar_btn(page, 0)
    page.wait_for_selector("#markdown-body .wiki-marker", timeout=3_000)
    # Wait for the toolbar to hide, or selectionchange races the second mouseup and it's ignored.
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
    _hl_article(page, base_url)

    _select_word(page, "crucially")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)
    force_paint(page)
    _click_emoji_toolbar_btn(page, 0)
    page.wait_for_selector("#markdown-body .wiki-marker", timeout=3_000)

    stored = page.evaluate(
        """() => Object.keys(localStorage).find(k => k.startsWith('wiki-markers-'))"""
    )
    assert stored is not None, "No wiki-markers-* key written to localStorage"

    page.locator("#markdown-body .wiki-marker").first.click()
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


def test_highlight_toolbar_buttons_are_keyboard_labeled(page, base_url):
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
    _hl_article(page, base_url, slug="system-design/hld/url-shortener")
    _select_word(page, "url_mappings")
    page.wait_for_selector(".highlight-toolbar:not(.hidden)", timeout=3_000)

    assert page.locator(".highlight-toolbar-btn--highlight").is_visible()
    visible_emoji = page.evaluate(
        """() => [...document.querySelectorAll('.highlight-toolbar-btn--emoji')]
            .filter(b => !b.hidden && b.offsetParent !== null).length"""
    )
    assert visible_emoji == 0, "Emoji marker buttons must be hidden for code selections"

    force_paint(page)
    _click_highlight_toolbar_btn(page)
    page.wait_for_selector("#markdown-body .wiki-highlight", timeout=3_000)


def test_emoji_marker_is_narrow_accent_tick(page, base_url):
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


def test_code_block_disables_ligatures(page, base_url):
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
    # Flexing the whole <p> makes every br-separated run a shrink-to-fit flex item and letter-wraps it.
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
    # The section fold and the answer toggle both drive `hidden` and can clobber each other.
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
