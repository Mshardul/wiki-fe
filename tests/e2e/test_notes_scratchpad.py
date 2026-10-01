"""
Per-article notes scratchpad:
- text persists to localStorage keyed by wiki+article path
- text restored when revisiting the article
- collapse toggle persists per wiki
- terminal restyle: monospace input, $ gutter present
"""

SLUG = "system-design/components/caching"
OTHER = "system-design/components/load-balancer"


def _article(page, base_url, slug=SLUG):
    page.goto(f"{base_url}/{slug}/", wait_until="domcontentloaded")
    page.wait_for_selector("#notes-scratchpad-input", timeout=10_000)
    return page


def test_notes_saved_to_localstorage(page, base_url):
    """Typing in the scratchpad persists the text to localStorage under a
    wiki+path-scoped key."""
    _article(page, base_url)
    page.locator("#notes-scratchpad-input").fill("remember to review this section")
    page.wait_for_timeout(400)  # debounce

    saved = page.evaluate("""() => {
        const key = Object.keys(localStorage).find(k => k.startsWith('wiki-notes-'));
        return key ? localStorage.getItem(key) : null;
    }""")
    assert saved == "remember to review this section"


def test_notes_restored_on_revisit(page, base_url):
    """Notes written on an article are shown again when navigating back to it."""
    _article(page, base_url)
    page.locator("#notes-scratchpad-input").fill("a note that should persist")
    page.wait_for_timeout(400)

    page.goto(f"{base_url}/system-design/", wait_until="domcontentloaded")
    page.wait_for_selector(".index-main, .wiki-index", timeout=5_000)
    _article(page, base_url)

    value = page.locator("#notes-scratchpad-input").input_value()
    assert value == "a note that should persist"


def test_notes_cleared_removes_localstorage_key(page, base_url):
    """Clearing the textarea removes the localStorage entry rather than
    persisting an empty string."""
    _article(page, base_url)
    page.locator("#notes-scratchpad-input").fill("temp")
    page.wait_for_timeout(400)
    page.locator("#notes-scratchpad-input").fill("")
    page.wait_for_timeout(400)

    has_key = page.evaluate(
        "() => Object.keys(localStorage).some(k => k.startsWith('wiki-notes-') && !k.includes('collapsed'))"
    )
    assert not has_key, "empty notes should not leave a localStorage key behind"


def test_notes_collapse_toggle_hides_input(page, base_url):
    """Clicking the collapse toggle hides the textarea and persists collapsed
    state."""
    _article(page, base_url)
    page.locator("#notes-scratchpad-toggle").click()
    page.wait_for_function(
        "() => document.querySelector('.notes-scratchpad')"
        ".classList.contains('notes-scratchpad--collapsed')",
        timeout=3_000,
    )
    assert not page.locator("#notes-scratchpad-input").is_visible()


def test_notes_input_uses_monospace_font(page, base_url):
    """Terminal restyle: the scratchpad textarea renders in a monospace font."""
    _article(page, base_url)
    font_family = page.evaluate(
        "() => getComputedStyle(document.getElementById('notes-scratchpad-input')).fontFamily"
    )
    assert "mono" in font_family.lower(), f"Expected a monospace font, got: {font_family}"


def test_notes_not_wiped_by_fast_navigation(page, base_url):
    """Navigating away before the debounce fires must keep the previous note.
    The save captures textarea value at input time, not from the later DOM."""
    _article(page, base_url)
    page.locator("#notes-scratchpad-input").fill("first article note")
    # Navigate away immediately, well before the 300ms debounce fires.
    page.goto(f"{base_url}/{OTHER}/", wait_until="domcontentloaded")
    page.wait_for_selector("#notes-scratchpad-input", timeout=10_000)
    page.wait_for_timeout(400)  # let the stale timer (if any) fire

    saved = page.evaluate("""() => {
        const key = Object.keys(localStorage).find(
            k => k.startsWith('wiki-notes-') && k.includes('caching')
        );
        return key ? localStorage.getItem(key) : null;
    }""")
    assert saved == "first article note", (
        f"expected the caching article's note to survive fast navigation, got: {saved!r}"
    )


def test_notes_flush_survives_navigate_and_retype(page, base_url):
    """Typing on the next article before the prior debounce fires must not
    clearTimeout-away the previous article's pending save."""
    _article(page, base_url)
    page.locator("#notes-scratchpad-input").fill("keep this on caching")
    page.goto(f"{base_url}/{OTHER}/", wait_until="domcontentloaded")
    page.wait_for_selector("#notes-scratchpad-input", timeout=10_000)
    page.locator("#notes-scratchpad-input").fill("lb note")
    page.wait_for_timeout(400)

    caching = page.evaluate("""() => {
        const key = Object.keys(localStorage).find(
            k => k.startsWith('wiki-notes-') && k.includes('caching')
        );
        return key ? localStorage.getItem(key) : null;
    }""")
    assert caching == "keep this on caching", (
        f"prior article note lost after navigate+retype, got: {caching!r}"
    )


def test_notes_gutter_dollar_sign_present(page, base_url):
    """Terminal restyle: a $ gutter glyph is rendered next to the textarea."""
    _article(page, base_url)
    content = page.evaluate("""() => {
        const body = document.querySelector('.notes-scratchpad-body');
        return getComputedStyle(body, '::before').content;
    }""")
    assert "$" in content, f"Expected '$' gutter glyph, got: {content}"
