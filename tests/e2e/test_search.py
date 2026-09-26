import re

import pytest
from playwright.sync_api import expect

# Not ported (dead CSS in search-modal.css, genuinely absent): command palette (`/`, verb commands), wiki-scope filtering (native + mobile custom dropdown, ⌘F), placeholder rotation, load-failure/retry (no debounce needed either — entries load once per modal-open, filtered in-memory), `?search=1` boot param.


def _open_search(page):
    page.keyboard.press("Meta+k")
    page.wait_for_selector('[role="dialog"][aria-label="Search"]', timeout=5_000)
    page.wait_for_selector(".gsearch-input")


def _search_dialog(page):
    return page.locator('[role="dialog"][aria-label="Search"]')


# ── open / keyboard nav / navigate ──────────────────────────────────


def test_home_topbar_search_button_opens_search(page, base_url):
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(base_url, wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=8_000)
    page.locator(".home-topbar [title='Search (⌘K)']").click()
    page.wait_for_selector('[role="dialog"][aria-label="Search"]')


def test_content_topbar_search_button_opens_search(page, base_url):
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)
    page.locator(".content-topbar [title='Search (⌘K)']").click()
    page.wait_for_selector('[role="dialog"][aria-label="Search"]')


@pytest.mark.smoke
def test_arrow_down_selects_first_result(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result")

    wiki_page.keyboard.press("ArrowDown")
    selected = wiki_page.locator(".gsearch-result.selected")
    assert selected.count() == 1


def test_arrow_keys_cycle_results(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "cache")
    wiki_page.locator(".gsearch-result").nth(1).wait_for()

    wiki_page.keyboard.press("ArrowDown")
    wiki_page.wait_for_selector(".gsearch-result.selected")
    first = wiki_page.locator(".gsearch-result.selected").first.inner_text()

    wiki_page.keyboard.press("ArrowDown")
    wiki_page.wait_for_selector(".gsearch-result.selected")
    second = wiki_page.locator(".gsearch-result.selected").first.inner_text()

    assert first != second


@pytest.mark.smoke
def test_enter_navigates_to_article(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result")

    wiki_page.keyboard.press("ArrowDown")
    wiki_page.keyboard.press("Enter")
    wiki_page.wait_for_selector("#markdown-body", timeout=8_000)
    assert "caching" in wiki_page.url


def test_search_input_has_aria_label(wiki_page):
    _open_search(wiki_page)
    label = wiki_page.locator(".gsearch-input").get_attribute("aria-label")
    assert label and label.strip()


@pytest.mark.smoke
def test_search_shows_real_articles(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert wiki_page.locator(".gsearch-result").count() > 0


# ── Result count badge ────────────────────────────────────────────


def test_result_count_shows_on_results(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    count_text = wiki_page.locator(".gsearch-count").inner_text()
    assert count_text.strip(), "Result count badge must not be empty when results exist"
    assert "result" in count_text.lower(), (
        f"Count badge must contain 'result', got '{count_text}'"
    )


def test_result_count_clears_on_empty_query(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    wiki_page.fill(".gsearch-input", "")
    wiki_page.wait_for_function(
        "() => (document.querySelector('.gsearch-count')?.textContent ?? '').trim() === ''",
        timeout=5_000,
    )


def test_result_count_clears_on_modal_reopen(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    wiki_page.keyboard.press("Escape")
    wiki_page.wait_for_selector('[role="dialog"][aria-label="Search"]', state="detached")

    _open_search(wiki_page)
    count_text = wiki_page.locator(".gsearch-count").inner_text()
    assert not count_text.strip(), (
        f"Count badge must be empty on modal reopen, got '{count_text}'"
    )


# ── Section-filter mode indicator ────────────────────────────────────


def test_section_filter_mode_shows_badge(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", ">")
    wiki_page.wait_for_function(
        "() => document.querySelector('.gsearch-dialog')?.classList.contains('section-mode')",
        timeout=5_000,
    )
    assert wiki_page.locator(".gsearch-mode-badge:visible").count() == 1, (
        "Section-filter mode badge must be visible"
    )


def test_section_filter_mode_clears_on_normal_query(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", ">")
    wiki_page.wait_for_function(
        "() => document.querySelector('.gsearch-dialog')?.classList.contains('section-mode')",
        timeout=5_000,
    )
    wiki_page.fill(".gsearch-input", "caching")
    wiki_page.wait_for_function(
        "() => !document.querySelector('.gsearch-dialog')?.classList.contains('section-mode')",
        timeout=5_000,
    )
    assert wiki_page.locator(".gsearch-mode-badge:visible").count() == 0, (
        "Mode badge must be hidden for a normal query"
    )


def test_section_filter_mode_lists_matching_sections(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", ">pattern")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert wiki_page.locator(".gsearch-result").count() > 0


# ── In-article find bar ──────────────────────────────────────────────


def _open_article(page, base_url):
    page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=15_000)


def test_article_find_bar(page, base_url):
    _open_article(page, base_url)

    page.keyboard.press("/")
    page.wait_for_selector("#article-find", timeout=3_000)
    assert page.evaluate("() => document.activeElement?.id") == "article-find-input"

    page.fill("#article-find-input", "cache")
    page.wait_for_selector("#markdown-body mark.article-find-hit", timeout=3_000)
    assert page.locator("#markdown-body mark.article-find-hit").count() > 0
    assert page.locator("mark.article-find-hit--current").count() == 1

    count_text = page.locator("#article-find-count").inner_text()
    assert "/" in count_text, f"Count must read 'i/N', got '{count_text}'"
    first_pos = count_text.split("/")[0]
    if int(count_text.split("/")[1]) > 1:
        page.keyboard.press("Enter")
        page.wait_for_function(
            f"() => document.getElementById('article-find-count').textContent.split('/')[0] !== '{first_pos}'",
            timeout=3_000,
        )
        assert page.locator("#article-find-count").inner_text().split("/")[0] != first_pos

    page.keyboard.press("Escape")
    page.wait_for_selector("#article-find", state="detached", timeout=3_000)


def test_article_find_bar_fits_320px(page, base_url):
    page.set_viewport_size({"width": 320, "height": 568})
    _open_article(page, base_url)
    page.keyboard.press("/")
    page.wait_for_selector("#article-find")

    bar = page.locator("#article-find")
    box = bar.bounding_box()
    assert box is not None
    assert box["x"] >= 0, f"Find bar overflows left edge: x={box['x']}"
    assert box["x"] + box["width"] <= 320, f"Find bar overflows right edge: right={box['x'] + box['width']}"


def test_find_bar_clears_sticky_header(page, base_url):
    """Find bar top must be below sticky section header bottom when header is visible (StickyHeader.tsx derives visibility from real scroll position via a scroll listener, not settable by poking DOM classes directly - scroll past the article's first h2 to trigger it for real)."""
    _open_article(page, base_url)
    page.evaluate("""() => {
        const h2 = document.querySelector('.markdown-body h2, #markdown-body h2');
        if (h2) window.scrollTo(0, h2.getBoundingClientRect().top + window.scrollY + 50);
    }""")
    page.wait_for_selector("body.sticky-header-visible", timeout=3_000)

    page.keyboard.press("/")
    page.wait_for_selector("#article-find")

    sticky = page.locator("#sticky-section-header")
    find_bar = page.locator("#article-find")

    sticky_box = sticky.bounding_box()
    find_box = find_bar.bounding_box()

    assert sticky_box is not None and find_box is not None
    sticky_bottom = sticky_box["y"] + sticky_box["height"]
    assert find_box["y"] >= sticky_bottom, (
        f"Find bar top ({find_box['y']}) overlaps sticky header bottom ({sticky_bottom})"
    )


# ── Search result snippets ────────────────────────────────────────────


def test_result_snippet_appears(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "cache")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert wiki_page.locator(".gsearch-result-snippet").count() > 0, (
        "At least one result must render a .gsearch-result-snippet"
    )


def test_result_snippet_contains_highlight(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "cache")
    wiki_page.wait_for_selector(".gsearch-result-snippet", timeout=8_000)
    marks = wiki_page.locator(".gsearch-result-snippet mark.gsearch-highlight").count()
    assert marks > 0, "Snippet must highlight the matched term with mark.gsearch-highlight"


# ── Recent searches ───────────────────────────────────────────────────


def test_recent_searches_shown_on_empty_input(wiki_page):
    wiki_page.evaluate(
        "() => localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache', 'tree']))"
    )
    _open_search(wiki_page)
    wiki_page.wait_for_selector(".gsearch-recents", timeout=3_000)
    chips = wiki_page.locator(".gsearch-recent-query").all_text_contents()
    assert "cache" in chips and "tree" in chips, (
        f"Recent chips must show injected queries, got {chips}"
    )


def test_recent_search_chip_click_runs_query(wiki_page):
    wiki_page.evaluate(
        "() => localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache']))"
    )
    _open_search(wiki_page)
    wiki_page.wait_for_selector(".gsearch-recent-query")
    wiki_page.locator(".gsearch-recent-query").first.click()
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    input_val = wiki_page.input_value(".gsearch-input")
    assert input_val == "cache", f"Input must be set to chip query, got '{input_val}'"
    assert wiki_page.locator(".gsearch-result").count() > 0


def test_recent_search_remove_button_removes_chip(wiki_page):
    wiki_page.evaluate(
        "() => localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache', 'tree']))"
    )
    _open_search(wiki_page)
    wiki_page.wait_for_selector(".gsearch-recent-remove")
    wiki_page.locator(".gsearch-recent-remove").first.click()
    wiki_page.wait_for_function(
        "() => document.querySelectorAll('.gsearch-recent-query').length === 1",
        timeout=5_000,
    )

    remaining = wiki_page.locator(".gsearch-recent-query").all_text_contents()
    assert len(remaining) == 1, f"One chip must remain after remove, got {remaining}"

    stored = wiki_page.evaluate(
        "() => JSON.parse(localStorage.getItem('wiki-recent-searches') || '[]')"
    )
    assert len(stored) == 1, f"localStorage must reflect removal, got {stored}"


def test_recent_searches_hidden_when_typing(wiki_page):
    wiki_page.evaluate(
        "() => localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache']))"
    )
    _open_search(wiki_page)
    wiki_page.wait_for_selector(".gsearch-recents")
    wiki_page.fill(".gsearch-input", "tree")
    wiki_page.wait_for_function(
        "() => document.querySelectorAll('.gsearch-recents').length === 0",
        timeout=5_000,
    )


# ── No-results fallback ───────────────────────────────────────────────


def test_no_results_fallback_shown(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "xyzzy_no_match_ever")
    wiki_page.wait_for_selector(".gsearch-no-results", timeout=8_000)
    text = wiki_page.locator(".gsearch-no-results").inner_text()
    assert "xyzzy_no_match_ever" in text, (
        f"No-results message must echo the query, got '{text}'"
    )


# ── Synonym expansion ─────────────────────────────────────────────────


def test_synonym_expansion_returns_results(wiki_page):
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "list")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert wiki_page.locator(".gsearch-result").count() > 0, (
        "Synonym query 'list' must return results via synonym expansion"
    )


def test_synonym_matched_title_is_highlighted(wiki_page):
    """A title that only matches via synonym expansion (not the literal typed query) must still render with its matched term highlighted. expandQuery() is a forward-only lookup (synonyms.json key -> values, never reverse) in both ports - "map" is only a value under "hash map"/"hash table", never a key, so it never expands; using "queue" -> "deque" instead, a real key->value pair where "Deque" never literally contains "queue"."""
    _open_search(wiki_page)
    wiki_page.fill(".gsearch-input", "queue")
    result = wiki_page.locator(
        ".gsearch-result", has=wiki_page.locator(".gsearch-result-title", has_text="Deque")
    )
    result.wait_for(timeout=8_000)
    marks = result.locator(".gsearch-result-title mark.gsearch-highlight")
    assert marks.count() > 0, (
        "Title matched via synonym expansion must still show a highlighted <mark>"
    )


# ── Search modal fits small viewport + results ───────────────────────


def test_search_modal_fits_small_viewport(wiki_page):
    wiki_page.set_viewport_size({"width": 375, "height": 400})
    wiki_page.locator("body").click()
    wiki_page.keyboard.press("Meta+k")
    wiki_page.wait_for_selector('[role="dialog"][aria-label="Search"]')

    dialog = wiki_page.locator(".gsearch-dialog")
    dialog.wait_for(state="visible", timeout=5_000)
    wiki_page.wait_for_function("""() => {
        const el = document.querySelector('.gsearch-dialog');
        if (!el) return false;
        return el.getAnimations().every(a => a.playState === 'finished');
    }""", timeout=5_000)
    box = wiki_page.evaluate("""() => {
        const r = document.querySelector('.gsearch-dialog').getBoundingClientRect();
        return {y: r.top, height: r.height};
    }""")
    assert box["height"] > 0, "Dialog has zero height"
    assert box["y"] >= 0, f"Dialog above viewport: y={box['y']}"
    assert box["y"] + box["height"] <= 400, (
        f"Dialog bottom ({box['y'] + box['height']}) exceeds viewport height (400)"
    )

    wiki_page.fill(".gsearch-input", "array")
    wiki_page.wait_for_selector(".gsearch-result", state="attached", timeout=10_000)
    results_box = wiki_page.evaluate("""() => {
        const results = document.querySelector('.gsearch-results');
        if (!results || !results.children.length) return null;
        const r = results.getBoundingClientRect();
        return {top: r.top, bottom: r.bottom};
    }""")
    assert results_box is not None, "No search results found"
    assert results_box["bottom"] <= 400, (
        f"Results container bottom ({results_box['bottom']}) overflows viewport height 400"
    )


def test_gsearch_results_has_overscroll_contain(wiki_page):
    _open_search(wiki_page)
    value = wiki_page.evaluate(
        "() => getComputedStyle(document.querySelector('.gsearch-results')).overscrollBehaviorY"
    )
    assert value == "contain", f".gsearch-results overscroll-behavior: {value}"


def test_recent_chip_44px_on_coarse_pointer_tablet_width(browser, base_url):
    ctx = browser.new_context(
        has_touch=True,
        is_mobile=True,
        viewport={"width": 800, "height": 1024},
        service_workers="block",
    )
    page = ctx.new_page()
    try:
        page.goto(f"{base_url}/system-design/components/caching/", wait_until="domcontentloaded")
        page.wait_for_selector("#markdown-body", timeout=10_000)
        page.evaluate(
            "() => localStorage.setItem('wiki-recent-searches', JSON.stringify(['caching']))"
        )
        page.keyboard.press("Meta+k")
        page.wait_for_selector('[role="dialog"][aria-label="Search"]')
        page.wait_for_selector(".gsearch-recent-chip", timeout=5_000)

        height = page.evaluate(
            "() => document.querySelector('.gsearch-recent-chip').getBoundingClientRect().height"
        )
        assert height >= 44, f"gsearch-recent-chip height too small at 800px: {height}px"
    finally:
        ctx.close()
