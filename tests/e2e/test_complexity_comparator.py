"""
Complexity comparator (WIKI-090):
- Opening/closing the comparator modal
- Picking 2+ data structures and rendering a merged Big-O matrix
- Picker constraints (max picks, compare button gating)
"""

DIALOG = '[role="dialog"][aria-label="Complexity comparator"]'


def _go_to_article(page, base_url, slug="dsa/data-structures/array"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _open_comparator(page):
    page.keyboard.press(",")
    page.wait_for_selector('[role="dialog"][aria-label="Preferences"]', timeout=3_000)
    page.locator('[data-action="prefs-tab"][data-tab="actions"]').click()
    page.locator('[data-action="complexity-compare-open"]').click()
    page.wait_for_selector(DIALOG, timeout=3_000)


def _close_via_button(page):
    page.locator("#compare-close").click()
    page.wait_for_selector(DIALOG, state="detached", timeout=2_000)


def test_open_comparator_from_content(page, base_url):
    """Comparator opens from prefs Actions and lists data structures."""
    _go_to_article(page, base_url)
    _open_comparator(page)
    page.wait_for_function(
        "() => document.querySelectorAll('#compare-picker-list .compare-picker-item').length > 0",
        timeout=5_000,
    )


def test_close_button_closes_comparator(page, base_url):
    """Clicking the close button closes the comparator modal."""
    _go_to_article(page, base_url)
    _open_comparator(page)
    _close_via_button(page)


def test_overlay_click_closes_comparator(page, base_url):
    """Clicking the backdrop closes the comparator modal."""
    _go_to_article(page, base_url)
    _open_comparator(page)
    # Modal backdrop is the outer .link-graph-modal presentation layer.
    page.locator(".link-graph-modal").click(position={"x": 5, "y": 5}, force=True)
    page.wait_for_selector(DIALOG, state="detached", timeout=2_000)


def test_compare_button_disabled_below_two_picks(page, base_url):
    """Compare button stays disabled with fewer than 2 structures picked."""
    _go_to_article(page, base_url)
    _open_comparator(page)
    page.wait_for_function(
        "() => document.querySelectorAll('#compare-picker-list .compare-picker-item').length > 0",
        timeout=5_000,
    )
    assert page.locator("#compare-run-btn").is_disabled()

    page.locator("#compare-picker-list input[type=checkbox]").first.check()
    assert page.locator("#compare-run-btn").is_disabled()


def test_picking_two_structures_renders_merged_matrix(page, base_url):
    """Picking 2 structures and clicking Compare renders a merged complexity table."""
    _go_to_article(page, base_url)
    _open_comparator(page)
    page.wait_for_function(
        "() => document.querySelectorAll('#compare-picker-list .compare-picker-item').length > 0",
        timeout=5_000,
    )

    checkboxes = page.locator("#compare-picker-list input[type=checkbox]")
    checkboxes.nth(0).check()
    checkboxes.nth(1).check()
    assert page.locator("#compare-run-btn").is_enabled()

    page.locator("#compare-run-btn").click()
    page.wait_for_selector(".complexity-compare-table", timeout=10_000)

    header_cells = page.locator(".complexity-compare-table thead tr").first.locator("th")
    assert header_cells.count() >= 3  # "Operation" + at least 2 structure columns


def test_picker_search_filters_structures(page, base_url):
    """Typing in the picker search input filters the structure list."""
    _go_to_article(page, base_url)
    _open_comparator(page)
    page.wait_for_function(
        "() => document.querySelectorAll('#compare-picker-list .compare-picker-item').length > 0",
        timeout=5_000,
    )
    total = page.locator("#compare-picker-list .compare-picker-item").count()

    page.locator("#compare-search-input").fill("hash table")
    page.wait_for_function(
        "(total) => document.querySelectorAll('#compare-picker-list .compare-picker-item').length < total",
        arg=total,
        timeout=3_000,
    )


def test_transient_load_failure_does_not_stick(page, base_url):
    """A transient search-index fetch failure on first open doesn't permanently cache an empty list."""
    page.route(
        "**/data/search-index.json",
        lambda route: route.fulfill(status=500, body="fail"),
        times=1,
    )
    _go_to_article(page, base_url)
    _open_comparator(page)
    page.wait_for_timeout(300)
    assert page.locator("#compare-picker-list .compare-picker-item").count() == 0
    _close_via_button(page)

    _open_comparator(page)
    page.wait_for_function(
        "() => document.querySelectorAll('#compare-picker-list .compare-picker-item').length > 0",
        timeout=5_000,
    )


def test_comparator_picks_reset_between_sessions(page, base_url):
    """Reopening the comparator clears prior checkbox selections."""
    _go_to_article(page, base_url)
    _open_comparator(page)
    page.wait_for_function(
        "() => document.querySelectorAll('#compare-picker-list .compare-picker-item').length > 0",
        timeout=5_000,
    )
    page.locator("#compare-picker-list input[type=checkbox]").first.check()
    _close_via_button(page)

    _open_comparator(page)
    checked = page.evaluate(
        "() => document.querySelectorAll('#compare-picker-list input[type=checkbox]:checked').length"
    )
    assert checked == 0, f"expected no checked picks after reopen, got {checked}"
