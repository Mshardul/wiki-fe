"""
Per-article notes scratchpad:
- text persists to localStorage keyed by wiki+article path
- text restored when revisiting the article
- collapse toggle persists per wiki
- terminal restyle: monospace input, $ gutter present
"""

import pytest


@pytest.fixture
def content_page(page, base_url):
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#view-content.active", timeout=10_000)
    page.wait_for_selector("#markdown-body[data-render-done]", timeout=10_000)
    page.wait_for_selector("#notes-scratchpad-input", timeout=5_000)
    return page


def test_notes_saved_to_localstorage(content_page, base_url):
    """Typing in the scratchpad persists the text to localStorage under a
    wiki+path-scoped key."""
    page = content_page
    page.locator("#notes-scratchpad-input").fill("remember to review this section")
    page.wait_for_timeout(400)  # debounce

    saved = page.evaluate("""() => {
        const key = Object.keys(localStorage).find(k => k.startsWith('wiki-notes-'));
        return key ? localStorage.getItem(key) : null;
    }""")
    assert saved == "remember to review this section"


def test_notes_restored_on_revisit(content_page, base_url):
    """Notes written on an article are shown again when navigating back to it."""
    page = content_page
    page.locator("#notes-scratchpad-input").fill("a note that should persist")
    page.wait_for_timeout(400)

    page.goto(f"{base_url}/#system-design", wait_until="domcontentloaded")
    page.wait_for_selector("#view-index.active", timeout=5_000)
    page.goto(f"{base_url}/#system-design/caching", wait_until="domcontentloaded")
    page.wait_for_selector("#notes-scratchpad-input", timeout=10_000)

    value = page.locator("#notes-scratchpad-input").input_value()
    assert value == "a note that should persist"


def test_notes_cleared_removes_localstorage_key(content_page, base_url):
    """Clearing the textarea removes the localStorage entry rather than
    persisting an empty string."""
    page = content_page
    page.locator("#notes-scratchpad-input").fill("temp")
    page.wait_for_timeout(400)
    page.locator("#notes-scratchpad-input").fill("")
    page.wait_for_timeout(400)

    has_key = page.evaluate(
        "() => Object.keys(localStorage).some(k => k.startsWith('wiki-notes-'))"
    )
    assert not has_key, "empty notes should not leave a localStorage key behind"


def test_notes_collapse_toggle_hides_input(content_page, base_url):
    """Clicking the collapse toggle hides the textarea and persists collapsed
    state."""
    page = content_page
    page.locator("#notes-scratchpad-toggle").click()
    page.wait_for_function(
        "() => document.getElementById('notes-scratchpad')"
        ".classList.contains('notes-scratchpad--collapsed')",
        timeout=3_000,
    )
    assert not page.locator("#notes-scratchpad-input").is_visible()


def test_notes_input_uses_monospace_font(content_page, base_url):
    """Terminal restyle: the scratchpad textarea renders in a monospace font."""
    page = content_page
    font_family = page.evaluate(
        "() => getComputedStyle(document.getElementById('notes-scratchpad-input')).fontFamily"
    )
    assert "mono" in font_family.lower(), f"Expected a monospace font, got: {font_family}"


def test_notes_gutter_dollar_sign_present(content_page, base_url):
    """Terminal restyle: a $ gutter glyph is rendered next to the textarea."""
    page = content_page
    content = page.evaluate("""() => {
        const body = document.querySelector('.notes-scratchpad-body');
        return getComputedStyle(body, '::before').content;
    }""")
    assert "$" in content, f"Expected '$' gutter glyph, got: {content}"
