"""
- ↑/↓ keyboard navigation in search results + Enter to select
- visited stubs excluded from ⌘K results (search no longer fetches articles on load)
- search input debounce (150ms)
- result count badge
- load-failure error state + retry
- section-filter mode indicator
"""


def _open_search(page):
    page.keyboard.press("Meta+k")
    page.wait_for_selector("#global-search-modal:not(.hidden)")
    page.wait_for_selector("#gsearch-input")


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
    wiki_page.wait_for_timeout(200)

    wiki_page.keyboard.press("ArrowDown")
    wiki_page.wait_for_selector(".gsearch-result.selected")
    first = wiki_page.locator(".gsearch-result.selected").first.inner_text()

    wiki_page.keyboard.press("ArrowDown")
    wiki_page.wait_for_selector(".gsearch-result.selected")
    second = wiki_page.locator(".gsearch-result.selected").first.inner_text()

    assert first != second


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
    wiki_page.wait_for_timeout(1_000)

    titles = [r.inner_text() for r in wiki_page.locator(".gsearch-result").all()]
    assert all("api gateway" not in t.lower() for t in titles), (
        f"Visited stub still appeared in results: {titles}"
    )


def test_search_does_not_fetch_articles_for_stub_detection(wiki_page):
    """WIKI-222: opening search must not fetch article .md bodies just to detect stubs."""
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

    # Debounce fires at 150ms — wait well past it
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

    # Type 7 chars with 0ms delay — without debounce this would trigger 7 updates
    for char in "caching":
        wiki_page.type("#gsearch-input", char, delay=0)

    # Wait for debounce + render to settle
    wiki_page.wait_for_timeout(400)

    updates = wiki_page.evaluate("() => window._resultUpdates ?? 0")
    # With 150ms debounce, rapid typing produces far fewer updates than keystrokes
    assert updates < 7, f"Expected debounced updates (<7) but got {updates}"


# ── Result count badge (WIKI-166) ─────────────────────────────────


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
    wiki_page.wait_for_timeout(300)  # past debounce

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
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")

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
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")

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
    page.goto(f"{base_url}/")
    page.wait_for_load_state("networkidle")

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
    wiki_page.wait_for_timeout(300)  # past debounce

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
    wiki_page.wait_for_timeout(300)
    wiki_page.fill("#gsearch-input", "caching")
    wiki_page.wait_for_timeout(300)

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


def test_placeholder_does_not_rotate_while_typing(wiki_page):
    """Hints never overwrite the placeholder once the user has typed text."""
    _open_search(wiki_page)
    wiki_page.fill("#gsearch-input", "cache")
    wiki_page.wait_for_timeout(_PLACEHOLDER_ROTATE_MS + 500)
    placeholder = wiki_page.locator("#gsearch-input").get_attribute("placeholder")
    assert not placeholder.startswith("try:"), (
        "Placeholder should not rotate to a hint while the input has a value"
    )


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
    page.wait_for_timeout(300)

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

    (The browser's native find may run instead — we only assert our modal
    does not enter scope-mode.)"""
    page.goto(f"{base_url}/")
    page.wait_for_selector("#view-home.active", timeout=5_000)

    page.keyboard.press("Meta+f")
    page.wait_for_timeout(300)

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


def test_slash_opens_article_find_bar(page, base_url):
    """Pressing '/' in an article opens the in-article find bar focused."""
    _open_article(page, base_url)
    page.keyboard.press("/")
    page.wait_for_selector("#article-find:not(.hidden)", timeout=3_000)
    focused_id = page.evaluate("() => document.activeElement?.id")
    assert focused_id == "article-find-input", (
        f"Find input must be focused on open, active = {focused_id}"
    )


def test_article_find_highlights_matches(page, base_url):
    """Typing in the find bar wraps matches in mark.article-find-hit."""
    _open_article(page, base_url)
    page.keyboard.press("/")
    page.wait_for_selector("#article-find:not(.hidden)")
    page.fill("#article-find-input", "cache")
    page.wait_for_selector("#markdown-body mark.article-find-hit", timeout=3_000)
    assert page.locator("#markdown-body mark.article-find-hit").count() > 0
    # One match is the current (focused) hit.
    assert page.locator("mark.article-find-hit--current").count() == 1


def test_article_find_count_and_cycle(page, base_url):
    """Enter cycles to the next match and the count reflects position."""
    _open_article(page, base_url)
    page.keyboard.press("/")
    page.wait_for_selector("#article-find:not(.hidden)")
    page.fill("#article-find-input", "cache")
    page.wait_for_selector("#markdown-body mark.article-find-hit", timeout=3_000)

    count_text = page.locator("#article-find-count").inner_text()
    assert "/" in count_text, f"Count must read 'i/N', got '{count_text}'"
    first_pos = count_text.split("/")[0]

    total = int(count_text.split("/")[1])
    if total > 1:
        page.keyboard.press("Enter")
        page.wait_for_timeout(100)
        new_pos = page.locator("#article-find-count").inner_text().split("/")[0]
        assert new_pos != first_pos, "Enter must advance the current match index"


def test_article_find_escape_closes_and_clears(page, base_url):
    """Escape closes the find bar and removes all highlight marks."""
    _open_article(page, base_url)
    page.keyboard.press("/")
    page.wait_for_selector("#article-find:not(.hidden)")
    page.fill("#article-find-input", "cache")
    page.wait_for_selector("#markdown-body mark.article-find-hit", timeout=3_000)

    page.keyboard.press("Escape")
    page.wait_for_selector("#article-find.hidden", state="attached", timeout=3_000)
    assert page.locator("#markdown-body mark.article-find-hit").count() == 0, (
        "Closing find must strip all highlight marks"
    )
