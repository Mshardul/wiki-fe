"""Code-block line numbers and the ? shortcuts panel."""


def _go_to_article(page, base_url, slug="system-design/components/caching"):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#markdown-body", timeout=10_000)


def _open_shortcuts(page, base_url):
    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector(".home-main .wiki-card", timeout=10_000)
    page.keyboard.press("?")
    dialog = page.locator('[role="dialog"][aria-label="Preferences"]')
    dialog.locator(".help-group").first.wait_for(timeout=5_000)
    return dialog


# ── Line numbers ─────────────────────────────────────────────────


def test_code_blocks_have_line_numbers(page, base_url):
    _go_to_article(page, base_url)
    count = page.evaluate(
        "() => document.querySelectorAll('pre.has-line-numbers').length"
    )
    assert count > 0, "Expected at least one pre.has-line-numbers in article"


def test_code_lines_have_counter_spans(page, base_url):
    _go_to_article(page, base_url)
    count = page.evaluate(
        "() => document.querySelectorAll('pre.has-line-numbers .code-line').length"
    )
    assert count > 0, "Expected .code-line spans inside numbered code blocks"


_SHIKI_DARK_BG = "rgb(36, 41, 46)"


def _pre_bg(page, theme):
    page.evaluate(f"() => document.documentElement.setAttribute('data-theme', '{theme}')")
    return page.evaluate(
        "() => getComputedStyle(document.querySelector('#markdown-body pre.shiki')).backgroundColor"
    )


def test_pre_background_dark_theme(page, base_url):
    _go_to_article(page, base_url)
    bg = _pre_bg(page, "dark")
    assert bg == _SHIKI_DARK_BG, f"Expected Shiki dark bg {_SHIKI_DARK_BG}, got: {bg!r}"


def test_pre_background_light_theme_differs(page, base_url):
    _go_to_article(page, base_url)
    bg = _pre_bg(page, "light")
    assert bg != _SHIKI_DARK_BG, f"Light theme code block must not use dark background, got: {bg!r}"


def test_short_code_blocks_no_line_numbers(page, base_url):
    _go_to_article(page, base_url)
    numbered = page.evaluate(
        """() => Array.from(document.querySelectorAll('pre.has-line-numbers code')).every(
            code => code.textContent.split('\\n').filter(l => l !== '').length >= 3
        )"""
    )
    assert numbered, (
        "has-line-numbers should only appear on code blocks with >= 3 lines"
    )


def test_mermaid_blocks_no_line_numbers(page, base_url):
    _go_to_article(page, base_url)
    assert page.locator("pre.mermaid.has-line-numbers").count() == 0


def test_multiline_highlight_span_not_corrupted(page, base_url):
    _go_to_article(page, base_url, slug="dsa/algorithms/bfs")
    counts = page.evaluate(
        """() => Array.from(document.querySelectorAll('pre.has-line-numbers .code-line')).map(
            el => ({ open: (el.innerHTML.match(/<span/g) || []).length,
                     close: (el.innerHTML.match(/<\\/span>/g) || []).length })
        )"""
    )
    assert counts, "Expected numbered code-line spans in bfs"
    for c in counts:
        assert c["open"] == c["close"], f"Unbalanced span tags in a code-line: {c}"


# ── Preferences modal (? hotkey) ─────────────────────────────────


def test_question_mark_opens_prefs_keyboard_tab(page, base_url):
    dialog = _open_shortcuts(page, base_url)
    assert dialog.get_by_role("tab", name="Shortcuts").get_attribute("aria-selected") == "true"


def test_prefs_keyboard_tab_contains_shortcuts(page, base_url):
    text = _open_shortcuts(page, base_url).inner_text()
    assert "⌘K" in text, "Shortcuts tab should mention ⌘K"
    assert "?" in text, "Shortcuts tab should mention ?"


def test_prefs_keyboard_tab_shows_index_and_content_groups(page, base_url):
    labels = [t.upper() for t in _open_shortcuts(page, base_url).locator(".help-group-label").all_inner_texts()]
    for group in ("GLOBAL", "INDEX", "CONTENT"):
        assert group in labels, f"Missing '{group}' group, got {labels}"


def test_prefs_keyboard_tab_shows_search_group(page, base_url):
    text = _open_shortcuts(page, base_url).inner_text().upper()
    assert "SEARCH" in text
    assert "FILTER RESULTS TO ONE SECTION" in text


def test_prefs_keyboard_tab_always_shows_touch_gestures(page, base_url):
    text = _open_shortcuts(page, base_url).inner_text().upper()
    for phrase in ("SWIPE LEFT FROM EDGE", "SWIPE DOWN", "SWIPE RIGHT ON ARTICLE CARD"):
        assert phrase in text, f"Touch group should mention {phrase!r}"


def test_prefs_focus_trapped_on_open(page, base_url):
    dialog = _open_shortcuts(page, base_url)
    assert dialog.evaluate("el => el.contains(document.activeElement)")
