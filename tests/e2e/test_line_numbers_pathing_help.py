"""Code-block line numbers, link path resolution, and the ? shortcuts panel."""

# Dropped: clear-recents/bookmarks undo toast - no per-section clear control exists (see test_recents.py, test_bookmarks.py).
# Dropped: prefs open/close/backdrop mechanics - covered by test_settings.py and Modal.test.tsx.

import pytest


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
    """Code blocks with >= 3 lines get .has-line-numbers on the pre element."""
    _go_to_article(page, base_url)
    count = page.evaluate(
        "() => document.querySelectorAll('pre.has-line-numbers').length"
    )
    assert count > 0, "Expected at least one pre.has-line-numbers in article"


def test_code_lines_have_counter_spans(page, base_url):
    """Each numbered block contains .code-line spans."""
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
    """In dark theme the code block takes Shiki's github-dark background."""
    _go_to_article(page, base_url)
    bg = _pre_bg(page, "dark")
    assert bg == _SHIKI_DARK_BG, f"Expected Shiki dark bg {_SHIKI_DARK_BG}, got: {bg!r}"


def test_pre_background_light_theme_differs(page, base_url):
    """In light theme the code block must not keep the dark background."""
    _go_to_article(page, base_url)
    bg = _pre_bg(page, "light")
    assert bg != _SHIKI_DARK_BG, f"Light theme code block must not use dark background, got: {bg!r}"


def test_short_code_blocks_no_line_numbers(page, base_url):
    """Code blocks with < 3 lines do NOT get line numbers."""
    _go_to_article(page, base_url)
    # Confirm has-line-numbers only appears on blocks with >= 3 lines
    numbered = page.evaluate(
        """() => Array.from(document.querySelectorAll('pre.has-line-numbers code')).every(
            code => code.textContent.split('\\n').filter(l => l !== '').length >= 3
        )"""
    )
    assert numbered, (
        "has-line-numbers should only appear on code blocks with >= 3 lines"
    )


def test_mermaid_blocks_no_line_numbers(page, base_url):
    """Mermaid source blocks never get line numbers."""
    _go_to_article(page, base_url)
    assert page.locator("pre.mermaid.has-line-numbers").count() == 0


def test_multiline_highlight_span_not_corrupted(page, base_url):
    """A token spanning several lines keeps balanced span tags per .code-line."""
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


# ── Multi-level path resolution ─────────────────────────────────


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_link_with_fragment_is_intercepted(page, base_url):
    """Internal .md links with a #anchor suffix keep the article slug and ?a= fragment."""
    page.route(
        "**/source.md",
        lambda r: r.fulfill(body="# Source\n\n[Jump](./target.md#section-1)"),
    )

    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=8_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.evaluate(
        """() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/source.md'),
        'Source', 'source')"""
    )
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )

    link = page.locator("#markdown-body a:has-text('Jump')")
    assert "wiki-link-article" in (link.get_attribute("class") or "")
    assert link.get_attribute("target") == "_blank"
    href = link.get_attribute("href") or ""
    assert "system-design/target" in href
    assert "a=section-1" in href


@pytest.mark.skip(reason="e2e-modernization epic — mock-article rewrite")
def test_excess_dotdot_does_not_crash(page, base_url):
    """A link with more .. than depth doesn't throw a JS error."""
    page.route(
        "**/source.md",
        lambda r: r.fulfill(body="# Source\n\n[Deep](../../../../target.md)"),
    )
    page.route("**/target.md", lambda r: r.fulfill(body="# Target\n\nOK."))

    page.goto(f"{base_url}/", wait_until="domcontentloaded")
    page.wait_for_selector("#view-home.active", timeout=10_000)
    page.wait_for_function("() => typeof window.navigateToContent === 'function'", timeout=8_000)
    page.evaluate(
        """() => navigateToContent(
        'system-design',
        encodeURIComponent('../content/system-design/source.md'),
        'Source', 'source')"""
    )
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_function(
        "() => !!document.querySelector('#markdown-body[data-render-done]')",
        timeout=10_000,
    )

    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.locator("text='Deep'").click()
    page.wait_for_timeout(200)
    assert not errors, f"Excess .. caused JS errors: {errors}"


# ── Preferences modal (? hotkey) ─────────────────────────────────


def test_question_mark_opens_prefs_keyboard_tab(page, base_url):
    """Pressing ? opens Preferences on the Shortcuts tab."""
    dialog = _open_shortcuts(page, base_url)
    assert dialog.get_by_role("tab", name="Shortcuts").get_attribute("aria-selected") == "true"


def test_prefs_keyboard_tab_contains_shortcuts(page, base_url):
    """Shortcuts tab lists at least the ⌘K and ? shortcuts."""
    text = _open_shortcuts(page, base_url).inner_text()
    assert "⌘K" in text, "Shortcuts tab should mention ⌘K"
    assert "?" in text, "Shortcuts tab should mention ?"


def test_prefs_keyboard_tab_shows_index_and_content_groups(page, base_url):
    """Shortcuts tab renders Global, Index and Content groups from shortcuts.json."""
    labels = [t.upper() for t in _open_shortcuts(page, base_url).locator(".help-group-label").all_inner_texts()]
    for group in ("GLOBAL", "INDEX", "CONTENT"):
        assert group in labels, f"Missing '{group}' group, got {labels}"


def test_prefs_keyboard_tab_shows_search_group(page, base_url):
    """Search-modal bindings get their own group."""
    text = _open_shortcuts(page, base_url).inner_text().upper()
    assert "SEARCH" in text
    assert "FILTER RESULTS TO ONE SECTION" in text


def test_prefs_keyboard_tab_always_shows_touch_gestures(page, base_url):
    """Shortcuts tab always includes the touch-gesture group, regardless of pointer type."""
    text = _open_shortcuts(page, base_url).inner_text().upper()
    for phrase in ("SWIPE LEFT FROM EDGE", "SWIPE DOWN", "SWIPE RIGHT ON ARTICLE CARD"):
        assert phrase in text, f"Touch group should mention {phrase!r}"


def test_prefs_focus_trapped_on_open(page, base_url):
    """Focus lands inside Preferences when opened via ?."""
    dialog = _open_shortcuts(page, base_url)
    assert dialog.evaluate("el => el.contains(document.activeElement)")
