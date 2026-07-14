"""
- Import/Export JSON data backup in settings.
"""

import json


def _open_settings(page):
    page.locator("[title='Preferences (,)']").first.click()
    page.wait_for_function(
        "() => !document.getElementById('prefs-modal').classList.contains('hidden')"
    )
    page.locator("[data-action='prefs-tab'][data-tab='advanced']").click()
    page.wait_for_selector("#prefs-panel-advanced.active")


# ── Export ─────────────────────────────────────────────────────────────────────


def test_export_button_triggers_download(page, base_url):
    """Clicking 'Export Backup' triggers a file download."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _open_settings(page)

    with page.expect_download() as dl_info:
        page.locator("button:has-text('Export')").click()

    download = dl_info.value
    assert download.suggested_filename.startswith("wiki-backup-")
    assert download.suggested_filename.endswith(".json")


def test_export_json_contains_expected_keys(page, base_url):
    """Exported JSON contains version, bookmarks, recents, settings keys."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _open_settings(page)

    with page.expect_download() as dl_info:
        page.locator("button:has-text('Export')").click()

    download = dl_info.value
    path = download.path()
    with open(path) as f:
        data = json.load(f)

    assert data.get("version") == 1, "Export JSON missing version:1"
    for key in ("bookmarks", "recents", "settings"):
        assert key in data, f"Export JSON missing key: {key}"
    assert "read" not in data, "Export JSON should not have legacy 'read' key"


# ── Import ─────────────────────────────────────────────────────────────────────


def test_import_restores_settings(page, base_url):
    """Importing a valid v1 backup file restores settings to localStorage."""
    import os
    import tempfile

    backup = {
        "version": 1,
        "bookmarks": "[]",
        "recents": "[]",
        "settings": json.dumps(
            {
                "preset": "light",
                "theme": "light",
                "accentId": "emerald",
                "font": "Lora",
                "fontSize": "L",
                "contentWidth": "Wide",
            }
        ),
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
        json.dump(backup, tmp)
        tmp_path = tmp.name

    try:
        page.goto(f"{base_url}/", wait_until="domcontentloaded")
        page.wait_for_selector("#view-home.active", timeout=8_000)
        _open_settings(page)

        with page.expect_navigation(timeout=10_000):
            page.locator("#import-upload").set_input_files(tmp_path)

        page.wait_for_selector("#view-home.active", timeout=8_000)

        stored = page.evaluate(
            "() => JSON.parse(localStorage.getItem('wiki-settings') || 'null')"
        )
        assert stored is not None, "Settings not written after import"
        assert stored.get("font") == "Lora"
        assert stored.get("theme") == "light"
    finally:
        os.unlink(tmp_path)


def test_import_invalid_file_shows_toast(page, base_url):
    """Importing a non-JSON file shows a toast error, does not crash."""
    import os
    import tempfile

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
        tmp.write("not valid json {{{")
        tmp_path = tmp.name

    try:
        page.goto(f"{base_url}/", wait_until="domcontentloaded")
        page.wait_for_selector("#view-home.active", timeout=8_000)
        _open_settings(page)

        page.locator("#import-upload").set_input_files(tmp_path)
        page.wait_for_selector("#wiki-toast.visible", timeout=3000)

        toast_text = page.locator("#wiki-toast").inner_text()
        assert "invalid" in toast_text.lower() or "failed" in toast_text.lower(), (
            f"Toast did not show error message. Got: {toast_text}"
        )
    finally:
        os.unlink(tmp_path)


def _seed_local_data(page):
    """Seeds one localStorage key per clearable category, across two wikis."""
    page.evaluate(
        """() => {
        localStorage.setItem('wiki-bookmarks', JSON.stringify([
            {wikiId: 'system-design', path: 'a.md', slug: 'a', title: 'A'},
            {wikiId: 'dsa', path: 'b.md', slug: 'b', title: 'B'},
        ]));
        localStorage.setItem('wiki-recents', JSON.stringify([
            {wikiId: 'system-design', path: 'a.md', slug: 'a', title: 'A', visitedAt: Date.now()},
            {wikiId: 'dsa', path: 'b.md', slug: 'b', title: 'B', visitedAt: Date.now()},
        ]));
        localStorage.setItem('wiki-read-system-design', JSON.stringify(['a.md']));
        localStorage.setItem('wiki-read-dsa', JSON.stringify(['b.md']));
        localStorage.setItem('wiki-notes-system-design-a', 'note a');
        localStorage.setItem('wiki-notes-dsa-b', 'note b');
        localStorage.setItem('wiki-highlights-system-design-a', JSON.stringify([{id: 'h1'}]));
        localStorage.setItem('wiki-highlights-dsa-b', JSON.stringify([{id: 'h2'}]));
        localStorage.setItem('wiki-recent-searches', JSON.stringify(['caching']));
        localStorage.setItem('wiki-pinned-wikis', JSON.stringify(['system-design']));
    }"""
    )


# ── Selective data clear ──────────────────────────────────────────────────────


def test_data_clear_checklist_renders_expected_categories(page, base_url):
    """The Clear Data checklist renders one checkbox per data category."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _open_settings(page)

    checkboxes = page.locator(".data-clear-checkbox")
    expect_count = checkboxes.count()
    assert expect_count >= 9, f"Expected at least 9 data categories, got {expect_count}"

    labels = page.locator(".data-clear-item span").all_inner_texts()
    for expected in ["Bookmarks", "Recents", "Read history", "Recent searches", "Pinned wikis"]:
        assert expected in labels, f"Missing category label: {expected}"


def test_data_clear_button_disabled_until_category_selected(page, base_url):
    """'Clear selected data' stays disabled until at least one checkbox is checked."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _open_settings(page)

    clear_btn = page.locator("#data-clear-btn")
    assert clear_btn.is_disabled()

    page.locator(".data-clear-checkbox[value='bookmarks']").check()
    assert not clear_btn.is_disabled()


def test_data_clear_requires_confirm_before_deleting(page, base_url):
    """Clicking 'Clear selected data' shows a confirm step; data isn't deleted yet."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_local_data(page)
    _open_settings(page)

    page.locator(".data-clear-checkbox[value='bookmarks']").check()
    page.locator("#data-clear-btn").click()

    page.wait_for_selector("#data-clear-confirm:not(.hidden)")
    stored = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    assert stored is not None and "system-design" in stored, (
        "Data was deleted before confirm was clicked"
    )

    page.locator("[data-action='data-clear-cancel']").click()
    page.wait_for_selector("#data-clear-confirm.hidden", state="attached")
    stored_after_cancel = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    assert stored_after_cancel == stored, "Cancel should not alter data"


def test_data_clear_global_removes_only_selected_category(page, base_url):
    """Confirming a global clear of one category removes only that category's keys."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_local_data(page)
    _open_settings(page)

    page.locator(".data-clear-checkbox[value='bookmarks']").check()
    page.locator("#data-clear-btn").click()
    page.wait_for_selector("#data-clear-confirm:not(.hidden)")
    page.locator("[data-action='data-clear-confirm']").click()

    page.wait_for_selector("#wiki-toast.visible", timeout=3000)

    bookmarks = page.evaluate("() => localStorage.getItem('wiki-bookmarks')")
    assert bookmarks in (None, "[]"), f"Bookmarks not cleared: {bookmarks}"

    recents = page.evaluate("() => localStorage.getItem('wiki-recents')")
    assert recents is not None and "system-design" in recents, "Recents should be untouched"

    notes = page.evaluate("() => localStorage.getItem('wiki-notes-system-design-a')")
    assert notes == "note a", "Notes should be untouched"


def test_data_clear_confirm_resets_checkbox_state(page, base_url):
    """After a confirmed clear, checkboxes reset and the button disables again."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_local_data(page)
    _open_settings(page)

    page.locator(".data-clear-checkbox[value='recentSearches']").check()
    page.locator("#data-clear-btn").click()
    page.wait_for_selector("#data-clear-confirm:not(.hidden)")
    page.locator("[data-action='data-clear-confirm']").click()

    page.wait_for_selector("#wiki-toast.visible", timeout=3000)
    expect_unchecked = page.locator(".data-clear-checkbox[value='recentSearches']")
    assert not expect_unchecked.is_checked()
    assert page.locator("#data-clear-btn").is_disabled()


def test_data_clear_wiki_scoped_affects_only_selected_wiki(page, base_url):
    """Scoping the clear to one wiki leaves the other wiki's data intact."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_local_data(page)
    _open_settings(page)

    page.locator("#data-clear-scope").select_option("system-design")
    page.locator(".data-clear-checkbox[value='notes']").check()
    page.locator("#data-clear-btn").click()
    page.wait_for_selector("#data-clear-confirm:not(.hidden)")
    page.locator("[data-action='data-clear-confirm']").click()
    page.wait_for_selector("#wiki-toast.visible", timeout=3000)

    sd_notes = page.evaluate("() => localStorage.getItem('wiki-notes-system-design-a')")
    dsa_notes = page.evaluate("() => localStorage.getItem('wiki-notes-dsa-b')")
    assert sd_notes is None, "system-design notes should be cleared"
    assert dsa_notes == "note b", "dsa notes should be untouched by a system-design-scoped clear"


def test_data_clear_global_only_category_ignores_wiki_scope(page, base_url):
    """Pinned wikis (global-only) clears fully even when a specific wiki is selected."""
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    _seed_local_data(page)
    _open_settings(page)

    page.locator("#data-clear-scope").select_option("dsa")
    page.locator(".data-clear-checkbox[value='pinnedWikis']").check()
    page.locator("#data-clear-btn").click()
    page.wait_for_selector("#data-clear-confirm:not(.hidden)")
    page.locator("[data-action='data-clear-confirm']").click()
    page.wait_for_selector("#wiki-toast.visible", timeout=3000)

    pinned = page.evaluate("() => localStorage.getItem('wiki-pinned-wikis')")
    assert pinned in (None, "[]"), (
        f"Pinned wikis should clear fully regardless of wiki scope, got: {pinned}"
    )


def test_import_version_mismatch_shows_warning_toast(page, base_url):
    """Importing a backup with unknown version shows a warning toast with undo/confirm."""
    import os
    import tempfile

    backup = {
        "version": 99,
        "bookmarks": "[]",
        "recents": "[]",
        "settings": "{}",
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
        json.dump(backup, tmp)
        tmp_path = tmp.name

    try:
        page.goto(f"{base_url}/", wait_until="domcontentloaded")
        page.wait_for_selector("#view-home.active", timeout=8_000)
        _open_settings(page)

        page.locator("#import-upload").set_input_files(tmp_path)
        page.wait_for_selector("#wiki-toast.visible", timeout=3000)

        toast_text = page.locator("#wiki-toast").inner_text()
        assert "version" in toast_text.lower() or "format" in toast_text.lower(), (
            f"Toast did not show version warning. Got: {toast_text}"
        )
        # Undo button = "Import anyway" callback
        assert page.locator(".toast-undo-btn").is_visible()
    finally:
        os.unlink(tmp_path)
