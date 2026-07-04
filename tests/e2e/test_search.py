"""
- ↑/↓ keyboard navigation in search results + Enter to select
- visited stubs excluded from ⌘K results (search no longer fetches articles on load)
- search input debounce (150ms)
- result count badge
- load-failure error state + retry
- section-filter mode indicator
"""

import pytest


def _open_search(page):
    page.keyboard.press("Meta+k")
    page.wait_for_selector("#global-search-modal:not(.hidden)")
    page.wait_for_selector("#gsearch-input")


@pytest.mark.smoke
def test_arrow_down_selects_first_result(wiki_page):
    """ArrowDown marks first result with .selected class."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result")

    wiki_page.keyboard.press("ArrowDown")
    selected = wiki_page.locator(".gsearch-result.selected")
    assert selected.count() == 1


def test_arrow_keys_cycle_results(wiki_page):
    """ArrowDown twice moves .selected to a different result."""
    _open_search(wiki_page)
    # "cache" matches many sections inside the large caching.md → guaranteed ≥2 results.
    wiki_page.fill("#gsearch-input", "cache")
    # Wait for ≥2 results and let the 150ms debounce fully settle.
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
    """Enter on focused result navigates to article (content view becomes active)."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result")

    wiki_page.keyboard.press("ArrowDown")
    wiki_page.keyboard.press("Enter")
    wiki_page.wait_for_selector("#view-content.active", timeout=8_000)


def test_visited_stub_excluded_from_search(wiki_page, base_url):
    """A stub becomes excludable once visited (readTimeCache marks it null)."""
    # Visit the known stub so its readTimeCache entry is set to null.
    wiki_page.goto(f"{base_url}/#system-design/api-gateway")
    wiki_page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    wiki_page.goto(f"{base_url}/")
    wiki_page.wait_for_selector("#view-home.active", timeout=5_000)

    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "api gateway")
    wiki_page.wait_for_function(
        "() => document.querySelectorAll('.gsearch-result').length > 0 || document.querySelector('.gsearch-no-results')",
        timeout=8_000,
    )

    titles = [r.inner_text() for r in wiki_page.locator(".gsearch-result").all()]
    assert all("api gateway" not in t.lower() for t in titles), (
        f"Visited stub still appeared in results: {titles}"
    )


def test_search_does_not_fetch_articles_for_stub_detection(wiki_page):
    """opening search must not fetch article .md bodies just to detect stubs."""
    wiki_page.evaluate("""() => {
        window._articleFetches = [];
        const orig = window.fetch;
        window.fetch = (url, ...rest) => {
            const u = typeof url === 'string' ? url : url?.url ?? '';
            if (u.endsWith('.md') && !u.endsWith('index.md')) {
                window._articleFetches.push(u);
            }
            return orig(url, ...rest);
        };
    }""")
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    article_fetches = wiki_page.evaluate("() => window._articleFetches")
    assert article_fetches == [], (
        f"Search fetched article bodies for stub detection: {article_fetches}"
    )


def test_search_input_has_aria_label(wiki_page):
    """Search input must have an aria-label - placeholder text alone is not read reliably by screen readers."""
    _open_search(wiki_page)
    label = wiki_page.locator("#gsearch-input").get_attribute("aria-label")
    assert label and label.strip()


@pytest.mark.smoke
def test_search_shows_real_articles(wiki_page):
    """non-stub articles do appear in search results."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert wiki_page.locator(".gsearch-result").count() > 0


# ── Search input debounce ─────────────────────────────────────────


def test_search_debounce_results_appear_after_typing(wiki_page):
    """results appear after debounce settles; rapid typing does not break search."""
    _open_search(wiki_page)

    # Type each character with no delay (simulates fast typist)
    for char in "caching":
        wiki_page.type("#gsearch-input", char, delay=0)

    # Debounce fires at 150ms - wait well past it
    wiki_page.wait_for_selector(".gsearch-result", timeout=2_000)
    assert wiki_page.locator(".gsearch-result").count() > 0


def test_search_debounce_suppresses_intermediate_updates(wiki_page):
    """rapid keystrokes trigger fewer result updates than keystrokes typed."""
    _open_search(wiki_page)

    # Attach MutationObserver to count result-list updates
    wiki_page.evaluate("""() => {
        window._resultUpdates = 0;
        const el = document.getElementById('gsearch-results');
        if (el) {
            new MutationObserver(() => { window._resultUpdates++; })
                .observe(el, { childList: true, subtree: true });
        }
    }""")

    # Type 7 chars with 0ms delay - without debounce this would trigger 7 updates
    for char in "caching":
        wiki_page.type("#gsearch-input", char, delay=0)

    wiki_page.wait_for_function(
        "() => (window._resultUpdates ?? 0) > 0", timeout=5_000
    )

    updates = wiki_page.evaluate("() => window._resultUpdates ?? 0")
    # With 150ms debounce, rapid typing produces far fewer updates than keystrokes
    assert updates < 7, f"Expected debounced updates (<7) but got {updates}"


# ── Result count badge ────────────────────────────────────────────


def test_result_count_shows_on_results(wiki_page):
    """#gsearch-count shows 'N results' text when results exist."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    count_text = wiki_page.evaluate(
        "() => document.getElementById('gsearch-count')?.textContent ?? ''"
    )
    assert count_text.strip(), "Result count badge must not be empty when results exist"
    assert "result" in count_text.lower(), (
        f"Count badge must contain 'result', got '{count_text}'"
    )


def test_result_count_clears_on_empty_query(wiki_page):
    """#gsearch-count is empty when search input is cleared."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    wiki_page.fill("#gsearch-input", "")
    wiki_page.wait_for_function(
        "() => (document.getElementById('gsearch-count')?.textContent ?? '').trim() === ''",
        timeout=5_000,
    )

    count_text = wiki_page.evaluate(
        "() => document.getElementById('gsearch-count')?.textContent ?? ''"
    )
    assert not count_text.strip(), (
        f"Result count must be empty on blank query, got '{count_text}'"
    )


def test_result_count_clears_on_modal_reopen(wiki_page):
    """#gsearch-count is empty when modal is closed and reopened."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)

    wiki_page.keyboard.press("Escape")
    wiki_page.wait_for_selector(
        "#global-search-modal.hidden", state="attached", timeout=2_000
    )

    _open_search(wiki_page)
    count_text = wiki_page.evaluate(
        "() => document.getElementById('gsearch-count')?.textContent ?? ''"
    )
    assert not count_text.strip(), (
        f"Count badge must be empty on modal reopen, got '{count_text}'"
    )


# ── Load failure error state + retry ─────────────────────────────────


def test_search_load_failure_shows_retry(page, base_url):
    """When every wiki index fails to load, search shows an error with a Retry button."""
    # Fail all index.md requests so loadAllSearchEntries finds no usable cache.
    page.route("**/index.md", lambda route: route.abort())
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.keyboard.press("Meta+k")
    page.wait_for_selector("#global-search-modal:not(.hidden)")

    page.wait_for_selector(".gsearch-error", timeout=8_000)
    assert page.locator(".gsearch-retry").count() == 1, (
        "Retry button must be present in the search error state"
    )


def test_search_retry_recovers_after_failure(page, base_url):
    """Retry re-runs the load; once requests succeed, results become available."""
    failing = {"on": True}

    def handler(route):
        if failing["on"]:
            route.abort()
        else:
            route.continue_()

    page.route("**/index.md", handler)
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    page.keyboard.press("Meta+k")
    page.wait_for_selector(".gsearch-error", timeout=8_000)

    # Let the network recover, then hit Retry.
    failing["on"] = False
    page.locator(".gsearch-retry").click()

    page.fill("#gsearch-input", "caching")
    page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert page.locator(".gsearch-result").count() > 0


def test_search_recovers_on_reopen_after_failure(page, base_url):
    """A failed first load must not wedge search for later opens."""
    failing = {"on": True}
    page.route(
        "**/index.md",
        lambda route: route.abort() if failing["on"] else route.continue_(),
    )
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)

    # First open fails.
    page.keyboard.press("Meta+k")
    page.wait_for_selector(".gsearch-error", timeout=8_000)
    page.keyboard.press("Escape")
    page.wait_for_selector("#global-search-modal.hidden", state="attached")

    # Network heals; reopening re-attempts the load (proves flag was cleared).
    failing["on"] = False
    page.keyboard.press("Meta+k")
    page.fill("#gsearch-input", "caching")
    page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert page.locator(".gsearch-result").count() > 0


# ── Section-filter mode indicator ────────────────────────────────────


def test_section_filter_mode_shows_badge(wiki_page):
    """Typing '>' switches to section-filter mode and shows the mode badge."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", ">")
    wiki_page.wait_for_function(
        "() => document.querySelector('.gsearch-dialog')?.classList.contains('section-mode')",
        timeout=5_000,
    )

    dialog = wiki_page.locator(".gsearch-dialog")
    assert "section-mode" in (dialog.get_attribute("class") or ""), (
        "Dialog must carry .section-mode class in section-filter mode"
    )
    assert wiki_page.locator(".gsearch-mode-badge").is_visible(), (
        "Section-filter mode badge must be visible"
    )


def test_section_filter_mode_clears_on_normal_query(wiki_page):
    """Removing the leading '>' exits section-filter mode and hides the badge."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", ">")
    wiki_page.wait_for_function(
        "() => document.querySelector('.gsearch-dialog')?.classList.contains('section-mode')",
        timeout=5_000,
    )
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_function(
        "() => !document.querySelector('.gsearch-dialog')?.classList.contains('section-mode')",
        timeout=5_000,
    )

    dialog = wiki_page.locator(".gsearch-dialog")
    assert "section-mode" not in (dialog.get_attribute("class") or ""), (
        "Dialog must drop .section-mode for a normal query"
    )
    assert not wiki_page.locator(".gsearch-mode-badge").is_visible(), (
        "Mode badge must be hidden for a normal query"
    )


# ── ⌘K placeholder teaches its own grammar ──────────────────────────────────────

# The placeholder rotates every 2.8s while the input is empty.
_PLACEHOLDER_ROTATE_MS = 2800


@pytest.mark.slow
def test_placeholder_rotates_hint_when_empty(wiki_page):
    """While the ⌘K input is empty, the placeholder cycles to an example query."""
    _open_search(wiki_page)
    default = wiki_page.locator("#gsearch-input").get_attribute("placeholder")
    # Wait past one rotation tick (plus margin).
    wiki_page.wait_for_function(
        "(d) => document.getElementById('gsearch-input').placeholder !== d",
        arg=default,
        timeout=_PLACEHOLDER_ROTATE_MS + 2_000,
    )
    rotated = wiki_page.locator("#gsearch-input").get_attribute("placeholder")
    assert rotated.startswith("try:"), f"Expected a 'try:' hint, got '{rotated}'"


@pytest.mark.slow
def test_placeholder_does_not_rotate_while_typing(wiki_page):
    """Hints never overwrite the placeholder once the user has typed text."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "cache")
    wiki_page.wait_for_timeout(_PLACEHOLDER_ROTATE_MS + 500)
    placeholder = wiki_page.locator("#gsearch-input").get_attribute("placeholder")
    assert not placeholder.startswith("try:"), (
        "Placeholder should not rotate to a hint while the input has a value"
    )


@pytest.mark.slow
def test_placeholder_resets_to_default_on_close(wiki_page):
    """Closing the modal restores the static default placeholder."""
    _open_search(wiki_page)
    wiki_page.wait_for_function(
        "() => document.getElementById('gsearch-input').placeholder.startsWith('try:')",
        timeout=_PLACEHOLDER_ROTATE_MS + 2_000,
    )
    wiki_page.keyboard.press("Escape")
    wiki_page.wait_for_selector(
        "#global-search-modal.hidden", state="attached", timeout=2_000
    )
    placeholder = wiki_page.locator("#gsearch-input").get_attribute("placeholder")
    assert placeholder == "Search all wikis…", (
        f"Default placeholder not restored on close, got '{placeholder}'"
    )


# ── ⌘F scoped wiki search ────────────────────────────────────────────


def _open_scoped_search(page):
    """Open ⌘F (wiki-scoped search) from a wiki index/content view."""
    page.keyboard.press("Meta+f")
    page.wait_for_selector("#global-search-modal:not(.hidden)")
    page.wait_for_selector("#gsearch-input")


def test_cmd_f_opens_scoped_search_with_badge(page, base_url):
    """⌘F on a wiki index opens search in scope mode and shows the wiki badge."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    _open_scoped_search(page)
    page.wait_for_function(
        "() => document.querySelector('.gsearch-dialog')?.classList.contains('scope-mode')",
        timeout=5_000,
    )

    dialog = page.locator(".gsearch-dialog")
    assert "scope-mode" in (dialog.get_attribute("class") or ""), (
        "Dialog must carry .scope-mode class when opened via ⌘F"
    )
    assert page.locator(".gsearch-mode-badge").is_visible(), (
        "Scope badge must be visible in scoped search"
    )


def test_cmd_f_results_limited_to_current_wiki(page, base_url):
    """Scoped search returns results only from the active wiki's group."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    _open_scoped_search(page)
    page.fill("#gsearch-input", "a")
    page.wait_for_selector(".gsearch-result", timeout=8_000)

    # Group labels are per-wiki; scoped search must show exactly one group.
    labels = page.locator(".gsearch-group-label").count()
    assert labels <= 1, f"Scoped search must show a single wiki group, got {labels}"


def test_cmd_f_on_home_does_not_open_scoped_search(page, base_url):
    """⌘F on the home view has no wiki to scope to; app must not open scoped mode.

    (The browser's native find may run instead - we only assert our modal
    does not enter scope-mode.)"""
    page.goto(f"{base_url}/")
    page.wait_for_selector("#view-home.active", timeout=5_000)

    page.keyboard.press("Meta+f")
    page.wait_for_function(
        "() => !document.getElementById('global-search-modal').classList.contains('hidden')"
        " || !document.querySelector('.gsearch-dialog')?.classList.contains('scope-mode')",
        timeout=3_000,
    )

    dialog = page.locator(".gsearch-dialog")
    assert "scope-mode" not in (dialog.get_attribute("class") or ""), (
        "⌘F on home must not enter scoped search mode"
    )


def test_scope_clears_on_close(page, base_url):
    """Closing a scoped search drops scope-mode; reopening ⌘K is global again."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    _open_scoped_search(page)
    page.keyboard.press("Escape")
    page.wait_for_selector("#global-search-modal.hidden", state="attached")

    _open_search(page)
    dialog = page.locator(".gsearch-dialog")
    assert "scope-mode" not in (dialog.get_attribute("class") or ""), (
        "⌘K after a scoped search must reopen in global (unscoped) mode"
    )


# ── ⌘K command palette ───────────────────────────────────────────────


def test_slash_enters_command_mode(page, base_url):
    """Typing '/' switches ⌘K to command mode and lists commands."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    _open_search(page)
    page.fill("#gsearch-input", "/")
    page.wait_for_selector(".gsearch-command", timeout=8_000)

    dialog = page.locator(".gsearch-dialog")
    assert "command-mode" in (dialog.get_attribute("class") or ""), (
        "Dialog must carry .command-mode class when query starts with '/'"
    )
    assert page.locator(".gsearch-command").count() > 0, (
        "Command mode must list available commands"
    )


def test_command_filter_narrows_list(page, base_url):
    """Typing after '/' filters commands by label."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    _open_search(page)
    page.fill("#gsearch-input", "/export")
    page.wait_for_selector(".gsearch-command", timeout=8_000)

    labels = [c.inner_text().lower() for c in page.locator(".gsearch-command").all()]
    assert labels, "Filtered command list must not be empty for '/export'"
    assert all("export" in lbl for lbl in labels), (
        f"All filtered commands must match 'export', got {labels}"
    )


def test_wiki_command_hidden_without_wiki_context(page, base_url):
    """Wiki-scoped commands (e.g. clear recents) are hidden on the home view."""
    page.goto(f"{base_url}/")
    page.wait_for_selector("#view-home.active", timeout=5_000)

    _open_search(page)
    page.fill("#gsearch-input", "/")
    page.wait_for_selector(".gsearch-command", timeout=8_000)

    ids = [
        c.get_attribute("data-command") for c in page.locator(".gsearch-command").all()
    ]
    assert "clear-recents" not in ids, (
        "Wiki-scoped command must not appear without a current wiki"
    )
    # Global commands still available.
    assert "export-bookmarks" in ids, "Global commands must remain available on home"


def test_mark_all_read_command_marks_articles(page, base_url):
    """Running 'mark all read' sets read dots on the current wiki's index cards."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )

    _open_search(page)
    page.fill("#gsearch-input", "/mark all read")
    page.wait_for_selector(".gsearch-command[data-command='mark-all-read']", timeout=8_000)
    page.locator(".gsearch-command[data-command='mark-all-read']").first.click()

    # Returns to the index; at least one read dot should now be visible.
    page.wait_for_selector("#view-index.active", timeout=8_000)
    page.wait_for_selector(
        "#index-sections:not(.index-sections--loading)", timeout=15_000
    )
    page.wait_for_selector(".index-card", timeout=10_000)
    # Wait for at least one read dot to become visible after the re-render.
    page.wait_for_selector(".index-card-read-dot.visible", timeout=8_000)
    visible_dots = page.locator(".index-card-read-dot.visible").count()
    assert visible_dots > 0, "Mark-all-read must mark at least one article read"


# ── In-article find bar ──────────────────────────────────────────────


def _open_article(page, base_url):
    page.goto(f"{base_url}/#system-design/caching")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )


def test_article_find_bar(page, base_url):
    """'/' opens find bar; typing highlights matches; Enter cycles; Escape closes and clears."""
    _open_article(page, base_url)

    page.keyboard.press("/")
    page.wait_for_selector("#article-find:not(.hidden)", timeout=3_000)
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
    page.wait_for_selector("#article-find.hidden", state="attached", timeout=3_000)
    assert page.locator("#markdown-body mark.article-find-hit").count() == 0, (
        "Closing find must strip all highlight marks"
    )


# ── Scope dropdown ────────────────────────────────────────────────────


def test_scope_dropdown_exists_in_modal(wiki_page):
    """⌘K modal has a scope <select> populated with at least one wiki option."""
    _open_search(wiki_page)
    sel = wiki_page.locator("#gsearch-scope-select")
    assert sel.count() == 1, "Scope select must exist in the search modal"
    options = sel.locator("option").all_text_contents()
    assert options[0].lower() == "all wikis", f"First option must be 'All wikis', got {options[0]}"
    assert len(options) > 1, "Scope select must include at least one wiki option"


def test_scope_dropdown_filters_results(page, base_url):
    """Selecting a wiki in the scope dropdown restricts results to that wiki."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    _open_search(page)
    page.fill("#gsearch-input", "cache")
    page.wait_for_selector(".gsearch-result", timeout=8_000)
    count_all = page.locator(".gsearch-result").count()

    page.select_option("#gsearch-scope-select", "system-design")
    page.wait_for_function(
        f"() => document.querySelectorAll('.gsearch-result').length <= {count_all}",
        timeout=5_000,
    )
    count_scoped = page.locator(".gsearch-result").count()

    assert count_scoped <= count_all, (
        "Scoped results must be a subset of all-wikis results"
    )
    labels = [g.inner_text() for g in page.locator(".gsearch-group-label").all()]
    assert all("system design" in lbl.lower() or lbl == "" for lbl in labels), (
        f"Scoped search must only show system-design group, got {labels}"
    )


def test_scope_dropdown_all_wikis_restores_full_results(page, base_url):
    """Switching back to 'All wikis' restores full result set."""
    page.goto(f"{base_url}/#system-design")
    page.wait_for_selector("#view-index.active", timeout=10_000)

    _open_search(page)
    page.fill("#gsearch-input", "cache")
    page.wait_for_selector(".gsearch-result", timeout=8_000)
    count_all = page.locator(".gsearch-result").count()

    page.select_option("#gsearch-scope-select", "system-design")
    page.wait_for_function(
        f"() => document.querySelectorAll('.gsearch-result').length < {count_all}",
        timeout=5_000,
    )

    page.select_option("#gsearch-scope-select", "")
    page.wait_for_function(
        f"() => document.querySelectorAll('.gsearch-result').length === {count_all}",
        timeout=5_000,
    )
    count_restored = page.locator(".gsearch-result").count()

    assert count_restored == count_all, (
        f"Restoring 'All wikis' must return full count {count_all}, got {count_restored}"
    )


# ── Search result snippets ────────────────────────────────────────────


def test_result_snippet_appears(wiki_page):
    """Search results include a snippet element beneath the title."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "cache")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert wiki_page.locator(".gsearch-result-snippet").count() > 0, (
        "At least one result must render a .gsearch-result-snippet"
    )


def test_result_snippet_contains_highlight(wiki_page):
    """Snippet wraps the matched term in a <mark> element."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "cache")
    wiki_page.wait_for_selector(".gsearch-result-snippet", timeout=8_000)
    marks = wiki_page.locator(".gsearch-result-snippet mark.gsearch-highlight").count()
    assert marks > 0, "Snippet must highlight the matched term with mark.gsearch-highlight"


# ── Recent searches ───────────────────────────────────────────────────


def test_recent_searches_shown_on_empty_input(wiki_page):
    """Injected recent searches appear as chips when input is empty."""
    wiki_page.evaluate(
        "localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache', 'tree']))"
    )
    _open_search(wiki_page)
    wiki_page.wait_for_selector(".gsearch-recents", timeout=3_000)
    chips = wiki_page.locator(".gsearch-recent-query").all_text_contents()
    assert "cache" in chips and "tree" in chips, (
        f"Recent chips must show injected queries, got {chips}"
    )


def test_recent_search_chip_click_runs_query(wiki_page):
    """Clicking a recent chip populates the input and triggers search."""
    wiki_page.evaluate(
        "localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache']))"
    )
    _open_search(wiki_page)
    wiki_page.wait_for_selector(".gsearch-recent-query")
    wiki_page.locator(".gsearch-recent-query").first.click()
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    input_val = wiki_page.input_value("#gsearch-input")
    assert input_val == "cache", f"Input must be set to chip query, got '{input_val}'"
    assert wiki_page.locator(".gsearch-result").count() > 0


def test_recent_search_remove_button_removes_chip(wiki_page):
    """Clicking × on a chip removes it from the list and from localStorage."""
    wiki_page.evaluate(
        "localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache', 'tree']))"
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
        "JSON.parse(localStorage.getItem('wiki-recent-searches') || '[]')"
    )
    assert len(stored) == 1, f"localStorage must reflect removal, got {stored}"


def test_recent_searches_hidden_when_typing(wiki_page):
    """Recent chips are hidden once the user starts typing."""
    wiki_page.evaluate(
        "localStorage.setItem('wiki-recent-searches', JSON.stringify(['cache']))"
    )
    _open_search(wiki_page)
    wiki_page.wait_for_selector(".gsearch-recents")
    wiki_page.fill("#gsearch-input", "tree")
    wiki_page.wait_for_function(
        "() => document.querySelectorAll('.gsearch-recents').length === 0",
        timeout=5_000,
    )
    assert wiki_page.locator(".gsearch-recents").count() == 0, (
        "Recent chips must disappear once user is typing"
    )


# ── No-results fallback ───────────────────────────────────────────────


def test_no_results_fallback_shown(wiki_page):
    """A query with zero matches shows the no-results message."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "xyzzy_no_match_ever")
    wiki_page.wait_for_selector(".gsearch-no-results", timeout=8_000)
    text = wiki_page.locator(".gsearch-no-results").inner_text()
    assert "xyzzy_no_match_ever" in text, (
        f"No-results message must echo the query, got '{text}'"
    )


# ── Synonym expansion ─────────────────────────────────────────────────


def test_synonym_expansion_returns_results(wiki_page):
    """Querying a synonym term returns results via synonym expansion."""
    _open_search(wiki_page)
    # 'list' is a synonym of 'array' - should surface DSA/system-design articles
    wiki_page.fill("#gsearch-input", "list")
    wiki_page.wait_for_selector(".gsearch-result", timeout=8_000)
    assert wiki_page.locator(".gsearch-result").count() > 0, (
        "Synonym query 'list' must return results via synonym expansion"
    )


# ── Search input semantics ──────────────────────────────────────────


def test_search_input_has_inputmode_search(wiki_page):
    """gsearch-input must have inputmode=search for mobile keyboard hint."""
    result = wiki_page.evaluate(
        "document.getElementById('gsearch-input').getAttribute('inputmode')"
    )
    assert result == "search"


def test_search_input_has_enterkeyhint_search(wiki_page):
    """gsearch-input must have enterkeyhint=search."""
    result = wiki_page.evaluate(
        "document.getElementById('gsearch-input').getAttribute('enterkeyhint')"
    )
    assert result == "search"


# ── Find bar overflow on narrow screens ──────────────────────────────


def test_article_find_bar_fits_320px(wiki_page, base_url):
    """Find bar must not overflow viewport at 320px width."""
    wiki_page.set_viewport_size({"width": 320, "height": 568})
    wiki_page.goto(f"{base_url}/#system-design/caching")
    wiki_page.wait_for_selector("#view-content.active", timeout=10_000)
    wiki_page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )
    wiki_page.keyboard.press("/")
    wiki_page.wait_for_selector("#article-find:not(.hidden)")

    bar = wiki_page.locator("#article-find")
    box = bar.bounding_box()
    assert box is not None
    assert box["x"] >= 0, f"Find bar overflows left edge: x={box['x']}"
    assert box["x"] + box["width"] <= 320, f"Find bar overflows right edge: right={box['x'] + box['width']}"


# ── Find bar + sticky header overlap ─────────────────────────────────


def test_find_bar_clears_sticky_header(wiki_page, base_url):
    """Find bar top must be below sticky section header bottom when header is visible."""
    wiki_page.goto(f"{base_url}/#system-design/caching")
    wiki_page.wait_for_selector("#view-content.active", timeout=10_000)
    wiki_page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )

    wiki_page.keyboard.press("/")
    wiki_page.wait_for_selector("#article-find:not(.hidden)")

    wiki_page.evaluate("""() => {
        const banner = document.getElementById('sticky-section-header');
        if (banner) {
            banner.textContent = 'Test Section';
            banner.classList.add('visible');
            document.body.classList.add('sticky-header-visible');
        }
    }""")

    sticky = wiki_page.locator("#sticky-section-header")
    find_bar = wiki_page.locator("#article-find")

    sticky_box = sticky.bounding_box()
    find_box = find_bar.bounding_box()

    assert sticky_box is not None and find_box is not None
    sticky_bottom = sticky_box["y"] + sticky_box["height"]
    assert find_box["y"] >= sticky_bottom, (
        f"Find bar top ({find_box['y']}) overlaps sticky header bottom ({sticky_bottom})"
    )


# ── Search modal fits small viewport + results ───────────────────────


def test_search_modal_fits_small_viewport(wiki_page):
    """Search dialog and results must not overflow a 375x400 viewport."""
    wiki_page.set_viewport_size({"width": 375, "height": 400})
    wiki_page.locator("body").click()
    wiki_page.keyboard.press("Meta+k")
    wiki_page.wait_for_selector("#global-search-modal:not(.hidden)")

    dialog = wiki_page.locator(".gsearch-dialog")
    dialog.wait_for(state="visible", timeout=5_000)
    # The dialog's open animation translates it into place; wait for its rect to
    # stop moving (two consecutive rAFs at the same top) before measuring it.
    wiki_page.wait_for_function("""() => {
        const el = document.querySelector('.gsearch-dialog');
        if (!el) return false;
        return new Promise((resolve) => {
            const top1 = el.getBoundingClientRect().top;
            requestAnimationFrame(() => {
                const top2 = el.getBoundingClientRect().top;
                resolve(top1 === top2);
            });
        });
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

    wiki_page.fill("#gsearch-input", "array")
    wiki_page.wait_for_selector(".gsearch-result", state="attached", timeout=10_000)
    # Results list scrolls internally (overflow-y: auto) so its own box, not the
    # last of however many result rows match, must stay within the viewport.
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


# ── Custom scope dropdown ────────────────────────────────────────────


def test_scope_custom_dropdown(wiki_page):
    """Custom scope button opens listbox; selecting an option scopes results."""
    wiki_page.set_viewport_size({"width": 375, "height": 700})
    # Wait for media query and the 150ms resize-debounce in app.js to settle
    # before opening the search modal, or the debounce will close it.
    wiki_page.wait_for_function(
        "() => window.matchMedia('(max-width: 640px)').matches",
        timeout=3_000,
    )
    wiki_page.wait_for_timeout(200)
    wiki_page.locator("body").click()
    wiki_page.keyboard.press("Meta+k")
    wiki_page.wait_for_selector("#global-search-modal:not(.hidden)")

    wiki_page.fill("#gsearch-input", "array")
    wiki_page.wait_for_selector(".gsearch-result", state="attached", timeout=10_000)

    # At <=640px the custom scope button replaces the native select
    wiki_page.wait_for_function(
        "() => getComputedStyle(document.querySelector('.gsearch-scope-custom')).display !== 'none'",
        timeout=3_000,
    )
    scope_btn = wiki_page.locator(".gsearch-scope-btn")
    scope_btn.wait_for(state="visible", timeout=5_000)
    scope_btn.click()
    wiki_page.locator(".gsearch-scope-listbox:not(.hidden)").wait_for(state="visible", timeout=5_000)

    options = wiki_page.locator(".gsearch-scope-option")
    if options.count() > 1:
        options.nth(1).click()
        wiki_page.locator(".gsearch-dialog.scope-mode").wait_for(state="visible", timeout=5_000)
        assert "scope-mode" in (wiki_page.locator(".gsearch-dialog").get_attribute("class") or "")
